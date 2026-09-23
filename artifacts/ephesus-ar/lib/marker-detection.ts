import type { BattlePlayer } from "@workspace/api-client-react";
import type { CameraFrame } from "@/components/camera-types";

export type MarkerLockState = {
  candidateId: number | null;
  candidateCount: number;
  lockedId: number | null;
  lastSeenAt: number;
};

export function createMarkerLockState(): MarkerLockState {
  return { candidateId: null, candidateCount: 0, lockedId: null, lastSeenAt: 0 };
}

/**
 * Camera frames are intentionally sampled slowly on older phones. Require two
 * consecutive observations, then retain a lock for a short bounded window so
 * one slow/missed frame does not make the trigger appear broken.
 */
export function updateMarkerLock(
  state: MarkerLockState,
  detectedId: number | null,
  now: number,
  options: { consecutiveFrames?: number; holdMs?: number } = {},
): number | null {
  const consecutiveFrames = options.consecutiveFrames ?? 2;
  const holdMs = options.holdMs ?? 1250;

  if (detectedId === null) {
    if (state.lockedId !== null && now - state.lastSeenAt <= holdMs) return state.lockedId;
    state.candidateId = null;
    state.candidateCount = 0;
    state.lockedId = null;
    return null;
  }

  if (state.candidateId === detectedId) state.candidateCount += 1;
  else {
    state.candidateId = detectedId;
    state.candidateCount = 1;
  }

  if (state.candidateCount >= consecutiveFrames) {
    state.lockedId = detectedId;
    state.lastSeenAt = now;
  }
  if (state.lockedId !== null && state.lockedId === detectedId) state.lastSeenAt = now;
  return state.lockedId !== null && now - state.lastSeenAt <= holdMs ? state.lockedId : null;
}

/**
 * Damage authorization deliberately has no hold window. A retained UI lock
 * can make aiming feel stable, but it must never damage an opponent that is
 * absent from the newest analyzed camera frame.
 */
export function updateMarkerAuthorization(
  state: MarkerLockState,
  detectedId: number | null,
  now: number,
  options: { consecutiveFrames?: number } = {},
): number | null {
  const consecutiveFrames = options.consecutiveFrames ?? 2;
  if (detectedId === null) {
    state.candidateId = null;
    state.candidateCount = 0;
    state.lockedId = null;
    state.lastSeenAt = 0;
    return null;
  }

  if (state.candidateId !== detectedId) {
    state.candidateId = detectedId;
    state.candidateCount = 1;
    state.lockedId = null;
    state.lastSeenAt = now;
    return consecutiveFrames <= 1 ? detectedId : null;
  }

  state.candidateCount += 1;
  state.lastSeenAt = now;
  if (state.candidateCount >= consecutiveFrames) state.lockedId = detectedId;
  return state.lockedId;
}

function rgb(hex: string) {
  const value = hex.replace("#", "");
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  };
}

export function detectPlayerMarker(
  frame: CameraFrame,
  players: BattlePlayer[],
  aim: { x: number; y: number },
  viewport: { width: number; height: number },
) {
  if (!viewport.width || !viewport.height) return null;
  const centerX = Math.round(frame.width * (0.5 + aim.x / viewport.width));
  const centerY = Math.round(frame.height * (0.5 + aim.y / viewport.height));
  const radius = Math.max(7, Math.round(frame.width * 0.09));
  let best: { markerId: number; score: number } | null = null;

  for (const player of players) {
    const target = rgb(player.markerColor);
    let score = 0;
    let minX = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    for (let y = Math.max(0, centerY - radius); y < Math.min(frame.height, centerY + radius); y += 2) {
      for (let x = Math.max(0, centerX - radius); x < Math.min(frame.width, centerX + radius); x += 2) {
        const offset = (y * frame.width + x) * 4;
        const dr = frame.data[offset] - target.r;
        const dg = frame.data[offset + 1] - target.g;
        const db = frame.data[offset + 2] - target.b;
        if (dr * dr + dg * dg + db * db < 2600) {
          score += 1;
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
      }
    }
    const spanX = maxX - minX;
    const spanY = maxY - minY;
    const sampledBounds = Number.isFinite(spanX) && Number.isFinite(spanY)
      ? (Math.floor(spanX / 2) + 1) * (Math.floor(spanY / 2) + 1)
      : 0;
    const density = sampledBounds > 0 ? score / sampledBounds : 0;
    let outerMatches = 0;
    let outerSamples = 0;
    let gapMatches = 0;
    let gapSamples = 0;
    let innerMatches = 0;
    let innerSamples = 0;
    if (sampledBounds > 0) {
      const midX = (minX + maxX) / 2;
      const midY = (minY + maxY) / 2;
      const halfX = Math.max(1, spanX / 2);
      const halfY = Math.max(1, spanY / 2);
      for (let y = minY; y <= maxY; y += 2) {
        for (let x = minX; x <= maxX; x += 2) {
          const radial = Math.max(Math.abs((x - midX) / halfX), Math.abs((y - midY) / halfY));
          const offset = (y * frame.width + x) * 4;
          const dr = frame.data[offset] - target.r;
          const dg = frame.data[offset + 1] - target.g;
          const db = frame.data[offset + 2] - target.b;
          const matches = dr * dr + dg * dg + db * db < 2600;
          if (radial >= 0.82) {
            outerSamples += 1;
            if (matches) outerMatches += 1;
          } else if (radial >= 0.66) {
            gapSamples += 1;
            if (matches) gapMatches += 1;
          } else if (radial <= 0.58) {
            innerSamples += 1;
            if (matches) innerMatches += 1;
          }
        }
      }
    }
    const outerRate = outerSamples ? outerMatches / outerSamples : 0;
    const gapRate = gapSamples ? gapMatches / gapSamples : 1;
    const innerRate = innerSamples ? innerMatches / innerSamples : 0;
    // The rendered player badge has an exact-color outer border and inner
    // block, separated by a dimmed gap. This topology rejects televisions and
    // arbitrary textured regions that merely contain the assigned color.
    const markerShaped = score >= 8
      && spanX >= 6
      && spanY >= 6
      && density >= 0.15
      && density <= 0.97
      && outerRate >= 0.15
      && innerRate >= 0.2
      && gapRate <= 0.35;
    if (markerShaped && (!best || score > best.score)) best = { markerId: player.markerId, score };
  }
  return best?.markerId ?? null;
}