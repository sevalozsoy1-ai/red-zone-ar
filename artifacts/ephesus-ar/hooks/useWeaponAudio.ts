import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { waitForAnyAudioPlayerReady } from '@/lib/audio-readiness';
import {
  activateNativeAudioSession,
  ensureNativeAudioSession,
  suspendNativeAudioSession,
} from '@/lib/native-audio-session';
import { getWeapon, type WeaponId } from '@/lib/weapons';
import { WEAPON_SOUNDS } from '@/lib/weapon-assets';

type SoundKey = WeaponId | 'reload';
type PlayerPool = {
  players: AudioPlayer[];
  ready: Promise<void>;
};
type PlayerPools = Partial<Record<SoundKey, PlayerPool>>;
const MAX_CACHED_POOLS = 3;

const SOURCES: Record<SoundKey, number> = {
  ...WEAPON_SOUNDS,
  reload: require('../assets/audio/reload.wav'),
};

export type WeaponAudio = {
  playShot: (id: WeaponId) => void;
  playReload: () => void;
  playTestSound: (id: WeaponId) => void;
  prepareWeapon: (id: WeaponId) => void;
  error: string | null;
};

export function useWeaponAudio(): WeaponAudio {
  const [error, setError] = useState<string | null>(null);
  const pools = useRef<Partial<PlayerPools>>({});
  const cursor = useRef<Partial<Record<SoundKey, number>>>({});
  const lastPlayed = useRef<Partial<Record<SoundKey, number>>>({});
  const queuedKeys = useRef(new Set<SoundKey>());
  const poolRecency = useRef(new Map<SoundKey, number>());
  const poolSequence = useRef(0);
  const lifecycleGeneration = useRef(0);
  const mounted = useRef(true);
  // AppState.currentState can briefly be null/unknown while Expo Go finishes
  // attaching the bridge. Treat that startup state as usable rather than
  // dropping the first shot before the first AppState event arrives.
  const active = useRef(
    AppState.currentState !== 'background' && AppState.currentState !== 'inactive',
  );

  const disposePool = useCallback((key: SoundKey) => {
    const pool = pools.current[key];
    if (!pool) return;
    delete pools.current[key];
    poolRecency.current.delete(key);
    queuedKeys.current.delete(key);
    pool.players.forEach((player) => {
      try {
        player.remove();
      } catch {
        // Native media services can release a player during an interruption.
      }
    });
  }, []);

  const ensurePool = useCallback((key: SoundKey): PlayerPool | null => {
    const existing = pools.current[key];
    if (existing) {
      poolRecency.current.set(key, ++poolSequence.current);
      return existing;
    }

    if (poolRecency.current.size >= MAX_CACHED_POOLS) {
      const leastRecentKey = Array.from(poolRecency.current.entries())
        .filter(([candidateKey]) => candidateKey !== key)
        .sort(([, first], [, second]) => first - second)[0]?.[0];
      if (leastRecentKey) disposePool(leastRecentKey);
    }

    const poolSize = key !== 'reload' && getWeapon(key).automatic ? 2 : 1;
    const players: AudioPlayer[] = [];
    try {
      for (let index = 0; index < poolSize; index += 1) {
        players.push(createAudioPlayer(SOURCES[key], {
          // Keep short effects from deactivating the shared iOS audio session
          // as soon as one pooled player reaches its end.
          keepAudioSessionActive: true,
          downloadFirst: true,
        }));
      }
    } catch {
      players.forEach((player) => {
        try {
          player.remove();
        } catch {
          // Best-effort cleanup after a partial native allocation.
        }
      });
      setError('Silah sesleri yüklenemedi.');
      return null;
    }

    const ready = waitForAnyAudioPlayerReady(players).then(() => undefined);
    const created = { players, ready };
    pools.current[key] = created;
    poolRecency.current.set(key, ++poolSequence.current);
    // The rejection is consumed here as well as by an individual shot. This
    // prevents a slow/failing preload from becoming an unhandled rejection.
    void ready.catch(() => undefined);
    return created;
  }, []);

  useEffect(() => {
    mounted.current = true;
    void ensureNativeAudioSession().catch(() => {
      if (mounted.current) {
        setError('Ses sistemi başlatılamadı. Cihaz sesini açıp SESİ DENE düğmesine basın.');
      }
    });

    const subscription = AppState.addEventListener('change', (state) => {
      active.current = state === 'active';
      lifecycleGeneration.current += 1;
      if (!active.current) {
        Object.values(pools.current).forEach((pool) => {
          pool?.players.forEach((player) => {
            try {
              player.pause();
            } catch {
              // A player may already be gone after a native interruption.
            }
          });
        });
        void suspendNativeAudioSession().catch(() => undefined);
      } else {
        // Audio mode is process-wide and may have been deactivated by the
        // OS or another app even while React Native stayed mounted.
        void ensureNativeAudioSession().catch(() => {
          if (mounted.current) {
            setError('Ses sistemi yeniden başlatılamadı. Cihaz sesini açıp SESİ DENE düğmesine basın.');
          }
        });
      }
    });

    return () => {
      mounted.current = false;
      lifecycleGeneration.current += 1;
      subscription.remove();
      (Object.keys(pools.current) as SoundKey[]).forEach(disposePool);
      pools.current = {};
      queuedKeys.current.clear();
      poolRecency.current.clear();
    };
  }, [disposePool]);

  const play = useCallback((key: SoundKey) => {
    if (!active.current || !mounted.current) return;
    const now = Date.now();
    const cooldown = key === 'minigun-m134' ? 1400 : key !== 'reload' && getWeapon(key).automatic ? 170 : 0;
    if (now - (lastPlayed.current[key] ?? 0) < cooldown) return;
    lastPlayed.current[key] = now;
    const pool = ensurePool(key);
    if (!pool) return;

    // Do not drop the first shot while downloadFirst is still resolving. One
    // queued request per key is enough; automatic fire will continue normally
    // once this initial request has completed.
    if (queuedKeys.current.has(key)) return;
    queuedKeys.current.add(key);
    const generation = lifecycleGeneration.current;

    void Promise.all([activateNativeAudioSession(), pool.ready])
      .then(() => {
        queuedKeys.current.delete(key);
        if (
          !mounted.current
          || !active.current
          || generation !== lifecycleGeneration.current
        ) return;
        const currentPool = pools.current[key];
        if (currentPool !== pool) throw new Error('Audio player pool was replaced');
        const readyPool = currentPool.players.filter(
          (candidate) => candidate.isLoaded && !candidate.currentStatus.error,
        );
        if (!readyPool.length) {
          disposePool(key);
          throw new Error('Audio player pool is unavailable');
        }
        const index = (cursor.current[key] ?? 0) % readyPool.length;
        cursor.current[key] = (cursor.current[key] ?? 0) + 1;
        const player = readyPool[index];
        if (!player.isLoaded) throw new Error('Audio player is not loaded');

        // Resetting a pooled player permits overlapping rounds during
        // automatic fire. Readiness is checked before seeking so the first
        // tap cannot rewind an empty native player.
        return player.seekTo(0).then(() => {
          if (
            !mounted.current
            || !active.current
            || generation !== lifecycleGeneration.current
          ) return;
          try {
            player.play();
            // This clears a previous failure only after the asset and audio
            // mode are verified. Expo's play() is void, so this is not an
            // audibility/success claim.
            setError(null);
          } catch {
            throw new Error('Audio player play failed');
          }
        });
      })
      .catch(() => {
        if (pools.current[key] !== pool) return;
        queuedKeys.current.delete(key);
        disposePool(key);
        if (mounted.current) {
          setError('Ses oynatılamadı. Cihaz sesini açıp SESİ DENE düğmesine tekrar basın.');
        }
      });
  }, [disposePool, ensurePool]);

  const playShot = useCallback((id: WeaponId) => play(id), [play]);
  const playReload = useCallback(() => play('reload'), [play]);
  const playTestSound = useCallback((id: WeaponId) => play(id), [play]);
  const prepareWeapon = useCallback((id: WeaponId) => {
    ensurePool(id);
  }, [ensurePool]);

  return { playShot, playReload, playTestSound, prepareWeapon, error };
}