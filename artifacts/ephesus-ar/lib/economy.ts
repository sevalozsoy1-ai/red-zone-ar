import {
  isWeaponId,
  isFreeWeapon,
  migrateWeaponId,
  type WeaponId,
} from './weapons.ts';

/**
 * All simulated balances are integer USD cents. Persisted `*Kurus` names are
 * legacy storage/API fields retained only so existing device data can migrate.
 *
 * This is deliberately a simulation rate.  It is not an ad network reward,
 * a card charge, or a promise of real money.
 */
export const SIMULATED_AD_REWARD_CENTS = 50;
export const ACTION_COST_CENTS = SIMULATED_AD_REWARD_CENTS;
export const GENERIC_ACTION_COST_CENTS = ACTION_COST_CENTS;
export const AMMO_REFILL_COST_CENTS = ACTION_COST_CENTS;
export const KNIFE_USE_COST_CENTS = ACTION_COST_CENTS;
export const PRO_WEAPON_UNLOCK_COST_CENTS = ACTION_COST_CENTS;
/** @deprecated Legacy names retained for existing callers; values are USD cents. */
export const SIMULATED_AD_REWARD_KURUS = SIMULATED_AD_REWARD_CENTS;
export const AD_REWARD_KURUS = SIMULATED_AD_REWARD_CENTS;
export const SIMULATED_AD_RATE_KURUS = SIMULATED_AD_REWARD_CENTS;
export const SIMULATED_AD_VALUE_KURUS = SIMULATED_AD_REWARD_CENTS;
export const AD_RATE_KURUS = SIMULATED_AD_REWARD_CENTS;
export const KURUS_PER_LEGACY_CREDIT = 10;
export const CENTS_PER_LEGACY_CREDIT = KURUS_PER_LEGACY_CREDIT;
export const DEFAULT_CREDIT_CENTS = 12 * CENTS_PER_LEGACY_CREDIT;
/** @deprecated Legacy persisted-unit alias; value is USD cents. */
export const DEFAULT_CREDIT_KURUS = DEFAULT_CREDIT_CENTS;
/** @deprecated Legacy names retained for existing callers; values are USD cents. */
export const ACTION_COST_KURUS = ACTION_COST_CENTS;
export const GENERIC_ACTION_COST_KURUS = ACTION_COST_CENTS;
export const AMMO_REFILL_COST_KURUS = ACTION_COST_CENTS;
export const KNIFE_USE_COST_KURUS = ACTION_COST_CENTS;
export const PRO_WEAPON_UNLOCK_COST_KURUS = ACTION_COST_CENTS;
export const PRO_WEAPON_AD_UNLOCKS_REQUIRED = 1;
export const ACTION_UNLOCK_DURATION_MS = 24 * 60 * 60 * 1_000;
export const WEAPON_UNLOCK_DURATION_MS = ACTION_UNLOCK_DURATION_MS;

export const SOLO_ENTRY_REQUIRED_ADS = 3;
export const TEAM_ENTRY_REQUIRED_ADS = 3;
export const AMMO_REFILL_REQUIRED_ADS = 1;
export const VISION_REQUIRED_ADS = 1;
export const WEAPON_REQUIRED_ADS = 1;

export type EconomyAction =
  | 'soloEntry'
  | 'teamEntry'
  | 'ammoRefill'
  | 'nightVision'
  | 'thermal'
  | { type: 'weapon'; weaponId: WeaponId };

export type WeaponUnlocks = Partial<Record<WeaponId, number>>;

export type PendingEconomyAction = {
  id: string;
  action: EconomyAction;
  /** Total ad units for this gate, before credit reservation. */
  requiredAds: number;
  /** Ad units still required after the upfront whole-unit reservation. */
  remainingAds: number;
  completedAds: number;
  /** @deprecated Legacy persisted field name; numeric value is USD cents. */
  reservedKurus: number;
  startedAt: number;
  vip: boolean;
  vipExpiresAt?: number | null;
  alreadySatisfied?: boolean;
  /** Required for idempotent team-match charging. */
  matchId?: string;
  dayKey?: string;
};

