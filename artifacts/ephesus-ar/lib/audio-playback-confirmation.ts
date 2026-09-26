export type AudioPlaybackProgressStatus = {
  currentTime?: number;
  didJustFinish?: boolean;
  error?: string | null;
};

export type AudioPlaybackProgressSource = {
  currentStatus?: AudioPlaybackProgressStatus;
  addListener: (
    event: 'playbackStatusUpdate',
    listener: (status: AudioPlaybackProgressStatus) => void,
  ) => { remove: () => void };
};

export type AudioPlaybackRequestState<T> = {
  mounted: boolean;
  active: boolean;
  requestIsCurrent: boolean;
  lifecycleIsCurrent: boolean;
  enemyIsCurrent: boolean;
  selectedWeaponIsCurrent: boolean;
  pool: T;
  currentPool: T | undefined;
};

export function isCurrentAudioPlaybackRequest<T>(
  state: AudioPlaybackRequestState<T>,
): boolean {
  return state.mounted
    && state.active
    && state.requestIsCurrent
    && state.lifecycleIsCurrent
    && state.enemyIsCurrent
    && state.selectedWeaponIsCurrent
    && state.pool === state.currentPool;
}

export const AUDIO_PLAYBACK_PROGRESS_TIMEOUT_MS = 700;

/**
 * Confirm that native playback advanced instead of treating a successful call
 * to play() as evidence that the audio engine actually started the sound.
 */
export function waitForAudioPlaybackProgress(
  player: AudioPlaybackProgressSource,
  timeoutMs = AUDIO_PLAYBACK_PROGRESS_TIMEOUT_MS,
): Promise<boolean> {
  const startingTime = player.currentStatus?.currentTime ?? 0;
  const hasPositionAdvanced = (status: AudioPlaybackProgressStatus | undefined) => {
    return !!status && !status.error
      && status.currentTime !== undefined && status.currentTime > startingTime + 0.01;
  };

  return new Promise<boolean>((resolve) => {
    let settled = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let subscription: { remove: () => void } | undefined;

    const finish = (progressed: boolean) => {
      if (settled) return;
      settled = true;
      if (timeout) clearTimeout(timeout);
      try { subscription?.remove(); } catch { /* The player may have been released. */ }
      resolve(progressed);
    };

    try {
      subscription = player.addListener('playbackStatusUpdate', (status) => {
        if (status.error) finish(false);
        else if (status.didJustFinish === true || hasPositionAdvanced(status)) finish(true);
      });
      if (settled) subscription.remove();
      // Recheck after listener registration to close the native-event race.
      if (!settled && hasPositionAdvanced(player.currentStatus)) finish(true);
    } catch {
      finish(false);
      return;
    }

    if (!settled) {
      timeout = setTimeout(() => finish(false), Math.max(0, timeoutMs));
    }
  });
}