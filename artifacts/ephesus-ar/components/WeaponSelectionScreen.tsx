import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGame } from '@/context/GameContext';
import { useColors } from '@/hooks/useColors';
import { useI18n } from '@/hooks/useI18n';
import { rtlLayout } from '@/lib/rtl';
import WeaponCatalogList from './WeaponCatalogList';
import { WEAPONS } from '@/lib/weapons';

export default function WeaponSelectionScreen({ onBack, onCamera }: { onBack: () => void; onCamera: () => void }) {
  const c = useColors();
  const { t, rtl, locale } = useI18n();
  const insets = useSafeAreaInsets();
  const { selectedWeapon, setSelectedWeapon, isWeaponUnlocked } = useGame();
  const selectedUnlocked = isWeaponUnlocked(selectedWeapon);
  const selectedWeaponName = WEAPONS.find((weapon) => weapon.id === selectedWeapon)?.name ?? selectedWeapon;
  return <View style={[s.root, rtl && s.rtl, { backgroundColor: c.background, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={s.header}>
      <Pressable onPress={onBack} accessibilityLabel={t('close')} style={s.back}><Feather name="arrow-left" size={22} color={c.foreground} /></Pressable>
       <View style={s.heading}>
         <Text style={[s.title, { color: c.foreground }]}>{t('equipmentSelection')}</Text>
         <Text style={[s.subtitle, { color: c.mutedForeground }]}>{WEAPONS.length} · {t('equipmentSettings')}</Text>
         <View testID="selected-weapon-summary" accessibilityLiveRegion="polite" style={s.selectedSummary}>
           <Feather name="check-circle" size={14} color={c.cyan} />
           <Text numberOfLines={1} style={[s.selectedSummaryText, { color: c.cyan }]}>
             {locale === 'tr' ? `SEÇİLİ · ${selectedWeaponName}` : `SELECTED · ${selectedWeaponName}`}
           </Text>
         </View>
       </View>
    </View>
    <View style={s.content}><WeaponCatalogList selectedWeapon={selectedWeapon} onSelect={setSelectedWeapon} /></View>
    <Pressable disabled={!selectedUnlocked} onPress={onCamera} style={[s.start, { backgroundColor: c.cyan }, !selectedUnlocked && s.disabledStart]}>
      <Text numberOfLines={1} style={{ color: c.ink, fontWeight: '800', flex: 1 }}>{selectedUnlocked ? t('openCamera') : t('waiting')}</Text><Feather name="camera" size={20} color={c.ink} />
    </Pressable>
  </View>;
}

const s = StyleSheet.create({
  root: { flex: 1 },
  rtl: rtlLayout,
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
  back: { padding: 12 },
  heading: { flex: 1, minWidth: 0 },
  title: { fontSize: 18, fontWeight: '800', letterSpacing: 1 },
  subtitle: { fontSize: 10, marginTop: 3 },
  selectedSummary: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5 },
  selectedSummaryText: { minWidth: 0, flexShrink: 1, fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  content: { flex: 1, minHeight: 0, paddingHorizontal: 20 },
  start: { marginHorizontal: 20, marginTop: 10, borderRadius: 14, minHeight: 56, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 8 },
  disabledStart: { opacity: 0.45 },
});