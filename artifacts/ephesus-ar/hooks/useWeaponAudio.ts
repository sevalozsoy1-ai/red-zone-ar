import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { waitForAnyAudioPlayerReady } from '@/lib/audio-readiness';
import {
  activateNativeAudioSession,
  ensureNativeAudioSession,
  suspendNativeAudioSession,
} from '@/lib/native-audio-session';
import {
  createAudioPoolCoordinator,
  type AudioPoolCoordinator,
} from '@/lib/audio-pool-coordinator';
import { getWeapon, type WeaponId } from '@/lib/weapons';
import { WEAPON_SOUNDS } from '@/lib/weapon-assets';
import { useGame } from '@/context/GameContext';
import { effectiveWeaponVolume } from '@/lib/audio-settings';

type SoundKey = WeaponId | 'reload';
type PlayerPool = {
  players: AudioPlayer[];
  coordinator: AudioPoolCoordinator<AudioPlayer>;
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
  const { audioVolumes } = useGame();
  const [error, setError] = useState<string | null>(null);
  const pools = useRef<Partial<PlayerPools>>({});
  const lastPlayed = useRef<Partial<Record<SoundKey, number>>>({});
  const queuedRequests = useRef(new Map<SoundKey, number>());
  const requestSequence = useRef(0);
  const poolRecency = useRef(new Map<SoundKey, number>());
  const poolSequence = useRef(0);
  const lifecycleGeneration = useRef(0);
  // Share one mount/foreground session activation across all shots. Calling
  // activateNativeAudioSession for every trigger serializes native promises
  // indefinitely during sustained fire on Android.
  const sessionReady = useRef<Promise<void>>(Promise.resolve());
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
    pool.coordinator.invalidate();
    queuedRequests.current.delete(key);
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
        const player = createAudioPlayer(SOURCES[key], {
          // Keep short effects from deactivating the shared iOS audio session
          // as soon as one pooled player reaches its end.
          keepAudioSessionActive: true,
          downloadFirst: true,
        });
        player.volume = effectiveWeaponVolume(audioVolumes);
        players.push(player);
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
    const created = {
      players,
      coordinator: createAudioPoolCoordinator(players),
      ready,
    };
    pools.current[key] = created;
    poolRecency.current.set(key, ++poolSequence.current);
    // The rejection is consumed here as well as by an individual shot. This
    // prevents a slow/failing preload from becoming an unhandled rejection.
    void ready.catch(() => undefined);
    return created;
  }, [audioVolumes, disposePool]);

  useEffect(() => {
    const volume = effectiveWeaponVolume(audioVolumes);
    Object.values(pools.current).forEach((pool) => {
      pool?.players.forEach((player) => {
        player.volume = volume;
      });
    });
  }, [audioVolumes]);

  useEffect(() => {
    mounted.current = true;
    sessionReady.current = ensureNativeAudioSession();
    void sessionReady.current.catch(() => {
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
        sessionReady.current = ensureNativeAudioSession();
        void sessionReady.current.catch(() => {
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
      queuedRequests.current.clear();
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

    const requestId = ++requestSequence.current;
    const queuedRequest = queuedRequests.current.get(key);
    // Do not create an unbounded queue while a newly selected sound is
    // downloading. One deferred request is enough; subsequent automatic shots
    // will use the ready pool directly.
    if (queuedRequest !== undefined) return;
    const generation = lifecycleGeneration.current;
    const isUsablePlayer = (candidate: AudioPlayer) =>
      candidate.isLoaded && !candidate.currentStatus.error;
    const playFromPool = (targetPool: PlayerPool, retry: boolean): Promise<void> => {
      const lease = targetPool.coordinator.acquire(isUsablePlayer);
      if (!lease) {
        // A pool can be ready because any one copy loaded while another copy
        // is still decoding. Do not rebuild in that case; wait/use the loaded
        // copy. Rebuild only when no usable native player remains.
        if (!retry && !targetPool.players.some(isUsablePlayer)) {
          disposePool(key);
          const rebuilt = ensurePool(key);
          if (rebuilt) {
            return Promise.all([activateNativeAudioSession(), rebuilt.ready])
              .then(() => playFromPool(rebuilt, true));
          }
        }
        return Promise.resolve();
      }
      return Promise.resolve()
        .then(() => {
          if (
            !mounted.current
            || !active.current
            || generation !== lifecycleGeneration.current
            || !targetPool.coordinator.isCurrent(lease.generation)
          ) return;
          if (pools.current[key] !== targetPool) {
            throw new Error('Audio player pool was replaced');
          }
          const player = lease.value;
          if (!player.isLoaded || player.currentStatus.error) {
            throw new Error('Audio player is not loaded');
          }
          // Stop the previous play before rewinding a pooled Android player.
          player.pause();
          return player.seekTo(0).then(() => {
            if (
              !mounted.current
              || !active.current
              || generation !== lifecycleGeneration.current
              || !targetPool.coordinator.isCurrent(lease.generation)
            ) return;
            try {
              player.play();
              setError(null);
            } catch {
              throw new Error('Audio player play failed');
            }
          });
        })
        .catch((playError) => {
          const hasUsableAlternative = targetPool.players.some(
            (candidate) => candidate !== lease.value && isUsablePlayer(candidate),
          );
          if (!retry && pools.current[key] === targetPool && !hasUsableAlternative) {
            disposePool(key);
            const rebuilt = ensurePool(key);
            if (rebuilt) {
              return Promise.all([activateNativeAudioSession(), rebuilt.ready])
                .then(() => playFromPool(rebuilt, true));
            }
          }
          if (!retry && hasUsableAlternative) {
            return playFromPool(targetPool, true);
          }
          throw playError;
        })
        .finally(lease.release);
    };

    const currentReadyPlayer = pool.players.some(isUsablePlayer);
    if (!currentReadyPlayer) {
      queuedRequests.current.set(key, requestId);
    }

    // Native audio activation is shared at mount/foreground; avoid queuing
    // one process-wide activation request per automatic-weapon shot.
    void Promise.all([sessionReady.current, pool.ready])
      .then(() => {
        if (queuedRequests.current.get(key) === requestId) {
          queuedRequests.current.delete(key);
        }
        if (
          !mounted.current
          || !active.current
          || generation !== lifecycleGeneration.current
        ) return;
        return playFromPool(pool, false);
      })
      .catch(() => {
        if (pools.current[key] !== pool) return;
        if (queuedRequests.current.get(key) === requestId) {
          queuedRequests.current.delete(key);
        }
        disposePool(key);
        if (mounted.current) {
          setError('Ses oynatılamadı. Cihaz sesini açıp SESİ DENE düğmesine tekrar basın.');
        }
      });
  }, [disposePool, ensurePool]);

  const playShot = useCallback((id: WeaponId) => play(id), [play]);
  const playReload = useCallback(() => play('reload'), [play]);
  const playTestSound = useCallback((id: WeaponId) => {
    // A failed mount/foreground activation leaves its shared promise rejected.
    // A deliberate retry must replace that promise or every later shot fails
    // immediately without asking the native session to recover.
    sessionReady.current = activateNativeAudioSession();
    disposePool(id);
    play(id);
  }, [disposePool, play]);
  const prepareWeapon = useCallback((id: WeaponId) => {
    ensurePool(id);
  }, [ensurePool]);

  return { playShot, playReload, playTestSound, prepareWeapon, error };
}