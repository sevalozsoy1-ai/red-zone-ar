import { Asset } from 'expo-asset';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useGame } from '@/context/GameContext';
import {
  assertAudioOutputAvailable,
  waitForRunningAudioContext,
} from '@/lib/audio-readiness';
import { getWeapon, type WeaponId } from '@/lib/weapons';
import type { EnemyVariant, RadioCue } from '@/lib/enemy-combat';
import { WEAPON_SOUNDS } from '@/lib/weapon-assets';
import { effectiveEffectsVolume, effectiveWeaponVolume } from '@/lib/audio-settings';
import { automaticSoundIntervalMs } from '@/lib/automatic-fire';

type SoundKey = WeaponId | 'reload' | 'enemy-shot' | 'enemy-scout' | 'enemy-heavy' | 'enemy-sniper' |
  'enemy-rocket' | 'enemy-cobra-shot' | 'enemy-impact' | 'enemy-rotor' |
  'enemy-radio' | 'enemy-radio-urgent' | 'enemy-radio-air';
type RadioKey = 'enemy-radio' | 'enemy-radio-urgent' | 'enemy-radio-air';
const radioKey = (cue: RadioCue): RadioKey => cue === 'air' ? 'enemy-radio-air' : cue === 'urgent' ? 'enemy-radio-urgent' : 'enemy-radio';
const isEffectsKey = (key: SoundKey | undefined) => key?.startsWith('enemy-radio') || key === 'enemy-rotor' || key === 'enemy-impact';
const gunScale = (key: SoundKey | undefined) => key === 'enemy-scout' || key === 'enemy-heavy' ? 0.65 : 1;

const SOURCES: Record<SoundKey, number> = {
  ...WEAPON_SOUNDS,
  reload: require('../assets/audio/reload.wav'),
  'enemy-shot': require('../assets/audio/rifle-shot.wav'),
  'enemy-scout': require('../assets/audio/smg-shot.wav'),
  'enemy-heavy': require('../assets/audio/machinegun-shot.wav'),
  'enemy-sniper': require('../assets/audio/weapons/dragunov-svd.mp3'),
  'enemy-rocket': require('../assets/audio/weapons/rpg-7.mp3'),
  'enemy-cobra-shot': require('../assets/audio/weapons/at4.mp3'),
  'enemy-impact': require('../assets/audio/weapons/frag-grenade.mp3'),
  'enemy-rotor': require('../assets/audio/enemy-cobra-rotor.mp3'),
  'enemy-radio': require('../assets/audio/enemy-radio.mp3'),
  'enemy-radio-urgent': require('../assets/audio/enemy-radio-urgent.mp3'),
  'enemy-radio-air': require('../assets/audio/enemy-radio-air.mp3'),
};

export type WeaponAudio = {
  playShot: (id: WeaponId) => void;
  playReload: () => void;
  playEnemyShot: (variant?: EnemyVariant) => void;
  playEnemyImpact: () => void;
  playEnemyEntrance: (variant: EnemyVariant) => void;
  stopEnemyRotor: () => void;
  stopEnemyCombatAudio: () => void;
  playEnemyWarning: (cue?: RadioCue) => Promise<boolean>;
  stopEnemyWarning: () => void;
  prepareEnemyAudio: (cue?: RadioCue) => void;
  playTestSound: (id: WeaponId) => void;
  prepareWeapon: (id: WeaponId) => void;
  error: string | null;
};

type WebkitWindow = Window & typeof globalThis & {
  webkitAudioContext?: typeof AudioContext;
};

