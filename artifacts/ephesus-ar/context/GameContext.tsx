import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { normalizeLocale, type Locale } from '@/lib/i18n';
import { migrateWeaponId, type WeaponId } from '@/lib/weapons';
import {
  AMMO_REFILL_COST_CENTS,
  CENTS_PER_LEGACY_CREDIT,
  DEFAULT_CREDIT_CENTS,
  GENERIC_ACTION_COST_CENTS,
  KNIFE_USE_COST_CENTS,
  isWeaponUnlocked,
  migrateCreditCents,
  migrateLegacyWeaponUnlocks,
  migrateUnlockedWeaponIds,
  normalizeEconomyState,
  restorePendingActions,
  refundCents,
  spendCents,
  beginAction as beginEconomyAction,
  cancelAction as cancelEconomyAction,
  commitAction as commitEconomyAction,
  recordActionAd,
  type EconomyState,
  type ActionProgressResult,
  type ActionCommitResult,
  type BeginActionOptions,
  type BeginActionResult,
  type EconomyAction,
  type PendingEconomyAction,
  type WeaponUnlocks,
} from '@/lib/economy';
import {
  DEFAULT_VISION_UNLOCKS,
  isUnlockableVisionMode,
  type UnlockableVisionMode,
  type VisionMode,
  type VisionUnlocks,
} from '@/lib/vision-modes';
import {
  commerceAdapter,
  createSimulationTransactionId,
  DEFAULT_COMMERCE_LEDGER,
  normalizeCommerceLedger,
  type CommerceLedger,
  type CreditPackageId,
} from '@/lib/commerce';

export type CountryCode = 'TR' | 'DE' | 'UA' | 'US';
export type LanguageCode = Locale;

type PersistedState = {
  onboarded?: boolean;
  language?: string;
  country?: CountryCode;
  creditCents?: number;
  creditKurus?: number;
  unlockedWeapons?: unknown;
  weaponUnlocks?: unknown;
  /** Legacy persisted balance; read only by migrateCreditCents. */
  credits?: number;
  ammo?: number;
  adTokens?: number;
  selectedWeapon?: string;
  // Legacy soundEnabled values are intentionally ignored; app audio is always enabled.
  visionUnlocks?: Partial<VisionUnlocks>;
  commerce?: unknown;
  simulationSnapshot?: unknown;
  pendingActions?: unknown;
  completedActions?: unknown;
  cancelledActions?: unknown;
  soloAccessDay?: unknown;
  teamMatchIds?: unknown;
};

type GameState = {
  onboarded: boolean;
  language: LanguageCode;
  country: CountryCode;
  creditCents: number;
  unlockedWeapons: WeaponId[];
  weaponUnlocks: WeaponUnlocks;
  ammo: number;
  adTokens: number;
  selectedWeapon: WeaponId;
  visionUnlocks: VisionUnlocks;
  commerce: CommerceLedger;
  simulationSnapshot: SimulationSnapshot | null;
  pendingActions: Record<string, PendingEconomyAction>;
  completedActions: Record<string, PendingEconomyAction>;
  cancelledActions: Record<string, PendingEconomyAction>;
  soloAccessDay: string | null;
  teamMatchIds: string[];
};

type SimulationSnapshot = Pick<GameState, 'creditCents' | 'unlockedWeapons' | 'weaponUnlocks' | 'commerce'>;

function normalizeSimulationSnapshot(value: unknown): SimulationSnapshot | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<SimulationSnapshot>;
  if (typeof candidate.creditCents !== 'number' || !Number.isFinite(candidate.creditCents)) return null;
  return {
    creditCents: Math.max(0, Math.floor(candidate.creditCents)),
    unlockedWeapons: migrateUnlockedWeaponIds(candidate.unlockedWeapons),
    weaponUnlocks: migrateLegacyWeaponUnlocks(
      candidate.unlockedWeapons,
      (candidate as Partial<GameState>).weaponUnlocks,
    ),
    commerce: normalizeCommerceLedger(candidate.commerce),
  };
}

