import type { BattlePlayer } from "@workspace/api-client-react";

export const TARGET_TAG_VERSION = "1";
export const TARGET_TAG_COUNT = 10;
export const TARGET_TAG_WIDTH_CM = 10;
export const TARGET_HIT_TOLERANCE_CM = 30;
export const QR_OBSERVATION_MAX_AGE_MS = 300;
export const ROOM_CODE_LENGTH = 6;

export type QrPoint = { x: number; y: number };
export type QrGeometry = {
  cornerPoints?: QrPoint[];
  bounds?: { origin?: QrPoint; size?: { width: number; height: number } };
};

export function targetPayload(markerId: number): string {
  if (!Number.isInteger(markerId) || markerId < 0 || markerId >= TARGET_TAG_COUNT) {
    throw new Error("TARGET_ID_OUT_OF_RANGE");
  }
  return `RZ:T:${String(markerId + 1).padStart(2, "0")}:${TARGET_TAG_VERSION}`;
}

/** Strict parser: no room IDs, tokens, names, or arbitrary payloads. */
export function parseTargetPayload(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const match = /^RZ:T:(0[1-9]|10):1$/.exec(value.trim());
  if (!match) return null;
  return Number(match[1]) - 1;
}

/** A room QR carries only the public room code, never a session token. */
export function roomJoinPayload(roomCode: string): string {
  const normalized = typeof roomCode === "string" ? roomCode.trim().toUpperCase() : "";
  if (!/^[A-Z0-9]{6}$/.test(normalized)) throw new Error("ROOM_CODE_INVALID");
  return `RZ:R:${normalized}:1`;
}

export function parseRoomJoinPayload(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = /^RZ:R:([A-Z0-9]{6}):1$/.exec(value.trim().toUpperCase());
  return match ? match[1] : null;
}

export function isFreshQrObservation(observedAt: number, now: number, maxAgeMs = QR_OBSERVATION_MAX_AGE_MS): boolean {
  return Number.isFinite(observedAt) && Number.isFinite(now)
    && now >= observedAt && now - observedAt <= maxAgeMs;
}

export type QrTargetMode = 'fresh' | 'retained' | 'automatic' | 'none';

export function getQrTargetMode(options: {
  observedAt?: number;
  now: number;
  hasRetainedTarget: boolean;
  hasAutomaticTarget: boolean;
}): QrTargetMode {
  if (options.hasRetainedTarget && options.observedAt !== undefined
    && isFreshQrObservation(options.observedAt, options.now)) return 'fresh';
  if (options.hasRetainedTarget) return 'retained';
  if (options.hasAutomaticTarget) return 'automatic';
  return 'none';
}

export function getEligibleQrTarget(
  players: BattlePlayer[] | undefined,
  ownPlayerId: string | undefined,
  markerId: number | null,
): BattlePlayer | null {
  if (!players || markerId === null || markerId < 0 || markerId >= TARGET_TAG_COUNT) return null;
  const target = players.find((player) => player.markerId === markerId);
  if (!target || target.id === ownPlayerId || !target.alive || target.connected === false
    || target.markerId < 0 || target.markerId >= TARGET_TAG_COUNT) {
    return null;
  }
  return target;
}

function finitePoint(point: QrPoint | undefined): point is QrPoint {
  return !!point && Number.isFinite(point.x) && Number.isFinite(point.y);
}

function geometryRect(geometry: QrGeometry, viewport: { width: number; height: number }) {
  if (!Number.isFinite(viewport.width) || !Number.isFinite(viewport.height) || viewport.width <= 0 || viewport.height <= 0) return null;
  const points = geometry.cornerPoints;
  if (points && points.length >= 4 && points.every(finitePoint)) {
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    if (maxX > minX && maxY > minY && minX >= -1 && minY >= -1 && maxX <= viewport.width + 1 && maxY <= viewport.height + 1) {
      return { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY };
    }
    // Do not use an out-of-coordinate-space corner array as a fallback.
    return null;
  }
  const origin = geometry.bounds?.origin;
  const size = geometry.bounds?.size;
  if (!finitePoint(origin) || !size || !Number.isFinite(size.width) || !Number.isFinite(size.height)
    || size.width <= 0 || size.height <= 0) return null;
  const minX = origin.x;
  const minY = origin.y;
  const maxX = minX + size.width;
  const maxY = minY + size.height;
  if (minX < 0 || minY < 0 || maxX > viewport.width || maxY > viewport.height) return null;
  return { minX, maxX, minY, maxY, width: size.width, height: size.height };
}

/**
 * A 10 cm tag gets a 30 cm physical tolerance in every direction.
 * Since the tag is the scale reference, this is three observed tag widths.
 */
export function isQrWithinExpandedHitRegion(
  geometry: QrGeometry,
  viewport: { width: number; height: number },
  toleranceMultiplier = TARGET_HIT_TOLERANCE_CM / TARGET_TAG_WIDTH_CM,
): boolean {
  const rect = geometryRect(geometry, viewport);
  if (!rect || !Number.isFinite(toleranceMultiplier) || toleranceMultiplier < 0) return false;
  const expandX = rect.width * toleranceMultiplier;
  const expandY = rect.height * toleranceMultiplier;
  const centerX = viewport.width / 2;
  const centerY = viewport.height / 2;
  return centerX >= rect.minX - expandX
    && centerX <= rect.maxX + expandX
    && centerY >= rect.minY - expandY
    && centerY <= rect.maxY + expandY;
}
