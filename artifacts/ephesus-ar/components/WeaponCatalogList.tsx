import React, { useMemo, useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { FlatList, Image, Modal, Pressable, SectionList, StyleSheet, Text, TextInput, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useI18n } from '@/hooks/useI18n';
import { useGame } from '@/context/GameContext';
import EconomyGate from '@/components/EconomyGate';
import {
  PRO_WEAPON_AD_UNLOCKS_REQUIRED,
  PRO_WEAPON_UNLOCK_COST_CENTS,
} from '@/lib/economy';
import {
  getWeaponAction,
  isFreeWeapon,
  WEAPONS,
  WEAPON_CATEGORIES,
  type Weapon,
  type WeaponCategory,
  type WeaponId,
} from '@/lib/weapons';
import { WEAPON_IMAGES } from '@/lib/weapon-assets';
import { weaponActionLabel, weaponCategoryLabel, uiText } from '@/lib/i18n';
import { economyText } from '@/lib/economy-ui';
import { rtlLayout } from '@/lib/rtl';

type CatalogSection = {
  key: 'free' | 'pro';
  title: string;
  data: Weapon[];
};

type Props = {
  selectedWeapon: WeaponId;
  onSelect: (id: WeaponId) => void;
  compact?: boolean;
};

export default function WeaponCatalogList({ selectedWeapon, onSelect, compact = false }: Props) {
  const c = useColors();
  const { locale, t, rtl } = useI18n();
  const {
    activeGold,
    creditCents,
    isWeaponUnlocked,
    unlockWeaponWithCredits,
  } = useGame();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<WeaponCategory | null>(null);
  const [pendingWeapon, setPendingWeapon] = useState<WeaponId | null>(null);
  const [gateVisible, setGateVisible] = useState(false);
  const [notice, setNotice] = useState('');
  const pendingAction = useMemo(
    () => pendingWeapon ? ({ type: 'weapon', weaponId: pendingWeapon } as const) : 'soloEntry' as const,
    [pendingWeapon],
  );

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase(locale);
    return WEAPONS.filter((weapon) =>
      (!category || weapon.category === category)
      && (!normalized || `${weapon.name} ${weapon.category}`.toLocaleLowerCase(locale).includes(normalized)));
  }, [category, locale, query]);

  const sections = useMemo<CatalogSection[]>(() => {
    const free = filtered.filter((weapon) => isFreeWeapon(weapon.id));
    const pro = filtered.filter((weapon) => !isFreeWeapon(weapon.id));
    return [
      ...(free.length ? [{ key: 'free' as const, title: `${uiText(locale, 'freeArsenal')} · ${weaponCategoryLabel(locale, 'Tabancalar')} + SMG`, data: free }] : []),
      ...(pro.length ? [{ key: 'pro' as const, title: `${uiText(locale, 'premiumArsenal')} · ${economyText(locale, 'economyAdValue')}`, data: pro }] : []),
    ];
  }, [filtered, locale, t]);

  const closeUnlock = () => {
    setPendingWeapon(null);
    setGateVisible(false);
    setNotice('');
  };

  const chooseWeapon = (weapon: Weapon) => {
    if (isWeaponUnlocked(weapon.id)) {
      onSelect(weapon.id);
      return;
    }
    if (activeGold || creditCents >= PRO_WEAPON_UNLOCK_COST_CENTS) {
      const result = unlockWeaponWithCredits(weapon.id);
      if (result.ok) {
        onSelect(weapon.id);
        return;
      }
      setNotice(result.message);
    }
    setPendingWeapon(weapon.id);
    if (!activeGold && creditCents < PRO_WEAPON_UNLOCK_COST_CENTS) setNotice('');
  };

  const unlockWithGate = () => {
    if (pendingWeapon) setGateVisible(true);
  };

  const renderItem = ({ item }: { item: Weapon }) => {
    const unlocked = isWeaponUnlocked(item.id);
    const selected = selectedWeapon === item.id && unlocked;
    return (
      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ checked: selected, disabled: !unlocked }}
        accessibilityLabel={`${item.name} · ${unlocked ? t('continue') : t('waiting')}`}
        onPress={() => chooseWeapon(item)}
        style={[
          s.card,
          compact && s.cardCompact,
          !unlocked && s.lockedCard,
          { backgroundColor: c.card, borderColor: c.border },
        ]}
      >
        <View style={s.thumbnailFrame}>
          <Image source={WEAPON_IMAGES[item.id]} resizeMode="cover" style={s.thumbnail} />
          {!unlocked && <View style={s.thumbnailLock}><Feather name="lock" size={15} color="#fff" /></View>}
        </View>
        <View style={s.itemMain}>
          <View style={s.nameRow}>
            <Text numberOfLines={1} style={[s.name, compact && s.nameCompact, { color: c.foreground }]}>{item.name}</Text>
            {!unlocked && <Text style={[s.proTag, { color: c.amber }]}>PRO</Text>}
          </View>
          <Text numberOfLines={1} style={[s.meta, { color: c.mutedForeground }]}>
            {weaponCategoryLabel(locale, item.category)} · {item.capacity} {weaponActionLabel(locale, item.archetype === 'grenade' ? 'count' : getWeaponAction(item) === 'launch' ? 'rocket' : getWeaponAction(item) === 'energy' ? 'energy' : getWeaponAction(item) === 'slingshot' ? 'ball' : getWeaponAction(item) === 'melee' ? 'hit' : 'ammo')}{item.archetype === 'grenade' ? '' : ` · ${economyText(locale, 'economyInitialMagazines')}`} · {getWeaponAction(item) === 'launch' ? weaponActionLabel(locale, 'launch') : getWeaponAction(item) === 'energy' ? weaponActionLabel(locale, item.automatic ? 'energy' : 'single') : getWeaponAction(item) === 'slingshot' ? weaponActionLabel(locale, 'ball') : getWeaponAction(item) === 'melee' ? weaponActionLabel(locale, 'melee') : item.automatic ? weaponActionLabel(locale, 'automatic') : item.archetype === 'grenade' ? weaponActionLabel(locale, 'grenade') : weaponActionLabel(locale, 'single')}{item.zoom > 1 ? ` · ${item.zoom}×` : ''}
          </Text>
           {!unlocked && <Text style={[s.lockCopy, { color: c.mutedForeground }]}>{PRO_WEAPON_AD_UNLOCKS_REQUIRED} · {economyText(locale, 'economyAdValue')} · {t('adSimulation')}</Text>}
        </View>
        {!unlocked && <Feather name="lock" size={21} color={c.amber} />}
      </Pressable>
    );
  };

  return (
    <View style={s.root}>
      <View style={[s.search, { borderColor: c.border, backgroundColor: c.card }]}>
        <Feather name="search" size={18} color={c.mutedForeground} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('equipmentSelection')}
          placeholderTextColor={c.mutedForeground}
          style={[s.input, { color: c.foreground }]}
          returnKeyType="search"
        />
        {!!query && <Pressable accessibilityLabel={t('close')} onPress={() => setQuery('')}><Feather name="x" size={18} color={c.mutedForeground} /></Pressable>}
      </View>
      <Text style={[s.categoryLabel, { color: c.amber }]}>{locale === 'tr' ? 'KATEGORİLER' : 'CATEGORIES'}</Text>
      <FlatList
        horizontal
        data={[null, ...WEAPON_CATEGORIES] as Array<WeaponCategory | null>}
        keyExtractor={(item) => item ?? 'all'}
        renderItem={({ item }) => (
          <Pressable onPress={() => setCategory(item)} style={[s.chip, { borderColor: item === category ? c.cyan : c.border, backgroundColor: item === category ? c.card : 'transparent' }]}>
             <Text numberOfLines={1} style={[s.chipText, { color: item === category ? c.cyan : c.mutedForeground }]}>{item ? weaponCategoryLabel(locale, item) : t('equipmentSelection')}</Text>
          </Pressable>
        )}
        showsHorizontalScrollIndicator={false}
        style={s.filters}
        contentContainerStyle={s.filterContent}
      />
       <Text style={[s.count, { color: c.mutedForeground }]}>{filtered.length} / {WEAPONS.length} · {t('equipmentSelection')}</Text>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        renderSectionHeader={({ section }) => (
          <View style={[s.sectionHeader, { backgroundColor: c.background }]}>
            <Text style={[s.sectionTitle, { color: section.key === 'pro' ? c.amber : c.cyan }]}>{section.title}</Text>
          </View>
        )}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={filtered.length > 0}
        contentContainerStyle={s.list}
        initialNumToRender={4}
        maxToRenderPerBatch={4}
        updateCellsBatchingPeriod={50}
        windowSize={3}
         ListEmptyComponent={<View style={s.empty}><Feather name="search" size={28} color={c.mutedForeground} /><Text style={{ color: c.mutedForeground }}>{t('errorMessage')}</Text></View>}
      />

         <ModalUnlock
        weaponId={pendingWeapon}
        notice={notice}
        colors={c}
        onClose={closeUnlock}
           onUnlock={unlockWithGate}
      />
       {pendingWeapon ? (
         <EconomyGate
           visible={gateVisible}
           action={pendingAction}
           title={WEAPONS.find((weapon) => weapon.id === pendingWeapon)?.name ?? t('equipmentSelection')}
           body={economyText(locale, 'economyUnlock')}
           onApproved={() => true}
           onComplete={() => {
             onSelect(pendingWeapon);
             closeUnlock();
           }}
           onCancel={() => setGateVisible(false)}
           testID="weapon-unlock-gate"
         />
       ) : null}
    </View>
  );
}