export type ActionEconomyState = {
  creditCents: number;
  /** @deprecated Legacy persisted field name; numeric value is USD cents. */
  creditKurus?: number;
  unlockedWeapons: WeaponId[];
  /** New state fields are optional to keep pure legacy callers source-safe. */
  weaponUnlocks?: WeaponUnlocks;
  visionUnlocks?: { nightVision: number; thermal: number };
  pendingActions?: Record<string, PendingEconomyAction>;
  completedActions?: Record<string, PendingEconomyAction>;
  cancelledActions?: Record<string, PendingEconomyAction>;
  soloAccessDay?: string | null;
  teamMatchIds?: string[];
};

export type EconomyState = ActionEconomyState;

export type EconomyTransactionResult = {
  ok: boolean;
  message: string;
  state: EconomyState;
};

export type LegacyEconomyStorage = {
  /** New authoritative persisted field (integer USD cents). */
  creditCents?: unknown;
  /** Explicitly named alias accepted by newer callers. */
  creditKurus?: unknown;
  /** Old persisted field. It is intentionally read only during migration. */
  credits?: unknown;
  unlockedWeapons?: unknown;
  weaponUnlocks?: unknown;
  pendingActions?: unknown;
  completedActions?: unknown;
  cancelledActions?: unknown;
  soloAccessDay?: unknown;
  teamMatchIds?: unknown;
};

export type BeginActionOptions = {
  now?: number;
  transactionId?: string;
  idempotencyKey?: string;
  /** GameContext supplies this from the simulated VIP entitlement. */
  vip?: boolean;
  vipExpiresAt?: number | null;
  matchId?: string;
  dayKey?: string;
};

export type BeginActionResult = {
  ok: boolean;
  message: string;
  state: EconomyState;
  transaction: PendingEconomyAction | null;
  /** Ads still needed after whole-cent reservation. */
  requiredAds: number;
  /** Total ads before credit reservation, for progress copy if needed. */
  totalRequiredAds: number;
  remainingAds: number;
  /** @deprecated Legacy result field name; numeric value is USD cents. */
  reservedKurus: number;
  alreadySatisfied?: boolean;
};

export type ActionProgressResult = {
  ok: boolean;
  message: string;
  state: EconomyState;
  transaction: PendingEconomyAction | null;
  completed: boolean;
  progress: number;
  /** Ads still needed after reservation. */
  requiredAds: number;
  totalRequiredAds: number;
  remainingAds: number;
};

export type ActionCommitResult = {
  ok: boolean;
  message: string;
  state: EconomyState;
  transaction: PendingEconomyAction | null;
  /** @deprecated Legacy result field name; numeric value is USD cents. */
  consumedKurus: number;
};

const asNonNegativeInteger = (value: unknown): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return Math.max(0, Math.floor(value));
};

function readCents(state: Pick<ActionEconomyState, 'creditCents'> & { creditKurus?: unknown }): number {
  const explicit = asNonNegativeInteger(state.creditKurus);
  if (explicit !== null) return explicit;
  return asNonNegativeInteger(state.creditCents) ?? 0;
}

function withBalance(state: EconomyState, balanceCents: number): EconomyState {
  const next = {
    ...state,
    creditCents: Math.max(0, Math.floor(balanceCents)),
    unlockedWeapons: [...state.unlockedWeapons],
  };
  if ('creditKurus' in state) (next as EconomyState & { creditKurus?: number }).creditKurus = next.creditCents;
  return next;
}

/**
 * Migrate persisted balances exactly once at read time. Legacy `creditKurus`
 * is retained as a storage name, but its numeric value is now interpreted as
 * USD cents. Otherwise each legacy display credit becomes ten cents;
 * no additional balance is invented.
 */
export function migrateCreditKurus(
  persisted: Pick<LegacyEconomyStorage, 'creditCents' | 'creditKurus' | 'credits'>,
  fallback = DEFAULT_CREDIT_CENTS,
): number {
  const legacyCents = asNonNegativeInteger(persisted.creditKurus);
  if (legacyCents !== null) return legacyCents;
  const cents = asNonNegativeInteger(persisted.creditCents);
  if (cents !== null) return cents;
  const legacyCredits = asNonNegativeInteger(persisted.credits);
  if (legacyCredits !== null) return legacyCredits * CENTS_PER_LEGACY_CREDIT;
  return fallback;
}

/** Compatibility alias for the original API. */
export const migrateCreditCents = (
  persisted: Pick<LegacyEconomyStorage, 'creditCents' | 'creditKurus' | 'credits'>,
  fallback = DEFAULT_CREDIT_CENTS,
): number => migrateCreditKurus(persisted, fallback);

