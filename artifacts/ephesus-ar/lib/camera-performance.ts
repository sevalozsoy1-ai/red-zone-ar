export type CameraPerformanceProfile = 'quality' | 'balanced' | 'compatibility';

export type CameraPerformanceConfig = {
  frameWidth: number;
  intervalMs: number;
  targetCaptureArea: number;
  maxCaptureArea: number;
  minCaptureArea: number;
  photoQuality: number;
  jpegCompression: number;
};

const ANALYSIS_MIN_CAPTURE_AREA = 1280 * 720;
const ANALYSIS_TARGET_CAPTURE_AREA = 1920 * 1080;
const ANALYSIS_MAX_CAPTURE_AREA = 1920 * 1080;

export const CAMERA_PERFORMANCE_CONFIG: Record<CameraPerformanceProfile, CameraPerformanceConfig> = {
  quality: {
    frameWidth: 180,
    intervalMs: 450,
    targetCaptureArea: 1280 * 720,
    maxCaptureArea: 1920 * 1080,
    minCaptureArea: 1280 * 720,
    photoQuality: 0.75,
    jpegCompression: 0.7,
  },
  balanced: {
    frameWidth: 160,
    intervalMs: 700,
    targetCaptureArea: 1280 * 720,
    maxCaptureArea: 1280 * 720,
    minCaptureArea: 1280 * 720,
    photoQuality: 0.65,
    jpegCompression: 0.65,
  },
  compatibility: {
    // Degrade cadence first. Keep enough pixels and JPEG quality for marker
    // colors on older Huawei camera HALs instead of producing muddy frames.
    frameWidth: 144,
    intervalMs: 1000,
    targetCaptureArea: 1280 * 720,
    maxCaptureArea: 1280 * 720,
    minCaptureArea: 1280 * 720,
    photoQuality: 0.55,
    jpegCompression: 0.55,
  },
};

export function selectCameraPerformanceProfile(deviceYearClass: number | null | undefined): CameraPerformanceProfile {
  if (!Number.isFinite(deviceYearClass)) return 'balanced';
  if ((deviceYearClass as number) <= 2019) return 'compatibility';
  if ((deviceYearClass as number) <= 2022) return 'balanced';
  return 'quality';
}

export function nextSlowerCameraProfile(profile: CameraPerformanceProfile): CameraPerformanceProfile {
  if (profile === 'quality') return 'balanced';
  return 'compatibility';
}

export function nextFasterCameraProfile(
  profile: CameraPerformanceProfile,
  ceiling: CameraPerformanceProfile,
): CameraPerformanceProfile {
  const rank: Record<CameraPerformanceProfile, number> = { compatibility: 0, balanced: 1, quality: 2 };
  if (rank[profile] >= rank[ceiling]) return profile;
  return profile === 'compatibility' ? 'balanced' : 'quality';
}

/**
 * Schedule the next analysis capture from the end of the previous one.
 *
 * Keeping the cadence deadline relative to the start of the previous capture
 * preserves the requested sample rate when processing is quick, while the
 * small floor prevents a tight loop on camera HALs that take longer than the
 * requested interval. Unlike an interval timer this can never queue captures
 * behind an in-flight native camera operation.
 */
export function nextCameraCaptureDelayMs(
  profile: CameraPerformanceProfile,
  processingElapsedMs: number,
): number {
  const elapsed = Number.isFinite(processingElapsedMs) ? Math.max(0, processingElapsedMs) : 0;
  return Math.max(16, CAMERA_PERFORMANCE_CONFIG[profile].intervalMs - elapsed);
}

/**
 * Pick one bounded native still mode for marker analysis. This is independent
 * of adaptive cadence so profile changes never reconfigure the camera HAL.
 */
export function chooseAnalysisPictureSize(
  sizes: string[],
  viewport: { width: number; height: number },
): string | undefined {
  const viewportAspect = viewport.width > 0 && viewport.height > 0
    ? viewport.width / viewport.height
    : 9 / 16;
  const targetAspect = viewportAspect < 1 ? 1 / viewportAspect : viewportAspect;
  const parsed = sizes
    .map((size) => {
      const [width, height] = size.split("x").map(Number);
      return { size, width, height, area: width * height, aspect: width / height };
    })
    .filter((size) => (
      size.width > 0 &&
      size.height > 0 &&
      Number.isFinite(size.area) &&
      Number.isFinite(size.aspect)
    ));
  if (!parsed.length) return undefined;

  const bounded = parsed.filter((size) => (
    size.area >= ANALYSIS_MIN_CAPTURE_AREA &&
    size.area <= ANALYSIS_MAX_CAPTURE_AREA
  ));
  const candidates = bounded.length
    ? bounded
    : parsed.filter((size) => size.area >= ANALYSIS_MIN_CAPTURE_AREA)
      .sort((left, right) => left.area - right.area)
      .slice(0, 1);
  return [...candidates].sort((left, right) => {
    const leftScore = Math.abs(Math.log(left.aspect / targetAspect)) * 3
      + Math.abs(left.area - ANALYSIS_TARGET_CAPTURE_AREA) / ANALYSIS_TARGET_CAPTURE_AREA;
    const rightScore = Math.abs(Math.log(right.aspect / targetAspect)) * 3
      + Math.abs(right.area - ANALYSIS_TARGET_CAPTURE_AREA) / ANALYSIS_TARGET_CAPTURE_AREA;
    return leftScore - rightScore;
  })[0]?.size;
}