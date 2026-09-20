import { Asset } from 'expo-asset';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useGame } from '@/context/GameContext';
import {
  assertAudioOutputAvailable,
  waitForRunningAudioContext,
} from '@/lib/audio-readiness';
import { getWeapon, type WeaponId } from '@/lib/weapons';
import { WEAPON_SOUNDS } from '@/lib/weapon-assets';
import { effectiveWeaponVolume } from '@/lib/audio-settings';

type SoundKey = WeaponId | 'reload';

const SOURCES: Record<SoundKey, number> = {
  ...WEAPON_SOUNDS,
  reload: require('../assets/audio/reload.wav'),
};

export type WeaponAudio = {
  playShot: (id: WeaponId) => void;
  playReload: () => void;
  playTestSound: (id: WeaponId) => void;
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
  const lastPlayed = useRef<Partial<Record<SoundKey, number>>>({});
  const deferredKeys = useRef(new Set<SoundKey>());
  const mounted = useRef(true);

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
    const cooldown = key === 'minigun-m134' ? 1400 : key !== 'reload' && getWeapon(key).automatic ? 170 : 0;
    if (now - (lastPlayed.current[key] ?? 0) < cooldown) return;
    lastPlayed.current[key] = now;
    const audioContext = ensureContext();
    if (!audioContext) return;

    void waitForRunningAudioContext(audioContext)
      .then(() => loadBuffer(audioContext, key))
      .then(() => {
        if (!mounted.current || document.hidden) return;
        const buffer = buffers.current[key];
        if (!buffer) throw new Error('Missing decoded audio buffer');
        assertAudioOutputAvailable(audioContext);
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
         const gain = audioContext.createGain();
         gain.gain.value = effectiveWeaponVolume(audioVolumes);
         source.connect(gain);
         gain.connect(audioContext.destination);
        sources.current.add(source);
         gains.current.set(source, gain);
        source.onended = () => {
          sources.current.delete(source);
           gains.current.delete(source);
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
    gains.current.forEach((gain) => { gain.gain.value = volume; });
  }, [audioVolumes]);

  const playShot = useCallback((id: WeaponId) => play(id), [play]);
  const playReload = useCallback(() => play('reload'), [play]);
  useEffect(() => {
    if (!gameReady || deferredKeys.current.size === 0) return;
    const pending = Array.from(deferredKeys.current);
    deferredKeys.current.clear();
    pending.forEach((key) => play(key));
  }, [gameReady, play]);
  const playTestSound = useCallback((id: WeaponId) => play(id), [play]);

  return { playShot, playReload, playTestSound, error };
}