import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { waitForAudioPlayerReady } from '@/lib/audio-readiness';
import {
  activateNativeAudioSession,
  ensureNativeAudioSession,
  suspendNativeAudioSession,
} from '@/lib/native-audio-session';

const INTRO_SOURCE = require('../assets/audio/red-zone-menu-combat.mp3');
const ACCENT_SOURCE = require('../assets/audio/red-zone-weapon-menu-accent.mp3');
const INTRO_VOLUME = 0.22;
const ACCENT_VOLUME = 0.3;

export type MenuAudioOptions = {
  enabled: boolean;
  ready: boolean;
};

export type MenuAudio = {
  playWeaponAccent: () => void;
  startMusic: () => void;
  error: string | null;
};

/**
 * Menu ambience is intentionally independent from useWeaponAudio. A native
 * intro player can finish downloading while a user's first camera tap is
 * already firing a weapon, so sharing either player/pool would race that tap.
 */
export function useMenuAudio({ enabled, ready }: MenuAudioOptions): MenuAudio {
  const [error, setError] = useState<string | null>(null);
  const introPlayer = useRef<AudioPlayer | null>(null);
  const accentPlayer = useRef<AudioPlayer | null>(null);
  const introReady = useRef<Promise<void> | null>(null);
  const accentReady = useRef<Promise<void> | null>(null);
  const active = useRef(
    AppState.currentState !== 'background' && AppState.currentState !== 'inactive',
  );
  const mounted = useRef(true);
  const enabledRef = useRef(enabled);
  const readyRef = useRef(ready);
  const introStartQueued = useRef(false);
  const accentStartQueued = useRef(false);
  const introGeneration = useRef(0);
  const accentGeneration = useRef(0);
  const lastAccentAt = useRef(0);

  enabledRef.current = enabled;
  readyRef.current = ready;

  const stopIntro = useCallback(() => {
    introGeneration.current += 1;
    introStartQueued.current = false;
    const player = introPlayer.current;
    if (!player) return;
    try {
      player.pause();
    } catch {
      // A player can be released by native audio during an interruption.
    }
    // Reset on navigation so returning to the menu opens with a clean intro,
    // rather than continuing a track that was playing over a battle.
    void player.seekTo(0).catch(() => undefined);
  }, []);

  const stopAccent = useCallback(() => {
    accentGeneration.current += 1;
    accentStartQueued.current = false;
    const player = accentPlayer.current;
    if (!player) return;
    try {
      player.pause();
    } catch {
      // See stopIntro: native interruption cleanup is best-effort.
    }
    void player.seekTo(0).catch(() => undefined);
  }, []);

  const startIntro = useCallback(() => {
    if (
      !mounted.current
      || !active.current
      || !enabledRef.current
      || !readyRef.current
      || introStartQueued.current
    ) return;
    const player = introPlayer.current;
    const sourceReady = introReady.current;
    if (!player || !sourceReady) return;

    introStartQueued.current = true;
    const generation = introGeneration.current;
    void Promise.all([activateNativeAudioSession(), sourceReady])
      .then(() => {
        introStartQueued.current = false;
        if (
          !mounted.current
          || !active.current
          || !enabledRef.current
          || !readyRef.current
          || generation !== introGeneration.current
          || !player.isLoaded
        ) return;
        player.loop = true;
        player.play();
        setError(null);
      })
      .catch(() => {
        introStartQueued.current = false;
        if (mounted.current) {
          setError('Menü müziği yüklenemedi. Cihaz sesini açıp tekrar deneyin.');
        }
      });
  }, []);

  const playWeaponAccent = useCallback(() => {
    if (
      !mounted.current
      || !active.current
      || !enabledRef.current
      || !readyRef.current
      || accentStartQueued.current
    ) return;
    const now = Date.now();
    if (now - lastAccentAt.current < 180) return;
    const player = accentPlayer.current;
    const sourceReady = accentReady.current;
    if (!player || !sourceReady) return;

    lastAccentAt.current = now;
    accentStartQueued.current = true;
    const generation = accentGeneration.current;
    void Promise.all([activateNativeAudioSession(), sourceReady])
      .then(() => {
        accentStartQueued.current = false;
        if (
          !mounted.current
          || !active.current
          || !enabledRef.current
          || !readyRef.current
          || generation !== accentGeneration.current
          || !player.isLoaded
        ) return;
        player.loop = false;
        return player.seekTo(0).then(() => {
          if (
            mounted.current
            && active.current
            && enabledRef.current
            && readyRef.current
            && generation === accentGeneration.current
          ) {
            player.play();
          }
        });
      })
      .catch(() => {
        accentStartQueued.current = false;
        if (mounted.current) {
          setError('Menü ses efekti oynatılamadı. Cihaz sesini açıp tekrar deneyin.');
        }
      });
  }, []);

  useEffect(() => {
    mounted.current = true;
    void ensureNativeAudioSession().catch(() => {
      if (mounted.current) {
        setError('Ses sistemi başlatılamadı. Cihaz sesini açıp tekrar deneyin.');
      }
    });

    try {
      const intro = createAudioPlayer(INTRO_SOURCE, {
        downloadFirst: true,
        keepAudioSessionActive: true,
      });
      const accent = createAudioPlayer(ACCENT_SOURCE, {
        downloadFirst: true,
        keepAudioSessionActive: true,
      });
      intro.volume = INTRO_VOLUME;
      intro.loop = true;
      accent.volume = ACCENT_VOLUME;
      accent.loop = false;
      introPlayer.current = intro;
      accentPlayer.current = accent;

      const introSourceReady = waitForAudioPlayerReady(intro).then(() => undefined);
      const accentSourceReady = waitForAudioPlayerReady(accent).then(() => undefined);
      introReady.current = introSourceReady;
      accentReady.current = accentSourceReady;
      void introSourceReady.catch(() => undefined);
      void accentSourceReady.catch(() => undefined);
    } catch {
      setError('Menü sesleri yüklenemedi.');
    }

    const subscription = AppState.addEventListener('change', (state) => {
      active.current = state === 'active';
      if (!active.current) {
        stopIntro();
        stopAccent();
        void suspendNativeAudioSession().catch(() => undefined);
      } else if (enabledRef.current && readyRef.current) {
        void ensureNativeAudioSession()
          .then(startIntro)
          .catch(() => {
            if (mounted.current) {
              setError('Ses sistemi yeniden başlatılamadı. Menü sesini tekrar deneyin.');
            }
          });
      }
    });

    return () => {
      mounted.current = false;
      subscription.remove();
      stopIntro();
      stopAccent();
      introPlayer.current?.remove();
      accentPlayer.current?.remove();
      introPlayer.current = null;
      accentPlayer.current = null;
      introReady.current = null;
      accentReady.current = null;
    };
  }, [startIntro, stopAccent, stopIntro]);

  useEffect(() => {
    if (!enabled || !ready || !active.current) {
      if (!enabled) {
        stopIntro();
        stopAccent();
      }
      return;
    }
    startIntro();
  }, [enabled, ready, startIntro, stopAccent, stopIntro]);

  const startMusic = useCallback(() => {
    // Keep loaded-player playback in the user's gesture for browser autoplay.
    const player = introPlayer.current;
    if (player?.isLoaded && enabledRef.current && active.current) {
      player.play();
    } else {
      startIntro();
    }
  }, [startIntro]);

  return { playWeaponAccent, startMusic, error };
}