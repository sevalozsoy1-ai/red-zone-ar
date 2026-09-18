import React from 'react';
import { Feather } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useI18n } from '@/hooks/useI18n';
import { rtlLayout } from '@/lib/rtl';
import { CREDIT_PACKAGES, createSimulationTransactionId, type CreditPackage } from '@/lib/commerce';
import { economyText, formatUsdFromCents } from '@/lib/economy-ui';
import { useGame } from '@/context/GameContext';
import GoldPurchasePanel from '@/components/GoldPurchasePanel';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function CreditTopUpPanel({ visible, onClose }: Props) {
  const colors = useColors();
  const { locale, t, rtl } = useI18n();
  const { creditCents, purchaseCredits } = useGame();
  const [pendingPackage, setPendingPackage] = React.useState<CreditPackage | null>(null);
  const [goldVisible, setGoldVisible] = React.useState(false);
  const [notice, setNotice] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const operationRef = React.useRef(false);

  React.useEffect(() => {
    if (!visible) {
      setPendingPackage(null);
      setGoldVisible(false);
      setNotice('');
      setBusy(false);
      operationRef.current = false;
    }
  }, [visible]);

  const confirmPackage = () => {
    if (!pendingPackage || busy || operationRef.current) return;
    operationRef.current = true;
    setBusy(true);
    const result = purchaseCredits(
      pendingPackage.id,
      createSimulationTransactionId('credits', pendingPackage.id),
    );
    setNotice(result.ok ? t('creditsAdded') : t('noRealCharge'));
    setPendingPackage(null);
    setBusy(false);
  };

  const selectPackage = (item: CreditPackage) => {
    // Selecting a package is a new user intent after the previous operation.
    operationRef.current = false;
    setPendingPackage(item);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      testID="credit-topup-panel"
    >
      <View style={[styles.backdrop, rtl && styles.rtl]}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.header}>
            <View style={styles.heading}>
              <Feather name="zap" size={17} color={colors.amber} />
              <Text style={[styles.kicker, { color: colors.amber }]}>{t('creditPacks')}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('close')}
              onPress={onClose}
              style={styles.close}
            >
              <Feather name="x" size={22} color={colors.foreground} />
            </Pressable>
          </View>
          <Text style={[styles.title, { color: colors.foreground }]}>{t('creditPacks')}</Text>
          <Text style={[styles.body, { color: colors.mutedForeground }]}>
            {t('creditsPurchaseConfirm')}
          </Text>
          <View style={[styles.balance, { borderColor: colors.border, backgroundColor: colors.secondary }]}>
            <Text style={[styles.balanceLabel, { color: colors.mutedForeground }]}>{t('creditPacks')}</Text>
            <Text style={[styles.balanceValue, { color: colors.foreground }]}>{formatUsdFromCents(creditCents, locale)}</Text>
          </View>
          <View style={styles.packages}>
            {CREDIT_PACKAGES.slice(0, 2).map((item) => (
              <Pressable
                key={item.id}
                testID={`credit-package-${item.id}`}
                accessibilityRole="button"
                accessibilityLabel={formatUsdFromCents(item.priceCents, locale)}
                onPress={() => selectPackage(item)}
                style={[styles.packageRow, { backgroundColor: colors.secondary, borderColor: colors.border }]}
              >
                <View>
                  <Text style={[styles.packageAmount, { color: colors.foreground }]}>{formatUsdFromCents(item.creditCents, locale)}</Text>
                  <Text style={[styles.packageCaption, { color: colors.mutedForeground }]}>{t('noExpiry')}</Text>
                </View>
                <Text style={[styles.packagePrice, { color: colors.amber }]}>{formatUsdFromCents(item.priceCents, locale)}</Text>
                <Feather name="arrow-up-right" size={16} color={colors.cyan} />
              </Pressable>
            ))}
          </View>
          <View style={[styles.notice, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            <Feather name="credit-card" size={18} color={colors.cyan} />
            <Text style={[styles.noticeText, { color: colors.mutedForeground }]}>
              {economyText(locale, 'economySimulationOnly')}
            </Text>
          </View>
          {notice ? <Text style={[styles.notice, { color: colors.cyan }]}>{notice}</Text> : null}
          <Pressable
            testID="buy-gold-from-credits-btn"
            accessibilityRole="button"
            accessibilityLabel={t('goldPlan')}
            onPress={() => setGoldVisible(true)}
            style={[styles.goldButton, { borderColor: colors.amber, backgroundColor: colors.secondary }]}
          >
            <Feather name="award" size={16} color={colors.amber} />
            <Text style={[styles.goldButtonText, { color: colors.amber }]}>{t('goldPlan')} · {t('goldPrice')}</Text>
          </Pressable>
          <Pressable
            testID="credit-topup-close"
            accessibilityRole="button"
            accessibilityLabel={t('close')}
            onPress={onClose}
            style={[styles.done, { backgroundColor: colors.cyan }]}
          >
            <Text style={[styles.doneText, { color: colors.ink }]}>{t('close')}</Text>
          </Pressable>
        </View>
      </View>
      <Modal
        visible={!!pendingPackage}
        transparent
        animationType="fade"
        onRequestClose={() => setPendingPackage(null)}
        testID="credit-confirmation"
      >
        <View style={[styles.backdrop, rtl && styles.rtl]}>
          <View style={[styles.confirmCard, { backgroundColor: colors.card, borderColor: colors.cyan }]}>
            <Feather name="zap" size={26} color={colors.cyan} />
            <Text style={[styles.confirmTitle, { color: colors.foreground }]}>{t('confirmSimulation')}</Text>
            <Text style={[styles.confirmBody, { color: colors.mutedForeground }]}>
              {pendingPackage ? `${formatUsdFromCents(pendingPackage.creditCents, locale)} · ${formatUsdFromCents(pendingPackage.priceCents, locale)}` : ''}
            </Text>
            <Text style={[styles.confirmBody, { color: colors.cyan }]}>{economyText(locale, 'economySimulationOnly')} · {t('creditsPurchaseConfirm')}</Text>
            <View style={styles.confirmActions}>
              <Pressable onPress={() => setPendingPackage(null)} style={[styles.secondaryDone, { borderColor: colors.border }]}>
                <Text style={[styles.doneText, { color: colors.mutedForeground }]}>{t('close')}</Text>
              </Pressable>
              <Pressable
                testID="credit-confirm-btn"
                disabled={busy}
                onPress={confirmPackage}
                style={[styles.done, { backgroundColor: colors.cyan }, busy && styles.disabled]}
              >
                <Text style={[styles.doneText, { color: colors.ink }]}>{t('simulatePurchase')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <GoldPurchasePanel visible={goldVisible} onClose={() => setGoldVisible(false)} />
    </Modal>
  );
}

export default CreditTopUpPanel;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  rtl: rtlLayout,
  card: {
    width: '100%',
    maxWidth: 430,
    borderRadius: 22,
    borderWidth: 1,
    padding: 20,
    gap: 15,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  kicker: { fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  close: { minWidth: 42, minHeight: 42, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 21, fontWeight: '900', letterSpacing: 0.4 },
  body: { fontSize: 14, lineHeight: 21 },
  packages: { width: '100%', gap: 7 },
  balance: { minHeight: 42, borderRadius: 10, borderWidth: 1, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  balanceLabel: { fontSize: 10, fontWeight: '800' },
  balanceValue: { fontSize: 16, fontWeight: '900' },
  packageRow: {
    minHeight: 42,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  packageAmount: { fontSize: 12, fontWeight: '800' },
  packagePrice: { fontSize: 12, fontWeight: '800' },
  packageCaption: { flex: 1, fontSize: 10, textAlign: 'right' },
  goldButton: { minHeight: 44, borderRadius: 11, borderWidth: 1, flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  goldButtonText: { fontSize: 10, fontWeight: '900', textAlign: 'center' },
  notice: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
  },
  noticeText: { flex: 1, fontSize: 12, lineHeight: 18 },
  done: { minHeight: 48, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  doneText: { fontSize: 12, fontWeight: '900', letterSpacing: 0.7 },
  confirmCard: { width: '100%', maxWidth: 390, borderRadius: 20, borderWidth: 1, padding: 20, gap: 12, alignItems: 'center' },
  confirmTitle: { fontSize: 17, fontWeight: '900', textAlign: 'center' },
  confirmBody: { fontSize: 12, lineHeight: 18, textAlign: 'center' },
  confirmActions: { flexDirection: 'row', width: '100%', gap: 8, marginTop: 4 },
  secondaryDone: { minHeight: 48, flex: 1, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.5 },
});