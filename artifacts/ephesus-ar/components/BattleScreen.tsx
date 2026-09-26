import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, AppState, Modal, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useKeepAwake } from 'expo-keep-awake';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useI18n } from '@/hooks/useI18n';
import { cameraFacingLabel } from '@/lib/i18n';
import { useGame } from '@/context/GameContext';
import { useWeaponAudio } from '@/hooks/useWeaponAudio';
import { useMenuAudio } from '@/hooks/useMenuAudio';
import { getWeapon, getWeaponAmmoLabel, getWeaponFireLabel, type WeaponId } from '@/lib/weapons';
import { economyText } from '@/lib/economy-ui';
import { addImpact, type TrackedImpact } from '@/lib/impact-tracker';
import { PausableTimers } from '@/lib/pausable-timers';
import { impactForWeapon, projectileFlightMs } from '@/lib/weapon-impact';
import { advanceEnemyCombat, hideEnemy, hitMedkitDrop, hitPeekingEnemy, scheduleEnemyAppearance, shiftEnemyCombatTime, squadGrenadeSuggestion, startEnemyRound, type EnemyCombat, type EnemyVariant } from '@/lib/enemy-combat';
import { heldShotIntervalMs } from '@/lib/automatic-fire';
import { effectiveScopeZoom } from '@/lib/scope-zoom';
import LiveBattleCamera from './LiveBattleCamera';
import type { CameraStatus } from './camera-types';
import ImpactEffects from './ImpactEffects';
import EnemyOverlay from './EnemyOverlay';
import AimTouchLayer from './AimTouchLayer';
import FireButton from './FireButton';
import WeaponView from './WeaponView';
import { NormalReticle } from './ScopeOverlay';
import { VisionModeControl, VisionModeOverlay } from './VisionModeControl';
import WeaponCatalogList from './WeaponCatalogList';
import EconomyGate from './EconomyGate';
import { IronSightOverlay, ScopeOverlay } from './ScopeOverlay';

type Props = { onExit: () => void };

const THREAT_LABELS: Record<EnemyVariant, { tr: string; en: string }> = {
  rifle: { tr: 'DÜŞMAN YAKLAŞIYOR', en: 'ENEMY APPROACHING' },
  scout: { tr: 'İZCİ BİRLİĞİ', en: 'SCOUT UNIT' },
  heavy: { tr: 'AĞIR MAKİNELİ', en: 'HEAVY GUNNER' },
  sniper: { tr: 'KESKİN NİŞANCI', en: 'SNIPER' },
  rocketeer: { tr: 'ROKETÇİ', en: 'ROCKET SOLDIER' },
  cobra: { tr: 'KOBRA · HAVA DESTEĞİ', en: 'COBRA · AIR SUPPORT' },
  tank: { tr: 'TANK · MERKEZ GEÇİŞİ', en: 'TANK · CENTER CROSSING' },
  jet: { tr: 'SAVAŞ UÇAĞI · HAVA DESTEĞİ', en: 'FIGHTER JET · AIR SUPPORT' },
  sidecar: { tr: 'SEPETLİ MOTOSİKLET · YOL GEÇİŞİ', en: 'SIDECAR MOTORCYCLE · ROAD CROSSING' },
  'mortar-team': { tr: 'HAVAN EKİBİ KURULUYOR', en: 'MORTAR CREW DEPLOYING' },
  'machinegun-team': { tr: 'MAKİNELİ TÜFEK EKİBİ', en: 'MACHINE-GUN CREW DEPLOYING' },
  squad: { tr: '10 KİŞİLİK DÜŞMAN TAKIMI', en: '10-PERSON ENEMY SQUAD' },
  laser: { tr: 'LAZERLİ ASKER', en: 'LASER SOLDIER' },
  robot: { tr: 'SAVAŞ ROBOTU', en: 'COMBAT ROBOT' },
};

