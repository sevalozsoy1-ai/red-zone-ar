import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Camera } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useI18n } from '@/hooks/useI18n';
import { CountryCode, LanguageCode, useGame } from '@/context/GameContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BattleScreen from '@/components/BattleScreen';
import HomeGameBanner from '@/components/HomeGameBanner';
import WeaponSelectionScreen from '@/components/WeaponSelectionScreen';
import { WEAPONS } from '@/lib/weapons';
import { CREDIT_PACKAGES } from '@/lib/commerce';
import BattleLobbyScreen from '@/components/BattleLobbyScreen';
import { setBattleSessionToken } from '@/lib/battle-auth';
import CreditTopUpPanel from '@/components/CreditTopUpPanel';
import GoldPurchasePanel from '@/components/GoldPurchasePanel';
import EconomyGate from '@/components/EconomyGate';
import CameraPerformanceNotice from '@/components/CameraPerformanceNotice';
import { economyText, formatUsdFromCents } from '@/lib/economy-ui';
import type { BattleSession } from '@workspace/api-client-react';
import {
  countryTranslationKey,
  detectPreferredLocale,
  detectPreferredRegion,
  LOCALE_INFO,
  SUPPORTED_LOCALES,
  translate,
  type Locale,
  type TranslationKey,
  uiText,
} from '@/lib/i18n';
import { canLeaveBoot, shouldApplyDevicePreferences } from '@/lib/startup-gate';
import { rtlLayout } from '@/lib/rtl';
import { useMenuAudio } from '@/hooks/useMenuAudio';
import type { AudioVolumeKey } from '@/lib/audio-settings';

type Screen = 'boot' | 'permissions' | 'briefing' | 'home' | 'camera' | 'multiplayer' | 'settings' | 'armory' | 'store';

const COUNTRIES: Record<CountryCode, { flag: string }> = {
  TR: { flag: '🇹🇷' },
  DE: { flag: '🇩🇪' },
  UA: { flag: '🇺🇦' },
  US: { flag: '🇺🇸' },
};

type Translate = (key: TranslationKey) => string;

function languageForGame(value: Locale): LanguageCode {
  // GameContext is being widened to the complete locale union separately.
  // This bridge keeps this screen source-compatible with older persisted
  // saves while allowing every locale at runtime today.
  return value as unknown as LanguageCode;
}

function HapticButton({ children, onPress, style, disabled = false, testID = 'action-button', accessibilityLabel }: { children: React.ReactNode; onPress: () => void; style?: any; disabled?: boolean; testID?: string; accessibilityLabel?: string }) {
  return (
    <Pressable
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }}
      style={({ pressed }) => [style, pressed && styles.pressed, disabled && styles.disabled]}
    >
      {children}
    </Pressable>
  );
}

const FEEDBACK_SUBJECT: Record<Locale, string> = {
  tr: 'Red Zone oyunu ile ilgili görüşüm var',
  en: 'I have feedback about the Red Zone game',
  zh: '我对 Red Zone 游戏有反馈',
  ja: 'Red Zone ゲームについて意見があります',
  ar: 'لدي ملاحظات حول لعبة Red Zone',
  de: 'Ich habe Feedback zum Spiel Red Zone',
  fr: 'J’ai un avis sur le jeu Red Zone',
  es: 'Tengo comentarios sobre el juego Red Zone',
  it: 'Ho un commento sul gioco Red Zone',
  pt: 'Tenho uma opinião sobre o jogo Red Zone',
  ru: 'У меня есть отзыв об игре Red Zone',
  uk: 'У мене є відгук про гру Red Zone',
  hi: 'Red Zone गेम के बारे में मेरी प्रतिक्रिया है',
  ur: 'Red Zone گیم کے بارے میں میری رائے ہے',
  bn: 'Red Zone গেম সম্পর্কে আমার মতামত আছে',
  pa: 'Red Zone ਗੇਮ ਬਾਰੇ ਮੇਰੀ ਰਾਏ ਹੈ',
  id: 'Saya memiliki masukan tentang game Red Zone',
  ko: 'Red Zone 게임에 대한 의견이 있습니다',
  vi: 'Tôi có góp ý về trò chơi Red Zone',
  th: 'ฉันมีความคิดเห็นเกี่ยวกับเกม Red Zone',
  nl: 'Ik heb feedback over het spel Red Zone',
  pl: 'Mam opinię o grze Red Zone',
  sv: 'Jag har synpunkter på spelet Red Zone',
  fa: 'درباره بازی Red Zone بازخورد دارم',
};

function BrandFooter() {
  const colors = useColors();
  const { width } = useWindowDimensions();
  const travel = useRef(new Animated.Value(width)).current;
  useEffect(() => {
    travel.setValue(width);
    const animation = Animated.loop(
      Animated.timing(travel, {
        toValue: -430,
        duration: 9000,
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [travel, width]);
  return (
    <View style={styles.footerTrack}>
      <Animated.Text
        numberOfLines={1}
        style={[styles.footer, { color: colors.mutedForeground, transform: [{ translateX: travel }] }]}
      >
        Geliştirici - Halil Özsoy - www.ephesusmedya.com.tr
      </Animated.Text>
    </View>
  );
}

function Header({ title, onBack, right }: { title: string; onBack?: () => void; right?: React.ReactNode }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { rtl } = useI18n();
  return (
    <View style={[styles.header, rtl && styles.rtl, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
      <HapticButton onPress={onBack ?? (() => undefined)} style={styles.iconButton}>
        <Ionicons name={onBack ? (rtl ? 'chevron-forward' : 'chevron-back') : 'radio-outline'} size={22} color={colors.cyan} />
      </HapticButton>
      <Text style={[styles.headerTitle, { color: colors.foreground }]}>{title}</Text>
      {right ?? <View style={styles.iconButton} />}
    </View>
  );
}

function BootScreen({ onDone, canLeave }: { onDone: () => void; canLeave: boolean }) {
  const colors = useColors();
  const { t, rtl, locale } = useI18n();
  const pulse = useRef(new Animated.Value(0)).current;
  const entrance = useRef(new Animated.Value(0)).current;
  const [introElapsed, setIntroElapsed] = useState(false);
  useEffect(() => {
    const timeout = setTimeout(() => setIntroElapsed(true), 1200);
    return () => clearTimeout(timeout);
  }, []);
  useEffect(() => {
    const animation = Animated.parallel([
      Animated.timing(entrance, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.loop(Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 850, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 850, useNativeDriver: true }),
      ])),
    ]);
    animation.start();
    return () => animation.stop();
  }, [entrance, pulse]);
  // The parent re-renders while GameContext finishes its async restore and
  // while the startup gate applies device preferences. Do not restart the
  // boot timer on unrelated callback identity changes; the callback itself is
  // refreshed through a ref so fresh and returning launches can both finish.
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  useEffect(() => {
    if (canLeave && introElapsed) onDoneRef.current();
  }, [canLeave, introElapsed]);
  return (
    <View style={[styles.boot, rtl && styles.rtl, { backgroundColor: colors.background }]}>
      <Animated.View style={[styles.bootRing, { borderColor: colors.cyan, opacity: entrance, transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.06] }) }] }]}>
        <Image source={require('../assets/images/red-zone-ar-icon.png')} style={styles.bootIcon} />
      </Animated.View>
      <Animated.Text style={[styles.bootTitle, { color: '#FF3B30', opacity: entrance, transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] }]}>{t('brand')}</Animated.Text>
      <Text style={[styles.bootSubtitle, { color: colors.amber }]}>{t('bootSubtitle')}</Text>
      <View style={[styles.bootLine, { backgroundColor: colors.secondary }]}>
        <View style={[styles.bootProgress, { backgroundColor: colors.cyan }]} />
      </View>
      <Text style={[styles.bootCaption, { color: colors.mutedForeground }]}>{locale === 'tr' ? 'YÜKLENİYOR…' : t('bootCaption')}</Text>
      <BrandFooter />
    </View>
  );
}

