import React from 'react';
import { Feather } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useI18n } from '@/hooks/useI18n';
import { useGame } from '@/context/GameContext';
import { economyText, formatUsdFromCents } from '@/lib/economy-ui';
import { rtlLayout } from '@/lib/rtl';
import { useEconomyGate, type EconomyGateResult } from '@/hooks/useEconomyGate';
import type { EconomyAction } from '@/lib/economy';

type Props = {
  visible: boolean;
  action: EconomyAction;
  matchId?: string;
  daily?: boolean;
  title?: string;
  body?: string;
  onApproved: () => EconomyGateResult | boolean | Promise<EconomyGateResult | boolean>;
  onComplete?: () => void;
  onCancel: () => void;
  testID?: string;
};

/**
 * Shared, visible economy gate used by solo entry, team match entry,
 * refills, and time-limited unlocks. This is deliberately not an ad timer:
 * every simulated ad requires a separate user tap.
 */
export default function EconomyGate({
  visible,
  action,
  matchId,
  daily,
  title,
  body,
  onApproved,
  onComplete,
  onCancel,
  testID = 'economy-gate',
}: Props) {
  const colors = useColors();
  const { locale, rtl } = useI18n();
  const { creditCents, activeGold } = useGame();
  const gate = useEconomyGate({ visible, action, matchId, daily, onApproved, onComplete, onCancel });
  const completedUnits = Math.min(gate.totalUnits, gate.reservedUnits + gate.adsCompleted);
  const progressLabel = `${completedUnits}/${gate.totalUnits}`;
  const isError = gate.phase === 'error';

  if (activeGold && visible) {
    // VIP is an entitlement bypass, not a zero-priced ad surface. The hook
    // commits the action immediately and the caller's onComplete advances.
    return null;
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={gate.cancel} testID={testID}>
      <View style={[styles.backdrop, rtl && styles.rtl]}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.header}>
            <View style={styles.kickerRow}>
              <Feather name="shield" size={15} color={colors.amber} />
              <Text style={[styles.kicker, { color: colors.amber }]}>{economyText(locale, 'economyTestLabel')}</Text>
            </View>
            <Pressable testID={`${testID}-cancel-top`} accessibilityRole="button" accessibilityLabel={economyText(locale, 'economyGateCancel')} onPress={gate.cancel} style={styles.close}>
              <Feather name="x" size={21} color={colors.foreground} />
            </Pressable>
          </View>
          <Text style={[styles.title, { color: colors.foreground }]}>{title ?? economyText(locale, 'economyGateTitle')}</Text>
          <Text style={[styles.body, { color: colors.mutedForeground }]}>{body ?? economyText(locale, 'economyGateBody')}</Text>
          <View style={[styles.balance, { borderColor: colors.border, backgroundColor: colors.secondary }]}>
            <View>
              <Text style={[styles.balanceLabel, { color: colors.mutedForeground }]}>{economyText(locale, 'creditsBalance')}</Text>
              <Text style={[styles.balanceValue, { color: colors.foreground }]}>{formatUsdFromCents(creditCents, locale)}</Text>
            </View>
            <Text style={[styles.progress, { color: colors.cyan }]}>{economyText(locale, 'economyGateProgress')} {progressLabel}</Text>
          </View>
          <View style={[styles.track, { backgroundColor: colors.secondary }]}>
            <View style={[styles.trackFill, { width: `${Math.round((completedUnits / gate.totalUnits) * 100)}%`, backgroundColor: colors.cyan }]} />
          </View>
          {gate.creditSpentCents > 0 ? (
            <Text style={[styles.creditApplied, { color: colors.cyan }]}>
              {economyText(locale, 'economyGateCreditApplied')}: {formatUsdFromCents(gate.creditSpentCents, locale)}
            </Text>
          ) : null}
          {gate.remainingAds > 0 ? (
            <Pressable
              testID={`${testID}-ad-${gate.adsCompleted + 1}`}
              accessibilityRole="button"
              accessibilityLabel={economyText(locale, 'economyGateAdAction')}
              onPress={gate.completeAd}
              style={[styles.adButton, { borderColor: colors.cyan, backgroundColor: colors.secondary }]}
            >
              <Feather name="play-circle" size={21} color={colors.cyan} />
              <View style={styles.adCopy}>
                <Text style={[styles.adTitle, { color: colors.cyan }]}>{economyText(locale, 'economyGateAdAction')}</Text>
                <Text style={[styles.adSub, { color: colors.mutedForeground }]}>{economyText(locale, 'economyAdValue')} · {gate.remainingAds} remaining</Text>
              </View>
            </Pressable>
          ) : null}
          {gate.isBusy ? <Text style={[styles.status, { color: colors.mutedForeground }]}>{economyText(locale, 'economyGateProgress')}…</Text> : null}
          {gate.dailyBypass ? <Text style={[styles.status, { color: colors.cyan }]}>{economyText(locale, 'economySoloDaily')}</Text> : null}
          {isError ? (
            <View style={styles.errorRow}>
              <Text style={[styles.error, { color: colors.signal }]}>{gate.error || economyText(locale, 'economyGateTitle')}</Text>
              <Pressable testID={`${testID}-retry`} onPress={gate.retry} style={[styles.retry, { borderColor: colors.signal }]}>
                <Text style={[styles.retryText, { color: colors.signal }]}>{economyText(locale, 'economyGateContinue')}</Text>
              </Pressable>
            </View>
          ) : null}
          <Text style={[styles.note, { color: colors.mutedForeground }]}>{economyText(locale, 'economyGateNoRefund')}</Text>
          <Pressable testID={`${testID}-cancel`} accessibilityRole="button" onPress={gate.cancel} style={[styles.cancel, { borderColor: colors.border }]}>
            <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>{economyText(locale, 'economyGateCancel')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,.82)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  rtl: rtlLayout,
  card: { width: '100%', maxWidth: 440, borderWidth: 1, borderRadius: 22, padding: 20, gap: 13 },
  header: { minHeight: 36, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  kickerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  kicker: { fontSize: 9, fontWeight: '900', letterSpacing: 1.1 },
  close: { minWidth: 40, minHeight: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 23, fontWeight: '900' },
  body: { fontSize: 13, lineHeight: 19 },
  balance: { borderWidth: 1, borderRadius: 12, padding: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  balanceLabel: { fontSize: 10, fontWeight: '800' },
  balanceValue: { fontSize: 18, fontWeight: '900', marginTop: 3 },
  progress: { fontSize: 12, fontWeight: '900' },
  track: { height: 5, borderRadius: 4, overflow: 'hidden' },
  trackFill: { height: 5 },
  creditApplied: { fontSize: 11, fontWeight: '800', textAlign: 'center' },
  adButton: { minHeight: 62, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 11 },
  adCopy: { flex: 1 },
  adTitle: { fontSize: 11, fontWeight: '900', letterSpacing: .5 },
  adSub: { fontSize: 10, marginTop: 4 },
  status: { textAlign: 'center', fontSize: 11, fontWeight: '800' },
  errorRow: { gap: 9 },
  error: { fontSize: 11, fontWeight: '800', textAlign: 'center' },
  retry: { minHeight: 38, borderWidth: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  retryText: { fontSize: 10, fontWeight: '900' },
  note: { fontSize: 10, lineHeight: 15, textAlign: 'center' },
  cancel: { minHeight: 45, borderWidth: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontSize: 11, fontWeight: '900', letterSpacing: .7 },
});