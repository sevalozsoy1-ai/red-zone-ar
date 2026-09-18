import {
  beginAction,
  cancelAction,
  commitAction,
  recordActionAd,
  type ActionCommitResult,
  type ActionEconomyState,
  type ActionProgressResult,
  type BeginActionOptions,
  type BeginActionResult,
  type EconomyAction,
} from './economy.ts';

/**
 * Commerce is simulation-only in this build. No card details, payment
 * provider, receipt, or real ad network is ever collected here.
 */
export const COMMERCE_MODE = 'simulation' as const;
export type CommerceMode = 'simulation' | 'real';

/**
 * VIP is $9.99 (999 USD cents) for one calendar month.
 */
export const GOLD_PLAN = {
  id: 'gold-monthly',
  priceCents: 999,
  currency: 'USD',
  billingPeriod: 'calendar-month',
  /** @deprecated A month is calendar based, not a fixed 30-day period. */
  durationDays: 30,
  durationMs: 30 * 24 * 60 * 60 * 1_000,
} as const;

export type CreditPackageId = 'credits-5-usd' | 'credits-15-usd';

export type CreditPackage = {
  id: CreditPackageId;
  priceCents: number;
  creditCents: number;
  displayDollars: number;
};

/** Simulation topups have exactly the full package value and no extra bonus. */
export const CREDIT_PACKAGES: readonly CreditPackage[] = [
  {
    id: 'credits-5-usd',
    priceCents: 499,
    creditCents: 500,
    displayDollars: 5,
  },
  {
    id: 'credits-15-usd',
    priceCents: 1499,
    creditCents: 1500,
    displayDollars: 15,
  },
];

export type CommerceTransaction = {
  productId: string;
  kind: 'gold' | 'credits';
  appliedAt: number;
};

export type CommerceLedger = {
  /** Expiry of simulated VIP; credits and weapon unlocks are separate. */
  goldExpiresAt: number | null;
  goldPurchasedAt: number | null;
  goldTransactionId: string | null;
  simulationTransactions: Record<string, CommerceTransaction>;
};

export type CommerceEntitlements = {
  activeGold: boolean;
  allProAccess: boolean;
  adFree: boolean;
  unlimitedAmmo: boolean;
  unlimitedKnife: boolean;
  unlimitedRefills: boolean;
  unlimitedVision: boolean;
  goldExpiresAt: number | null;
};

export type CommercePurchaseResult<TState> = {
  ok: boolean;
  duplicate: boolean;
  message: string;
  state: TState;
  grantedCents: number;
};

export type CommerceAdapter = {
  readonly mode: CommerceMode;
  readonly isSimulation: boolean;
  getEntitlements: (ledger: CommerceLedger, now?: number) => CommerceEntitlements;
  purchaseGold: <TState extends { commerce: CommerceLedger }>(
    state: TState,
    transactionId: string,
    now?: number,
  ) => CommercePurchaseResult<TState>;
  purchaseCredits: <TState extends { commerce: CommerceLedger; creditCents: number }>(
    state: TState,
    packageId: CreditPackageId,
    transactionId: string,
    now?: number,
  ) => CommercePurchaseResult<TState>;
  cancelGold: <TState extends { commerce: CommerceLedger }>(state: TState) => TState;
  resetSimulation: <TState extends { commerce: CommerceLedger }>(state: TState) => TState;
  restoreSimulation: <TState extends { commerce: CommerceLedger }>(state: TState) => TState;
  showRewardedAd: (activeGold: boolean) => { ok: boolean; bypassed: boolean; message: string };
};

export const DEFAULT_COMMERCE_LEDGER: CommerceLedger = {
  goldExpiresAt: null,
  goldPurchasedAt: null,
  goldTransactionId: null,
  simulationTransactions: {},
};

