import { useCallback, useEffect, useRef, useState } from 'react';
import { useGame } from '@/context/GameContext';
import type { EconomyAction, PendingEconomyAction } from '@/lib/economy';
import { GATE_UNITS, REWARDED_AD_VALUE_CENTS } from '@/lib/economy-ui';

export type EconomyGateResult = {
  ok: boolean;
  message?: string;
};

export type UseEconomyGateOptions = {
  visible: boolean;
  action: EconomyAction;
  matchId?: string;
  /**
   * The economy engine computes the local day for soloEntry. This flag only
   * controls the explanatory copy in the reusable surface.
   */
  daily?: boolean;
  onApproved: () => EconomyGateResult | boolean | Promise<EconomyGateResult | boolean>;
  onComplete?: () => void;
  onCancel?: () => void;
};

type GatePhase = 'idle' | 'charging' | 'ads' | 'approving' | 'complete' | 'error';

function asResult(value: EconomyGateResult | boolean | undefined): EconomyGateResult {
  if (typeof value === 'boolean') return { ok: value };
  return value ?? { ok: true };
}

/**
 * Reserves whole rewarded-ad units from the current credit balance before
 * asking for simulated ads. Credit reservations are synchronously refundable
 * on cancel or failed approval. Ad completion is always an explicit tap and
 * is never represented by a timer.
 */
