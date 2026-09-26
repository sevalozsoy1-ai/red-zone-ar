export type AudioPoolLease<T> = {
  value: T;
  generation: number;
  release: () => void;
};

type Slot<T> = {
  value: T;
  busy: boolean;
};

export interface AudioPoolCoordinator<T> {
  acquire(predicate?: (value: T) => boolean): AudioPoolLease<T> | null;
  isCurrent(leaseGeneration: number): boolean;
  invalidate(): void;
  readonly generation: number;
  readonly busyCount: number;
  readonly size: number;
}

export type AudioPoolCacheCandidate<Key extends string = string> = {
  key: Key;
  recency: number;
  busy: boolean;
  playing: boolean;
  loading: boolean;
  queued: boolean;
  pendingRequest: boolean;
};

/**
 * Find an idle cache entry without interrupting a player, a pending preload,
 * or a request waiting for that preload. Keeping this policy pure makes the
 * delayed-load LRU behavior testable without native audio players.
 */
export function findLeastRecentlyUsedEvictableAudioPool<Key extends string>(
  candidates: readonly AudioPoolCacheCandidate<Key>[],
  protectedKey?: Key,
): Key | null {
  return candidates
    .filter((candidate) => candidate.key !== protectedKey)
    .filter((candidate) => !candidate.busy && !candidate.playing && !candidate.loading
      && !candidate.queued && !candidate.pendingRequest)
    .sort((first, second) => first.recency - second.recency)[0]?.key ?? null;
}

/**
 * Keeps pooled native players single-owner while a seek/play operation is
 * pending. The coordinator is deliberately platform agnostic so its lifecycle
 * guarantees can be tested without creating expo-audio players.
 */
export function createAudioPoolCoordinator<T>(
  values: readonly T[],
): AudioPoolCoordinator<T> {
  const slots: Slot<T>[] = values.map((value) => ({ value, busy: false }));
  let generation = 0;
  let cursor = 0;

  return {
    acquire(predicate: (value: T) => boolean = () => true): AudioPoolLease<T> | null {
      if (slots.length === 0) return null;
      for (let offset = 0; offset < slots.length; offset += 1) {
        const index = (cursor + offset) % slots.length;
        const slot = slots[index];
        if (slot.busy || !predicate(slot.value)) continue;
        slot.busy = true;
        cursor = (index + 1) % slots.length;
        const leaseGeneration = generation;
        let released = false;
        return {
          value: slot.value,
          generation: leaseGeneration,
          release: () => {
            if (released) return;
            released = true;
            // A disposed pool may be invalidated and leased again before
            // this async seek/play operation settles. Its old lease must
            // never free the slot owned by the replacement generation.
            if (generation === leaseGeneration) slot.busy = false;
          },
        };
      }
      return null;
    },
    isCurrent(leaseGeneration: number): boolean {
      return leaseGeneration === generation;
    },
    invalidate(): void {
      generation += 1;
      slots.forEach((slot) => {
        slot.busy = false;
      });
    },
    get generation(): number {
      return generation;
    },
    get busyCount(): number {
      return slots.filter((slot) => slot.busy).length;
    },
    get size(): number {
      return slots.length;
    },
  };
}