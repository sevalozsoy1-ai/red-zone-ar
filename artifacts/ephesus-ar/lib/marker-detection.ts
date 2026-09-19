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
    for (let y = Math.max(0, centerY - radius); y < Math.min(frame.height, centerY + radius); y += 2) {
      for (let x = Math.max(0, centerX - radius); x < Math.min(frame.width, centerX + radius); x += 2) {
        const offset = (y * frame.width + x) * 4;
        const dr = frame.data[offset] - target.r;
        const dg = frame.data[offset + 1] - target.g;
        const db = frame.data[offset + 2] - target.b;
        if (dr * dr + dg * dg + db * db < 6800) score += 1;
      }
    }
    if (score >= 5 && (!best || score > best.score)) best = { markerId: player.markerId, score };
  }
  return best?.markerId ?? null;
}