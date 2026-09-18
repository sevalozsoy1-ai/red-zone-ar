export type AudioSessionOperation = () => Promise<void>;

/**
 * Serialize process-wide audio-session mutations without poisoning the queue
 * after one native operation rejects.
 */
export function createAudioSessionQueue() {
  let operation: Promise<void> = Promise.resolve();

  return {
    enqueue(task: AudioSessionOperation): Promise<void> {
      const next = operation.then(task);
      operation = next.catch(() => undefined);
      return next;
    },
  };
}