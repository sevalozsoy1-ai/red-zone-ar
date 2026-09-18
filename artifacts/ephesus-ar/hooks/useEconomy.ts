import { useGame } from '@/context/GameContext';
import {
  AMMO_REFILL_COST_CENTS,
  GENERIC_ACTION_COST_CENTS,
  KNIFE_USE_COST_CENTS,
  PRO_WEAPON_UNLOCK_COST_CENTS,
} from '@/lib/economy';
import type {
  ActionCommitResult,
  ActionProgressResult,
  BeginActionOptions,
  BeginActionResult,
  EconomyAction,
} from '@/lib/economy';

/**
 * Economy surface for combat-adjacent features. Debits are synchronous and
 * atomic, and no method here creates paid balance.
 */
export function useEconomy() {
  const game = useGame();
  return {
    creditCents: game.creditCents,
    creditKurus: game.creditKurus,
    credits: game.credits,
    spendCents: game.spendCents,
    refundCents: game.refundCents,
    spendGenericAction: game.spendGenericAction,
    refundGenericAction: game.refundGenericAction,
    spendAmmoCredits: game.spendAmmoCredits,
    refundAmmoCredits: game.refundAmmoCredits,
    spendKnifeCredits: game.spendKnifeCredits,
    refundKnifeCredits: game.refundKnifeCredits,
    prices: {
      actionKurus: GENERIC_ACTION_COST_CENTS,
      ammoRefillKurus: AMMO_REFILL_COST_CENTS,
      weaponUnlockKurus: PRO_WEAPON_UNLOCK_COST_CENTS,
      genericActionCents: GENERIC_ACTION_COST_CENTS,
      ammoRefillCents: AMMO_REFILL_COST_CENTS,
      knifeUseCents: KNIFE_USE_COST_CENTS,
      proWeaponUnlockCents: PRO_WEAPON_UNLOCK_COST_CENTS,
    },
    beginAction: (action: EconomyAction, options?: BeginActionOptions): BeginActionResult =>
      game.beginAction(action, options),
    recordAdClick: (transactionId: string): ActionProgressResult => game.recordAdClick(transactionId),
    commitAction: (transactionId: string, now?: number): ActionCommitResult => game.commitAction(transactionId, now),
    cancelAction: (transactionId: string): ActionCommitResult => game.cancelAction(transactionId),
    pendingActions: game.pendingActions,
  };
}