export function migrateUnlockedWeaponIds(value: unknown): WeaponId[] {
  if (!Array.isArray(value)) return [];
  const migrated = value
    .map((id) => migrateWeaponId(id))
    .filter((id): id is WeaponId => id !== null && !isFreeWeapon(id));
  return [...new Set(migrated)];
}

export function migrateWeaponUnlocks(value: unknown): WeaponUnlocks {
  if (!value || typeof value !== 'object') return {};
  const result: WeaponUnlocks = {};
  for (const [rawId, rawExpiry] of Object.entries(value)) {
    const id = migrateWeaponId(rawId);
    const expiry = asNonNegativeInteger(rawExpiry);
    if (id && !isFreeWeapon(id) && expiry !== null) result[id] = expiry;
  }
  return result;
}

/**
 * Legacy saves only contained an array of unlocked Pro weapon ids. Those
 * grants have no trustworthy age, so give each one a bounded 24-hour window
 * exactly once while the save is migrated. New saves persist weaponUnlocks
 * and are never treated as permanent array-only unlocks.
 */
export function migrateLegacyWeaponUnlocks(
  unlockedValue: unknown,
  persistedExpiries?: unknown,
  now = Date.now(),
): WeaponUnlocks {
  const result = migrateWeaponUnlocks(persistedExpiries);
  for (const weaponId of migrateUnlockedWeaponIds(unlockedValue)) {
    if (result[weaponId] === undefined) {
      result[weaponId] = now + WEAPON_UNLOCK_DURATION_MS;
    }
  }
  return result;
}

export function isWeaponUnlocked(
  weaponId: WeaponId,
  unlockedWeapons: readonly WeaponId[],
  now = Date.now(),
  weaponUnlocks?: WeaponUnlocks,
): boolean {
  if (isFreeWeapon(weaponId)) return true;
  const expiry = weaponUnlocks?.[weaponId];
  if (typeof expiry === 'number') return expiry > now;
  // Array-only Pro ids are legacy data. Callers must migrate them to a
  // bounded expiry; never grant an indefinite runtime fallback.
  return false;
}

export function spendCents(
  current: EconomyState,
  amountCents: number,
  message = 'Yetersiz Pro kredi.',
): EconomyTransactionResult {
  const amount = asNonNegativeInteger(amountCents);
  const balance = readCents(current);
  if (amount === null || amount <= 0) {
    return { ok: false, message: 'Geçersiz ekonomi işlemi.', state: current };
  }
  if (balance < amount) return { ok: false, message, state: current };
  return {
    ok: true,
    message: `$${(amount / 100).toFixed(2)} USD harcandı.`,
    state: withBalance(current, balance - amount),
  };
}

export const spendKurus = spendCents;

export function refundCents(current: EconomyState, amountCents: number): EconomyTransactionResult {
  const amount = asNonNegativeInteger(amountCents);
  if (amount === null || amount <= 0) {
    return { ok: false, message: 'Geçersiz iade işlemi.', state: current };
  }
  return {
    ok: true,
    message: `$${(amount / 100).toFixed(2)} USD iade edildi.`,
    state: withBalance(current, readCents(current) + amount),
  };
}

export const refundKurus = refundCents;

/**
 * @deprecated Compatibility-only pure helper. Production callers must use
 * beginAction/recordActionAd/commitAction; GameContext routes legacy calls
 * through that gate.
 */
export function unlockWeaponFromAd(
  current: EconomyState,
  weaponId: WeaponId,
  now = Date.now(),
): EconomyTransactionResult {
  if (!isWeaponId(weaponId)) {
    return { ok: false, message: 'Geçersiz ekipman.', state: current };
  }
  if (isFreeWeapon(weaponId)) {
    return { ok: true, message: 'Bu ekipman zaten ücretsiz.', state: current };
  }
  if (current.unlockedWeapons.includes(weaponId) && isWeaponUnlocked(weaponId, current.unlockedWeapons, now, current.weaponUnlocks)) {
    return { ok: true, message: 'Bu ekipman zaten açık.', state: current };
  }
  return {
    ok: true,
    message: 'Simülasyon tamamlandı; ekipman açıldı.',
    state: {
      ...current,
      unlockedWeapons: [...new Set([...current.unlockedWeapons, weaponId])],
      weaponUnlocks: {
        ...(current.weaponUnlocks ?? {}),
        [weaponId]: now + WEAPON_UNLOCK_DURATION_MS,
      },
    },
  };
}