export function normalizeCommerceLedger(value: unknown): CommerceLedger {
  if (!value || typeof value !== 'object') {
    return { ...DEFAULT_COMMERCE_LEDGER, simulationTransactions: {} };
  }
  const candidate = value as Partial<CommerceLedger>;
  const expiresAt = typeof candidate.goldExpiresAt === 'number' && Number.isFinite(candidate.goldExpiresAt)
    ? candidate.goldExpiresAt
    : null;
  const purchasedAt = typeof candidate.goldPurchasedAt === 'number' && Number.isFinite(candidate.goldPurchasedAt)
    ? candidate.goldPurchasedAt
    : null;
  const transactions: Record<string, CommerceTransaction> = {};
  if (candidate.simulationTransactions && typeof candidate.simulationTransactions === 'object') {
    for (const [id, raw] of Object.entries(candidate.simulationTransactions)) {
      if (!raw || typeof raw !== 'object') continue;
      const transaction = raw as Partial<CommerceTransaction>;
      if (
        typeof transaction.productId === 'string'
        && (transaction.kind === 'gold' || transaction.kind === 'credits')
        && typeof transaction.appliedAt === 'number'
        && Number.isFinite(transaction.appliedAt)
      ) {
        transactions[id] = {
          productId: transaction.productId,
          kind: transaction.kind,
          appliedAt: transaction.appliedAt,
        };
      }
    }
  }
  return {
    goldExpiresAt: expiresAt,
    goldPurchasedAt: purchasedAt,
    goldTransactionId: typeof candidate.goldTransactionId === 'string' ? candidate.goldTransactionId : null,
    simulationTransactions: transactions,
  };
}

export function isGoldActive(goldExpiresAt: number | null | undefined, now = Date.now()): boolean {
  return typeof goldExpiresAt === 'number'
    && Number.isFinite(goldExpiresAt)
    && goldExpiresAt > now;
}

export function getCommerceEntitlements(
  ledger: CommerceLedger,
  now = Date.now(),
): CommerceEntitlements {
  const activeGold = isGoldActive(ledger.goldExpiresAt, now);
  return {
    activeGold,
    allProAccess: activeGold,
    adFree: activeGold,
    unlimitedAmmo: activeGold,
    unlimitedKnife: activeGold,
    unlimitedRefills: activeGold,
    unlimitedVision: activeGold,
    goldExpiresAt: ledger.goldExpiresAt,
  };
}

function transactionIdOrFail(transactionId: string): string | null {
  const value = transactionId.trim();
  return value.length > 0 ? value : null;
}

function withTransaction(
  ledger: CommerceLedger,
  transactionId: string,
  transaction: CommerceTransaction,
): CommerceLedger {
  return {
    ...ledger,
    simulationTransactions: {
      ...ledger.simulationTransactions,
      [transactionId]: transaction,
    },
  };
}

function packageForId(packageId: CreditPackageId): CreditPackage | undefined {
  return CREDIT_PACKAGES.find((item) => item.id === packageId);
}

/** Add one calendar month while clamping dates such as January 31 to February 28/29. */
export function addCalendarMonthClamped(timestamp: number): number {
  const source = new Date(timestamp);
  const year = source.getFullYear();
  const month = source.getMonth();
  const day = source.getDate();
  const target = new Date(
    year,
    month + 1,
    1,
    source.getHours(),
    source.getMinutes(),
    source.getSeconds(),
    source.getMilliseconds(),
  );
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, lastDay));
  return target.getTime();
}

/**
 * Apply the one-time simulated VIP grant. Replaying an idempotency key returns
 * the exact same object and never extends the entitlement twice.
 */
export function simulateGoldPurchase<TState extends { commerce: CommerceLedger }>(
  state: TState,
  transactionId: string,
  now = Date.now(),
): CommercePurchaseResult<TState> {
  const id = transactionIdOrFail(transactionId);
  if (!id) {
    return {
      ok: false,
      duplicate: false,
      message: 'Bir simülasyon işlem kimliği gerekir.',
      state,
      grantedCents: 0,
    };
  }
  const existing = state.commerce.simulationTransactions[id];
  if (existing) {
    if (existing.kind !== 'gold' || existing.productId !== GOLD_PLAN.id) {
      return {
        ok: false,
        duplicate: true,
        message: 'Bu simülasyon işlem kimliği zaten kullanıldı.',
        state,
        grantedCents: 0,
      };
    }
    return {
      ok: true,
      duplicate: true,
      message: 'Bu simüle VIP işlemi zaten uygulandı.',
      state,
      grantedCents: 0,
    };
  }
  const nextLedger = withTransaction(state.commerce, id, {
    kind: 'gold',
    productId: GOLD_PLAN.id,
    appliedAt: now,
  });
  const currentExpiry = isGoldActive(state.commerce.goldExpiresAt, now)
    ? state.commerce.goldExpiresAt ?? now
    : now;
  const nextState = {
    ...state,
    commerce: {
      ...nextLedger,
      goldPurchasedAt: now,
      goldTransactionId: id,
      goldExpiresAt: addCalendarMonthClamped(currentExpiry),
    },
  };
  return {
    ok: true,
    duplicate: false,
    message: 'Simüle VIP bir takvim ayı için etkinleştirildi. Gerçek ücret alınmadı.',
    state: nextState,
    grantedCents: 0,
  };
}

