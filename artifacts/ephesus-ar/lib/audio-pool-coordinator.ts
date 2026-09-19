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
            slot.busy = false;
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