export function useEconomyGate({
  visible,
  action,
  matchId,
  daily = false,
  onApproved,
  onComplete,
  onCancel,
}: UseEconomyGateOptions) {
  const game = useGame();
  const beginActionRef = useRef(game.beginAction);
  const recordAdClickRef = useRef(game.recordAdClick);
  const commitActionRef = useRef(game.commitAction);
  const cancelActionRef = useRef(game.cancelAction);
  beginActionRef.current = game.beginAction;
  recordAdClickRef.current = game.recordAdClick;
  commitActionRef.current = game.commitAction;
  cancelActionRef.current = game.cancelAction;
  const actionRef = useRef(action);
  actionRef.current = action;
  const [phase, setPhase] = useState<GatePhase>('idle');
  const [creditSpentCents, setCreditSpentCents] = useState(0);
  const [adsCompleted, setAdsCompleted] = useState(0);
  const [adsRequired, setAdsRequired] = useState(GATE_UNITS);
  const [error, setError] = useState('');
  const [dailyBypass, setDailyBypass] = useState(false);
  const [transaction, setTransaction] = useState<PendingEconomyAction | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const transactionRef = useRef(0);
  const transactionIdRef = useRef('');
  const openingKeyRef = useRef('');
  const completedKeyRef = useRef('');
  const cleanupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const approvedRef = useRef(false);
  const cancelledRef = useRef(false);
  const onApprovedRef = useRef(onApproved);
  onApprovedRef.current = onApproved;
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const totalUnits = typeof action === 'string' && (action === 'soloEntry' || action === 'teamEntry')
    ? GATE_UNITS
    : 1;
  const actionKey = typeof action === 'string' ? action : `weapon:${action.weaponId}`;
  const gateKey = `${actionKey}:${matchId ?? ''}:${daily ? 'daily' : 'standard'}`;
  const reservedUnits = Math.floor(creditSpentCents / REWARDED_AD_VALUE_CENTS);
  const scheduleUnmountCleanup = () => {
    const transactionId = transactionIdRef.current;
    if (!transactionId) return;
    cleanupTimerRef.current = setTimeout(() => {
      if (transactionIdRef.current === transactionId && phaseRef.current !== 'complete') {
        cancelActionRef.current(transactionId);
        transactionIdRef.current = '';
      }
    }, 0);
  };

  const approve = useCallback(async (transaction: number) => {
    if (transaction !== transactionRef.current || approvedRef.current || cancelledRef.current) return;
    approvedRef.current = true;
    setPhase('approving');
    try {
      const result = asResult(await onApprovedRef.current());
      if (transaction !== transactionRef.current || cancelledRef.current) return;
      if (!result.ok) {
        approvedRef.current = false;
        if (transactionIdRef.current) cancelActionRef.current(transactionIdRef.current);
        setError(result.message ?? '');
        setPhase('error');
        return;
      }
      if (!transactionIdRef.current) {
        setPhase('error');
        return;
      }
      const committed = commitActionRef.current(transactionIdRef.current);
      if (!committed.ok) {
        approvedRef.current = false;
        cancelActionRef.current(transactionIdRef.current);
        setError(committed.message);
        setPhase('error');
        return;
      }
      setPhase('complete');
      completedKeyRef.current = openingKeyRef.current;
      transactionIdRef.current = '';
      onCompleteRef.current?.();
    } catch {
      approvedRef.current = false;
      if (transactionIdRef.current) cancelActionRef.current(transactionIdRef.current);
      setError('');
      setPhase('error');
    }
  }, []);

  useEffect(() => {
    if (cleanupTimerRef.current) {
      clearTimeout(cleanupTimerRef.current);
      cleanupTimerRef.current = null;
    }
    if (!visible) {
      if (phase !== 'idle' && phase !== 'complete' && transactionIdRef.current) {
        cancelActionRef.current(transactionIdRef.current);
      }
      transactionRef.current += 1;
      approvedRef.current = false;
      cancelledRef.current = false;
      setPhase('idle');
      setAdsCompleted(0);
      setAdsRequired(totalUnits);
      setCreditSpentCents(0);
      setTransaction(null);
      setError('');
      setDailyBypass(false);
      openingKeyRef.current = '';
      completedKeyRef.current = '';
      return;
    }
    const openingKey = `${gateKey}:${retryNonce}`;
    // React development replay can invoke an effect twice. Do not reserve
    // credits or create a second transaction for the same visible gate.
    if (
      openingKeyRef.current === openingKey
      && (Boolean(transactionIdRef.current) || completedKeyRef.current === openingKey)
    ) return scheduleUnmountCleanup;
    openingKeyRef.current = openingKey;
    completedKeyRef.current = '';
    const transaction = ++transactionRef.current;
    cancelledRef.current = false;
    approvedRef.current = false;
    transactionIdRef.current = `${actionKey}:${Date.now()}:${transaction}`;
    setCreditSpentCents(0);
    setAdsCompleted(0);
    setAdsRequired(totalUnits);
    setTransaction(null);
    setError('');
    setPhase('charging');

    const result = beginActionRef.current(actionRef.current, {
      transactionId: transactionIdRef.current,
      idempotencyKey: transactionIdRef.current,
      matchId,
    });
    if (!result.ok || !result.transaction) {
      setError(result.message);
      setPhase('error');
      return;
    }
    transactionIdRef.current = result.transaction.id;
    setTransaction(result.transaction);
    setCreditSpentCents(result.reservedKurus);
    setAdsRequired(totalUnits);
    setAdsCompleted(result.transaction.completedAds);
    setDailyBypass(Boolean(result.alreadySatisfied || result.transaction.vip || (daily && result.requiredAds === 0)));
    // requiredAds is the action total; remainingAds excludes units already
    // covered by the atomic credit reservation. Credit-funded gates must
    // approve immediately rather than leaving the modal in Processing.
    if (result.remainingAds <= 0) {
      void approve(transaction);
    } else {
      setPhase('ads');
    }
    // Gate opening is intentionally a transaction boundary. A balance update
    // while an ad is open must not begin a second action.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return scheduleUnmountCleanup;
  }, [visible, gateKey, retryNonce]);

  const completeAd = useCallback(() => {
    if (phaseRef.current !== 'ads' || cancelledRef.current || approvedRef.current || !transactionIdRef.current) return;
    const result = recordAdClickRef.current(transactionIdRef.current);
    if (!result.ok || !result.transaction) {
      setError(result.message);
      setPhase('error');
      return;
    }
    setTransaction(result.transaction);
    setAdsCompleted(result.progress);
    setAdsRequired(totalUnits);
    if (result.completed) void approve(transactionRef.current);
  }, [approve]);

  const cancel = useCallback(() => {
    if (phaseRef.current === 'complete') return;
    cancelledRef.current = true;
    transactionRef.current += 1;
    if (transactionIdRef.current) cancelActionRef.current(transactionIdRef.current);
    transactionIdRef.current = '';
    setPhase('idle');
    setAdsCompleted(0);
    setAdsRequired(GATE_UNITS);
    setCreditSpentCents(0);
    setTransaction(null);
    setError('');
    onCancelRef.current?.();
  }, []);

  const retry = useCallback(() => {
    if (transactionIdRef.current) cancelActionRef.current(transactionIdRef.current);
    transactionIdRef.current = '';
    transactionRef.current += 1;
    setError('');
    setPhase('charging');
    setRetryNonce((value) => value + 1);
  }, []);

  return {
    phase,
    action,
    daily,
    totalUnits,
    reservedUnits,
    creditSpentCents,
    adsCompleted,
    adsRequired,
    remainingAds: Math.max(0, totalUnits - reservedUnits - adsCompleted),
    transaction,
    error,
    dailyBypass,
    completeAd,
    cancel,
    retry,
    isBusy: phase === 'charging' || phase === 'approving',
    isComplete: phase === 'complete',
  };
}