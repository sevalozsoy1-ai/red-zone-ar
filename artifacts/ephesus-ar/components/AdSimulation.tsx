import React, { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useI18n } from '@/hooks/useI18n';
import { rtlLayout } from '@/lib/rtl';
import CreditTopUpPanel from '@/components/CreditTopUpPanel';
import GoldPurchasePanel from '@/components/GoldPurchasePanel';
import { useGame } from '@/context/GameContext';
import { economyText } from '@/lib/economy-ui';

type Props = {
  visible: boolean;
  onClose: () => void;
  onReward: () => void;
  title?: string;
  body?: string;
  rewardLabel?: string;
};

export default function AdSimulation({
  visible,
  onClose,
  onReward,
  title,
  body,
  rewardLabel,
}: Props) {
  const colors = useColors();
  const { locale, t, rtl } = useI18n();
  const { activeGold } = useGame();
  const displayTitle = title ?? t('cameraReady');
  const displayBody = body ?? t('storeNote');
  const displayReward = rewardLabel ?? t('continue');
  const [topUpVisible, setTopUpVisible] = useState(false);
  const [goldVisible, setGoldVisible] = useState(false);
  const awarded = useRef(false);

  useEffect(() => {
    if (!visible || !activeGold || awarded.current) return;
    awarded.current = true;
    onReward();
    onClose();
  }, [activeGold, onClose, onReward, visible]);

  useEffect(() => {
    if (!visible || activeGold) return;
    awarded.current = false;
  }, [activeGold, visible]);

  const claim = () => {
    if (awarded.current) return;
    awarded.current = true;
    onReward();
    onClose();
  };
  return (
    <>
       <Modal visible={visible && !activeGold} transparent animationType="fade" onRequestClose={onClose}>
        <View style={[s.backdrop, rtl && s.rtl]}><View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={s.header}><Text style={[s.kicker, { color: colors.amber }]}>{t('adSimulation')}</Text><Pressable onPress={onClose} accessibilityLabel={t('close')} style={s.close}><Feather name="x" size={24} color={colors.foreground} /></Pressable></View>
           <Feather name="play-circle" size={52} color={colors.cyan} />
          <Text style={[s.title, { color: colors.foreground }]}>{displayTitle}</Text>
          <Text style={[s.body, { color: colors.mutedForeground }]}>{displayBody}</Text>
           <Text style={[s.note, { color: colors.cyan }]}>{t('noRealCharge')}</Text>
           <Text style={[s.tapNote, { color: colors.mutedForeground }]}>{t('adSimulation')} · {t('continue')}</Text>
           <Pressable testID="complete-simulated-ad-btn" accessibilityRole="button" accessibilityLabel={displayReward} onPress={claim} style={[s.button, { backgroundColor: colors.cyan }]}>
             <Text style={{ color: colors.ink, fontWeight: '800' }}>{displayReward}</Text>
          </Pressable>
          <Text style={[s.note, { color: colors.mutedForeground }]}>{t('storeNote')}</Text>
          <Pressable
            testID="buy-credits-btn"
            accessibilityRole="button"
            accessibilityLabel={t('creditPacks')}
            onPress={() => setTopUpVisible(true)}
            style={[s.topUpButton, { borderColor: colors.border, backgroundColor: colors.secondary }]}
          >
            <Feather name="zap" size={15} color={colors.amber} />
            <Text style={[s.topUpText, { color: colors.amber }]}>{t('creditPacks')}</Text>
          </Pressable>
           <Pressable
             testID="buy-gold-btn"
             accessibilityRole="button"
             accessibilityLabel={t('goldPlan')}
             onPress={() => setGoldVisible(true)}
             style={[s.goldButton, { borderColor: colors.amber, backgroundColor: colors.secondary }]}
           >
             <Feather name="award" size={15} color={colors.amber} />
              <Text style={[s.goldText, { color: colors.amber }]}>{economyText(locale, 'economyVip')}</Text>
           </Pressable>
        </View></View>
      </Modal>
      <CreditTopUpPanel visible={topUpVisible} onClose={() => setTopUpVisible(false)} />
      <GoldPurchasePanel visible={goldVisible} onClose={() => setGoldVisible(false)} />
    </>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', alignItems: 'center', justifyContent: 'center', padding: 22 },
  rtl: rtlLayout,
  card: { width: '100%', maxWidth: 420, borderRadius: 24, borderWidth: 1, padding: 22, alignItems: 'center', gap: 18 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' },
  kicker: { fontSize: 10, fontWeight: '800', letterSpacing: 1.4 },
  close: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 23, fontWeight: '700', textAlign: 'center' },
  body: { fontSize: 14, lineHeight: 22, textAlign: 'center' },
  button: { minHeight: 50, width: '100%', borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  note: { fontSize: 12, textAlign: 'center' },
  tapNote: { fontSize: 12, textAlign: 'center' },
  topUpButton: { minHeight: 42, width: '100%', borderRadius: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  topUpText: { fontSize: 11, fontWeight: '900', letterSpacing: 0.7 },
  goldButton: { minHeight: 42, width: '100%', borderRadius: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  goldText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.4, textAlign: 'center' },
});