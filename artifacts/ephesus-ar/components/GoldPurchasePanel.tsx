import React, { useEffect, useRef, useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useI18n } from '@/hooks/useI18n';
import { useGame } from '@/context/GameContext';
import { createSimulationTransactionId, GOLD_PLAN } from '@/lib/commerce';
import { rtlLayout } from '@/lib/rtl';
import { economyText, formatUsdFromCents, VIP_PRICE_USD_CENTS } from '@/lib/economy-ui';

type Props = {
  visible: boolean;
  onClose: () => void;
};

function formatExpiry(expiresAt: number | null, locale: string) {
  if (!expiresAt) return '';
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(expiresAt));
  } catch {
    return new Date(expiresAt).toLocaleString();
  }
}

function formatRemaining(expiresAt: number | null, now: number) {
  if (!expiresAt || expiresAt <= now) return '0h';
  const hours = Math.max(1, Math.ceil((expiresAt - now) / (60 * 60 * 1000)));
  const days = Math.floor(hours / 24);
  return days > 0 ? `${days}d ${hours % 24}h` : `${hours}h`;
}

/**
 * Explicit confirmation surface for the simulated Gold entitlement. There
 * are no card fields, billing calls, provider receipts, or hidden purchase
 * paths in this component.
 */
export default function GoldPurchasePanel({ visible, onClose }: Props) {
  const colors = useColors();
  const { locale, rtl, t } = useI18n();
  const {
    activeGold,
    goldExpiresAt,
    purchaseGold,
    cancelGold,
    resetCommerceSimulation,
    restoreCommerceSimulation,
  } = useGame();
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const operationRef = useRef(false);

  useEffect(() => {
    if (!visible) {
      setConfirmVisible(false);
      setNotice('');
      setBusy(false);
      operationRef.current = false;
    }
  }, [visible]);

  useEffect(() => {
    if (!visible || !activeGold) return;
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, [activeGold, visible]);

  const simulatePurchase = () => {
    if (busy || operationRef.current) return;
    operationRef.current = true;
    setBusy(true);
    const result = purchaseGold(createSimulationTransactionId('gold', GOLD_PLAN.id));
    setNotice(result.ok ? t('goldActive') : t('noRealCharge'));
    setConfirmVisible(false);
    setBusy(false);
  };

  const openConfirmation = () => {
    // A new explicit button press is a new intent. The confirmation handler
    // remains synchronously locked so two same-batch presses cannot grant two
    // entitlements before React renders the first result.
    operationRef.current = false;
    setConfirmVisible(true);
  };

  const cancel = () => {
    cancelGold();
    setNotice(t('goldCancelled'));
  };

  const reset = () => {
    resetCommerceSimulation();
    setNotice(t('simulationReset'));
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      testID="gold-purchase-panel"
    >
      <View style={[styles.backdrop, rtl && styles.rtl]}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.header}>
            <View style={styles.heading}>
              <Feather name="award" size={18} color={colors.amber} />
              <View>
                <Text style={[styles.kicker, { color: colors.amber }]}>{t('gold')} · {t('simulationBadge')}</Text>
                <Text style={[styles.title, { color: colors.foreground }]}>{t('goldPlan')}</Text>
              </View>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel={t('close')} onPress={onClose} style={styles.close}>
              <Feather name="x" size={22} color={colors.foreground} />
            </Pressable>
          </View>

          <View style={[styles.priceRow, { borderColor: colors.border, backgroundColor: colors.secondary }]}>
              <Text style={[styles.price, { color: colors.foreground }]}>{economyText(locale, 'economyVip')}</Text>
            <Text style={[styles.duration, { color: colors.amber }]}>{t('goldDuration')}</Text>
          </View>
          <Text style={[styles.body, { color: colors.mutedForeground }]}>{t('goldBenefits')}</Text>
          <View style={[styles.noticeBox, { borderColor: colors.cyan, backgroundColor: colors.secondary }]}>
            <Feather name="shield" size={16} color={colors.cyan} />
            <Text style={[styles.noticeText, { color: colors.mutedForeground }]}>{t('noRealCharge')}</Text>
          </View>

          {activeGold ? (
            <View style={[styles.activeBox, { borderColor: colors.amber }]}>
              <Text style={[styles.activeTitle, { color: colors.amber }]}>{t('goldActive')}</Text>
              <Text style={[styles.activeText, { color: colors.foreground }]}>
                {t('goldExpires')}: {formatExpiry(goldExpiresAt, locale)}
              </Text>
              <Text style={[styles.activeText, { color: colors.cyan }]}>
                {economyText(locale, 'economyExpiry')}: {formatRemaining(goldExpiresAt, now)}
              </Text>
              <Text style={[styles.activeText, { color: colors.mutedForeground }]}>{t('adFree')} · {t('allProAccess')}</Text>
            </View>
          ) : null}

          {notice ? <Text style={[styles.notice, { color: colors.cyan }]}>{notice}</Text> : null}

          <View style={styles.goldActions}>
            <Pressable
              testID="simulate-gold-btn"
              accessibilityRole="button"
              accessibilityLabel={t('simulatePurchase')}
              onPress={openConfirmation}
              style={[styles.primary, styles.actionFlex, { backgroundColor: colors.amber }]}
            >
              <Feather name="check-circle" size={17} color={colors.ink} />
              <Text style={[styles.primaryText, { color: colors.ink }]}>{t('simulatePurchase')}</Text>
            </Pressable>
            {activeGold ? (
              <Pressable
                testID="cancel-gold-btn"
                accessibilityRole="button"
                accessibilityLabel={t('cancelSimulation')}
                onPress={cancel}
                style={[styles.secondaryButton, styles.actionFlex, { borderColor: colors.amber }]}
              >
                <Text style={[styles.secondaryText, { color: colors.amber }]}>{t('cancelSimulation')}</Text>
              </Pressable>
            ) : null}
          </View>

          <View style={styles.managementRow}>
            <Pressable
              testID="restore-simulation-btn"
              accessibilityRole="button"
              accessibilityLabel={t('restoreSimulation')}
              onPress={() => { restoreCommerceSimulation(); setNotice(t('restoreSimulation')); }}
              style={[styles.managementButton, { borderColor: colors.border }]}
            >
              <Feather name="refresh-cw" size={13} color={colors.mutedForeground} />
              <Text style={[styles.managementText, { color: colors.mutedForeground }]}>{t('restoreSimulation')}</Text>
            </Pressable>
            <Pressable
              testID="reset-simulation-btn"
              accessibilityRole="button"
              accessibilityLabel={t('resetSimulation')}
              onPress={reset}
              style={[styles.managementButton, { borderColor: colors.border }]}
            >
              <Feather name="rotate-ccw" size={13} color={colors.mutedForeground} />
              <Text style={[styles.managementText, { color: colors.mutedForeground }]}>{t('resetSimulation')}</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <Modal
        visible={confirmVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmVisible(false)}
        testID="gold-confirmation"
      >
        <View style={[styles.backdrop, rtl && styles.rtl]}>
          <View style={[styles.confirmCard, { backgroundColor: colors.card, borderColor: colors.amber }]}>
            <Feather name="alert-circle" size={28} color={colors.amber} />
            <Text style={[styles.confirmTitle, { color: colors.foreground }]}>{t('confirmSimulation')}</Text>
            <Text style={[styles.confirmBody, { color: colors.mutedForeground }]}>{formatUsdFromCents(VIP_PRICE_USD_CENTS, locale)} · {t('goldDuration')}</Text>
            <Text style={[styles.confirmBody, { color: colors.cyan }]}>{t('noRealCharge')}</Text>
            <View style={styles.confirmActions}>
              <Pressable
                testID="gold-confirm-cancel"
                accessibilityRole="button"
                onPress={() => setConfirmVisible(false)}
                style={[styles.secondaryButton, { borderColor: colors.border }]}
              >
                <Text style={[styles.secondaryText, { color: colors.mutedForeground }]}>{t('close')}</Text>
              </Pressable>
              <Pressable
                testID="gold-confirm-btn"
                accessibilityRole="button"
                disabled={busy}
                onPress={simulatePurchase}
                style={[styles.primary, { backgroundColor: colors.amber }, busy && styles.disabled]}
              >
                <Text style={[styles.primaryText, { color: colors.ink }]}>{t('confirmSimulation')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.82)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  rtl: rtlLayout,
  card: { width: '100%', maxWidth: 440, borderRadius: 22, borderWidth: 1, padding: 20, gap: 14 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 9, flex: 1 },
  kicker: { fontSize: 9, fontWeight: '900', letterSpacing: 1.1 },
  title: { fontSize: 20, fontWeight: '900', marginTop: 4 },
  close: { minWidth: 42, minHeight: 42, alignItems: 'center', justifyContent: 'center' },
  priceRow: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 4 },
  price: { fontSize: 20, fontWeight: '900' },
  duration: { fontSize: 11, fontWeight: '800' },
  body: { fontSize: 13, lineHeight: 19 },
  noticeBox: { borderWidth: 1, borderRadius: 11, padding: 11, flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  noticeText: { flex: 1, fontSize: 11, lineHeight: 16 },
  activeBox: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 4 },
  activeTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  activeText: { fontSize: 11, lineHeight: 17 },
  notice: { fontSize: 11, textAlign: 'center', lineHeight: 17 },
  primary: { minHeight: 48, borderRadius: 12, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  goldActions: { flexDirection: 'row', gap: 8 },
  actionFlex: { flex: 1 },
  primaryText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.6, textAlign: 'center' },
  secondaryButton: { minHeight: 46, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5, textAlign: 'center' },
  managementRow: { flexDirection: 'row', gap: 8 },
  managementButton: { flex: 1, minHeight: 38, borderRadius: 10, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 6 },
  managementText: { fontSize: 8, fontWeight: '800', textAlign: 'center' },
  confirmCard: { width: '100%', maxWidth: 390, borderRadius: 20, borderWidth: 1, padding: 20, gap: 12 },
  confirmTitle: { fontSize: 17, fontWeight: '900', textAlign: 'center' },
  confirmBody: { fontSize: 12, lineHeight: 18, textAlign: 'center' },
  confirmActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  disabled: { opacity: 0.5 },
});