function normalizePendingActions(value: unknown): Record<string, PendingEconomyAction> {
  return normalizeEconomyState({
    pendingActions: value,
    creditCents: 0,
    unlockedWeapons: [],
  }).pendingActions ?? {};
}

export type EconomyActionResult = {
  ok: boolean;
  message: string;
};
type CommerceActionResult = { ok: boolean; duplicate?: boolean; message: string };

type GameContextValue = {
  ready: boolean;
  onboarded: boolean;
  language: LanguageCode;
  country: CountryCode;
  /** Authoritative balance, always in cents. */
  creditCents: number;
  /** Canonical integer kurus alias for new panels. */
  creditKurus: number;
  /** Display-only legacy unit (creditCents / 10), never persisted or mutated. */
  credits: number;
  unlockedWeapons: readonly WeaponId[];
  weaponUnlocks: WeaponUnlocks;
  ammo: number;
  adTokens: number;
  selectedWeapon: WeaponId;
  visionUnlocks: VisionUnlocks;
  commerceMode: 'simulation' | 'real';
  activeGold: boolean;
  goldExpiresAt: number | null;
  isGoldActive: (now?: number) => boolean;
  purchaseGold: (transactionId?: string) => CommerceActionResult;
  purchaseCredits: (packageId: CreditPackageId, transactionId?: string) => CommerceActionResult;
  cancelGold: () => void;
  resetCommerceSimulation: () => void;
  restoreCommerceSimulation: () => void;
  setSelectedWeapon: (id: WeaponId) => void;
  setOnboarded: (value: boolean) => void;
  setLanguage: (value: LanguageCode) => void;
  setCountry: (value: CountryCode) => void;
  isWeaponUnlocked: (id: WeaponId) => boolean;
  unlockWeaponFromAd: (id: WeaponId) => EconomyActionResult;
  unlockWeaponWithCredits: (id: WeaponId) => EconomyActionResult;
  spendCents: (amountCents: number) => EconomyActionResult;
  refundCents: (amountCents: number) => EconomyActionResult;
  spendGenericAction: () => EconomyActionResult;
  refundGenericAction: () => EconomyActionResult;
  spendAmmoCredits: () => EconomyActionResult;
  refundAmmoCredits: () => EconomyActionResult;
  spendKnifeCredits: () => EconomyActionResult;
  refundKnifeCredits: () => EconomyActionResult;
  spendAmmo: () => void;
  refillAmmo: () => void;
  watchAd: () => void;
  isVisionModeUnlocked: (mode: VisionMode, now?: number) => boolean;
  unlockVisionModeWithCredits: (mode: UnlockableVisionMode) => { ok: boolean; message: string };
  grantVisionModeFromAd: (mode: UnlockableVisionMode) => void;
  beginAction: (action: EconomyAction, options?: BeginActionOptions) => BeginActionResult;
  recordAdClick: (transactionId: string) => ActionProgressResult;
  commitAction: (transactionId: string, now?: number) => ActionCommitResult;
  cancelAction: (transactionId: string) => ActionCommitResult;
  pendingActions: Readonly<Record<string, PendingEconomyAction>>;
};