export default function BattleScreen({ onExit }: Props) {
  useKeepAwake(undefined, { suppressDeactivateWarnings: true });
  const colors = useColors();
  const { t, rtl, locale } = useI18n();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { selectedWeapon, setSelectedWeapon, flashlightEnabled, activeGold, ammo: savedAmmo, ready: gameReady, musicEnabled, setAudioPreferences } = useGame();
  const audio = useWeaponAudio();
  const audioRef = useRef(audio);
  audioRef.current = audio;
  const battleMusic = useMenuAudio({ enabled: true, ready: gameReady, track: 'battle' });
  const [status, setStatus] = useState<CameraStatus>({ state: 'requesting', message: t('cameraHint') });
  const [visionMode, setVisionMode] = useState<'normal' | 'nightVision' | 'thermal'>('normal');
  const [restartKey, setRestartKey] = useState(0);
  const [facing, setFacing] = useState<'front' | 'back'>('back');
  const [torchOn, setTorchOn] = useState(false);
  const [flashNotice, setFlashNotice] = useState('');
  const [impacts, setImpacts] = useState<TrackedImpact[]>([]);
  const [projectileTarget, setProjectileTarget] = useState({ x: 0, y: 0 });
  const [fireSignal, setFireSignal] = useState(0);
  const [isFiring, setIsFiring] = useState(false);
  const [ammo, setAmmo] = useState(savedAmmo);
  const [spareMagazines, setSpareMagazines] = useState(2);
  const [isReloading, setIsReloading] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [scopeActive, setScopeActive] = useState(false);
  const [enemyEnabled, setEnemyEnabled] = useState(false);
  const [enemyCombat, setEnemyCombat] = useState(() => startEnemyRound(Date.now()));
  const warningId = enemyCombat.warning?.id;
  const [silentWarningId, setSilentWarningId] = useState(0);
  const [refillVisible, setRefillVisible] = useState(false);
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  const holdTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const reloadTimerRef = useRef(new PausableTimers());
  const ammoRef = useRef(savedAmmo);
  const magazineRef = useRef(new Map<WeaponId, { ammo: number; reserve: number }>());
  const previousWeaponRef = useRef<WeaponId>(selectedWeapon);
  const lastFireRef = useRef(0);
  const fireRef = useRef<() => void>(() => undefined);
  const aimPointRef = useRef({ x: 0, y: 0 });
  const impactsRef = useRef<TrackedImpact[]>([]);
  const impactIdRef = useRef(0);
  const lastImpactAtRef = useRef(0);
  const impactGenerationRef = useRef(0);
  const impactTimersRef = useRef(new PausableTimers());
  const defeatTimerRef = useRef(new PausableTimers());
  const defeatScheduledRef = useRef(false);
  const restartRoundRef = useRef<() => void>(() => undefined);
  const enemyCombatRef = useRef<EnemyCombat>(enemyCombat);
  const lastEnemyShotRef = useRef(0);
  const lastEnemyWarningRef = useRef(0);
  const lastEnemyEntranceRef = useRef(0);
  const lastHealthRef = useRef(enemyCombat.health);
  const pickerPauseAtRef = useRef<number | null>(null);
  const damageAnim = useRef(new Animated.Value(0)).current;
  const aimAnim = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const fireAnim = useRef(new Animated.Value(0)).current;
  const recoilAnim = useRef(new Animated.Value(0)).current;
  const zoomAnim = useRef(new Animated.Value(1)).current;
  const reloadAnim = useRef(new Animated.Value(0)).current;
  const knifeThrowAnim = useRef(new Animated.Value(0)).current;
  const weapon = getWeapon(selectedWeapon);
  const scopedZoom = effectiveScopeZoom(weapon.zoom);
  const cameraOrEnemyReady = status.state === 'live' || status.state === 'blocked' || status.state === 'error' || status.state === 'unsupported';
  const combatReady = cameraOrEnemyReady && appActive && !isReloading && !pickerVisible && !refillVisible && (!enemyEnabled || enemyCombat.health > 0);
  const showEnemyOverlay = enemyEnabled && cameraOrEnemyReady && appActive && !refillVisible;
  ammoRef.current = ammo;

  useEffect(() => {
    const interval = setInterval(() => {
      if (!impactsRef.current.length) return;
      const active = impactsRef.current.filter((item) => item.expiresAt > Date.now());
      if (active.length === impactsRef.current.length) return;
      impactsRef.current = active;
      setImpacts(active);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const updateEnemyCombat = useCallback((next: EnemyCombat) => {
    enemyCombatRef.current = next;
    setEnemyCombat(next);
  }, []);

  useEffect(() => {
    if (!enemyEnabled || !cameraOrEnemyReady || !appActive || pickerVisible || refillVisible || enemyCombat.health === 0) return;
    const timer = setInterval(() => {
      const previous = enemyCombatRef.current;
      const next = advanceEnemyCombat(previous, Date.now(), Math.random());
      if (next !== previous) updateEnemyCombat(next);
    }, 100);
    return () => clearInterval(timer);
  }, [appActive, cameraOrEnemyReady, enemyCombat.health, enemyEnabled, pickerVisible, refillVisible, updateEnemyCombat]);

  useEffect(() => {
    if (cameraOrEnemyReady && appActive && enemyEnabled && !refillVisible) return;
    audioRef.current.stopEnemyCombatAudio();
    const next = hideEnemy(enemyCombatRef.current, Date.now());
    if (next !== enemyCombatRef.current) updateEnemyCombat(next);
  }, [appActive, cameraOrEnemyReady, enemyEnabled, refillVisible, updateEnemyCombat]);

  useEffect(() => {
    if (!enemyEnabled || !appActive || pickerVisible || refillVisible || warningId === undefined) {
      audioRef.current.stopEnemyWarning();
      return;
    }
    if (warningId === lastEnemyWarningRef.current) return;
    lastEnemyWarningRef.current = warningId;
    setSilentWarningId(0);
    let cancelled = false;
    let settled = false;
    const finish = (started: boolean) => {
      if (cancelled || settled) return;
      settled = true;
      clearTimeout(timeout);
      if (!started) {
        audioRef.current.stopEnemyWarning();
        setSilentWarningId(warningId);
      }
      const current = enemyCombatRef.current;
      if (current.warning?.id === warningId) {
        updateEnemyCombat(scheduleEnemyAppearance(current, warningId, Date.now()));
      }
    };
    const timeout = setTimeout(() => finish(false), 3000);
    void audioRef.current.playEnemyWarning(enemyCombatRef.current.warning?.radioCue).then(finish, () => finish(false));
    return () => {
      cancelled = true;
      clearTimeout(timeout);
      audioRef.current.stopEnemyWarning();
    };
  }, [appActive, enemyEnabled, pickerVisible, refillVisible, updateEnemyCombat, warningId]);

  useEffect(() => {
    const visitor = enemyCombat.enemy;
    if (!enemyEnabled || !visitor || visitor.id === lastEnemyEntranceRef.current) return;
    lastEnemyEntranceRef.current = visitor.id;
    audioRef.current.playEnemyEntrance(visitor.variant);
    return () => {
      if (visitor.variant === 'cobra') audioRef.current.stopEnemyRotor();
    };
  }, [enemyCombat.enemy?.id, enemyEnabled]);

  useEffect(() => {
    const tookDamage = enemyCombat.health < lastHealthRef.current;
    lastHealthRef.current = enemyCombat.health;
    const attack = enemyCombat.lastAttack;
    if (!enemyEnabled || !attack || attack.id === lastEnemyShotRef.current) return;
    lastEnemyShotRef.current = attack.id;
    if (attack.kind === 'impact') audioRef.current.playEnemyImpact();
    else audioRef.current.playEnemyShot(attack.variant);
    if (!tookDamage) return;
    damageAnim.setValue(0.55);
    const pulse = Animated.timing(damageAnim, { toValue: 0, duration: 520, useNativeDriver: true });
    pulse.start();
    return () => pulse.stop();
  }, [damageAnim, enemyCombat.lastAttack, enemyCombat.health, enemyEnabled]);

  useEffect(() => {
    Animated.timing(zoomAnim, {
      toValue: scopeActive ? scopedZoom : 1,
      duration: 260,
      useNativeDriver: true,
    }).start();
  }, [scopeActive, scopedZoom, zoomAnim]);

  useEffect(() => {
    const previous = previousWeaponRef.current;
    if (previous !== selectedWeapon) {
      reloadTimerRef.current.cancelAll();
      setIsReloading(false);
      reloadAnim.stopAnimation();
      reloadAnim.setValue(0);
      if (holdTimer.current) clearInterval(holdTimer.current);
      holdTimer.current = null;
      setIsFiring(false);
      magazineRef.current.set(previous, { ammo: ammoRef.current, reserve: spareMagazines });
      previousWeaponRef.current = selectedWeapon;
    }
    audio.prepareWeapon(selectedWeapon);
    const next = getWeapon(selectedWeapon);
    const saved = magazineRef.current.get(selectedWeapon) ?? { ammo: next.capacity, reserve: 2 };
    ammoRef.current = saved.ammo;
    setAmmo(saved.ammo);
    setSpareMagazines(saved.reserve);
    setScopeActive(false);
    // Only a weapon change restores its magazine; a refill must not reset it.
  }, [selectedWeapon]);

  useEffect(() => () => {
    impactGenerationRef.current += 1;
    impactTimersRef.current.cancelAll();
    defeatTimerRef.current.cancelAll();
    reloadTimerRef.current.cancelAll();
    if (holdTimer.current) clearInterval(holdTimer.current);
  }, []);

  const fire = useCallback(() => {
    const now = Date.now();
    if (!combatReady || now - lastFireRef.current < weapon.interval) return;
    if (!activeGold && ammoRef.current <= 0) {
      if (holdTimer.current) clearInterval(holdTimer.current);
      holdTimer.current = null;
      setIsFiring(false);
      return;
    }
    lastFireRef.current = now;
    if (!activeGold) {
      ammoRef.current = Math.max(0, ammoRef.current - 1);
      setAmmo(ammoRef.current);
    }
    setFireSignal((value) => value + 1);
    const flightMs = projectileFlightMs(weapon);
    if (flightMs > 0 || weapon.id === 'knife') setProjectileTarget({ ...aimPointRef.current });
    const screenPoint = { x: width / 2 + aimPointRef.current.x, y: height / 2 + aimPointRef.current.y };
    const targetEnemyId = enemyCombatRef.current.enemy?.id;
    const hitEnemy = (at: number) => {
      const previous = enemyCombatRef.current;
      if (enemyEnabled && weapon.id !== 'flashbang' && weapon.id !== 'smoke-grenade') {
        const healed = hitMedkitDrop(previous, screenPoint, width, height, at, flightMs ? 1.7 : 1);
        if (healed !== previous) {
          updateEnemyCombat(healed);
          return true;
        }
      }
      if (!enemyEnabled || !previous.enemy || previous.enemy.id !== targetEnemyId) return false;
      const next = hitPeekingEnemy(previous, screenPoint, width, height, at, flightMs ? 1.7 : 1, weapon);
      if (next === previous) return false;
      updateEnemyCombat(next);
      if (previous.enemy.variant === 'cobra' && !next.enemy) audioRef.current.stopEnemyRotor();
      if (!next.enemy && (previous.enemy.variant === 'tank' || previous.enemy.variant === 'cobra' || previous.enemy.variant === 'jet' || previous.enemy.variant === 'sidecar')) audioRef.current.playEnemyImpact();
      return true;
    };
    const hitNow = flightMs === 0 && hitEnemy(now);
    if (flightMs > 0 || (!hitNow && now - lastImpactAtRef.current >= 1100)) {
      lastImpactAtRef.current = now;
      const id = ++impactIdRef.current;
      const kind = impactForWeapon(weapon);
      const point = {
        x: (width / 2 + aimPointRef.current.x) / Math.max(1, width),
        y: (height / 2 + aimPointRef.current.y) / Math.max(1, height),
      };
      const placeImpact = () => {
        if (flightMs > 0) hitEnemy(Date.now());
        const arrivedAt = Date.now();
        // Brief screen-space feedback only: no camera-frame sampling and no
        // long-lived burn attached to where the camera used to point.
        const updated = addImpact(impactsRef.current, null, point, kind, id, arrivedAt);
        impactsRef.current = updated;
        setImpacts(updated);
      };
      if (flightMs > 0) {
        const generation = impactGenerationRef.current;
        impactTimersRef.current.add(() => {
          if (generation === impactGenerationRef.current) placeImpact();
        }, flightMs);
      } else placeImpact();
    }
    const throwable = weapon.archetype === 'grenade' || weapon.archetype === 'launcher' || weapon.id === 'knife';
    if (throwable) {
      knifeThrowAnim.stopAnimation();
      knifeThrowAnim.setValue(0);
      Animated.timing(knifeThrowAnim, { toValue: 1, duration: flightMs || 800, useNativeDriver: true }).start(() => {
        knifeThrowAnim.setValue(0);
      });
    }
    fireAnim.setValue(1);
    recoilAnim.setValue(1);
    Animated.parallel([
      Animated.timing(fireAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
      Animated.timing(recoilAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start();
    audio.playShot(selectedWeapon);
  }, [activeGold, audio, combatReady, enemyEnabled, fireAnim, height, knifeThrowAnim, recoilAnim, selectedWeapon, updateEnemyCombat, weapon, weapon.archetype, weapon.id, weapon.interval, width]);
  fireRef.current = fire;

  const reload = useCallback(() => {
    if (!combatReady || isReloading || (!activeGold && spareMagazines <= 0) || ammo >= weapon.capacity) return;
    setIsFiring(false);
    if (holdTimer.current) clearInterval(holdTimer.current);
    holdTimer.current = null;
    setIsReloading(true);
    if (!activeGold) setSpareMagazines((value) => Math.max(0, value - 1));
    reloadTimerRef.current.cancelAll();
    reloadTimerRef.current.add(() => {
      setIsReloading(false);
      ammoRef.current = weapon.capacity;
      setAmmo(weapon.capacity);
    }, 1500);
    reloadAnim.setValue(1);
    Animated.timing(reloadAnim, { toValue: 0, duration: 1500, useNativeDriver: true }).start();
    audio.playReload();
  }, [activeGold, ammo, audio, combatReady, isReloading, reloadAnim, spareMagazines, weapon.capacity]);

  const startFire = useCallback(() => {
    if (holdTimer.current) return;
    setIsFiring(true);
    fire();
    if (weapon.automatic) {
      holdTimer.current = setInterval(() => fireRef.current(), heldShotIntervalMs(weapon));
    }
  }, [fire, weapon]);
  const stopFire = useCallback(() => {
    setIsFiring(false);
    if (holdTimer.current) clearInterval(holdTimer.current);
    holdTimer.current = null;
  }, []);
  useEffect(() => {
    if (pickerVisible || !appActive) reloadTimerRef.current.pause();
    else reloadTimerRef.current.resume();
    if (pickerVisible) {
      if (pickerPauseAtRef.current === null) pickerPauseAtRef.current = Date.now();
      stopFire();
      audioRef.current.stopEnemyCombatAudio();
      // A pending radio cue must restart on resume, or an unscheduled
      // warning can remain on screen forever after its sound was cancelled.
      if (enemyCombatRef.current.warning?.appearsAt === null) lastEnemyWarningRef.current = 0;
      impactTimersRef.current.pause();
      return;
    }
    const pausedAt = pickerPauseAtRef.current;
    if (pausedAt === null) return;
    pickerPauseAtRef.current = null;
    const shifted = shiftEnemyCombatTime(enemyCombatRef.current, Date.now() - pausedAt);
    if (shifted !== enemyCombatRef.current) updateEnemyCombat(shifted);
    impactTimersRef.current.resume();
    if (enemyEnabled && shifted.enemy?.variant === 'cobra') audioRef.current.playEnemyEntrance('cobra');
  }, [appActive, pickerVisible, enemyEnabled, stopFire, updateEnemyCombat]);
  useEffect(() => {
    if (enemyEnabled && enemyCombat.health === 0) stopFire();
  }, [enemyCombat.health, enemyEnabled, stopFire]);
  useEffect(() => {
    if (pickerVisible || refillVisible) stopFire();
  }, [pickerVisible, refillVisible, stopFire]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      const active = next === 'active';
      setAppActive(active);
      if (!active) {
        stopFire();
        setTorchOn(false);
        impactGenerationRef.current += 1;
        impactTimersRef.current.cancelAll();
      }
    });
    return () => subscription.remove();
  }, [stopFire]);

  const chooseFacing = (next: 'front' | 'back') => {
    if (next === facing) return;
    stopFire();
    setTorchOn(false);
    setFlashNotice('');
    impactGenerationRef.current += 1;
    impactTimersRef.current.cancelAll();
    impactsRef.current = [];
    setImpacts([]);
    setStatus({ state: 'requesting', message: `${cameraFacingLabel(locale, next)} · ${t('waiting')}` });
    setFacing(next);
  };

  const toggleTorch = () => {
    if (facing !== 'back' || Platform.OS === 'web') {
      setFlashNotice(`${cameraFacingLabel(locale, facing)} · ${t('flashlightUnsupported')}`);
      return;
    }
    if (!appActive || status.state !== 'live') {
      setFlashNotice(status.message);
      return;
    }
    setFlashNotice('');
    setTorchOn((on) => !on);
  };

  const resetEnemies = () => {
    stopFire();
    defeatTimerRef.current.cancelAll();
    defeatScheduledRef.current = false;
    audio.stopEnemyCombatAudio();
    lastEnemyShotRef.current = 0;
    lastEnemyWarningRef.current = 0;
    lastEnemyEntranceRef.current = 0;
    updateEnemyCombat(startEnemyRound(Date.now()));
  };
  const restartEnemyRound = () => {
    reloadTimerRef.current.cancelAll();
    setIsReloading(false);
    reloadAnim.setValue(0);
    ammoRef.current = weapon.capacity;
    setAmmo(weapon.capacity);
    setSpareMagazines(2);
    magazineRef.current.set(selectedWeapon, { ammo: weapon.capacity, reserve: 2 });
    resetEnemies();
  };
  restartRoundRef.current = restartEnemyRound;
  useEffect(() => {
    if (!enemyEnabled || enemyCombat.health !== 0) {
      defeatTimerRef.current.cancelAll();
      defeatScheduledRef.current = false;
      return;
    }
    if (!defeatScheduledRef.current) {
      defeatScheduledRef.current = true;
      defeatTimerRef.current.add(() => restartRoundRef.current(), 5000);
    }
    if (pickerVisible || !appActive) defeatTimerRef.current.pause();
    else defeatTimerRef.current.resume();
  }, [appActive, enemyCombat.health, enemyEnabled, pickerVisible]);
  const toggleEnemies = () => {
    stopFire();
    if (enemyEnabled) {
      audio.stopEnemyCombatAudio();
      if (enemyCombatRef.current.health === 0) restartEnemyRound();
      updateEnemyCombat(hideEnemy(enemyCombatRef.current, Date.now()));
      setEnemyEnabled(false);
    } else {
      if (enemyCombatRef.current.health === 0) restartEnemyRound();
      else updateEnemyCombat({ ...enemyCombatRef.current, enemy: null, warning: null, nextAppearanceAt: Date.now() + 2400 });
      audio.prepareEnemyAudio();
      setEnemyEnabled(true);
    }
  };

  const warningCopy = enemyEnabled && enemyCombat.warning
    ? `${silentWarningId === warningId ? (locale === 'tr' ? 'TELSİZ SESSİZ' : 'RADIO UNAVAILABLE') : (locale === 'tr' ? 'TELSİZ' : 'RADIO')} · ${THREAT_LABELS[enemyCombat.warning.variant][locale === 'tr' ? 'tr' : 'en']}`
    : '';
  const topMessage = flashNotice || audio.error || battleMusic.error
    || (showEnemyOverlay && enemyCombat.enemy?.variant === 'squad'
      ? squadGrenadeSuggestion(locale === 'tr' ? 'tr' : 'en') : '')
    || (showEnemyOverlay && enemyCombat.medkit ? (locale === 'tr' ? 'İLK YARDIM · VUR, +1 CAN' : 'FIRST AID · SHOOT FOR +1 HP') : '')
    || warningCopy || status.message;
  const isTopAlert = topMessage !== status.message || status.state !== 'live';

  return (
    <View style={styles.root}>
      <Animated.View style={[StyleSheet.absoluteFill, {
        transform: [
          { translateX: Animated.multiply(aimAnim.x, Animated.subtract(1, zoomAnim)) },
          { translateY: Animated.multiply(aimAnim.y, Animated.subtract(1, zoomAnim)) },
          { scale: zoomAnim },
        ],
      }]}>
        <LiveBattleCamera
          key={`${facing}-${restartKey}`}
          onStatus={(next) => {
            if (next.state !== 'live') setTorchOn(false);
            setStatus(next);
          }}
          restartKey={restartKey}
          facing={facing}
          fireSignal={fireSignal}
          flashlightEnabled={flashlightEnabled}
          torchOn={torchOn}
        />
      </Animated.View>
      <ImpactEffects impacts={status.state === 'live' ? impacts : []} width={width} height={height} />
      <VisionModeOverlay mode={visionMode} />
       <EnemyOverlay
          enemy={showEnemyOverlay ? enemyCombat.enemy : null}
          projectile={showEnemyOverlay ? enemyCombat.projectile : null}
          medkit={showEnemyOverlay ? enemyCombat.medkit : null}
          death={showEnemyOverlay ? enemyCombat.death : null}
          lastAttack={showEnemyOverlay ? enemyCombat.lastAttack : null}
         width={width} height={height} paused={pickerVisible}
       />
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.damageWash, { opacity: damageAnim }]} />
      <AimTouchLayer onAim={(x, y) => { aimPointRef.current = { x, y }; aimAnim.setValue({ x, y }); }} />
      <NormalReticle aimAnim={aimAnim} isScopeActive={scopeActive} color={colors.cyan} />
      <IronSightOverlay aimAnim={aimAnim} isActive={scopeActive && weapon.zoom <= 1.5} reticleColor={colors.cyan} />
      <ScopeOverlay aimAnim={aimAnim} isScopeActive={scopeActive && weapon.zoom > 1.5} zoom={scopedZoom} reticleColor={colors.cyan} />
      <WeaponView
        weaponId={selectedWeapon}
        archetype={weapon.archetype}
        aimAnim={aimAnim}
        fireAnim={fireAnim}
        recoilAnim={recoilAnim}
        reloadAnim={reloadAnim}
        knifeThrowAnim={knifeThrowAnim}
        knifeThrowTarget={projectileTarget}
        isAiming={scopeActive}
      />
       <View style={[styles.topBar, { top: insets.top + 4 }]} pointerEvents="box-none">
        <Pressable onPress={() => { stopFire(); setTorchOn(false); reloadTimerRef.current.cancelAll(); setIsReloading(false); onExit(); }} style={styles.iconButton} accessibilityLabel={t('close')}>
           <Feather name={rtl ? 'arrow-right' : 'arrow-left'} size={19} color={colors.foreground} />
        </Pressable>
        <View style={styles.statusCopy}>
           <View style={styles.topSummary}>
             <Text numberOfLines={1} style={[styles.topTitle, { color: colors.foreground }]}>{t('camera')}</Text>
             {enemyEnabled && <Text numberOfLines={1} style={styles.enemyScoreText}>
               {locale === 'tr' ? 'CAN' : 'HP'} {enemyCombat.health}/10 · {locale === 'tr' ? 'V' : 'K'} {enemyCombat.kills}{enemyCombat.automaticTotalHits > 0 ? ` · OTO ${enemyCombat.automaticTotalHits}` : ''}
             </Text>}
           </View>
           <Text numberOfLines={1} accessibilityLabel={topMessage} style={[styles.topStatus, { color: isTopAlert ? colors.amber : colors.cyan }]}>
             {topMessage}
          </Text>
        </View>
         <Pressable testID="battle-music-toggle" accessibilityRole="switch" accessibilityState={{ checked: musicEnabled }} accessibilityLabel={locale === 'tr' ? `Müzik ${musicEnabled ? 'açık' : 'kapalı'}` : `Music ${musicEnabled ? 'on' : 'off'}`} onPress={() => setAudioPreferences({ musicEnabled: !musicEnabled })} style={[styles.iconButton, { borderColor: musicEnabled ? colors.cyan : colors.border }]}>
           <Feather name={musicEnabled ? 'music' : 'volume-x'} size={17} color={musicEnabled ? colors.cyan : colors.foreground} />
         </Pressable>
          <Pressable onPress={() => { resetEnemies(); setTorchOn(false); setFlashNotice(''); impactGenerationRef.current += 1; impactTimersRef.current.cancelAll(); impactsRef.current = []; setImpacts([]); setRestartKey((value) => value + 1); }} style={styles.iconButton} accessibilityLabel={t('tryAgain')}>
          <Feather name="refresh-cw" size={19} color={colors.foreground} />
        </Pressable>
      </View>
       <View style={[styles.cameraControls, { top: insets.top + 52 }]} pointerEvents="box-none">
        {(['front', 'back'] as const).map((side) => (
          <Pressable
            key={side}
            testID={`camera-${side}-button`}
            accessibilityRole="button"
            accessibilityLabel={`${t('camera')} · ${cameraFacingLabel(locale, side)}`}
            accessibilityState={{ selected: facing === side }}
            onPress={() => chooseFacing(side)}
            style={[styles.cameraControl, { borderColor: facing === side ? colors.cyan : colors.border }]}
          >
            <Feather name={side === 'front' ? 'user' : 'camera'} size={16} color={facing === side ? colors.cyan : colors.foreground} />
            <Text numberOfLines={1} style={[styles.cameraControlText, { color: facing === side ? colors.cyan : colors.foreground }]}>
              {cameraFacingLabel(locale, side)}
            </Text>
          </Pressable>
        ))}
        <Pressable
          testID="camera-flash-button"
          accessibilityRole="button"
          accessibilityLabel={torchOn ? t('flashlightOn') : t('flashlightOff')}
          accessibilityState={{ selected: torchOn }}
          onPress={toggleTorch}
          style={[styles.cameraControl, { borderColor: torchOn ? colors.amber : colors.border }]}
        >
          <Feather name={torchOn ? 'zap' : 'zap-off'} size={16} color={torchOn ? colors.amber : colors.foreground} />
          <Text numberOfLines={1} style={[styles.cameraControlText, { color: torchOn ? colors.amber : colors.foreground }]}>
            {torchOn ? t('flashlightOn') : t('flashlightOff')}
          </Text>
        </Pressable>
      </View>
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]} pointerEvents="box-none">
        <View style={styles.controlColumn}>
          <VisionModeControl activeMode={visionMode} onModeChange={setVisionMode} cameraFacing={facing} />
          <Pressable onPress={() => setPickerVisible(true)} style={[styles.weapon, { borderColor: colors.border }]} accessibilityLabel={t('equipmentSelection')}>
            <Feather name="crosshair" size={16} color={colors.cyan} />
            <Text numberOfLines={1} style={[styles.weaponText, { color: colors.foreground }]}>{weapon.name}</Text>
          </Pressable>
          <Text style={[styles.ammo, { color: colors.foreground }]}>{ammo} / {spareMagazines} {getWeaponAmmoLabel(weapon)}</Text>
          <View style={styles.actionRow}>
          <Pressable onPress={reload} disabled={!combatReady || (!activeGold && spareMagazines <= 0)} style={[styles.reload, { borderColor: colors.border }]} accessibilityLabel={t('camera')}>
            <Feather name="rotate-cw" size={18} color={colors.cyan} />
          </Pressable>
          <Pressable onPress={() => setRefillVisible(true)} style={[styles.reload, { borderColor: colors.border }]} accessibilityLabel={t('store')}>
            <Feather name="plus" size={18} color={colors.amber} />
          </Pressable>
          </View>
        </View>
        <FireButton
          label={getWeaponFireLabel(weapon)}
          disabled={!combatReady || (!activeGold && ammo <= 0)}
          onPressIn={startFire}
          onPressOut={stopFire}
        />
      </View>
      <Pressable testID="scope-toggle" accessibilityRole="button" accessibilityState={{ selected: scopeActive, disabled: !combatReady }} onPress={() => setScopeActive((value) => !value)} disabled={!combatReady} style={[styles.scopeButton, { borderColor: colors.cyan }]} accessibilityLabel={locale === 'tr' ? (scopeActive ? 'Dürbünü kapat' : 'Dürbünü aç') : (scopeActive ? 'Close scope' : 'Open scope')}>
        <Feather name={scopeActive ? 'eye-off' : 'eye'} size={18} color={colors.cyan} />
      </Pressable>
      <Pressable testID="enemy-mode-toggle" accessibilityRole="switch" accessibilityState={{ checked: enemyEnabled }} onPress={toggleEnemies} style={[styles.enemyToggle, { borderColor: enemyEnabled ? '#ff6860' : colors.cyan }]}>
        <Feather name="crosshair" size={15} color={enemyEnabled ? '#ff6860' : colors.cyan} />
        <Text style={[styles.enemyToggleText, { color: enemyEnabled ? '#ff9e90' : colors.foreground }]}>
          {locale === 'tr' ? 'DÜŞMAN' : 'ENEMY'} {enemyEnabled ? (locale === 'tr' ? 'AÇIK' : 'ON') : (locale === 'tr' ? 'KAPALI' : 'OFF')}
        </Text>
      </Pressable>
      {status.state === 'requesting' || status.state === 'paused' ? (
        <View style={styles.loading} pointerEvents="none">
          {status.state === 'requesting' ? <ActivityIndicator color={colors.cyan} /> : null}
          <Text style={[styles.loadingText, { color: colors.foreground }]}>{status.message}</Text>
        </View>
      ) : null}
      {enemyEnabled && enemyCombat.health === 0 && (
        <View style={styles.gameOver} testID="enemy-game-over">
          <Text style={styles.gameOverTitle}>{locale === 'tr' ? 'CAN BİTTİ' : 'OUT OF HEALTH'}</Text>
          <Text style={styles.gameOverScore}>{locale === 'tr' ? 'VURUŞ' : 'KILLS'} {enemyCombat.kills}</Text>
          <Text style={styles.gameOverHint}>{locale === 'tr' ? 'Yeni tur 5 saniye sonra başlar.' : 'Next round starts in 5 seconds.'}</Text>
          <Pressable onPress={restartEnemyRound} style={styles.gameOverAction} testID="restart-enemies">
            <Text style={styles.gameOverActionText}>{locale === 'tr' ? 'YENİDEN BAŞLA' : 'RESTART'}</Text>
          </Pressable>
          <Pressable onPress={toggleEnemies} style={styles.gameOverSecondary}>
            <Text style={styles.gameOverSecondaryText}>{locale === 'tr' ? 'DÜŞMANSIZ SERBEST ATIŞ' : 'FREE FIRE WITHOUT ENEMIES'}</Text>
          </Pressable>
        </View>
      )}
      <Modal visible={pickerVisible} transparent animationType="slide" onRequestClose={() => setPickerVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.picker, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={styles.pickerHeader}>
              <View>
                <Text style={[styles.title, { color: colors.foreground }]}>{t('equipmentSelection')}</Text>
                <Text style={[styles.topStatus, { color: colors.cyan }]}>
                  {locale === 'tr' ? 'OYUN DURAKLATILDI' : 'GAME PAUSED'}
                </Text>
              </View>
              <Pressable onPress={() => setPickerVisible(false)}><Feather name="x" size={22} color={colors.foreground} /></Pressable>
            </View>
            <WeaponCatalogList compact selectedWeapon={selectedWeapon} onSelect={(id: WeaponId) => {
              if (holdTimer.current) clearInterval(holdTimer.current);
              holdTimer.current = null;
              reloadTimerRef.current.cancelAll();
              setIsReloading(false);
              setIsFiring(false);
              magazineRef.current.set(selectedWeapon, { ammo: ammoRef.current, reserve: spareMagazines });
              setSelectedWeapon(id);
              setPickerVisible(false);
            }} />
          </View>
        </View>
      </Modal>
      <EconomyGate
        visible={refillVisible}
        action="ammoRefill"
        title={economyText('tr', 'economyRefill')}
        body={economyText('tr', 'economyRefillReward')}
        onApproved={() => combatReady}
        onComplete={() => { setSpareMagazines((value) => value + 2); setRefillVisible(false); }}
        onCancel={() => setRefillVisible(false)}
        testID="ammo-refill-gate"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050807' },
  damageWash: { backgroundColor: '#dd271e' },
  enemyScoreText: { color: '#fff5dc', fontWeight: '900', fontSize: 10, flexShrink: 1 },
  enemyToggle: { position: 'absolute', alignSelf: 'center', bottom: 174, height: 40, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, borderRadius: 9, borderWidth: 1, backgroundColor: 'rgba(0,0,0,0.8)' },
  enemyToggleText: { fontWeight: '900', fontSize: 9, letterSpacing: 0.4 },
  gameOver: { ...StyleSheet.absoluteFill, zIndex: 30, backgroundColor: 'rgba(5,8,9,0.92)', justifyContent: 'center', alignItems: 'center', gap: 15, paddingHorizontal: 25 },
  gameOverTitle: { color: '#ff8074', fontSize: 30, fontWeight: '900', letterSpacing: 2 },
  gameOverScore: { color: '#f0f4ed', fontSize: 17, fontWeight: '700' },
  gameOverHint: { color: '#b6c4c1', fontSize: 13, textAlign: 'center' },
  gameOverAction: { backgroundColor: '#bd4339', paddingHorizontal: 25, paddingVertical: 15, borderRadius: 12, marginTop: 10 },
  gameOverActionText: { color: '#fff', fontWeight: '900', letterSpacing: 1 },
  gameOverSecondary: { padding: 12 },
  gameOverSecondaryText: { color: '#d2e3e3', fontWeight: '800', fontSize: 12 },
  topBar: { position: 'absolute', left: 0, right: 0, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
  topSummary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4, minWidth: 0 },
  topTitle: { fontSize: 11, fontWeight: '800', flexShrink: 1 },
  topStatus: { fontSize: 10, marginTop: 2 },
  cameraControls: { position: 'absolute', left: 12, right: 12, flexDirection: 'row', gap: 5 },
  cameraControl: { flex: 1, minWidth: 0, minHeight: 44, paddingHorizontal: 4, borderWidth: 1, borderRadius: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.75)' },
  cameraControlText: { fontSize: 9, fontWeight: '800', flexShrink: 1, textAlign: 'center' },
  iconButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  statusCopy: { flex: 1, minWidth: 0 },
  title: { fontSize: 15, fontWeight: '800', letterSpacing: 1 },
  status: { fontSize: 10, marginTop: 3 },
  bottomBar: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  controlColumn: { alignItems: 'flex-start', gap: 8 },
  actionRow: { flexDirection: 'row', gap: 8 },
  weapon: { maxWidth: 180, minHeight: 34, borderWidth: 1, borderRadius: 9, paddingHorizontal: 9, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: 'rgba(0,0,0,0.55)' },
  weaponText: { maxWidth: 140, fontSize: 10, fontWeight: '800' },
  ammo: { fontSize: 26, fontWeight: '900' },
  reload: { width: 42, height: 38, borderWidth: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.55)' },
  loading: { position: 'absolute', left: 20, right: 20, top: '48%', alignItems: 'center', gap: 10 },
  loadingText: { fontSize: 12, textAlign: 'center' },
  scopeButton: { position: 'absolute', right: 18, bottom: 170, width: 44, height: 40, borderWidth: 1, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  picker: { height: '82%', maxHeight: '82%', borderTopWidth: 1, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 16 },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
});