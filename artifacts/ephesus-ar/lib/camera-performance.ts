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

export const CAMERA_PERFORMANCE_CONFIG: Record<CameraPerformanceProfile, CameraPerformanceConfig> = {
  quality: {
    frameWidth: 160,
    intervalMs: 450,
    targetCaptureArea: 960 * 540,
    maxCaptureArea: 1280 * 720,
    minCaptureArea: 640 * 480,
    photoQuality: 0.7,
    jpegCompression: 0.65,
  },
  balanced: {
    frameWidth: 144,
    intervalMs: 650,
    targetCaptureArea: 640 * 480,
    maxCaptureArea: 960 * 540,
    minCaptureArea: 480 * 360,
    photoQuality: 0.55,
    jpegCompression: 0.55,
  },
  compatibility: {
    frameWidth: 112,
    intervalMs: 900,
    targetCaptureArea: 480 * 360,
    maxCaptureArea: 640 * 480,
    minCaptureArea: 320 * 240,
    photoQuality: 0.4,
    jpegCompression: 0.45,
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