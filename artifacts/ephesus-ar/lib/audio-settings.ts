export type AudioVolumeKey = 'master' | 'music' | 'weapon' | 'effects';

export type AudioPreferences = {
  musicEnabled: boolean;
  flashlightEnabled: boolean;
};

export const DEFAULT_AUDIO_PREFERENCES: AudioPreferences = {
  musicEnabled: true,
  flashlightEnabled: true,
};

export type AudioVolumes = {
  master: number;
  music: number;
  weapon: number;
  effects: number;
};

export const DEFAULT_AUDIO_VOLUMES: AudioVolumes = {
  master: 1,
  music: 1,
  weapon: 1,
  effects: 1,
};

export function normalizeAudioVolume(value: unknown, fallback = 1): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(1, Math.max(0, value));
}

export function normalizeAudioVolumes(value: unknown): AudioVolumes {
  const candidate = value && typeof value === 'object' ? value as Partial<AudioVolumes> : {};
  return {
    master: normalizeAudioVolume(candidate.master),
    music: normalizeAudioVolume(candidate.music),
    weapon: normalizeAudioVolume(candidate.weapon),
    effects: normalizeAudioVolume(candidate.effects),
  };
}

export function normalizeAudioPreference(value: unknown, fallback = true): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

export function normalizeAudioPreferences(value: unknown): AudioPreferences {
  if (!value || typeof value !== 'object') return DEFAULT_AUDIO_PREFERENCES;
  const candidate = value as Partial<AudioPreferences>;
  return {
    musicEnabled: normalizeAudioPreference(candidate.musicEnabled),
    flashlightEnabled: normalizeAudioPreference(candidate.flashlightEnabled),
  };
}

export function effectiveMusicVolume(volumes: AudioVolumes): number {
  return volumes.master * volumes.music;
}

export function effectiveWeaponVolume(volumes: AudioVolumes): number {
  return volumes.master * volumes.weapon;
}

export function effectiveEffectsVolume(volumes: AudioVolumes): number {
  return volumes.master * volumes.effects;
}