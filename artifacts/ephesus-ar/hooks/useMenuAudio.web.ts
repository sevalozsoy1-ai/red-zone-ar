import { Asset } from 'expo-asset';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  assertAudioOutputAvailable,
  waitForRunningAudioContext,
} from '@/lib/audio-readiness';
import { useGame } from '@/context/GameContext';
import {
  effectiveEffectsVolume,
  effectiveMusicVolume,
} from '@/lib/audio-settings';

const INTRO_SOURCE = require('../assets/audio/red-zone-menu-combat.mp3');
const BATTLE_SOURCE = require('../assets/audio/battle-ambient.mp3');
const ACCENT_SOURCE = require('../assets/audio/red-zone-weapon-menu-accent.mp3');
const INTRO_VOLUME = 0.22;
const ACCENT_VOLUME = 0.3;

type SoundKey = 'intro' | 'accent';
type WebkitWindow = Window & typeof globalThis & {
  webkitAudioContext?: typeof AudioContext;
};

export type MenuAudioOptions = {
  enabled: boolean;
  ready: boolean;
  track?: 'menu' | 'battle';
};

export type MenuAudio = {
  playWeaponAccent: () => void;
  error: string | null;
};

/**
 * Browsers require a trusted gesture before Web Audio can run. The gesture
 * listener resumes the engine itself; it never plays-and-pauses an audio
 * player as an unlock probe, which would race the first real weapon action.
 */
