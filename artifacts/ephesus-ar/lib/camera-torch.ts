export type CameraTorchAvailability = {
  platform: "android" | "ios" | "web" | "other";
  facing: "front" | "back";
  permissionGranted: boolean;
  mounted: boolean;
};

export type CameraTorchLifecycle = {
  generation: number;
  enabled: boolean;
};

/**
 * Torch is an optional capability of the active rear camera. Keeping this
 * decision pure makes unsupported devices and denied permissions a no-op.
 */
export function canPulseCameraTorch({
  platform,
  facing,
  permissionGranted,
  mounted,
}: CameraTorchAvailability): boolean {
  return platform !== "web" && facing === "back" && permissionGranted && mounted;
}

/** Fire signals are counters; mount-time values and duplicate renders are ignored. */
export function isPostMountFireSignal(previous: number | undefined, next: number | undefined): boolean {
  return Number.isFinite(next) && Number.isFinite(previous) && (next as number) > (previous as number);
}

export function invalidateCameraTorch(state: CameraTorchLifecycle): CameraTorchLifecycle {
  return { generation: state.generation + 1, enabled: false };
}

export function canCommitTorchTimeout(
  expectedGeneration: number,
  current: CameraTorchLifecycle,
  mounted: boolean,
): boolean {
  return mounted && expectedGeneration === current.generation && current.enabled;
}