function ModalUnlock({
  weaponId,
  notice,
  colors,
  onClose,
  onUnlock,
}: {
  weaponId: WeaponId | null;
  notice: string;
  colors: ReturnType<typeof useColors>;
  onClose: () => void;
  onUnlock: () => void;
}) {
  const { locale, t, rtl } = useI18n();
  const weapon = weaponId ? WEAPONS.find((item) => item.id === weaponId) : null;
  return (
    <Modal visible={!!weaponId} transparent animationType="fade" onRequestClose={onClose}>
       <View style={[s.modalBackdrop, rtl && s.rtl]}>
        <View style={[s.unlockCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={s.unlockHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[s.modalKicker, { color: colors.amber }]}>{t('creditPacks')} · {t('waiting')}</Text>
              <Text style={[s.modalTitle, { color: colors.foreground }]}>{weapon?.name ?? ''}</Text>
            </View>
             <Pressable accessibilityLabel={t('close')} onPress={onClose} style={s.closeButton}>
              <Feather name="x" size={21} color={colors.foreground} />
            </Pressable>
          </View>
          <Text style={[s.modalBody, { color: colors.mutedForeground }]}>
              {economyText(locale, 'economyUnlock')}
          </Text>
           <Pressable accessibilityRole="button" onPress={onUnlock} style={[s.unlockButton, { backgroundColor: colors.secondary, borderColor: colors.cyan }]}>
            <Feather name="play-circle" size={19} color={colors.cyan} />
            <View style={s.buttonCopy}>
                <Text style={[s.buttonTitle, { color: colors.cyan }]}>{economyText(locale, 'economyUnlock')} · {economyText(locale, 'economyAdValue')}</Text>
                <Text style={[s.buttonSub, { color: colors.mutedForeground }]}>{economyText(locale, 'economyGateBody')}</Text>
            </View>
          </Pressable>
          {notice ? <Text style={[s.modalNotice, { color: colors.signal }]}>{notice}</Text> : null}
            <Text style={[s.modalNote, { color: colors.mutedForeground }]}>{economyText(locale, 'economyGateNoRefund')}</Text>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, minHeight: 0 },
  rtl: rtlLayout,
  search: { minHeight: 48, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  input: { flex: 1, minWidth: 0, fontSize: 15, paddingVertical: 10 },
  categoryLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 1.2, marginTop: 10 },
  filters: { flexGrow: 0, flexShrink: 0, height: 42, marginTop: 6, zIndex: 3, overflow: 'visible' },
  filterContent: { gap: 8, paddingRight: 8, alignItems: 'center' },
  chip: { borderWidth: 1, borderRadius: 18, paddingHorizontal: 12, height: 34, justifyContent: 'center' },
  chipText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },
  count: { fontSize: 11, fontWeight: '700', marginVertical: 10, letterSpacing: 0.5 },
  list: { gap: 9, paddingBottom: 18 },
  sectionHeader: { paddingVertical: 8 },
  sectionTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 0.7 },
  card: { minHeight: 98, borderWidth: 1, borderRadius: 16, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardCompact: { minHeight: 82, paddingVertical: 7 },
  lockedCard: { opacity: 0.82 },
  thumbnailFrame: { width: 96, height: 68, borderRadius: 11, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,.055)' },
  thumbnail: { width: '100%', height: '100%' },
  thumbnailLock: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,.48)' },
  itemMain: { flex: 1, minWidth: 0, gap: 6 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  name: { flex: 1, fontSize: 17, fontWeight: '800' },
  nameCompact: { fontSize: 15 },
  proTag: { fontSize: 9, fontWeight: '900', letterSpacing: 0.7 },
  meta: { fontSize: 10, fontWeight: '600' },
  lockCopy: { fontSize: 9, fontWeight: '700' },
  empty: { alignItems: 'center', padding: 32, gap: 10 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 },
  unlockCard: { width: '100%', maxWidth: 430, alignSelf: 'center', borderRadius: 22, borderWidth: 1, padding: 20 },
  unlockHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  modalKicker: { fontSize: 9, fontWeight: '900', letterSpacing: 1.4 },
  modalTitle: { fontSize: 24, fontWeight: '900', marginTop: 7 },
  closeButton: { minWidth: 42, minHeight: 42, alignItems: 'center', justifyContent: 'center' },
  modalBody: { fontSize: 13, lineHeight: 19, marginTop: 14 },
  unlockButton: { minHeight: 58, borderRadius: 13, borderWidth: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, gap: 11, marginTop: 12 },
  buttonCopy: { flex: 1 },
  buttonTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 0.6 },
  buttonSub: { fontSize: 10, marginTop: 3 },
  modalNotice: { fontSize: 11, fontWeight: '800', textAlign: 'center', marginTop: 10 },
  modalNote: { fontSize: 10, lineHeight: 15, textAlign: 'center', marginTop: 15 },
});