export function useMenuAudio({ enabled, ready, track = 'menu' }: MenuAudioOptions): MenuAudio {
  const { audioVolumes, musicEnabled } = useGame();
  const musicVolume = track === 'battle' ? 0.16 : INTRO_VOLUME;
  const [error, setError] = useState<string | null>(null);
  const context = useRef<AudioContext | null>(null);
  const buffers = useRef<Partial<Record<SoundKey, AudioBuffer>>>({});
  const loading = useRef<Partial<Record<SoundKey, Promise<void>>>>({});
  const introSource = useRef<AudioBufferSourceNode | null>(null);
  const accentSource = useRef<AudioBufferSourceNode | null>(null);
  const introGain = useRef<GainNode | null>(null);
  const accentGain = useRef<GainNode | null>(null);
  const resumeRequest = useRef<Promise<void> | null>(null);
  const introGeneration = useRef(0);
  const accentGeneration = useRef(0);
  const introStartQueued = useRef(false);
  const lastAccentAt = useRef(0);
  const activated = useRef(false);
  const mounted = useRef(true);
  const enabledRef = useRef(enabled);
  const readyRef = useRef(ready);
  const musicEnabledRef = useRef(musicEnabled);

  enabledRef.current = enabled;
  readyRef.current = ready;
  musicEnabledRef.current = musicEnabled;

  const stopSource = useCallback((sourceRef: { current: AudioBufferSourceNode | null }) => {
    const source = sourceRef.current;
    sourceRef.current = null;
    if (!source) return;
    try {
      source.stop();
    } catch {
      // A source which already ended cannot always be stopped again.
    }
    source.disconnect();
  }, []);

  const stopIntro = useCallback(() => {
    introGeneration.current += 1;
    introStartQueued.current = false;
    stopSource(introSource);
  }, [stopSource]);

  const stopAccent = useCallback(() => {
    accentGeneration.current += 1;
    stopSource(accentSource);
  }, [stopSource]);

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
      const source = key === 'intro' ? (track === 'battle' ? BATTLE_SOURCE : INTRO_SOURCE) : ACCENT_SOURCE;
      const uri = Asset.fromModule(source).uri;
      const response = await fetch(uri);
      if (!response.ok) throw new Error(`Audio request failed: ${response.status}`);
      const buffer = await audioContext.decodeAudioData(await response.arrayBuffer());
      if (buffer.length < 1 || buffer.duration <= 0) {
        throw new Error(`Decoded audio asset is empty: ${key}`);
      }
      buffers.current[key] = buffer;
    })().catch((loadError) => {
      delete loading.current[key];
      if (mounted.current) setError('Ses dosyaları indirilemedi veya çözülemedi.');
      throw loadError;
    });
    loading.current[key] = request;
    return request;
  }, [track]);

  const resumeAudio = useCallback(() => {
    const audioContext = ensureContext();
    if (!audioContext) return Promise.reject(new Error('Audio context unavailable'));
    if (audioContext.state === 'running') return Promise.resolve();
    if (resumeRequest.current) return resumeRequest.current;

    const request = waitForRunningAudioContext(audioContext);
    resumeRequest.current = request;
    void request.finally(() => {
      if (resumeRequest.current === request) resumeRequest.current = null;
    }).catch(() => undefined);
    return request;
  }, [ensureContext]);

  const startIntro = useCallback(() => {
    if (
      !mounted.current
      || !activated.current
      || !enabledRef.current
      || !musicEnabledRef.current
      || !readyRef.current
      || document.hidden
    ) return;
    const audioContext = ensureContext();
    if (!audioContext) return;
    // Trusted gestures arrive for every menu tap. Keep an already-running
    // intro alive instead of restarting it on each pointerdown.
    if (introSource.current && audioContext.state === 'running') return;
    if (introStartQueued.current) return;
    introStartQueued.current = true;
    const generation = ++introGeneration.current;
    void resumeAudio()
      .then(() => loadBuffer(audioContext, 'intro'))
      .then(() => {
        introStartQueued.current = false;
        if (
          !mounted.current
          || !enabledRef.current
          || !musicEnabledRef.current
          || !readyRef.current
          || document.hidden
          || generation !== introGeneration.current
        ) return;
        assertAudioOutputAvailable(audioContext);
        stopSource(introSource);
        const source = audioContext.createBufferSource();
        const gain = audioContext.createGain();
        const buffer = buffers.current.intro;
        if (!buffer) throw new Error('Missing decoded menu intro');
        source.buffer = buffer;
        source.loop = true;
        gain.gain.value = musicVolume * effectiveMusicVolume(audioVolumes);
        source.connect(gain);
        gain.connect(audioContext.destination);
        introSource.current = source;
        introGain.current = gain;
        source.onended = () => {
          if (introSource.current === source) introSource.current = null;
          source.disconnect();
          gain.disconnect();
        };
        source.start();
        setError(null);
      })
      .catch(() => {
        introStartQueued.current = false;
        if (mounted.current) {
          setError('Müzik oynatılamadı. Tarayıcıda ilk dokunuşu deneyin.');
        }
      });
  }, [audioVolumes, ensureContext, loadBuffer, musicVolume, resumeAudio, stopSource]);

  const playWeaponAccent = useCallback(() => {
    if (
      !mounted.current
      || !activated.current
      || !enabledRef.current
      || !musicEnabledRef.current
      || !readyRef.current
      || document.hidden
    ) return;
    const now = Date.now();
    if (now - lastAccentAt.current < 180) return;
    const audioContext = ensureContext();
    if (!audioContext) return;
    lastAccentAt.current = now;
    const generation = ++accentGeneration.current;
    void resumeAudio()
      .then(() => loadBuffer(audioContext, 'accent'))
      .then(() => {
        if (
          !mounted.current
          || !enabledRef.current
          || !musicEnabledRef.current
          || !readyRef.current
          || document.hidden
          || generation !== accentGeneration.current
        ) return;
        assertAudioOutputAvailable(audioContext);
        stopSource(accentSource);
        const source = audioContext.createBufferSource();
        const gain = audioContext.createGain();
        const buffer = buffers.current.accent;
        if (!buffer) throw new Error('Missing decoded menu accent');
        source.buffer = buffer;
        gain.gain.value = ACCENT_VOLUME * effectiveEffectsVolume(audioVolumes);
        source.connect(gain);
        gain.connect(audioContext.destination);
        accentSource.current = source;
        accentGain.current = gain;
        source.onended = () => {
          if (accentSource.current === source) accentSource.current = null;
          source.disconnect();
          gain.disconnect();
        };
        source.start();
      })
      .catch(() => {
        if (mounted.current) {
          setError('Menü ses efekti oynatılamadı. Tarayıcıda ilk dokunuşu deneyin.');
        }
      });
  }, [audioVolumes, ensureContext, loadBuffer, resumeAudio, stopSource]);

  useEffect(() => {
    if (introGain.current) introGain.current.gain.value = musicVolume * effectiveMusicVolume(audioVolumes);
    if (accentGain.current) accentGain.current.gain.value = ACCENT_VOLUME * effectiveEffectsVolume(audioVolumes);
  }, [audioVolumes, musicVolume]);

  const activateAudio = useCallback(() => {
    activated.current = true;
    void resumeAudio()
      .then(() => {
        if (enabledRef.current && musicEnabledRef.current && readyRef.current && !document.hidden) startIntro();
      })
      .catch(() => {
        if (mounted.current) {
          setError('Tarayıcı sesi engelledi. Menü sesini başlatmak için tekrar dokunun.');
        }
      });
  }, [resumeAudio, startIntro]);

  useEffect(() => {
    mounted.current = true;
    const handleGesture = (event: Event) => {
      if (event.isTrusted) activateAudio();
    };
    const stopForBackground = () => {
      stopIntro();
      stopAccent();
      void context.current?.suspend().catch(() => undefined);
    };
    const handleVisibility = () => {
      if (document.hidden) stopForBackground();
    };

    window.addEventListener('pointerdown', handleGesture, { passive: true });
    window.addEventListener('keydown', handleGesture);
    window.addEventListener('blur', stopForBackground);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      mounted.current = false;
      window.removeEventListener('pointerdown', handleGesture);
      window.removeEventListener('keydown', handleGesture);
      window.removeEventListener('blur', stopForBackground);
      document.removeEventListener('visibilitychange', handleVisibility);
      stopIntro();
      stopAccent();
      buffers.current = {};
      loading.current = {};
      const audioContext = context.current;
      context.current = null;
      if (audioContext && audioContext.state !== 'closed') {
        void audioContext.close().catch(() => undefined);
      }
    };
  }, [activateAudio, stopAccent, stopIntro]);

  useEffect(() => {
    if (!enabled || !ready || !musicEnabled || !activated.current || document.hidden) {
      if (!enabled || !musicEnabled) {
        stopIntro();
        stopAccent();
      }
      return;
    }
    startIntro();
  }, [enabled, musicEnabled, ready, startIntro, stopAccent, stopIntro]);

  return { playWeaponAccent, error };
}