function PermissionScreen({ onContinue }: { onContinue: () => void }) {
  const colors = useColors();
  const { setLanguage } = useGame();
  const { t, rtl, locale } = useI18n();
  const [cameraStatus, setCameraStatus] = useState<'unknown' | 'granted' | 'denied' | 'unavailable'>('unknown');
  const [cameraRequested, setCameraRequested] = useState(false);
  useEffect(() => {
    let mounted = true;
    const restorePermission = async () => {
      try {
        const granted = Platform.OS === 'web'
          ? typeof navigator !== 'undefined' && navigator.permissions
            ? (await navigator.permissions.query({ name: 'camera' as PermissionName })).state === 'granted'
            : false
          : (await Camera.getCameraPermissionsAsync()).granted;
        if (mounted && granted) setCameraStatus('granted');
      } catch {
        // Browsers without the camera Permissions API use the explicit button.
      }
    };
    void restorePermission();
    return () => { mounted = false; };
  }, []);
  const camera = cameraStatus === 'granted';
  const canContinueWithoutCamera = cameraRequested && (cameraStatus === 'denied' || cameraStatus === 'unavailable');
  const requestPermissions = async () => {
    setCameraRequested(true);
    if (Platform.OS === 'web') {
      const getUserMedia = typeof navigator !== 'undefined' ? navigator.mediaDevices?.getUserMedia : undefined;
      if (!getUserMedia) {
        setCameraStatus('unavailable');
        return;
      }
      try {
        const stream = await getUserMedia.call(navigator.mediaDevices, { video: true, audio: false });
        stream.getTracks().forEach((track) => track.stop());
        setCameraStatus('granted');
      } catch {
        setCameraStatus('denied');
      }
      return;
    }
    try {
      const cameraResult = await Camera.requestCameraPermissionsAsync();
      setCameraStatus(cameraResult.granted ? 'granted' : 'denied');
    } catch {
      setCameraStatus('unavailable');
    }
  };
  const primaryAction = camera || canContinueWithoutCamera ? onContinue : requestPermissions;
  const primaryLabel = camera ? t('continue') : canContinueWithoutCamera ? uiText(locale, 'continueWithoutCamera') : t('grantAccess');
  const cameraMessage = uiText(locale, cameraStatus === 'unavailable' ? 'cameraUnavailable' : 'cameraPermissionDenied');
  return (
    <View style={[styles.screen, rtl && styles.rtl, { backgroundColor: colors.background }]}>
      <LinearGradient colors={[colors.background, colors.panel]} style={StyleSheet.absoluteFill} />
      <View style={styles.permissionTop}>
        <View style={[styles.eyebrow, { backgroundColor: colors.secondary }]}><View style={[styles.dot, { backgroundColor: colors.cyan }]} /><Text style={[styles.eyebrowText, { color: colors.cyan }]}>{t('setupStep')}</Text></View>
        <Text style={[styles.display, { color: colors.foreground }]}>{t('permissions')}</Text>
        <Text style={[styles.body, { color: colors.mutedForeground }]}>
          {t('cameraHint')} · {locale === 'tr'
            ? 'Kamera gerekir; arka flaş varsa isteğe bağlı kullanılır.'
            : 'Camera is required; the rear torch is optional when the device supports it.'}
        </Text>
        <Text style={[styles.sectionLabel, { color: colors.amber, marginTop: 16 }]}>{t('language')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.permissionLanguages}>
          {SUPPORTED_LOCALES.map((item) => <HapticButton key={item} onPress={() => setLanguage(languageForGame(item))} style={[styles.languageChip, { backgroundColor: item === locale ? colors.cyan : colors.secondary }]}><Text style={[styles.languageChipText, { color: item === locale ? colors.ink : colors.mutedForeground }]}>{LOCALE_INFO[item].nativeName}</Text></HapticButton>)}
        </ScrollView>
      </View>
      <View style={[styles.permissionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <PermissionRow icon="camera" label={t('cameraAccess')} enabled={camera} t={t} />
        <Text style={[styles.permissionHint, { color: colors.mutedForeground }]}>{t('audioInfo')}</Text>
        {cameraRequested && !camera ? <Text style={[styles.permissionHint, styles.rtlText, { color: colors.signal }]}>{cameraMessage}</Text> : null}
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        {cameraRequested && !camera ? <HapticButton onPress={requestPermissions} style={[styles.secondaryButton, { borderColor: colors.cyan }]}>
          <Text style={[styles.secondaryButtonText, { color: colors.cyan }]}>{camera ? t('ready') : t('grantAccess')}</Text>
          <Feather name="shield" size={17} color={colors.cyan} />
        </HapticButton> : null}
        {cameraRequested && !camera && Platform.OS !== 'web' ? <HapticButton onPress={() => { if (typeof Linking.openSettings === 'function') void Linking.openSettings(); }} style={[styles.secondaryButton, { borderColor: colors.border }]}>
          <Text style={[styles.secondaryButtonText, { color: colors.mutedForeground }]}>{t('settings')}</Text>
          <Feather name="settings" size={17} color={colors.mutedForeground} />
        </HapticButton> : null}
        <HapticButton onPress={primaryAction} style={[styles.primaryButton, { backgroundColor: colors.cyan }]}>
          <Text style={[styles.primaryButtonText, styles.rtlText, { color: colors.ink }]}>{primaryLabel}</Text>
          <Feather name="arrow-up-right" size={18} color={colors.ink} />
        </HapticButton>
      </View>
      <BrandFooter />
    </View>
  );
}

function PermissionRow({ icon, label, enabled, statusLabel, t }: { icon: keyof typeof Feather.glyphMap; label: string; enabled: boolean; statusLabel?: string; t: Translate }) {
  const colors = useColors();
  return (
    <View style={styles.permissionRow}>
      <View style={[styles.permissionIcon, { backgroundColor: colors.secondary }]}><Feather name={icon} size={18} color={colors.cyan} /></View>
      <Text style={[styles.permissionLabel, { color: colors.foreground }]}>{label}</Text>
      <View style={[styles.statusPill, { backgroundColor: enabled ? 'rgba(102,227,208,0.14)' : colors.muted }]}><Text style={[styles.statusText, styles.rtlText, { color: enabled ? colors.cyan : colors.mutedForeground }]}>{enabled ? t('ready') : statusLabel ?? t('waiting')}</Text></View>
    </View>
  );
}

function BriefingScreen({ onDone }: { onDone: () => void }) {
  const colors = useColors();
  const { country, setCountry } = useGame();
  const { t, locale, rtl } = useI18n();
  return (
    <View style={[styles.screen, rtl && styles.rtl, { backgroundColor: colors.background }]}>
      <LinearGradient colors={[colors.background, colors.panel]} style={StyleSheet.absoluteFill} />
      <View style={styles.briefingTop}><Text style={[styles.overline, { color: colors.amber }]}>{t('setupOverline')}</Text><Text style={[styles.display, { color: colors.foreground }]}>{t('mission')}</Text><Text style={[styles.body, { color: colors.mutedForeground }]}>{t('missionText')}</Text></View>
      <View style={[styles.countryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>{t('chooseRegion')}</Text>
        <CountryPicker label={t('region')} selected={country} onSelect={setCountry} locale={locale} />
        <HapticButton onPress={onDone} style={[styles.primaryButton, { backgroundColor: colors.cyan, marginTop: 22 }]}><Text style={[styles.primaryButtonText, { color: colors.ink }]}>{t('continue')}</Text><Feather name={rtl ? 'arrow-left' : 'arrow-right'} size={18} color={colors.ink} /></HapticButton>
      </View>
      <BrandFooter />
    </View>
  );
}

function CountryPicker({ label, selected, onSelect, locale }: { label: string; selected: CountryCode; onSelect: (country: CountryCode) => void; locale: Locale }) {
  const colors = useColors();
  return (
    <View style={styles.countrySection}><Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>{label}</Text><View style={styles.countryChoices}>{(Object.keys(COUNTRIES) as CountryCode[]).map((code) => <HapticButton key={code} onPress={() => onSelect(code)} style={[styles.countryChoice, { borderColor: selected === code ? colors.cyan : colors.border, backgroundColor: selected === code ? 'rgba(102,227,208,0.12)' : colors.panel }]}><Text style={styles.flag}>{COUNTRIES[code].flag}</Text><Text style={[styles.countryCode, { color: selected === code ? colors.cyan : colors.mutedForeground }]}>{code}</Text><Text style={[styles.countryName, { color: colors.foreground }]}>{translate(locale, countryTranslationKey(code))}</Text></HapticButton>)}</View></View>
  );
}

function HomeScreen({ onNavigate, onOpenCamera, onOpenTeamBattle }: { onNavigate: (screen: Screen) => void; onOpenCamera: () => void; onOpenTeamBattle: () => void }) {
  const colors = useColors();
  const { creditCents, activeGold, isWeaponUnlocked } = useGame();
  const { t, rtl, locale } = useI18n();
  const unlockedEquipmentCount = WEAPONS.filter((weapon) => isWeaponUnlocked(weapon.id)).length;
  return (
    <View style={[styles.screen, rtl && styles.rtl, { backgroundColor: colors.background }]}>
      <LinearGradient colors={[colors.background, '#0D211C']} style={StyleSheet.absoluteFill} />
      <ScrollView contentContainerStyle={styles.homeContent} showsVerticalScrollIndicator={false}>
        <View style={styles.homeHeader}><View><Text style={[styles.overline, { color: '#FF453A' }]}>{t('brand')}</Text><Text style={[styles.homeTitle, { color: colors.foreground }]}>{t('home')}</Text></View><HapticButton onPress={() => onNavigate('settings')} style={[styles.iconButton, { borderColor: colors.border }]}><Feather name="sliders" size={20} color={colors.cyan} /></HapticButton></View>
        <HomeGameBanner />
         <HapticButton testID="home-camera-btn" onPress={onOpenCamera} style={[styles.missionButton, { backgroundColor: colors.cyan }]}><View><Text style={[styles.missionButtonOverline, { color: colors.ink }]}>{t('camera')}</Text><Text style={[styles.missionButtonText, { color: colors.ink }]}>{locale === 'tr' ? 'GEZİNTİYE BAŞLA' : t('openCamera')}</Text></View><View style={[styles.roundArrow, { backgroundColor: colors.ink }]}><Feather name="camera" size={22} color={colors.cyan} /></View></HapticButton>
        <HapticButton testID="home-team-battle-btn" onPress={onOpenTeamBattle} style={[styles.missionButton, { backgroundColor: colors.amber }]}><View><Text style={[styles.missionButtonOverline, { color: colors.ink }]}>{t('players')}</Text><Text style={[styles.missionButtonText, { color: colors.ink }]}>{t('teamBattle')}</Text></View><View style={[styles.roundArrow, { backgroundColor: colors.ink }]}><Feather name="users" size={22} color={colors.amber} /></View></HapticButton>
          <View style={styles.statsRow}>
            <StatCard label={t('unlockedEquipment')} value={`${unlockedEquipmentCount} / ${WEAPONS.length}`} icon="crosshair" />
            <StatCard label={economyText(locale, 'creditsBalance')} value={activeGold ? 'VIP' : formatUsdFromCents(creditCents, locale)} icon="zap" />
          </View>
         <View style={styles.homeSectionHeader}><Text style={[styles.homeSectionTitle, { color: colors.foreground }]}>{t('equipmentSettings')}</Text><Text style={[styles.homeSectionHint, { color: colors.mutedForeground }]}>{uiText(locale, 'allEquipmentStatus')}</Text></View>
        <View style={styles.toolRow}><ToolCard title={t('equipmentSelection')} subtitle={t('weaponsGrenades')} icon="crosshair" onPress={() => onNavigate('armory')} /><ToolCard title={t('store')} subtitle={t('demoCreditStore')} icon="shopping-bag" onPress={() => onNavigate('store')} /></View>
        <View style={[styles.notice, { borderColor: colors.border, backgroundColor: colors.panel }]}><Feather name="camera" size={17} color={colors.amber} /><Text style={[styles.noticeText, { color: colors.mutedForeground }]}>{t('onDeviceProcessing')}</Text></View>
        <BrandFooter />
      </ScrollView>
    </View>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: keyof typeof Feather.glyphMap }) {
  const colors = useColors();
  return <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}><Feather name={icon} size={17} color={colors.amber} /><Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text><Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text></View>;
}

function ToolCard({ title, subtitle, icon, onPress }: { title: string; subtitle: string; icon: keyof typeof Feather.glyphMap; onPress: () => void }) {
  const colors = useColors();
  return <HapticButton onPress={onPress} style={[styles.toolCard, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={[styles.toolIcon, { backgroundColor: colors.secondary }]}><Feather name={icon} size={20} color={colors.cyan} /></View><Text style={[styles.toolTitle, { color: colors.foreground }]}>{title}</Text><Text style={[styles.toolSubtitle, { color: colors.mutedForeground }]}>{subtitle}</Text><Feather name="arrow-up-right" size={17} color={colors.amber} style={styles.toolArrow} /></HapticButton>;
}

function SettingsScreen({ onBack }: { onBack: () => void }) {
  const colors = useColors();
  const {
    language,
    setLanguage,
    activeGold,
    goldExpiresAt,
    audioVolumes,
    setAudioVolumes,
  } = useGame();
  const { t, locale, rtl } = useI18n();
  type Detail = 'about' | 'developer' | 'privacy' | 'security' | 'guide';
  const [detail, setDetail] = useState<Detail | null>(null);
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [goldVisible, setGoldVisible] = useState(false);
  const detailTitles: Record<Detail, TranslationKey> = {
    about: 'about',
    developer: 'developerInfo',
    privacy: 'privacy',
    security: 'security',
    guide: 'guide',
  };
  const detailBodies: Record<Detail, TranslationKey> = {
    about: 'detailAbout',
    developer: 'detailDeveloper',
    privacy: 'detailPrivacy',
    security: 'detailSecurity',
    guide: 'detailGuide',
  };
  return (
    <View style={[styles.screen, rtl && styles.rtl, { backgroundColor: colors.background }]}>
      <Header title={t('settings')} onBack={onBack} />
      <ScrollView contentContainerStyle={styles.settingsContent} showsVerticalScrollIndicator={false}>
         <View style={[styles.settingsHero, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={[styles.settingsOrb, { backgroundColor: colors.secondary }]}><MaterialCommunityIcons name="radar" size={34} color="#FF453A" /></View><View><Text style={[styles.settingsTitle, { color: colors.foreground }]}>{t('brand')}</Text><Text style={[styles.settingsSubtitle, { color: colors.mutedForeground }]}>v1.0</Text></View></View>
        <Text style={[styles.settingsSection, { color: colors.amber }]}>{t('system')}</Text>
         <View style={[styles.settingsGroup, { backgroundColor: colors.card, borderColor: colors.border }]}><SettingRow icon="globe" label={t('language')} trailing={<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.languageRow}>{SUPPORTED_LOCALES.map((item) => <HapticButton key={item} onPress={() => setLanguage(languageForGame(item))} style={[styles.languageChip, { backgroundColor: locale === item ? colors.cyan : colors.secondary }]}><Text style={[styles.languageChipText, { color: locale === item ? colors.ink : colors.mutedForeground }]}>{LOCALE_INFO[item].nativeName}</Text></HapticButton>)}</ScrollView>} /></View>
          <Text style={[styles.settingsSection, { color: colors.amber }]}>{locale === 'tr' ? 'SES MİKSERİ' : 'AUDIO MIXER'}</Text>
          <View style={[styles.settingsGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {([
              ['master', locale === 'tr' ? 'Genel ses' : 'Master volume', 'volume-2'],
              ['music', locale === 'tr' ? 'Menü müziği' : 'Menu music', 'music'],
              ['weapon', locale === 'tr' ? 'Silah sesleri' : 'Weapon sounds', 'target'],
              ['effects', locale === 'tr' ? 'Efekt sesleri' : 'Effects', 'zap'],
            ] as const).map(([key, label, icon]) => (
              <AudioSettingRow
                key={key}
                settingKey={key}
                label={label}
                icon={icon}
                value={audioVolumes[key]}
                onChange={(value) => setAudioVolumes({ [key]: value })}
              />
            ))}
          </View>
         <Text style={[styles.settingsSection, { color: colors.amber }]}>{t('gold')} · {t('simulationBadge')}</Text>
         <View style={[styles.goldSettingsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
           <View style={[styles.goldSettingsIcon, { backgroundColor: colors.secondary }]}><Feather name="award" size={21} color={colors.amber} /></View>
           <View style={styles.goldSettingsCopy}>
              <Text style={[styles.goldSettingsTitle, { color: colors.foreground }]}>{activeGold ? t('goldActive') : economyText(locale, 'economyVip')}</Text>
             <Text style={[styles.goldSettingsBody, { color: colors.mutedForeground }]}>{activeGold ? `${t('goldExpires')}: ${goldExpiresAt ? new Date(goldExpiresAt).toLocaleDateString(locale) : ''}` : t('noRealCharge')}</Text>
           </View>
           <HapticButton testID="settings-gold-btn" onPress={() => setGoldVisible(true)} style={[styles.goldSettingsButton, { borderColor: colors.amber }]}>
             <Text style={[styles.goldSettingsButtonText, { color: colors.amber }]}>{activeGold ? t('goldActive') : t('simulatePurchase')}</Text>
           </HapticButton>
         </View>
         <Text style={[styles.settingsSection, { color: colors.amber }]}>{t('information')}</Text>
         <View style={[styles.settingsGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
           {([['info', 'about'], ['user', 'developer'], ['shield', 'privacy'], ['lock', 'security'], ['book-open', 'guide']] as const).map(([icon, key]) => <SettingRow key={key} icon={icon} label={t(detailTitles[key])} onPress={() => setDetail(key)} />)}
           <SettingRow icon="message-square" label={locale === 'tr' ? 'Geri bildirim' : 'Feedback'} onPress={() => setFeedbackVisible(true)} />
         </View>
        <BrandFooter />
      </ScrollView>
       <Modal visible={!!detail} transparent animationType="slide" onRequestClose={() => setDetail(null)}><View style={[styles.detailOverlay, rtl && styles.rtl]}><View style={[styles.detailSheet, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={styles.sheetHandle} /><HapticButton onPress={() => setDetail(null)} style={styles.sheetClose}><Feather name="x" size={20} color={colors.mutedForeground} /></HapticButton><Text style={[styles.detailTitle, { color: colors.foreground }]}>{detail ? t(detailTitles[detail]) : ''}</Text><ScrollView style={styles.detailScroll} contentContainerStyle={styles.detailScrollContent} showsVerticalScrollIndicator={false}><Text style={[styles.detailBody, { color: colors.mutedForeground }]}>{detail ? t(detailBodies[detail]) : ''}</Text></ScrollView></View></View></Modal>
        <Modal visible={feedbackVisible} transparent animationType="slide" onRequestClose={() => setFeedbackVisible(false)}>
          <View style={[styles.detailOverlay, rtl && styles.rtl]}>
            <View style={[styles.detailSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.sheetHandle} />
              <HapticButton onPress={() => setFeedbackVisible(false)} style={styles.sheetClose}><Feather name="x" size={20} color={colors.mutedForeground} /></HapticButton>
              <Text style={[styles.detailTitle, { color: colors.foreground }]}>{locale === 'tr' ? 'Geri bildirim' : 'Feedback'}</Text>
              <Text style={[styles.detailBody, { color: colors.mutedForeground }]}>
                {locale === 'tr' ? 'Oyunda yaşadığınız bir sorunu veya önerinizi bize web sitemizden ya da e-posta ile iletebilirsiniz.' : 'Send us a problem report or suggestion through our website or by email.'}
              </Text>
              <HapticButton
                onPress={() => void Linking.openURL(`mailto:halilozsoy35@gmail.com?subject=${encodeURIComponent(FEEDBACK_SUBJECT[locale])}&body=${encodeURIComponent(`${FEEDBACK_SUBJECT[locale]}\n\n`)}`)}
                style={[styles.feedbackButton, { backgroundColor: colors.cyan }]}
              >
                <Feather name="mail" size={18} color={colors.ink} />
                <Text style={[styles.feedbackButtonText, { color: colors.ink }]}>{locale === 'tr' ? 'E-posta gönder' : 'Send email'}</Text>
              </HapticButton>
              <HapticButton
                onPress={() => void Linking.openURL('https://www.ephesusmedya.com.tr')}
                style={[styles.feedbackButton, { borderColor: colors.cyan, borderWidth: 1 }]}
              >
                <Feather name="globe" size={18} color={colors.cyan} />
                <Text style={[styles.feedbackButtonText, { color: colors.cyan }]}>www.ephesusmedya.com.tr</Text>
              </HapticButton>
            </View>
          </View>
        </Modal>
       <GoldPurchasePanel visible={goldVisible} onClose={() => setGoldVisible(false)} />
    </View>
  );
}

function SettingRow({ icon, label, trailing, onPress }: { icon: keyof typeof Feather.glyphMap; label: string; trailing?: React.ReactNode; onPress?: () => void }) {
  const colors = useColors();
  return <HapticButton onPress={onPress ?? (() => undefined)} style={[styles.settingRow, { borderBottomColor: colors.border }]}><View style={[styles.settingIcon, { backgroundColor: colors.secondary }]}><Feather name={icon} size={17} color={colors.cyan} /></View><Text style={[styles.settingLabel, { color: colors.foreground }]}>{label}</Text>{trailing ?? <Feather name="chevron-right" size={18} color={colors.mutedForeground} />}</HapticButton>;
}

function AudioSettingRow({
  settingKey,
  label,
  icon,
  value,
  onChange,
}: {
  settingKey: AudioVolumeKey;
  label: string;
  icon: keyof typeof Feather.glyphMap;
  value: number;
  onChange: (value: number) => void;
}) {
  const colors = useColors();
  const percentage = Math.round(value * 100);
  const adjust = (delta: number) => onChange(Math.min(1, Math.max(0, value + delta)));
  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: percentage, text: `${percentage}%` }}
      style={[styles.audioSettingRow, { borderBottomColor: colors.border }]}
    >
      <View style={[styles.settingIcon, { backgroundColor: colors.secondary }]}>
        <Feather name={icon} size={17} color={colors.cyan} />
      </View>
      <Text style={[styles.settingLabel, { color: colors.foreground }]}>{label}</Text>
      <HapticButton
        testID={`audio-${settingKey}-down`}
        accessibilityLabel={`${label} azalt`}
        onPress={() => adjust(-0.1)}
        style={[styles.audioAdjustButton, { borderColor: colors.border }]}
      >
        <Feather name="minus" size={16} color={colors.foreground} />
      </HapticButton>
      <Text style={[styles.audioPercentage, { color: colors.amber }]}>{percentage}%</Text>
      <HapticButton
        testID={`audio-${settingKey}-up`}
        accessibilityLabel={`${label} artır`}
        onPress={() => adjust(0.1)}
        style={[styles.audioAdjustButton, { borderColor: colors.border }]}
      >
        <Feather name="plus" size={16} color={colors.foreground} />
      </HapticButton>
    </View>
  );
}

function StoreScreen({ onBack }: { onBack: () => void }) {
  const colors = useColors();
  const { locale, t, rtl } = useI18n();
  const { activeGold, creditCents, goldExpiresAt } = useGame();
  const [topUpVisible, setTopUpVisible] = useState(false);
  const [goldVisible, setGoldVisible] = useState(false);
  return <View style={[styles.screen, rtl && styles.rtl, { backgroundColor: colors.background }]}>
    <Header title={t('store')} onBack={onBack} />
    <ScrollView contentContainerStyle={styles.storeContent}>
      <View style={[styles.storeHero, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.storeIcon, { backgroundColor: colors.secondary }]}><Feather name="zap" size={28} color={colors.amber} /></View>
        <Text style={[styles.storeTitle, { color: colors.foreground }]}>{t('storeHeroTitle')}</Text>
        <Text style={[styles.storeBody, { color: colors.mutedForeground }]}>{t('storeBody')}</Text>
        <View style={[styles.simulationBadge, { borderColor: colors.cyan, backgroundColor: colors.secondary }]}><Feather name="shield" size={13} color={colors.cyan} /><Text style={[styles.simulationBadgeText, { color: colors.cyan }]}>{t('simulationBadge')} · {t('noRealCharge')}</Text></View>
      </View>
      <Text style={[styles.settingsSection, { color: colors.amber }]}>{t('gold')} · {t('simulationBadge')}</Text>
      <HapticButton testID="store-gold-btn" onPress={() => setGoldVisible(true)} style={[styles.goldStoreCard, { backgroundColor: colors.card, borderColor: activeGold ? colors.amber : colors.border }]}>
        <View style={[styles.storeIcon, { backgroundColor: colors.secondary }]}><Feather name="award" size={25} color={colors.amber} /></View>
         <View style={styles.goldStoreCopy}><Text style={[styles.storeTitle, { color: colors.foreground }]}>{activeGold ? t('goldActive') : economyText(locale, 'economyVip')}</Text><Text style={[styles.storeBody, { color: colors.mutedForeground }]}>{activeGold ? `${t('goldExpires')}: ${goldExpiresAt ? new Date(goldExpiresAt).toLocaleDateString(locale) : ''}` : `${economyText(locale, 'economyVip')} · ${t('goldDuration')}`}</Text></View>
        <Feather name="arrow-up-right" size={18} color={colors.amber} />
      </HapticButton>
      <Text style={[styles.settingsSection, { color: colors.amber }]}>{t('creditPacks')}</Text>
      <View style={[styles.storeBalance, { borderColor: colors.cyan, backgroundColor: colors.secondary }]}>
        <Feather name="zap" size={16} color={colors.cyan} />
        <Text style={[styles.storeBalanceLabel, { color: colors.mutedForeground }]}>{economyText(locale, 'creditsBalance')}</Text>
        <Text style={[styles.storeBalanceValue, { color: colors.foreground }]}>{activeGold ? 'VIP' : formatUsdFromCents(creditCents, locale)}</Text>
      </View>
      {CREDIT_PACKAGES.slice(0, 2).map((item) => (
        <HapticButton key={item.id} testID={`store-credit-${item.id}`} onPress={() => setTopUpVisible(true)} style={[styles.packageRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View><Text style={[styles.packageAmount, { color: colors.foreground }]}>{formatUsdFromCents(item.creditCents, locale)}</Text><Text style={[styles.packageCaption, { color: colors.mutedForeground }]}>{t('noExpiry')}</Text></View>
          <View style={[styles.pricePill, { backgroundColor: colors.cyan }]}><Text style={[styles.priceText, { color: colors.ink }]}>{formatUsdFromCents(item.priceCents, locale)}</Text><Feather name="arrow-up-right" size={15} color={colors.ink} /></View>
        </HapticButton>
      ))}
      <View style={[styles.storeNote, { borderColor: colors.border }]}><Feather name="play-circle" size={17} color={colors.amber} /><Text style={[styles.noticeText, { color: colors.mutedForeground }]}>{t('storeNote')}</Text></View>
      <BrandFooter />
    </ScrollView>
    <CreditTopUpPanel visible={topUpVisible} onClose={() => setTopUpVisible(false)} />
    <GoldPurchasePanel visible={goldVisible} onClose={() => setGoldVisible(false)} />
  </View>;
}

/*
export default function Index() {
  const { ready, setOnboarded, setLanguage, setCountry } = useGame();
  const { locale } = useI18n();
  const externalCamera = Platform.OS === 'web' && typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('camera') === '1';
  const [screen, setScreen] = useState<Screen>(() => externalCamera ? 'camera' : 'boot');
  const [battleSession, setBattleSession] = useState<BattleSession | null>(null);
  const [soloGateVisible, setSoloGateVisible] = useState(false);
  // Menu audio has its own intro/effect players. It is active for boot and all
  // menu screens, but turns off before BattleScreen mounts.
  const menuAudio = useMenuAudio({ enabled: screen !== 'camera', ready });
  const [devicePreferencesApplied, setDevicePreferencesApplied] = useState(false);
  const setLanguageRef = useRef(setLanguage);
  const setCountryRef = useRef(setCountry);
  setLanguageRef.current = setLanguage;
  setCountryRef.current = setCountry;
  const navigateFromMenu = useCallback((nextScreen: Screen) => {
    if (nextScreen !== 'camera') menuAudio.playWeaponAccent();
    setScreen(nextScreen);
  }, [menuAudio.playWeaponAccent]);
  const openTeamBattle = useCallback(() => {
    // A normal team-battle entry always starts a fresh lobby. Clearing any
    // previous session prevents a stale combat screen from being reused when
    // returning from camera mode or an external preview URL.
    menuAudio.playWeaponAccent();
    setBattleSessionToken(null);
    setBattleSession(null);
    setScreen('multiplayer');
  }, [menuAudio.playWeaponAccent]);
  const openSoloCamera = useCallback(() => {
    menuAudio.playWeaponAccent();
    setSoloGateVisible(true);
  }, [menuAudio.playWeaponAccent]);
  useEffect(() => {
    if (!shouldApplyDevicePreferences(ready, devicePreferencesApplied, externalCamera)) return;
    let active = true;
    AsyncStorage.getItem('ephesus-ar-state')
      .then((raw) => {
        if (!active) return;
        let persisted: { language?: string; country?: CountryCode } = {};
        try {
          persisted = raw ? JSON.parse(raw) as typeof persisted : {};
        } catch {
          // A malformed preference file is handled by GameContext; use the
          // device locale only when no usable preference can be read.
        }
        if (!persisted.language) setLanguageRef.current(languageForGame(detectPreferredLocale()));
        if (!persisted.country) setCountryRef.current(detectPreferredRegion());
      })
      .finally(() => {
        if (active) setDevicePreferencesApplied(true);
      });
    return () => { active = false; };
  }, [devicePreferencesApplied, externalCamera, ready]);
  useEffect(() => { if (ready && !externalCamera) setScreen('boot'); }, [externalCamera, ready]);
  const bootReady = canLeaveBoot(ready, devicePreferencesApplied, externalCamera);
  const finishBoot = useCallback(() => {
    if (bootReady || externalCamera) setScreen('permissions');
  }, [bootReady, externalCamera]);
  if ((!bootReady && !externalCamera) || screen === 'boot') {
    return <BootScreen canLeave={bootReady || externalCamera} onDone={finishBoot} />;
  }
  if (screen === 'permissions') return <PermissionScreen onContinue={() => { setOnboarded(true); setScreen('home'); }} />;
  if (screen === 'camera') return <BattleScreen battleSession={battleSession} onExit={() => { setBattleSession(null); setScreen('home'); }} />;
  if (screen === 'multiplayer') return <BattleLobbyScreen onBack={() => { setBattleSession(null); navigateFromMenu('home'); }} onStart={(session) => { setBattleSession(session); setScreen('camera'); }} />;
  if (screen === 'settings') return <SettingsScreen onBack={() => navigateFromMenu('home')} />;
  if (screen === 'armory') return <WeaponSelectionScreen onBack={() => navigateFromMenu('home')} onCamera={() => { setScreen('home'); setSoloGateVisible(true); }} />;
  if (screen === 'store') return <StoreScreen onBack={() => navigateFromMenu('home')} />;
  return (
    <>
      <HomeScreen onNavigate={navigateFromMenu} onOpenCamera={openSoloCamera} onOpenTeamBattle={openTeamBattle} />
      <CameraPerformanceNotice />
      <EconomyGate
        visible={soloGateVisible}
        action="soloEntry"
        daily
        body={economyText(locale, 'economySoloDaily')}
        onApproved={() => true}
        onComplete={() => { setSoloGateVisible(false); setScreen('camera'); }}
        onCancel={() => setSoloGateVisible(false)}
        testID="solo-entry-gate"
      />
    </>
  );
}
*/
export default function Index() {
  const { ready, onboarded, setOnboarded, setLanguage, setCountry } = useGame();
  const { locale } = useI18n();
  const externalCamera = Platform.OS === 'web' && typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('camera') === '1';
  const [screen, setScreen] = useState<Screen>(() => externalCamera ? 'camera' : 'boot');
  const [battleSession, setBattleSession] = useState<BattleSession | null>(null);
  const clearBattleSession = useCallback(() => setBattleSession(null), []);
  const [soloGateVisible, setSoloGateVisible] = useState(false);
  // Menu audio has its own intro/effect players. It is active for boot and all
  // menu screens, but turns off before BattleScreen mounts.
  const menuAudio = useMenuAudio({ enabled: screen !== 'camera', ready });
  const [devicePreferencesApplied, setDevicePreferencesApplied] = useState(false);
  const setLanguageRef = useRef(setLanguage);
  const setCountryRef = useRef(setCountry);
  setLanguageRef.current = setLanguage;
  setCountryRef.current = setCountry;
  const navigateFromMenu = useCallback((nextScreen: Screen) => {
    if (nextScreen !== 'camera') menuAudio.playWeaponAccent();
    setScreen(nextScreen);
  }, [menuAudio.playWeaponAccent]);
  const openTeamBattle = useCallback(() => {
    // A normal team-battle entry always starts a fresh lobby. Clearing any
    // previous session prevents a stale combat screen from being reused when
    // returning from camera mode or an external preview URL.
    menuAudio.playWeaponAccent();
    setBattleSessionToken(null);
    setBattleSession(null);
    setScreen('multiplayer');
  }, [menuAudio.playWeaponAccent]);
  const openSoloCamera = useCallback(() => {
    menuAudio.playWeaponAccent();
    setSoloGateVisible(true);
  }, [menuAudio.playWeaponAccent]);
  useEffect(() => {
    if (!shouldApplyDevicePreferences(ready, devicePreferencesApplied, externalCamera)) return;
    let active = true;
    AsyncStorage.getItem('ephesus-ar-state')
      .then((raw) => {
        if (!active) return;
        let persisted: { language?: string; country?: CountryCode } = {};
        try {
          persisted = raw ? JSON.parse(raw) as typeof persisted : {};
        } catch {
          // A malformed preference file is handled by GameContext; use the
          // device locale only when no usable preference can be read.
        }
        if (!persisted.language) setLanguageRef.current(languageForGame(detectPreferredLocale()));
        if (!persisted.country) setCountryRef.current(detectPreferredRegion());
      })
      .finally(() => {
        if (active) setDevicePreferencesApplied(true);
      });
    return () => { active = false; };
  }, [devicePreferencesApplied, externalCamera, ready]);
  useEffect(() => { if (ready && !externalCamera) setScreen('boot'); }, [externalCamera, ready]);
  const bootReady = canLeaveBoot(ready, devicePreferencesApplied, externalCamera);
  const finishBoot = useCallback(() => {
    if (bootReady || externalCamera) setScreen(onboarded ? 'home' : 'permissions');
  }, [bootReady, externalCamera, onboarded]);
  if ((!bootReady && !externalCamera) || screen === 'boot') {
    return <BootScreen canLeave={bootReady || externalCamera} onDone={finishBoot} />;
  }
  if (screen === 'permissions') return <PermissionScreen onContinue={() => setScreen('briefing')} />;
  if (screen === 'briefing') return <BriefingScreen onDone={() => { setOnboarded(true); setScreen('home'); }} />;
  if (screen === 'camera') return <BattleScreen battleSession={battleSession} onSessionExpired={clearBattleSession} onExit={() => { setBattleSession(null); setScreen('home'); }} />;
  if (screen === 'multiplayer') return <BattleLobbyScreen onSessionExpired={clearBattleSession} onBack={() => { setBattleSession(null); navigateFromMenu('home'); }} onStart={(session) => { setBattleSession(session); setScreen('camera'); }} />;
  if (screen === 'settings') return <SettingsScreen onBack={() => navigateFromMenu('home')} />;
  if (screen === 'armory') return <WeaponSelectionScreen onBack={() => navigateFromMenu('home')} onCamera={() => { setScreen('home'); setSoloGateVisible(true); }} />;
  if (screen === 'store') return <StoreScreen onBack={() => navigateFromMenu('home')} />;
  return (
    <>
      <HomeScreen onNavigate={navigateFromMenu} onOpenCamera={openSoloCamera} onOpenTeamBattle={openTeamBattle} />
      <CameraPerformanceNotice />
      <EconomyGate
        visible={soloGateVisible}
        action="soloEntry"
        daily
        body={economyText(locale, 'economySoloDaily')}
        onApproved={() => true}
        onComplete={() => { setSoloGateVisible(false); setScreen('camera'); }}
        onCancel={() => setSoloGateVisible(false)}
        testID="solo-entry-gate"
      />
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  rtl: rtlLayout,
  rtlText: { writingDirection: 'auto' },
  boot: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  bootRing: { width: 138, height: 138, borderRadius: 69, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 25 },
  bootIcon: { width: 98, height: 98, borderRadius: 24 },
  bootTitle: { fontSize: 32, fontWeight: '700', letterSpacing: 7 },
  bootSubtitle: { fontSize: 10, letterSpacing: 3, marginTop: 8 },
  bootLine: { height: 3, width: 190, borderRadius: 2, marginTop: 62, overflow: 'hidden' },
  bootProgress: { width: '78%', height: 3 },
  bootCaption: { fontSize: 9, letterSpacing: 2, marginTop: 14 },
  footerTrack: { width: '100%', height: 24, overflow: 'hidden', justifyContent: 'center', marginTop: 18, marginBottom: 8 },
  footer: { width: 430, fontSize: 9, letterSpacing: 0.5, fontWeight: '700' },
  permissionTop: { paddingHorizontal: 24, paddingTop: 80 },
  eyebrow: { alignSelf: 'flex-start', borderRadius: 5, paddingHorizontal: 9, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 7 },
  eyebrowText: { fontSize: 9, letterSpacing: 1.5, fontWeight: '700' },
  dot: { width: 6, height: 6, borderRadius: 3 },
  display: { fontSize: 36, letterSpacing: 1.3, fontWeight: '700', marginTop: 24, lineHeight: 41 },
  displaySmall: { fontSize: 32, fontWeight: '700', lineHeight: 38, letterSpacing: 0.5, marginTop: 10, marginBottom: 24 },
  body: { fontSize: 14, lineHeight: 21, marginTop: 14, maxWidth: 340 },
  permissionLanguages: { gap: 6, paddingVertical: 14, paddingRight: 18 },
  permissionCard: { marginHorizontal: 18, marginTop: 35, borderWidth: 1, borderRadius: 20, padding: 18 },
  permissionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, gap: 12 },
  permissionIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  permissionLabel: { flex: 1, fontSize: 14, fontWeight: '600' },
  permissionHint: { fontSize: 11, lineHeight: 17, marginTop: 4 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 5 },
  statusText: { fontSize: 8, fontWeight: '700', letterSpacing: 1 },
  divider: { height: 1, marginVertical: 12 },
  primaryButton: { minHeight: 54, borderRadius: 12, paddingHorizontal: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  primaryButtonText: { fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  secondaryButton: { minHeight: 52, borderRadius: 12, borderWidth: 1, paddingHorizontal: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  secondaryButtonText: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  pressed: { opacity: 0.74, transform: [{ scale: 0.985 }] },
  disabled: { opacity: 0.4 },
  briefingTop: { paddingHorizontal: 24, paddingTop: 78 },
  overline: { fontSize: 9, fontWeight: '700', letterSpacing: 2.2 },
  countryCard: { marginHorizontal: 18, marginTop: 28, borderWidth: 1, borderRadius: 20, padding: 18 },
  sectionLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1.3, marginBottom: 10 },
  countrySection: { marginTop: 2 },
  countryChoices: { flexDirection: 'row', gap: 7 },
  countryChoice: { flex: 1, minHeight: 80, borderWidth: 1, borderRadius: 12, paddingVertical: 9, alignItems: 'center', justifyContent: 'center' },
  flag: { fontSize: 24 },
  countryCode: { fontSize: 8, fontWeight: '700', letterSpacing: 1, marginTop: 4 },
  countryName: { fontSize: 9, marginTop: 3 },
  vsRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 18 },
  vsLine: { height: 1, flex: 1 },
  vs: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  header: { minHeight: 92, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, gap: 12 },
  headerTitle: { flex: 1, fontSize: 14, fontWeight: '700', letterSpacing: 1.5 },
  iconButton: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  homeContent: { paddingHorizontal: 18, paddingTop: 62, paddingBottom: 28 },
  homeHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 25 },
  homeTitle: { fontSize: 28, fontWeight: '700', marginTop: 9, letterSpacing: 0.5 },
  signalCard: { minHeight: 168, borderRadius: 20, borderWidth: 1, padding: 19, flexDirection: 'row', gap: 18, alignItems: 'center', overflow: 'hidden' },
  radar: { width: 106, height: 106, borderRadius: 53, borderWidth: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  radarSweep: { height: 1, width: 100, position: 'absolute', transform: [{ rotate: '-42deg' }] },
  radarCenter: { width: 8, height: 8, borderRadius: 4 },
  signalCopy: { flex: 1 },
  signalLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1.7 },
  signalTitle: { fontSize: 19, fontWeight: '700', marginTop: 7 },
  signalText: { fontSize: 11, lineHeight: 16, marginTop: 6 },
  signalMeta: { flexDirection: 'row', gap: 14, marginTop: 14 },
  metaText: { fontSize: 10, fontWeight: '700' },
  missionButton: { marginTop: 14, borderRadius: 17, padding: 18, minHeight: 88, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  missionButtonOverline: { fontSize: 9, fontWeight: '700', letterSpacing: 1.8 },
  missionButtonText: { fontSize: 20, fontWeight: '700', marginTop: 5, letterSpacing: 0.2 },
  roundArrow: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  statsRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  statCard: { flex: 1, minHeight: 98, borderRadius: 14, borderWidth: 1, padding: 12 },
  statValue: { fontSize: 18, fontWeight: '700', marginTop: 12 },
  statLabel: { fontSize: 8, letterSpacing: 0.8, marginTop: 4 },
  homeSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 31, marginBottom: 12 },
  homeSectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  homeSectionHint: { fontSize: 9, letterSpacing: 1 },
  toolRow: { flexDirection: 'row', gap: 10 },
  toolCard: { flex: 1, minHeight: 138, borderRadius: 16, borderWidth: 1, padding: 14, position: 'relative' },
  toolIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  toolTitle: { fontSize: 14, fontWeight: '700', marginTop: 16 },
  toolSubtitle: { fontSize: 10, marginTop: 5 },
  toolArrow: { position: 'absolute', right: 14, top: 16 },
  notice: { borderRadius: 12, borderWidth: 1, flexDirection: 'row', gap: 10, padding: 13, marginTop: 16, alignItems: 'center' },
  noticeText: { flex: 1, fontSize: 11, lineHeight: 16 },
  settingsContent: { paddingHorizontal: 18, paddingTop: 20, paddingBottom: 32 },
  settingsHero: { borderWidth: 1, borderRadius: 18, padding: 17, flexDirection: 'row', alignItems: 'center', gap: 14 },
  settingsOrb: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  settingsTitle: { fontSize: 15, fontWeight: '700', letterSpacing: 1.2 },
  settingsSubtitle: { fontSize: 9, marginTop: 5, letterSpacing: 1 },
  settingsSection: { fontSize: 9, fontWeight: '700', letterSpacing: 1.7, marginTop: 27, marginBottom: 9 },
  settingsGroup: { borderWidth: 1, borderRadius: 15, overflow: 'hidden' },
  audioSettingRow: { minHeight: 62, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, gap: 8 },
  audioAdjustButton: { width: 32, height: 32, borderWidth: 1, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  audioPercentage: { width: 43, textAlign: 'center', fontSize: 12, fontWeight: '800' },
  goldSettingsCard: { borderWidth: 1, borderRadius: 15, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 9 },
  goldSettingsIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  goldSettingsCopy: { flex: 1, minWidth: 0 },
  goldSettingsTitle: { fontSize: 12, fontWeight: '900' },
  goldSettingsBody: { fontSize: 9, lineHeight: 14, marginTop: 3 },
  goldSettingsButton: { borderWidth: 1, borderRadius: 9, minHeight: 36, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' },
  goldSettingsButtonText: { fontSize: 8, fontWeight: '900', textAlign: 'center' },
  settingRow: { minHeight: 61, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 11, borderBottomWidth: 1 },
  settingIcon: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  settingLabel: { flex: 1, fontSize: 13, fontWeight: '600' },
  languageRow: { flexDirection: 'row', gap: 4 },
  languageChip: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 6 },
  languageChipText: { fontSize: 8, fontWeight: '700' },
  detailOverlay: { flex: 1, backgroundColor: 'rgba(7,17,15,0.72)', justifyContent: 'flex-end' },
  detailSheet: { minHeight: 320, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, padding: 23 },
  sheetHandle: { width: 38, height: 4, borderRadius: 2, backgroundColor: '#45665D', alignSelf: 'center', marginBottom: 18 },
  sheetClose: { position: 'absolute', right: 17, top: 20, width: 35, height: 35, alignItems: 'center', justifyContent: 'center' },
  detailTitle: { fontSize: 22, fontWeight: '700', marginTop: 12, marginBottom: 18 },
  detailScroll: { maxHeight: 390 },
  detailScrollContent: { paddingBottom: 12 },
  detailBody: { fontSize: 14, lineHeight: 23 },
  feedbackButton: { minHeight: 52, borderRadius: 12, marginTop: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  feedbackButtonText: { flex: 1, fontSize: 12, fontWeight: '800' },
  armoryContent: { padding: 18, paddingBottom: 30 },
  weaponCard: { borderWidth: 1, borderRadius: 18, padding: 15, marginTop: 12 },
  weaponHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  weaponCardName: { fontSize: 15, fontWeight: '700', letterSpacing: 0.8 },
  weaponCardType: { fontSize: 9, letterSpacing: 1.2, marginTop: 5 },
  weaponBadge: { paddingHorizontal: 7, paddingVertical: 5, borderRadius: 5 },
  weaponBadgeText: { fontSize: 8, fontWeight: '700', letterSpacing: 1 },
  weaponArt: { height: 118, borderRadius: 12, marginTop: 16, overflow: 'hidden', justifyContent: 'center', paddingHorizontal: 24 },
  weaponSilhouette: { height: 13, width: '78%', borderRadius: 8, transform: [{ rotate: '-6deg' }] },
  weaponBarrel: { height: 7, width: '23%', borderRadius: 4, position: 'absolute', right: 16, top: 43, transform: [{ rotate: '-6deg' }] },
  weaponFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 },
  weaponAmmo: { fontSize: 15, fontWeight: '700' },
  weaponAction: { fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  armoryNote: { borderWidth: 1, borderRadius: 12, padding: 13, marginTop: 15, flexDirection: 'row', gap: 9, alignItems: 'center' },
  storeContent: { padding: 18, paddingBottom: 32 },
  storeHero: { borderWidth: 1, borderRadius: 18, padding: 20 },
  simulationBadge: { borderWidth: 1, borderRadius: 9, minHeight: 32, marginTop: 15, paddingHorizontal: 9, flexDirection: 'row', alignItems: 'center', gap: 6 },
  simulationBadgeText: { flex: 1, fontSize: 9, lineHeight: 13, fontWeight: '800' },
  storeIcon: { width: 54, height: 54, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginBottom: 17 },
  storeTitle: { fontSize: 20, fontWeight: '700', letterSpacing: 0.4 },
  storeBody: { fontSize: 13, lineHeight: 20, marginTop: 8 },
  packageRow: { borderWidth: 1, borderRadius: 15, minHeight: 82, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 9 },
  packageAmount: { fontSize: 16, fontWeight: '700', letterSpacing: 1 },
  packageCaption: { fontSize: 10, marginTop: 5 },
  pricePill: { borderRadius: 9, minHeight: 40, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  priceText: { fontSize: 13, fontWeight: '700' },
  storeNote: { borderWidth: 1, borderRadius: 12, padding: 13, marginTop: 17, flexDirection: 'row', gap: 9, alignItems: 'center' },
  storeBalance: { minHeight: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  storeBalanceLabel: { flex: 1, fontSize: 11, fontWeight: '700' },
  storeBalanceValue: { fontSize: 16, fontWeight: '900' },
  goldStoreCard: { borderWidth: 1, borderRadius: 15, minHeight: 82, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 9 },
  goldStoreCopy: { flex: 1, minWidth: 0 },
});
