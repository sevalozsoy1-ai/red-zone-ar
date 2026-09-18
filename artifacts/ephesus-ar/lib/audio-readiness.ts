export const AUDIO_READY_TIMEOUT_MS = 10_000;

export type AudioPlayerReadinessStatus = {
  isLoaded?: boolean;
  error?: string | null;
};

type AudioPlayerSubscription = {
  remove: () => void;
};

export type AudioPlayerReadinessSource = {
  isLoaded: boolean;
  currentStatus: AudioPlayerReadinessStatus;
  addListener: (
    event: 'playbackStatusUpdate',
    listener: (status: AudioPlayerReadinessStatus) => void,
  ) => AudioPlayerSubscription;
};

export class AudioReadinessError extends Error {
  readonly reason: 'load-failed' | 'timeout' | 'context-not-running' | 'output-unavailable';

  constructor(
    reason: AudioReadinessError['reason'],
    message: string,
  ) {
    super(message);
    this.name = 'AudioReadinessError';
    this.reason = reason;
  }
}

function statusError(status: AudioPlayerReadinessStatus): AudioReadinessError | null {
  return status.error
    ? new AudioReadinessError('load-failed', status.error)
    : null;
}

/**
 * Wait for Expo AudioPlayer to finish loading its source.
 *
 * `createAudioPlayer(..., { downloadFirst: true })` starts asynchronously and
 * does not expose a loading promise. Listening for the status event prevents a
 * first tap from seeking/playing the empty player while its asset is still
 * being downloaded or decoded.
 */
export function waitForAudioPlayerReady(
  player: AudioPlayerReadinessSource,
  timeoutMs = AUDIO_READY_TIMEOUT_MS,
): Promise<void> {
  const initialStatus = player.currentStatus ?? {};
  const initialError = statusError(initialStatus);
  if (initialError) return Promise.reject(initialError);
  if (player.isLoaded || initialStatus.isLoaded) return Promise.resolve();

  return new Promise<void>((resolve, reject) => {
    let settled = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let subscription: AudioPlayerSubscription | undefined;

    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      if (timeout) clearTimeout(timeout);
      subscription?.remove();
      if (error) reject(error);
      else resolve();
    };

    try {
      subscription = player.addListener('playbackStatusUpdate', (status) => {
        const error = statusError(status);
        if (error) {
          finish(error);
        } else if (status.isLoaded) {
          finish();
        }
      });
      // A test double or a future native implementation may emit while
      // registering the listener. Do not leak the subscription in that case.
      if (settled) subscription.remove();
      // Loading can finish in the small gap between the initial check and
      // listener registration. Check again so a player cannot time out even
      // though native already decoded it.
      if (!settled && (player.isLoaded || player.currentStatus?.isLoaded)) {
        finish();
      }
    } catch (error) {
      finish(error instanceof Error ? error : new Error('Audio player listener failed'));
      return;
    }

    if (!settled) {
      timeout = setTimeout(() => {
        finish(
          new AudioReadinessError(
            'timeout',
            'Audio asset did not become ready before the timeout',
          ),
        );
      }, Math.max(0, timeoutMs));
    }
  });
}

/**
 * Resolve when any player in a pooled sound becomes usable. A pool may have
 * multiple copies for overlapping automatic fire; the first shot should not
 * wait for a slower secondary copy (or fail because that copy had a load
 * error) when another copy is already decoded.
 */
export function waitForAnyAudioPlayerReady(
  players: readonly AudioPlayerReadinessSource[],
  timeoutMs = AUDIO_READY_TIMEOUT_MS,
): Promise<void> {
  if (players.length === 0) {
    return Promise.reject(
      new AudioReadinessError('load-failed', 'Audio player pool is empty'),
    );
  }

  return new Promise<void>((resolve, reject) => {
    let remaining = players.length;
    let lastError: Error = new AudioReadinessError(
      'load-failed',
      'No audio player became ready',
    );
    let settled = false;

    players.forEach((player) => {
      // Every branch gets a rejection handler so slower/failing pooled
      // players cannot create unhandled rejections after another copy wins.
      void waitForAudioPlayerReady(player, timeoutMs).then(
        () => {
          if (settled) return;
          settled = true;
          resolve();
        },
        (error) => {
          if (settled) return;
          lastError = error instanceof Error ? error : lastError;
          remaining -= 1;
          if (remaining === 0) {
            settled = true;
            reject(lastError);
          }
        },
      );
    });
  });
}

/**
 * Resuming a Web Audio context can resolve while the browser keeps it
 * suspended (for example when no trusted gesture has reached the context).
 * Treat that state as a real failure instead of claiming playback succeeded.
 */
export async function waitForRunningAudioContext(
  audioContext: Pick<AudioContext, 'resume' | 'state'>,
): Promise<void> {
  await audioContext.resume();
  if (audioContext.state !== 'running') {
    throw new AudioReadinessError(
      'context-not-running',
      'The browser audio context is not running',
    );
  }
}

export function assertAudioOutputAvailable(
  audioContext: Pick<AudioContext, 'destination'>,
): void {
  const destination = audioContext.destination;
  if (!destination || destination.maxChannelCount < 1) {
    throw new AudioReadinessError(
      'output-unavailable',
      'The browser audio output is unavailable',
    );
  }
}
