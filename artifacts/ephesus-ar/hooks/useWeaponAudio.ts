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
  findLeastRecentlyUsedEvictableAudioPool,
  type AudioPoolCoordinator,
} from '@/lib/audio-pool-coordinator';
import { getWeapon, type WeaponId } from '@/lib/weapons';
import type { EnemyVariant, RadioCue } from '@/lib/enemy-combat';
import { WEAPON_SOUNDS } from '@/lib/weapon-assets';
import { useGame } from '@/context/GameContext';
import { effectiveEffectsVolume, effectiveWeaponVolume } from '@/lib/audio-settings';
import { automaticSoundIntervalMs } from '@/lib/automatic-fire';

type SoundKey = WeaponId | 'reload' | 'enemy-shot' | 'enemy-scout' | 'enemy-heavy' | 'enemy-sniper' |
  'enemy-rocket' | 'enemy-cobra-shot' | 'enemy-impact' | 'enemy-rotor' |
  'enemy-radio' | 'enemy-radio-urgent' | 'enemy-radio-air';
type RadioKey = 'enemy-radio' | 'enemy-radio-urgent' | 'enemy-radio-air';
const radioKey = (cue: RadioCue): RadioKey => cue === 'air' ? 'enemy-radio-air' : cue === 'urgent' ? 'enemy-radio-urgent' : 'enemy-radio';
const isEffectsKey = (key: SoundKey) => key.startsWith('enemy-radio') || key === 'enemy-rotor' || key === 'enemy-impact';
const gunScale = (key: SoundKey) => key === 'enemy-scout' || key === 'enemy-heavy' ? 0.65 : 1;
type PlayerPool = {
  players: AudioPlayer[];
  coordinator: AudioPoolCoordinator<AudioPlayer>;
  ready: Promise<void>;
  readySettled: boolean;
  pendingRequests: number;
  subscriptions: { remove: () => void }[];
};
type PlayerPools = Partial<Record<SoundKey, PlayerPool>>;
const MAX_CACHED_POOLS = 3;

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
  const sessionRecovery = useRef<Promise<void> | null>(null);
  const radioGeneration = useRef(0);
  const enemySoundGeneration = useRef(0);
  const rotorGeneration = useRef(0);
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

  const leastRecentlyUsedIdlePool = useCallback((protectedKey?: SoundKey) => {
    const candidates = Array.from(poolRecency.current.entries()).flatMap(([key, recency]) => {
      const pool = pools.current[key];
      if (!pool) return [];
      return [{
        key,
        recency,
        busy: pool.coordinator.busyCount > 0,
        playing: pool.players.some((player) => player.currentStatus.playing),
        loading: !pool.readySettled,
        queued: queuedRequests.current.has(key),
        pendingRequest: pool.pendingRequests > 0,
      }];
    });
    return findLeastRecentlyUsedEvictableAudioPool(candidates, protectedKey);
  }, []);

  const disposePool = useCallback((key: SoundKey) => {
    const pool = pools.current[key];
    if (!pool) return;
    delete pools.current[key];
    poolRecency.current.delete(key);
    pool.coordinator.invalidate();
    queuedRequests.current.delete(key);
    pool.subscriptions.forEach((subscription) => {
      try { subscription.remove(); } catch { /* The native player may already be gone. */ }
    });
    pool.players.forEach((player) => {
      try {
        player.remove();
      } catch {
        // Native media services can release a player during an interruption.
      }
    });
  }, []);

  const trimIdlePools = useCallback((protectedKey?: SoundKey) => {
    while (poolRecency.current.size > MAX_CACHED_POOLS) {
      const idleKey = leastRecentlyUsedIdlePool(protectedKey);
      if (!idleKey) return;
      disposePool(idleKey);
    }
  }, [disposePool, leastRecentlyUsedIdlePool]);

  const recoverNativeAudioSession = useCallback((): Promise<void> => {
    if (sessionRecovery.current) return sessionRecovery.current;
    const recovery = activateNativeAudioSession();
    sessionReady.current = recovery;
    sessionRecovery.current = recovery;
    const clearRecovery = () => {
      if (sessionRecovery.current === recovery) sessionRecovery.current = null;
    };
    void recovery.then(clearRecovery, clearRecovery);
    return recovery;
  }, []);

  const ensurePool = useCallback((key: SoundKey): PlayerPool | null => {
    const existing = pools.current[key];
    if (existing) {
      poolRecency.current.set(key, ++poolSequence.current);
      return existing;
    }

    if (poolRecency.current.size >= MAX_CACHED_POOLS) {
      const leastRecentKey = leastRecentlyUsedIdlePool(key);
      if (leastRecentKey) disposePool(leastRecentKey);
    }

    const poolSize = key === 'enemy-scout' || key === 'enemy-heavy' ? 2
      : key !== 'reload' && !key.startsWith('enemy-') && getWeapon(key as WeaponId).automatic ? 4 : 1;
    const players: AudioPlayer[] = [];
    try {
      for (let index = 0; index < poolSize; index += 1) {
        const player = createAudioPlayer(SOURCES[key], {
          // Keep short effects from deactivating the shared iOS audio session
          // as soon as one pooled player reaches its end.
          keepAudioSessionActive: true,
          downloadFirst: true,
        });
        player.volume = isEffectsKey(key) ? effectiveEffectsVolume(audioVolumes) : effectiveWeaponVolume(audioVolumes) * gunScale(key);
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

    const created = {
      players,
      coordinator: createAudioPoolCoordinator(players),
      ready: Promise.resolve(),
      readySettled: false,
      pendingRequests: 0,
      subscriptions: [] as { remove: () => void }[],
    };
    created.ready = waitForAnyAudioPlayerReady(players).then(
      () => {
        created.readySettled = true;
        trimIdlePools(key);
      },
      (loadError) => {
        created.readySettled = true;
        trimIdlePools(key);
        throw loadError;
      },
    );
    pools.current[key] = created;
    poolRecency.current.set(key, ++poolSequence.current);
    created.subscriptions = players.map((player) => player.addListener(
      'playbackStatusUpdate',
      () => trimIdlePools(key),
    ));
    trimIdlePools(key);
    // The rejection is consumed here as well as by an individual shot. This
    // prevents a slow/failing preload from becoming an unhandled rejection.
    void created.ready.catch(() => undefined);
    return created;
  }, [audioVolumes, disposePool, leastRecentlyUsedIdlePool, trimIdlePools]);

  useEffect(() => {
    const volume = effectiveWeaponVolume(audioVolumes);
    Object.entries(pools.current).forEach(([key, pool]) => {
      pool?.players.forEach((player) => {
        player.volume = isEffectsKey(key as SoundKey) ? effectiveEffectsVolume(audioVolumes) : volume * gunScale(key as SoundKey);
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
    const cooldown = key === 'reload' || key.startsWith('enemy-') ? 0 : automaticSoundIntervalMs(getWeapon(key as WeaponId));
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
    const enemyGeneration = enemySoundGeneration.current;
    const rotorRequest = rotorGeneration.current;
    const isCurrentEnemy = () => (!key.startsWith('enemy-') || enemyGeneration === enemySoundGeneration.current)
      && (key !== 'enemy-rotor' || rotorRequest === rotorGeneration.current);
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
            || !isCurrentEnemy()
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
           player.loop = key === 'enemy-rotor';
          return player.seekTo(0).then(() => {
            if (
              !mounted.current
              || !active.current
              || generation !== lifecycleGeneration.current
              || !isCurrentEnemy()
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
    pool.pendingRequests += 1;
    let pendingRequest = true;
    const settlePendingRequest = () => {
      if (!pendingRequest) return;
      pendingRequest = false;
      pool.pendingRequests = Math.max(0, pool.pendingRequests - 1);
    };

    // Native audio activation is shared at mount/foreground; avoid queuing
    // one process-wide activation request per automatic-weapon shot.
    const playWhenReady = (retry = false) => pool.ready.then(() => {
        if (queuedRequests.current.get(key) === requestId) {
          queuedRequests.current.delete(key);
        }
        if (
          !mounted.current
          || !active.current
          || generation !== lifecycleGeneration.current
          || !isCurrentEnemy()
        ) return;
        settlePendingRequest();
        return playFromPool(pool, retry);
      }).finally(() => {
        settlePendingRequest();
        trimIdlePools(key);
      });
    const handlePlaybackFailure = (playError: unknown) => {
        settlePendingRequest();
        if (pools.current[key] !== pool) return;
        if (queuedRequests.current.get(key) === requestId) {
          queuedRequests.current.delete(key);
        }
        disposePool(key);
        if (mounted.current) {
          setError('Ses oynatılamadı. Cihaz sesini açıp SESİ DENE düğmesine tekrar basın.');
        }
    };
    const sessionAtRequest = sessionReady.current;
    void sessionAtRequest.then(
      () => { void playWhenReady().catch(handlePlaybackFailure); },
      () => {
        // A failed mount/foreground activation must not poison every future
        // shot. Recover once for concurrent requests and retry this shot.
        if (sessionAtRequest !== sessionReady.current) {
          settlePendingRequest();
          if (queuedRequests.current.get(key) === requestId) {
            queuedRequests.current.delete(key);
          }
          trimIdlePools(key);
          return;
        }
        void recoverNativeAudioSession()
          .then(() => playWhenReady())
          .catch(handlePlaybackFailure);
      },
    );
  }, [disposePool, ensurePool, recoverNativeAudioSession, trimIdlePools]);

  const playShot = useCallback((id: WeaponId) => play(id), [play]);
  const playReload = useCallback(() => play('reload'), [play]);
  const playEnemyShot = useCallback((variant: EnemyVariant = 'rifle') => {
    const sounds: Record<EnemyVariant, SoundKey> = {
      rifle: 'enemy-shot', scout: 'enemy-scout', heavy: 'enemy-heavy',
      sniper: 'enemy-sniper', rocketeer: 'enemy-rocket', cobra: 'enemy-cobra-shot', tank: 'enemy-rocket', jet: 'enemy-cobra-shot',
      sidecar: 'enemy-heavy',
    };
    play(sounds[variant]);
  }, [play]);
  const playEnemyImpact = useCallback(() => play('enemy-impact'), [play]);
  const playEnemyEntrance = useCallback((variant: EnemyVariant) => {
    if (variant === 'cobra') play('enemy-rotor');
  }, [play]);
  const stopEnemyRotor = useCallback(() => {
    rotorGeneration.current += 1;
    queuedRequests.current.delete('enemy-rotor');
    pools.current['enemy-rotor']?.players.forEach((player) => {
      try { player.pause(); } catch { /* The rotor may already have ended. */ }
    });
  }, []);
  const stopEnemyCombatAudio = useCallback(() => {
    enemySoundGeneration.current += 1;
    radioGeneration.current += 1;
    rotorGeneration.current += 1;
    (Object.keys(pools.current) as SoundKey[]).filter((key) => key.startsWith('enemy-')).forEach((key) => {
      queuedRequests.current.delete(key);
      pools.current[key]?.players.forEach((player) => {
        try { player.pause(); } catch { /* Native audio may be interrupted. */ }
      });
    });
  }, []);
  const stopEnemyWarning = useCallback(() => {
    radioGeneration.current += 1;
    (['enemy-radio', 'enemy-radio-urgent', 'enemy-radio-air'] as RadioKey[]).forEach((key) => {
      queuedRequests.current.delete(key);
      pools.current[key]?.players.forEach((player) => {
        try { player.pause(); } catch { /* An interrupted player may be unavailable. */ }
      });
    });
  }, []);
  const playEnemyWarning = useCallback(async (cue: RadioCue = 'standard'): Promise<boolean> => {
    if (!active.current || !mounted.current) return false;
    const key = radioKey(cue);
    const generation = radioGeneration.current;
    const enemyGeneration = enemySoundGeneration.current;
    const lifecycle = lifecycleGeneration.current;
    const pool = ensurePool(key);
    if (!pool) return false;
    try {
      await Promise.all([sessionReady.current, pool.ready]);
      if (!mounted.current || !active.current || generation !== radioGeneration.current || enemyGeneration !== enemySoundGeneration.current || lifecycle !== lifecycleGeneration.current || pools.current[key] !== pool) return false;
      const player = pool.players.find((candidate) => candidate.isLoaded && !candidate.currentStatus.error);
      if (!player) return false;
      player.pause();
      await player.seekTo(0);
      if (!mounted.current || !active.current || generation !== radioGeneration.current || enemyGeneration !== enemySoundGeneration.current || lifecycle !== lifecycleGeneration.current || pools.current[key] !== pool) return false;
      player.play();
      setError(null);
      return true;
    } catch {
      if (mounted.current && generation === radioGeneration.current) setError('Telsiz sesi oynatılamadı.');
      return false;
    }
  }, [ensurePool]);
  const prepareEnemyAudio = useCallback((cue: RadioCue = 'urgent') => { ensurePool(radioKey(cue)); }, [ensurePool]);
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

  return { playShot, playReload, playEnemyShot, playEnemyImpact, playEnemyEntrance, stopEnemyRotor, stopEnemyCombatAudio, playEnemyWarning, stopEnemyWarning, prepareEnemyAudio, playTestSound, prepareWeapon, error };
}