/**
 * Apply a simulated credit-card top-up as one integer-USD-cent transaction.
 * This function intentionally does not accept card data or call a provider.
 */
export function simulateCreditPurchase<TState extends { commerce: CommerceLedger; creditCents: number }>(
  state: TState,
  packageId: CreditPackageId,
  transactionId: string,
  now = Date.now(),
): CommercePurchaseResult<TState> {
  const id = transactionIdOrFail(transactionId);
  const pack = packageForId(packageId);
  if (!id || !pack) {
    return {
      ok: false,
      duplicate: false,
      message: 'Geçerli bir simülasyon paketi ve işlem kimliği gerekir.',
      state,
      grantedCents: 0,
    };
  }
  const existing = state.commerce.simulationTransactions[id];
  if (existing) {
    if (existing.kind !== 'credits' || existing.productId !== pack.id) {
      return {
        ok: false,
        duplicate: true,
        message: 'Bu simülasyon işlem kimliği zaten kullanıldı.',
        state,
        grantedCents: 0,
      };
    }
    return {
      ok: true,
      duplicate: true,
      message: 'Bu simüle USD kredi yüklemesi zaten uygulandı.',
      state,
      grantedCents: 0,
    };
  }
  const nextState = {
    ...state,
    creditCents: Math.max(0, Math.floor(state.creditCents)) + pack.creditCents,
    commerce: withTransaction(state.commerce, id, {
      kind: 'credits',
      productId: pack.id,
      appliedAt: now,
    }),
  };
  return {
    ok: true,
    duplicate: false,
    message: `$${(pack.creditCents / 100).toFixed(2)} USD kredi simülasyonda eklendi. Gerçek ücret alınmadı.`,
    state: nextState,
    grantedCents: pack.creditCents,
  };
}

export const simulateCreditCardPurchase = simulateCreditPurchase;

export function createSimulationTransactionId(kind: 'gold' | 'credits', productId: string): string {
  return `${kind}:${productId}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Re-export the shared gate API from the commerce boundary as well as
 * economy.ts. This keeps UI panels independent of the state implementation.
 */
export {
  beginAction,
  recordActionAd,
  recordActionAd as recordAdClick,
  commitAction,
  cancelAction,
};
export type {
  ActionCommitResult,
  ActionEconomyState,
  ActionProgressResult,
  BeginActionOptions,
  BeginActionResult,
  EconomyAction,
};

export function createCommerceAdapter(mode: CommerceMode = COMMERCE_MODE): CommerceAdapter {
  if (mode === 'simulation') {
    return {
      mode,
      isSimulation: true,
      getEntitlements: getCommerceEntitlements,
      purchaseGold: simulateGoldPurchase,
      purchaseCredits: simulateCreditPurchase,
      cancelGold: (state) => ({
        ...state,
        commerce: {
          ...state.commerce,
          goldExpiresAt: null,
        },
      }),
      resetSimulation: (state) => ({
        ...state,
        commerce: DEFAULT_COMMERCE_LEDGER,
      }),
      restoreSimulation: (state) => state,
      showRewardedAd: (activeGold) => activeGold
        ? { ok: true, bypassed: true, message: 'VIP reklamsız erişimi simüle edilen reklamı atlattı.' }
        : { ok: true, bypassed: false, message: 'Simüle edilen reklam tamamlandı.' },
    };
  }

  const fail = <TState>(state: TState): CommercePurchaseResult<TState> => ({
    ok: false,
    duplicate: false,
    message: 'Doğrulanmış sağlayıcı kurulana kadar gerçek ticaret devre dışıdır.',
    state,
    grantedCents: 0,
  });
  return {
    mode,
    isSimulation: false,
    getEntitlements: getCommerceEntitlements,
    purchaseGold: fail,
    purchaseCredits: fail,
    cancelGold: (state) => state,
    resetSimulation: (state) => state,
    restoreSimulation: (state) => state,
    showRewardedAd: () => ({
      ok: false,
      bypassed: false,
      message: 'Doğrulanmış reklam sağlayıcısı kurulana kadar gerçek reklamlar devre dışıdır.',
    }),
  };
}

export const commerceAdapter = createCommerceAdapter();