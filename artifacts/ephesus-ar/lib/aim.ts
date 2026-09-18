export type AimOffset = { x: number; y: number };

export function getAimLimits(width: number, height: number) {
  return {
    x: Math.max(0, (width / 2) - 40),
    y: Math.max(0, (height / 2) - 160),
  };
}

export function clampAimOffset(offset: AimOffset, width: number, height: number): AimOffset {
  const limits = getAimLimits(width, height);
  return {
    x: Math.max(-limits.x, Math.min(limits.x, offset.x)),
    y: Math.max(-limits.y, Math.min(limits.y, offset.y)),
  };
}

export function aimOffsetForScreenPoint(
  screenX: number,
  screenY: number,
  width: number,
  height: number,
): AimOffset {
  return clampAimOffset(
    { x: screenX - width / 2, y: screenY - height / 2 },
    width,
    height,
  );
}