const defaults: GameState = {
  onboarded: false,
  language: 'tr',
  country: 'TR',
  creditCents: DEFAULT_CREDIT_CENTS,
  unlockedWeapons: [],
  weaponUnlocks: {},
  ammo: 12,
  adTokens: 3,
  selectedWeapon: 'glock-17',
  visionUnlocks: DEFAULT_VISION_UNLOCKS,
  commerce: DEFAULT_COMMERCE_LEDGER,
  simulationSnapshot: null,
  pendingActions: {},
  completedActions: {},
  cancelledActions: {},
  soloAccessDay: null,
  teamMatchIds: [],
};

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GameState>(defaults);
  const [ready, setReady] = useState(false);
  const [clock, setClock] = useState(() => Date.now());
  const stateRef = useRef(state);
  const legacyGateSequenceRef = useRef(0);
  const commerceRestoreRef = useRef<SimulationSnapshot>({
    creditCents: defaults.creditCents,
    unlockedWeapons: defaults.unlockedWeapons,
    weaponUnlocks: defaults.weaponUnlocks,
    commerce: defaults.commerce,
  });
  // React state updates are batched. Keep a synchronous snapshot for
  // transactions triggered twice before the next render.
  stateRef.current = state;
  const commitState = useCallback((next: GameState) => {
    stateRef.current = next;
    setState(next);
  }, []);
  const updateState = useCallback((patch: Partial<GameState>) => {
    commitState({ ...stateRef.current, ...patch });
  }, [commitState]);
  const setOnboarded = useCallback((onboarded: boolean) => updateState({ onboarded }), [updateState]);
  const setLanguage = useCallback((language: LanguageCode) => updateState({ language }), [updateState]);
  const setCountry = useCallback((country: CountryCode) => updateState({ country }), [updateState]);

  useEffect(() => {
    AsyncStorage.getItem('ephesus-ar-state')
      .then((raw) => {
        if (raw) {
          try {
            const persisted = JSON.parse(raw) as PersistedState;
            const unlockedWeapons = migrateUnlockedWeaponIds(persisted.unlockedWeapons);
            const weaponUnlocks = migrateLegacyWeaponUnlocks(
              persisted.unlockedWeapons,
              persisted.weaponUnlocks,
            );
            const migratedSelection = migrateWeaponId(persisted.selectedWeapon);
            const selectedWeapon = migratedSelection && isWeaponUnlocked(
              migratedSelection,
              unlockedWeapons,
              Date.now(),
              weaponUnlocks,
            )
              ? migratedSelection
              : defaults.selectedWeapon;
            const hydratedState: GameState = {
              onboarded: persisted.onboarded ?? defaults.onboarded,
               language: normalizeLocale(typeof persisted.language === 'string' ? persisted.language : defaults.language),
              country: persisted.country ?? defaults.country,
              creditCents: migrateCreditCents({
                creditCents: persisted.creditCents,
                creditKurus: persisted.creditKurus,
                credits: persisted.credits,
              }),
              unlockedWeapons,
              weaponUnlocks,
              ammo: persisted.ammo ?? defaults.ammo,
              adTokens: persisted.adTokens ?? defaults.adTokens,
              selectedWeapon,
              visionUnlocks: {
                nightVision: Number.isFinite(persisted.visionUnlocks?.nightVision) ? Math.max(0, persisted.visionUnlocks?.nightVision ?? 0) : 0,
                thermal: Number.isFinite(persisted.visionUnlocks?.thermal) ? Math.max(0, persisted.visionUnlocks?.thermal ?? 0) : 0,
              },
              commerce: normalizeCommerceLedger(persisted.commerce),
              simulationSnapshot: normalizeSimulationSnapshot(persisted.simulationSnapshot),
              pendingActions: normalizePendingActions(persisted.pendingActions),
              completedActions: normalizePendingActions(persisted.completedActions),
              cancelledActions: normalizePendingActions(persisted.cancelledActions),
              soloAccessDay: typeof persisted.soloAccessDay === 'string' ? persisted.soloAccessDay : null,
              teamMatchIds: Array.isArray(persisted.teamMatchIds)
                ? persisted.teamMatchIds.filter((value): value is string => typeof value === 'string')
                : [],
            };
            const restoredEconomy = restorePendingActions(hydratedState);
            const nextState: GameState = {
              ...hydratedState,
              creditCents: restoredEconomy.creditCents,
              pendingActions: restoredEconomy.pendingActions ?? {},
              cancelledActions: restoredEconomy.cancelledActions ?? {},
            };
            stateRef.current = nextState;
            commerceRestoreRef.current = nextState.simulationSnapshot ?? {
              creditCents: nextState.creditCents,
              unlockedWeapons: nextState.unlockedWeapons,
              weaponUnlocks: nextState.weaponUnlocks,
              commerce: nextState.commerce,
            };
            setState(nextState);
            } catch (error) {
             console.error('Failed to restore simulated economy state.', error);
            stateRef.current = defaults;
            commerceRestoreRef.current = {
              creditCents: defaults.creditCents,
              unlockedWeapons: defaults.unlockedWeapons,
              weaponUnlocks: defaults.weaponUnlocks,
              commerce: defaults.commerce,
            };
            setState(defaults);
          }
        }
      })
      .catch((error) => {
        console.error('Failed to read simulated economy state.', error);
        stateRef.current = defaults;
        commerceRestoreRef.current = {
          creditCents: defaults.creditCents,
          unlockedWeapons: defaults.unlockedWeapons,
          weaponUnlocks: defaults.weaponUnlocks,
          commerce: defaults.commerce,
        };
        setState(defaults);
      })
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 1_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const entitlement = commerceAdapter.getEntitlements(state.commerce, clock);
    if (
      ready
      && !entitlement.allProAccess
      && state.selectedWeapon !== defaults.selectedWeapon
      && !isWeaponUnlocked(state.selectedWeapon, state.unlockedWeapons, clock, state.weaponUnlocks)
    ) {
      const nextState = { ...state, selectedWeapon: defaults.selectedWeapon };
      stateRef.current = nextState;
      setState(nextState);
    }
  }, [clock, ready, state]);

  useEffect(() => {
    if (ready) {
      // Keep the legacy key for older builds while writing the canonical
      // integer-kurus alias for current builds.
      AsyncStorage.setItem(
        'ephesus-ar-state',
        JSON.stringify({ ...state, creditKurus: state.creditCents }),
      ).catch((error) => {
        console.error('Failed to persist simulated economy state.', error);
      });
    }
  }, [ready, state]);

  const value = useMemo<GameContextValue>(() => {
    const commit = (next: GameState) => {
      stateRef.current = next;
      setState(next);
    };
    const update = (patch: Partial<GameState>) => {
      const next = { ...stateRef.current, ...patch };
      commit(next);
    };
    const economyState = (current: GameState): EconomyState => ({
      creditCents: current.creditCents,
      unlockedWeapons: current.unlockedWeapons,
      weaponUnlocks: current.weaponUnlocks,
      visionUnlocks: current.visionUnlocks,
      pendingActions: current.pendingActions,
      completedActions: current.completedActions,
      cancelledActions: current.cancelledActions,
      soloAccessDay: current.soloAccessDay,
      teamMatchIds: current.teamMatchIds,
    });
    const saveSimulationSnapshot = (current: GameState): SimulationSnapshot => {
      const snapshot = {
        creditCents: current.creditCents,
        unlockedWeapons: current.unlockedWeapons,
        weaponUnlocks: current.weaponUnlocks,
        commerce: current.commerce,
      };
      commerceRestoreRef.current = snapshot;
      return snapshot;
    };
    const resultWithoutState = (result: { ok: boolean; message: string }): EconomyActionResult => ({
      ok: result.ok,
      message: result.message,
    });
    const spend = (amountCents: number): EconomyActionResult => {
      const current = stateRef.current;
      const result = spendCents(economyState(current), amountCents);
      if (result.ok) commit({ ...current, ...result.state });
      return resultWithoutState(result);
    };
    const refund = (amountCents: number): EconomyActionResult => {
      const current = stateRef.current;
      const result = refundCents(economyState(current), amountCents);
      if (result.ok) commit({ ...current, ...result.state });
      return resultWithoutState(result);
    };
      const entitlements = commerceAdapter.getEntitlements(state.commerce, clock);
      const effectiveSelectedWeapon = !entitlements.allProAccess
        && !isWeaponUnlocked(state.selectedWeapon, state.unlockedWeapons, clock, state.weaponUnlocks)
        ? defaults.selectedWeapon
        : state.selectedWeapon;
      const isGoldActiveNow = (now = Date.now()) => commerceAdapter.getEntitlements(stateRef.current.commerce, now).activeGold;
      const purchaseGold = (transactionId = createSimulationTransactionId('gold', 'gold-monthly')): CommerceActionResult => {
        const current = stateRef.current;
        const prepared = { ...current, simulationSnapshot: saveSimulationSnapshot(current) };
        const result = commerceAdapter.purchaseGold(prepared, transactionId, Date.now());
        if (result.ok && result.state !== current) commit(result.state);
        return { ok: result.ok, duplicate: result.duplicate, message: result.message };
      };
      const purchaseCredits = (
        packageId: CreditPackageId,
        transactionId = createSimulationTransactionId('credits', packageId),
      ): CommerceActionResult => {
        const current = stateRef.current;
        const prepared = { ...current, simulationSnapshot: saveSimulationSnapshot(current) };
        const result = commerceAdapter.purchaseCredits(prepared, packageId, transactionId, Date.now());
        if (result.ok && result.state !== current) commit(result.state);
        return { ok: result.ok, duplicate: result.duplicate, message: result.message };
      };
      const beginAction = (
        action: EconomyAction,
        options: BeginActionOptions = {},
      ): BeginActionResult => {
        const current = stateRef.current;
        const now = options.now ?? Date.now();
        const result = beginEconomyAction(economyState(current), action, {
          ...options,
          now,
          // VIP is always derived from the current local entitlement. A
          // caller cannot turn a non-VIP account into a bypass by setting an
          // option manually.
          vip: isGoldActiveNow(now),
          vipExpiresAt: current.commerce.goldExpiresAt,
        });
        if (result.ok) commit({ ...current, ...result.state });
        return result;
      };
      const recordAdClick = (transactionId: string): ActionProgressResult => {
        const current = stateRef.current;
        const result = recordActionAd(economyState(current), transactionId);
        if (result.ok && result.state !== economyState(current)) commit({ ...current, ...result.state });
        return result;
      };
      const commitAction = (transactionId: string, now = Date.now()): ActionCommitResult => {
        const current = stateRef.current;
        const result = commitEconomyAction(economyState(current), transactionId, now);
        if (result.ok) commit({ ...current, ...result.state });
        return result;
      };
      const cancelAction = (transactionId: string): ActionCommitResult => {
        const current = stateRef.current;
        const result = cancelEconomyAction(economyState(current), transactionId);
        if (result.ok) commit({ ...current, ...result.state });
        return result;
      };
      /**
       * Compatibility boundary for older screens. These methods used to
       * grant directly; route them through the same reservation/progress/
       * commit gate so a legacy caller cannot mint a Pro unlock.
       */
      const runLegacyGate = (
        action: EconomyAction,
        creditOnly: boolean,
      ): EconomyActionResult => {
        const transactionId = `legacy-gate:${Date.now()}:${++legacyGateSequenceRef.current}`;
        const started = beginAction(action, { transactionId });
        if (!started.ok || !started.transaction) return resultWithoutState(started);
        if (started.remainingAds > 0) {
          if (creditOnly) {
            cancelAction(transactionId);
            return {
              ok: false,
              message: 'Bu işlem için yeterli Pro kredi yok.',
            };
          }
          const progress = recordAdClick(transactionId);
          if (!progress.ok || !progress.completed) {
            cancelAction(transactionId);
            return resultWithoutState(progress);
          }
        }
        const committed = commitAction(transactionId);
        return resultWithoutState(committed);
      };
    return {
      ...state,
        selectedWeapon: effectiveSelectedWeapon,
      ready,
      creditCents: state.creditCents,
      creditKurus: state.creditCents,
      credits: Math.floor(state.creditCents / CENTS_PER_LEGACY_CREDIT),
      unlockedWeapons: state.unlockedWeapons,
      weaponUnlocks: state.weaponUnlocks,
      pendingActions: state.pendingActions,
        commerceMode: commerceAdapter.mode,
        activeGold: entitlements.activeGold,
        goldExpiresAt: state.commerce.goldExpiresAt,
        isGoldActive: isGoldActiveNow,
        purchaseGold,
        purchaseCredits,
        cancelGold: () => {
          const current = stateRef.current;
          commit(commerceAdapter.cancelGold({
            ...current,
            simulationSnapshot: saveSimulationSnapshot(current),
          }));
        },
        resetCommerceSimulation: () => {
          const current = stateRef.current;
          commit(commerceAdapter.resetSimulation({
            ...current,
            simulationSnapshot: saveSimulationSnapshot(current),
          }));
        },
        restoreCommerceSimulation: () => {
          const current = stateRef.current;
          const restored = commerceAdapter.restoreSimulation({
            ...current,
            creditCents: commerceRestoreRef.current.creditCents,
            unlockedWeapons: [...commerceRestoreRef.current.unlockedWeapons],
            weaponUnlocks: { ...commerceRestoreRef.current.weaponUnlocks },
            commerce: commerceRestoreRef.current.commerce,
            simulationSnapshot: null,
          });
          commit(restored);
        },
      setSelectedWeapon: (selectedWeapon) => {
        const current = stateRef.current;
         if (
           commerceAdapter.getEntitlements(current.commerce).allProAccess
           || isWeaponUnlocked(selectedWeapon, current.unlockedWeapons, Date.now(), current.weaponUnlocks)
         ) update({ selectedWeapon });
      },
       setOnboarded,
       setLanguage,
       setCountry,
       isWeaponUnlocked: (id) => commerceAdapter.getEntitlements(stateRef.current.commerce).allProAccess
          || isWeaponUnlocked(id, stateRef.current.unlockedWeapons, Date.now(), stateRef.current.weaponUnlocks),
       unlockWeaponFromAd: (id) => runLegacyGate({ type: 'weapon', weaponId: id }, false),
       unlockWeaponWithCredits: (id) => runLegacyGate({ type: 'weapon', weaponId: id }, true),
        spendCents: (amountCents) => isGoldActiveNow()
          ? { ok: true, message: 'Gold simulation: no credit debit.' }
          : spend(amountCents),
       refundCents: refund,
        spendGenericAction: () => isGoldActiveNow() ? { ok: true, message: 'Gold simulation: no credit debit.' } : spend(GENERIC_ACTION_COST_CENTS),
       refundGenericAction: () => refund(GENERIC_ACTION_COST_CENTS),
        spendAmmoCredits: () => isGoldActiveNow() ? { ok: true, message: 'Gold simulation: no credit debit.' } : spend(AMMO_REFILL_COST_CENTS),
       refundAmmoCredits: () => refund(AMMO_REFILL_COST_CENTS),
        spendKnifeCredits: () => isGoldActiveNow() ? { ok: true, message: 'Gold simulation: no credit debit.' } : spend(KNIFE_USE_COST_CENTS),
       refundKnifeCredits: () => refund(KNIFE_USE_COST_CENTS),
       spendAmmo: () => {
         if (commerceAdapter.getEntitlements(stateRef.current.commerce).unlimitedAmmo) return;
         update({ ammo: Math.max(0, stateRef.current.ammo - 1) });
       },
      refillAmmo: () => update({ ammo: 12 }),
       watchAd: () => {
         if (commerceAdapter.getEntitlements(stateRef.current.commerce).adFree) return;
         update({ adTokens: Math.max(0, stateRef.current.adTokens - 1) });
       },
       isVisionModeUnlocked: (mode, now = Date.now()) => commerceAdapter.getEntitlements(stateRef.current.commerce, now).unlimitedVision
         || !isUnlockableVisionMode(mode)
         || stateRef.current.visionUnlocks[mode] > now,
      unlockVisionModeWithCredits: (mode) => {
         return runLegacyGate(mode, true);
      },
      grantVisionModeFromAd: (mode) => {
         runLegacyGate(mode, false);
      },
       beginAction,
       recordAdClick,
       commitAction,
       cancelAction,
    };
    }, [clock, ready, setCountry, setLanguage, setOnboarded, state]);

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used inside GameProvider');
  return context;
}