/**
 * @deprecated Compatibility-only pure helper. Production callers must use
 * the weapon gate rather than mutating an unlock directly.
 */
export function unlockWeaponWithCredits(
  current: EconomyState,
  weaponId: WeaponId,
  now = Date.now(),
): EconomyTransactionResult {
  if (!isWeaponId(weaponId)) {
    return { ok: false, message: 'Geçersiz ekipman.', state: current };
  }
  if (isFreeWeapon(weaponId)) {
    return { ok: true, message: 'Bu ekipman zaten ücretsiz.', state: current };
  }
  if (current.unlockedWeapons.includes(weaponId) && isWeaponUnlocked(weaponId, current.unlockedWeapons, now, current.weaponUnlocks)) {
    return { ok: true, message: 'Bu ekipman zaten açık.', state: current };
  }
  const spent = spendKurus(
    current,
    PRO_WEAPON_UNLOCK_COST_CENTS,
    `$${(PRO_WEAPON_UNLOCK_COST_CENTS / 100).toFixed(2)} USD gerekiyor.`,
  );
  if (!spent.ok) return spent;
  return {
    ok: true,
    message: `$${(PRO_WEAPON_UNLOCK_COST_CENTS / 100).toFixed(2)} USD harcandı; ekipman açıldı.`,
    state: {
      ...spent.state,
      unlockedWeapons: [...new Set([...spent.state.unlockedWeapons, weaponId])],
      weaponUnlocks: {
        ...(spent.state.weaponUnlocks ?? {}),
        [weaponId]: now + WEAPON_UNLOCK_DURATION_MS,
      },
    },
  };
}

function actionName(action: EconomyAction): string {
  return typeof action === 'string' ? action : `weapon:${action.weaponId}`;
}

function requiredAdsFor(action: EconomyAction): number {
  switch (typeof action === 'string' ? action : 'weapon') {
    case 'soloEntry': return SOLO_ENTRY_REQUIRED_ADS;
    case 'teamEntry': return TEAM_ENTRY_REQUIRED_ADS;
    case 'ammoRefill': return AMMO_REFILL_REQUIRED_ADS;
    case 'nightVision':
    case 'thermal': return VISION_REQUIRED_ADS;
    default: return WEAPON_REQUIRED_ADS;
  }
}