export function useWeaponAudio(): WeaponAudio {
  const { ready: gameReady, audioVolumes } = useGame();
  const [error, setError] = useState<string | null>(null);
  const context = useRef<AudioContext | null>(null);
  const buffers = useRef<Partial<Record<SoundKey, AudioBuffer>>>({});
  const loading = useRef<Partial<Record<SoundKey, Promise<void>>>>({});
  const sources = useRef(new Set<AudioBufferSourceNode>());
  const gains = useRef(new Map<AudioBufferSourceNode, GainNode>());
  const sourceToKey = useRef(new Map<AudioBufferSourceNode, SoundKey>());
  const lastPlayed = useRef<Partial<Record<SoundKey, number>>>({});
  const deferredKeys = useRef(new Set<SoundKey>());
  const mounted = useRef(true);
  const radioGeneration = useRef(0);
  const enemySoundGeneration = useRef(0);
  const rotorGeneration = useRef(0);

  const stopAll = useCallback(() => {
    sources.current.forEach((source) => {
      try {
        source.stop();
      } catch {
        // A source which has already ended cannot always be stopped again.
      }
      source.disconnect();
      gains.current.get(source)?.disconnect();
    });
    sources.current.clear();
    gains.current.clear();
    sourceToKey.current.clear();
  }, []);

  const ensureContext = useCallback(() => {
    if (context.current && context.current.state !== 'closed') return context.current;
    const AudioContextClass = window.AudioContext || (window as WebkitWindow).webkitAudioContext;
    if (!AudioContextClass) {
      setError('Bu tarayıcı Web Audio özelliğini desteklemiyor.');
      return null;
    }
    try {
      context.current = new AudioContextClass();
      return context.current;
    } catch {
      setError('Tarayıcı ses sistemi başlatılamadı.');
      return null;
    }
  }, []);

  const loadBuffer = useCallback((audioContext: AudioContext, key: SoundKey) => {
    if (buffers.current[key]) return Promise.resolve();
    const existing = loading.current[key];
    if (existing) return existing;

    const request = (async () => {
      const uri = Asset.fromModule(SOURCES[key]).uri;
      const response = await fetch(uri);
      if (!response.ok) throw new Error(`Audio request failed: ${response.status}`);
      const buffer = await audioContext.decodeAudioData(await response.arrayBuffer());
      if (buffer.length < 1 || buffer.duration <= 0) {
        throw new Error(`Decoded audio asset is empty: ${key}`);
      }
      buffers.current[key] = buffer;
    })().catch((loadError) => {
      delete loading.current[key];
      if (mounted.current) setError('Silah sesleri indirilemedi veya çözülemedi. Bağlantınızı kontrol edin.');
      throw loadError;
    });
    loading.current[key] = request;
    return request;
  }, []);

  const preloadBuffers = useCallback(async (audioContext: AudioContext) => {
    // Warm the catalog in the background, but do not make the first shot wait
    // for an unrelated weapon. play() loads only the requested key below.
    await Promise.allSettled(
      (Object.keys(SOURCES) as SoundKey[]).map((key) => loadBuffer(audioContext, key)),
    );
  }, [loadBuffer]);

  const unlock = useCallback(() => {
    const audioContext = ensureContext();
    if (!audioContext) return;
    void waitForRunningAudioContext(audioContext)
      .then(() => preloadBuffers(audioContext))
      .catch(() => {
        if (mounted.current) setError('Tarayıcı sesi engelledi. SESİ DENE düğmesine basın.');
      });
  }, [ensureContext, preloadBuffers]);

  useEffect(() => {
    mounted.current = true;
    const handleGesture = (event: Event) => {
      if (event.isTrusted) unlock();
    };
    const handleVisibility = () => {
      if (document.hidden) {
        stopAll();
        void context.current?.suspend();
      }
    };

    window.addEventListener('pointerdown', handleGesture, { passive: true });
    window.addEventListener('keydown', handleGesture);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      mounted.current = false;
      window.removeEventListener('pointerdown', handleGesture);
      window.removeEventListener('keydown', handleGesture);
      document.removeEventListener('visibilitychange', handleVisibility);
      stopAll();
      buffers.current = {};
      loading.current = {};
      deferredKeys.current.clear();
      const audioContext = context.current;
      context.current = null;
      if (audioContext && audioContext.state !== 'closed') void audioContext.close();
    };
  }, [stopAll, unlock]);

  const play = useCallback((key: SoundKey) => {
    if (!mounted.current || document.hidden) return;
    // External web camera links can render before the game is ready. Defer
    // the first request until the app can safely process it.
    if (!gameReady) {
      deferredKeys.current.add(key);
      return;
    }
    const now = Date.now();
    const cooldown = key === 'reload' || key.startsWith('enemy-') ? 0 : automaticSoundIntervalMs(getWeapon(key as WeaponId));
    if (now - (lastPlayed.current[key] ?? 0) < cooldown) return;
    lastPlayed.current[key] = now;
    const audioContext = ensureContext();
    if (!audioContext) return;
    const enemyGeneration = enemySoundGeneration.current;
    const rotorRequest = rotorGeneration.current;

    void waitForRunningAudioContext(audioContext)
      .then(() => loadBuffer(audioContext, key))
      .then(() => {
        if (!mounted.current || document.hidden || (key.startsWith('enemy-') && enemyGeneration !== enemySoundGeneration.current)
          || (key === 'enemy-rotor' && rotorRequest !== rotorGeneration.current)) return;
        const buffer = buffers.current[key];
        if (!buffer) throw new Error('Missing decoded audio buffer');
        assertAudioOutputAvailable(audioContext);
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
         source.loop = key === 'enemy-rotor';
         const gain = audioContext.createGain();
           gain.gain.value = isEffectsKey(key) ? effectiveEffectsVolume(audioVolumes) : effectiveWeaponVolume(audioVolumes) * gunScale(key);
         source.connect(gain);
         gain.connect(audioContext.destination);
        sources.current.add(source);
         gains.current.set(source, gain);
        sourceToKey.current.set(source, key);
        source.onended = () => {
          sources.current.delete(source);
           gains.current.delete(source);
          sourceToKey.current.delete(source);
          source.disconnect();
           gain.disconnect();
        };
        source.start();
      })
      .catch(() => {
        if (mounted.current) setError('Ses oynatılamadı. SESİ DENE düğmesine tekrar basın.');
      });
  }, [audioVolumes, ensureContext, gameReady, loadBuffer]);

  useEffect(() => {
    const volume = effectiveWeaponVolume(audioVolumes);
    gains.current.forEach((gain, source) => {
      gain.gain.value = isEffectsKey(sourceToKey.current.get(source)) ? effectiveEffectsVolume(audioVolumes) : volume * gunScale(sourceToKey.current.get(source));
    });
  }, [audioVolumes]);

  const playShot = useCallback((id: WeaponId) => play(id), [play]);
  const playReload = useCallback(() => play('reload'), [play]);
  const playEnemyShot = useCallback((variant: EnemyVariant = 'rifle') => {
    const sounds: Record<EnemyVariant, SoundKey> = {
      rifle: 'enemy-shot', scout: 'enemy-scout', heavy: 'enemy-heavy',
      sniper: 'enemy-sniper', rocketeer: 'enemy-rocket', cobra: 'enemy-cobra-shot', tank: 'enemy-rocket', jet: 'enemy-cobra-shot', sidecar: 'enemy-heavy',
    };
    play(sounds[variant]);
  }, [play]);
  const playEnemyImpact = useCallback(() => play('enemy-impact'), [play]);
  const playEnemyEntrance = useCallback((variant: EnemyVariant) => {
    if (variant === 'cobra') play('enemy-rotor');
  }, [play]);
  const stopEnemySources = useCallback((matches: (key: SoundKey) => boolean) => {
    sourceToKey.current.forEach((key, source) => {
      if (!matches(key)) return;
      try { source.stop(); } catch { /* Source may have ended. */ }
      source.disconnect();
      gains.current.get(source)?.disconnect();
      sources.current.delete(source);
      gains.current.delete(source);
      sourceToKey.current.delete(source);
    });
  }, []);
  const stopEnemyRotor = useCallback(() => {
    rotorGeneration.current += 1;
    deferredKeys.current.delete('enemy-rotor');
    stopEnemySources((key) => key === 'enemy-rotor');
  }, [stopEnemySources]);
  const stopEnemyCombatAudio = useCallback(() => {
    enemySoundGeneration.current += 1;
    radioGeneration.current += 1;
    rotorGeneration.current += 1;
    Array.from(deferredKeys.current).filter((key) => key.startsWith('enemy-')).forEach((key) => deferredKeys.current.delete(key));
    stopEnemySources((key) => key.startsWith('enemy-'));
  }, [stopEnemySources]);
  const stopEnemyWarning = useCallback(() => {
    radioGeneration.current += 1;
    stopEnemySources((key) => key.startsWith('enemy-radio'));
  }, [stopEnemySources]);
  const playEnemyWarning = useCallback(async (cue: RadioCue = 'standard'): Promise<boolean> => {
    if (!mounted.current || document.hidden || !gameReady) return false;
    const key = radioKey(cue);
    const generation = radioGeneration.current;
    const enemyGeneration = enemySoundGeneration.current;
    const audioContext = ensureContext();
    if (!audioContext) return false;
    try {
      await waitForRunningAudioContext(audioContext);
      await loadBuffer(audioContext, key);
      if (!mounted.current || document.hidden || generation !== radioGeneration.current || enemyGeneration !== enemySoundGeneration.current) return false;
      assertAudioOutputAvailable(audioContext);
      const buffer = buffers.current[key];
      if (!buffer) return false;
      const source = audioContext.createBufferSource();
      const gain = audioContext.createGain();
      source.buffer = buffer;
      gain.gain.value = effectiveEffectsVolume(audioVolumes);
      source.connect(gain);
      gain.connect(audioContext.destination);
      sources.current.add(source);
      gains.current.set(source, gain);
      sourceToKey.current.set(source, key);
      source.onended = () => {
        sources.current.delete(source);
        gains.current.delete(source);
        sourceToKey.current.delete(source);
        source.disconnect();
        gain.disconnect();
      };
      source.start();
      return true;
    } catch {
      if (mounted.current && generation === radioGeneration.current) setError('Telsiz sesi oynatılamadı.');
      return false;
    }
  }, [audioVolumes, ensureContext, gameReady, loadBuffer]);
  const prepareEnemyAudio = useCallback((cue: RadioCue = 'urgent') => {
    const audioContext = context.current;
    if (audioContext && audioContext.state !== 'closed') void loadBuffer(audioContext, radioKey(cue)).catch(() => undefined);
  }, [loadBuffer]);
  useEffect(() => {
    if (!gameReady || deferredKeys.current.size === 0) return;
    const pending = Array.from(deferredKeys.current);
    deferredKeys.current.clear();
    pending.forEach((key) => play(key));
  }, [gameReady, play]);
  const playTestSound = useCallback((id: WeaponId) => play(id), [play]);
  const prepareWeapon = useCallback((id: WeaponId) => {
    const audioContext = context.current;
    if (!audioContext || audioContext.state === 'closed') return;
    void loadBuffer(audioContext, id).catch(() => {
      // loadBuffer already records a user-facing error.
    });
  }, [loadBuffer]);

  return { playShot, playReload, playEnemyShot, playEnemyImpact, playEnemyEntrance, stopEnemyRotor, stopEnemyCombatAudio, playEnemyWarning, stopEnemyWarning, prepareEnemyAudio, playTestSound, prepareWeapon, error };
}