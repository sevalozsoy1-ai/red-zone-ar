import {
  ACTION_COST_CENTS,
} from './economy.ts';

export const VISION_UNLOCK_DURATION_MS = 24 * 60 * 60 * 1000;
/** One 24-hour simulated filter unlock uses 50 USD cents. */
export const VISION_MODE_PRICE_CENTS = ACTION_COST_CENTS;
export const VISION_MODE_PRICE = VISION_MODE_PRICE_CENTS;
/** @deprecated Legacy export name; numeric value is USD cents. */
export const VISION_MODE_PRICE_KURUS = VISION_MODE_PRICE_CENTS;

export const VISION_MODES = ["normal", "nightVision", "thermal"] as const;
export type VisionMode = (typeof VISION_MODES)[number];
export type UnlockableVisionMode = Exclude<VisionMode, "normal">;
export type VisionUnlocks = Record<UnlockableVisionMode, number>;
/**
 * New callers use creditCents. The optional legacy credits shape lets older
 * pure callers migrate without making a second balance or silently granting
 * funds.
 */
export type VisionCreditState = {
  /** @deprecated Legacy persisted field name; numeric value is USD cents. */
  creditKurus?: number;
  creditCents?: number;
  credits?: number;
  visionUnlocks: VisionUnlocks;
};
export type VisionCreditUnlockResult = {
  ok: boolean;
  message: string;
  state: VisionCreditState;
};

export const DEFAULT_VISION_UNLOCKS: VisionUnlocks = {
  nightVision: 0,
  thermal: 0,
};

export const VISION_MODE_CONFIG: Record<
  VisionMode,
  { label: string; shortLabel: string; description: string; simulated: boolean }
> = {
  normal: {
    label: "NORMAL",
    shortLabel: "NORMAL",
    description: "Kamera renkleri olduğu gibi gösterilir.",
    simulated: false,
  },
  nightVision: {
    label: "GECE GÖRÜŞÜ",
    shortLabel: "GECE",
    description: "Yeşil bir görsel filtre simülasyonudur; karanlıkta gerçek görüş sağlamaz.",
    simulated: true,
  },
  thermal: {
    label: "TERMAL GÖRÜNÜM",
    shortLabel: "TERMAL",
    description: "Renkli bir ısı haritası görünümü simülasyonudur; ısı ölçmez.",
    simulated: true,
  },
};

export function isUnlockableVisionMode(mode: VisionMode): mode is UnlockableVisionMode {
  return mode !== "normal";
}

/**
 * Pure transaction used by the context so a credit unlock can be checked and
 * applied as one synchronous operation. An already-live mode is intentionally
 * idempotent: retrying the same request cannot charge credits twice.
 */
export function unlockVisionModeFromCredits(
  current: VisionCreditState,
  mode: UnlockableVisionMode,
  now: number,
): VisionCreditUnlockResult {
  if (current.visionUnlocks[mode] > now) {
    return {
      ok: true,
      message: "Bu görüş modu zaten açık.",
      state: current,
    };
  }
  const usesLegacyKurusField = Number.isFinite(current.creditKurus);
  const usesExplicitCents = Number.isFinite(current.creditCents);
  const availableCents = usesLegacyKurusField
    ? (current.creditKurus ?? 0)
    : usesExplicitCents
      ? (current.creditCents ?? 0)
      : (current.credits ?? 0);
  if (availableCents < VISION_MODE_PRICE_CENTS) {
    return {
      ok: false,
        message: `Yetersiz Pro kredi. $${(VISION_MODE_PRICE_CENTS / 100).toFixed(2)} USD gerekiyor.`,
      state: current,
    };
  }
  return {
    ok: true,
    message: `$${(VISION_MODE_PRICE_CENTS / 100).toFixed(2)} USD harcandı.`,
    state: {
      ...(usesLegacyKurusField
        ? { creditKurus: availableCents - VISION_MODE_PRICE_CENTS }
        : usesExplicitCents
          ? { creditCents: availableCents - VISION_MODE_PRICE_CENTS }
          : { credits: availableCents - VISION_MODE_PRICE_CENTS }),
      visionUnlocks: { ...current.visionUnlocks, [mode]: now + VISION_UNLOCK_DURATION_MS },
    },
  };
}