function localDayKey(now: number): string {
  const date = new Date(now);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function isVip(options: BeginActionOptions, now: number): boolean {
  if (options.vip === true && (options.vipExpiresAt == null || options.vipExpiresAt > now)) return true;
  return typeof options.vipExpiresAt === 'number' && options.vipExpiresAt > now;
}

function actionMatches(a: EconomyAction, b: EconomyAction): boolean {
  if (typeof a !== typeof b) return false;
  if (typeof a === 'string' && typeof b === 'string') return a === b;
  return typeof a !== 'string' && typeof b !== 'string' && a.type === b.type && a.weaponId === b.weaponId;
}

function clonePending(state: EconomyState): Record<string, PendingEconomyAction> {
  return { ...(state.pendingActions ?? {}) };
}

function nextTransactionId(
  state: EconomyState,
  action: EconomyAction,
  now: number,
  requested?: string,
): string {
  const explicit = requested?.trim();
  if (explicit) return explicit;
  const base = `${actionName(action)}:${now}`;
  if (!state.pendingActions?.[base]) return base;
  let sequence = 2;
  while (state.pendingActions?.[`${base}:${sequence}`]) sequence += 1;
  return `${base}:${sequence}`;
}

/**
 * Atomically reserve whole ad units from the USD-cent balance. A balance of
 * 125 cents on a three-ad gate reserves 100 cents and leaves the 25-cent fraction
 * untouched; one simulated ad remains to be watched. Reservation is refunded
 * by cancelAction and is only final at commitAction.
 */
export function beginAction(
  current: EconomyState,
  action: EconomyAction,
  options?: BeginActionOptions,
): BeginActionResult;
export function beginAction(
  action: EconomyAction,
  current: EconomyState,
  options?: BeginActionOptions,
): BeginActionResult;
export function beginAction(
  first: EconomyState | EconomyAction,
  second: EconomyAction | EconomyState,
  options: BeginActionOptions = {},
): BeginActionResult {
  const firstIsAction = typeof first === 'string'
    || (typeof first === 'object' && first !== null && 'type' in first);
  const current = (firstIsAction ? second : first) as EconomyState;
  const action = (firstIsAction ? first : second) as EconomyAction;
  if (
    (typeof action === 'string'
      && !['soloEntry', 'teamEntry', 'ammoRefill', 'nightVision', 'thermal'].includes(action))
    || (typeof action !== 'string'
      && (action.type !== 'weapon' || !isWeaponId(action.weaponId)))
  ) {
    return {
      ok: false,
      message: 'Geçersiz ekonomi işlemi.',
      state: current,
      transaction: null,
      requiredAds: 0,
      totalRequiredAds: 0,
      remainingAds: 0,
      reservedKurus: 0,
    };
  }
  const now = options.now ?? Date.now();
  const pending = clonePending(current);
  const requestedId = options.transactionId ?? options.idempotencyKey;
  const implicitExisting = !requestedId
    ? Object.values(pending).find((candidate) => (
      actionMatches(candidate.action, action)
      && (
        action !== 'teamEntry'
        || !options.matchId
        || candidate.matchId === options.matchId
      )
    ))
    : undefined;
  const id = implicitExisting?.id ?? nextTransactionId(current, action, now, requestedId);
  const existing = pending[id];
  if (existing) {
    if (!actionMatches(existing.action, action)) {
      return {
        ok: false,
        message: 'Bu işlem anahtarı başka bir ekonomi işlemi için kullanıldı.',
        state: current,
        transaction: null,
        requiredAds: 0,
        totalRequiredAds: 0,
        remainingAds: 0,
        reservedKurus: 0,
      };
    }
    return {
      ok: true,
      message: 'Ekonomi işlemi zaten başlatıldı.',
      state: current,
      transaction: existing,
      requiredAds: Math.max(0, existing.remainingAds - existing.completedAds),
      totalRequiredAds: existing.requiredAds,
      remainingAds: Math.max(0, existing.remainingAds - existing.completedAds),
      reservedKurus: existing.reservedKurus,
    };
  }
  const completed = current.completedActions?.[id];
  if (completed) {
    if (!actionMatches(completed.action, action)) {
      return {
        ok: false,
        message: 'Bu işlem anahtarı başka bir ekonomi işlemi için kullanıldı.',
        state: current,
        transaction: null,
        requiredAds: 0,
        totalRequiredAds: 0,
        remainingAds: 0,
        reservedKurus: 0,
      };
    }
    return {
      ok: true,
      message: 'Ekonomi işlemi zaten tamamlandı.',
      state: current,
      transaction: completed,
      requiredAds: 0,
      totalRequiredAds: completed.requiredAds,
      remainingAds: 0,
      reservedKurus: 0,
      alreadySatisfied: true,
    };
  }

  const dayKey = options.dayKey ?? localDayKey(now);
  const matchId = options.matchId?.trim() || undefined;
  const alreadySolo = action === 'soloEntry' && current.soloAccessDay === dayKey;
  const alreadyTeam = action === 'teamEntry' && !!matchId && (current.teamMatchIds ?? []).includes(matchId);
  const alreadyVision = (
    action === 'nightVision' || action === 'thermal'
  ) && (current.visionUnlocks?.[action] ?? 0) > now;
  const alreadyWeapon = typeof action !== 'string'
    && action.type === 'weapon'
    && isWeaponUnlocked(action.weaponId, current.unlockedWeapons, now, current.weaponUnlocks);
  const vip = isVip(options, now);
  const alreadySatisfied = alreadySolo || alreadyTeam || alreadyVision || alreadyWeapon;
  const requiredAds = alreadySatisfied || vip ? 0 : requiredAdsFor(action);
  const balance = readCents(current);
  const reservedKurus = requiredAds === 0
    ? 0
    : Math.min(Math.floor(balance / SIMULATED_AD_REWARD_CENTS), requiredAds) * SIMULATED_AD_REWARD_CENTS;
  const transaction: PendingEconomyAction = {
    id,
    action,
    requiredAds,
    remainingAds: Math.max(0, requiredAds - reservedKurus / SIMULATED_AD_REWARD_CENTS),
    completedAds: 0,
    reservedKurus,
    startedAt: now,
    vip,
    ...(options.vipExpiresAt !== undefined ? { vipExpiresAt: options.vipExpiresAt } : {}),
    ...(alreadySatisfied ? { alreadySatisfied: true } : {}),
    ...(matchId ? { matchId } : {}),
    ...(action === 'soloEntry' ? { dayKey } : {}),
  };
  const nextPending = { ...pending, [id]: transaction };
  const next = withBalance(
    { ...current, pendingActions: nextPending },
    balance - reservedKurus,
  );
  return {
    ok: true,
    message: vip
      ? 'VIP erişimi: reklam ve kredi kesintisi yok.'
      : requiredAds === 0
        ? 'Bu erişim zaten açık.'
        : reservedKurus > 0
          ? `$${(reservedKurus / 100).toFixed(2)} USD ayrıldı; ${requiredAds - reservedKurus / SIMULATED_AD_REWARD_CENTS} reklam kaldı.`
          : `${requiredAds} simülasyon reklamı gerekiyor.`,
    state: next,
    transaction,
    requiredAds: transaction.remainingAds,
    totalRequiredAds: transaction.requiredAds,
    remainingAds: transaction.remainingAds,
    reservedKurus,
    alreadySatisfied,
  };
}

/** Records exactly one simulated ad click and never grants the action early. */
export function recordActionAd(current: EconomyState, transactionId: string): ActionProgressResult {
  const transaction = current.pendingActions?.[transactionId];
  if (!transaction) {
    return {
      ok: false,
      message: 'Bekleyen ekonomi işlemi bulunamadı.',
      state: current,
      transaction: null,
      completed: false,
      progress: 0,
      requiredAds: 0,
      totalRequiredAds: 0,
      remainingAds: 0,
    };
  }
  if (transaction.vip || transaction.completedAds >= transaction.remainingAds) {
    return {
      ok: true,
      message: transaction.vip ? 'VIP erişimi reklam gerektirmez.' : 'Bu işlem için gereken reklamlar tamamlandı.',
      state: current,
      transaction,
      completed: true,
      progress: transaction.completedAds,
      requiredAds: Math.max(0, transaction.remainingAds - transaction.completedAds),
      totalRequiredAds: transaction.requiredAds,
      remainingAds: 0,
    };
  }
  const updated = {
    ...transaction,
    completedAds: Math.min(transaction.remainingAds, transaction.completedAds + 1),
  };
  const next = {
    ...current,
    pendingActions: { ...(current.pendingActions ?? {}), [transactionId]: updated },
  };
  const remainingAds = Math.max(0, updated.remainingAds - updated.completedAds);
  const completed = remainingAds === 0;
  return {
    ok: true,
    message: completed ? 'Simülasyon tamamlandı; erişimi onaylayabilirsiniz.' : 'Simülasyon reklamı tamamlandı.',
    state: next,
    transaction: updated,
    completed,
    progress: updated.completedAds,
    requiredAds: remainingAds,
    totalRequiredAds: updated.requiredAds,
    remainingAds,
  };
}

export const recordAdClick = recordActionAd;
export const progressAction = recordActionAd;

function applyActionGrant(
  state: EconomyState,
  transaction: PendingEconomyAction,
  now: number,
): EconomyState {
  const next: EconomyState = {
    ...state,
    unlockedWeapons: [...state.unlockedWeapons],
    pendingActions: { ...(state.pendingActions ?? {}) },
    completedActions: { ...(state.completedActions ?? {}), [transaction.id]: transaction },
  };
  delete next.pendingActions?.[transaction.id];
  // A VIP bypass or an already-live entitlement needs no persistent grant.
  // In particular, do not create a post-VIP weapon/vision window.
  if (
    transaction.vip
    || transaction.alreadySatisfied
  ) return next;
  if (transaction.action === 'soloEntry') {
    next.soloAccessDay = transaction.dayKey ?? localDayKey(now);
  } else if (transaction.action === 'teamEntry' && transaction.matchId) {
    next.teamMatchIds = [...new Set([...(next.teamMatchIds ?? []), transaction.matchId])];
  } else if (typeof transaction.action !== 'string' && transaction.action.type === 'weapon') {
    const weaponId = transaction.action.weaponId;
    if (!isFreeWeapon(weaponId)) {
      next.unlockedWeapons = [...new Set([...next.unlockedWeapons, weaponId])];
      next.weaponUnlocks = {
        ...(next.weaponUnlocks ?? {}),
        [weaponId]: now + WEAPON_UNLOCK_DURATION_MS,
      };
    }
  } else if (transaction.action === 'nightVision' || transaction.action === 'thermal') {
    next.visionUnlocks = {
      nightVision: next.visionUnlocks?.nightVision ?? 0,
      thermal: next.visionUnlocks?.thermal ?? 0,
      [transaction.action]: now + ACTION_UNLOCK_DURATION_MS,
    };
  }
  return next;
}

/** Grants the action only after all ad progress has been completed. */
export function commitAction(current: EconomyState, transactionId: string, now = Date.now()): ActionCommitResult {
  const transaction = current.pendingActions?.[transactionId];
  if (!transaction) {
    const completed = current.completedActions?.[transactionId];
    if (completed) {
      return {
        ok: true,
        message: 'Ekonomi işlemi zaten tamamlandı.',
        state: current,
        transaction: completed,
        consumedKurus: 0,
      };
    }
    return { ok: false, message: 'Bekleyen ekonomi işlemi bulunamadı.', state: current, transaction: null, consumedKurus: 0 };
  }
  if (
    transaction.vip
    && typeof transaction.vipExpiresAt === 'number'
    && transaction.vipExpiresAt <= now
  ) {
    return {
      ok: false,
      message: 'VIP erişiminin süresi doldu; işlemi yeniden başlatın.',
      state: current,
      transaction,
      consumedKurus: 0,
    };
  }
  if (!transaction.vip && transaction.completedAds < transaction.remainingAds) {
    return {
      ok: false,
      message: `${transaction.remainingAds - transaction.completedAds} simülasyon reklamı kaldı.`,
      state: current,
      transaction,
      consumedKurus: 0,
    };
  }
  return {
    ok: true,
    message: transaction.vip ? 'VIP erişimi verildi.' : 'Erişim verildi.',
    state: applyActionGrant(current, transaction, now),
    transaction,
    consumedKurus: transaction.reservedKurus,
  };
}

/** Cancelling (including a failed room join) restores the full reservation. */
export function cancelAction(current: EconomyState, transactionId: string): ActionCommitResult {
  const transaction = current.pendingActions?.[transactionId];
  if (!transaction) {
    const completed = current.completedActions?.[transactionId];
    if (completed) {
      return {
        ok: false,
        message: 'Tamamlanan ekonomi işlemi iptal edilemez.',
        state: current,
        transaction: completed,
        consumedKurus: 0,
      };
    }
    const cancelled = current.cancelledActions?.[transactionId];
    if (cancelled) {
      return {
        ok: true,
        message: 'Ekonomi işlemi zaten iptal edildi.',
        state: current,
        transaction: cancelled,
        consumedKurus: 0,
      };
    }
    return { ok: false, message: 'Bekleyen ekonomi işlemi bulunamadı.', state: current, transaction: null, consumedKurus: 0 };
  }
  const pending = { ...(current.pendingActions ?? {}) };
  delete pending[transactionId];
  return {
    ok: true,
    message: 'Ekonomi işlemi iptal edildi; ayrılan USD kredi iade edildi.',
    state: withBalance({
      ...current,
      pendingActions: pending,
      cancelledActions: { ...(current.cancelledActions ?? {}), [transactionId]: transaction },
    }, readCents(current) + transaction.reservedKurus),
    transaction,
    consumedKurus: 0,
  };
}

export const failAction = cancelAction;

/**
 * A local reload cannot safely resume a UI transaction that may have been
 * opened with a new id. Restore is therefore fail-closed: refund every
 * persisted reservation once, move it to cancellation history, and clear the
 * pending map before the hydrated state is persisted again.
 */
export function restorePendingActions(current: EconomyState): EconomyState {
  const pending = current.pendingActions ?? {};
  const refund = Object.values(pending).reduce(
    (total, transaction) => total + Math.max(0, Math.floor(transaction.reservedKurus)),
    0,
  );
  if (Object.keys(pending).length === 0) return current;
  return withBalance({
    ...current,
    pendingActions: {},
    cancelledActions: {
      ...(current.cancelledActions ?? {}),
      ...pending,
    },
  }, readCents(current) + refund);
}

export function normalizeEconomyState(storage: LegacyEconomyStorage, now = Date.now()): EconomyState {
  const unlockedWeapons = migrateUnlockedWeaponIds(storage.unlockedWeapons);
  const pendingActions: Record<string, PendingEconomyAction> = {};
  const completedActions: Record<string, PendingEconomyAction> = {};
  const cancelledActions: Record<string, PendingEconomyAction> = {};
  if (storage.pendingActions && typeof storage.pendingActions === 'object') {
    for (const [id, raw] of Object.entries(storage.pendingActions)) {
      if (!raw || typeof raw !== 'object') continue;
      const candidate = raw as Partial<PendingEconomyAction>;
      if (
        typeof candidate.id === 'string'
        && candidate.action
        && typeof candidate.requiredAds === 'number'
        && typeof candidate.completedAds === 'number'
        && typeof candidate.reservedKurus === 'number'
        && typeof candidate.startedAt === 'number'
      ) {
        const requiredAds = Math.max(0, Math.floor(candidate.requiredAds));
        const reservedKurus = Math.max(0, Math.floor(candidate.reservedKurus));
        const remainingAds = typeof candidate.remainingAds === 'number'
          ? Math.max(0, Math.floor(candidate.remainingAds))
          : Math.max(0, requiredAds - Math.floor(reservedKurus / SIMULATED_AD_REWARD_CENTS));
        pendingActions[id] = {
          id: candidate.id,
          action: candidate.action,
          requiredAds,
          remainingAds,
          completedAds: Math.max(0, Math.floor(candidate.completedAds)),
          reservedKurus,
          startedAt: candidate.startedAt,
          vip: candidate.vip === true,
          ...(typeof candidate.vipExpiresAt === 'number' || candidate.vipExpiresAt === null
            ? { vipExpiresAt: candidate.vipExpiresAt }
            : {}),
          ...(candidate.alreadySatisfied === true ? { alreadySatisfied: true } : {}),
          ...(typeof candidate.matchId === 'string' ? { matchId: candidate.matchId } : {}),
          ...(typeof candidate.dayKey === 'string' ? { dayKey: candidate.dayKey } : {}),
        };
      }
    }
  }
  const normalizeActionHistory = (
    value: unknown,
    destination: Record<string, PendingEconomyAction>,
  ) => {
    if (!value || typeof value !== 'object') return;
    for (const [id, raw] of Object.entries(value)) {
      if (!raw || typeof raw !== 'object') continue;
      const candidate = raw as Partial<PendingEconomyAction>;
      if (
        typeof candidate.id !== 'string'
        || !candidate.action
        || typeof candidate.requiredAds !== 'number'
        || typeof candidate.completedAds !== 'number'
        || typeof candidate.reservedKurus !== 'number'
        || typeof candidate.startedAt !== 'number'
      ) continue;
      const requiredAds = Math.max(0, Math.floor(candidate.requiredAds));
      const reservedKurus = Math.max(0, Math.floor(candidate.reservedKurus));
      destination[id] = {
        id: candidate.id,
        action: candidate.action,
        requiredAds,
        remainingAds: typeof candidate.remainingAds === 'number'
          ? Math.max(0, Math.floor(candidate.remainingAds))
          : Math.max(0, requiredAds - Math.floor(reservedKurus / SIMULATED_AD_REWARD_CENTS)),
        completedAds: Math.max(0, Math.floor(candidate.completedAds)),
        reservedKurus,
        startedAt: candidate.startedAt,
        vip: candidate.vip === true,
        ...(typeof candidate.vipExpiresAt === 'number' || candidate.vipExpiresAt === null
          ? { vipExpiresAt: candidate.vipExpiresAt }
          : {}),
        ...(candidate.alreadySatisfied === true ? { alreadySatisfied: true } : {}),
        ...(typeof candidate.matchId === 'string' ? { matchId: candidate.matchId } : {}),
        ...(typeof candidate.dayKey === 'string' ? { dayKey: candidate.dayKey } : {}),
      };
    }
  };
  normalizeActionHistory((storage as LegacyEconomyStorage).completedActions, completedActions);
  normalizeActionHistory((storage as LegacyEconomyStorage).cancelledActions, cancelledActions);
  return {
    creditCents: migrateCreditKurus(storage),
    unlockedWeapons,
    weaponUnlocks: migrateLegacyWeaponUnlocks(
      storage.unlockedWeapons,
      storage.weaponUnlocks,
      now,
    ),
    pendingActions,
    completedActions,
    cancelledActions,
    soloAccessDay: typeof storage.soloAccessDay === 'string' ? storage.soloAccessDay : null,
    teamMatchIds: Array.isArray(storage.teamMatchIds)
      ? storage.teamMatchIds.filter((value): value is string => typeof value === 'string')
      : [],
  };
}

export const isKnownWeaponForEconomy = (value: unknown): value is WeaponId =>
  isWeaponId(value);