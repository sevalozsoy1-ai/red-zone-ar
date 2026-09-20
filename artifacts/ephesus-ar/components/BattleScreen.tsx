import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Feather } from '@expo/vector-icons';
import { useKeepAwake } from 'expo-keep-awake';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LiveBattleCamera from './LiveBattleCamera';
import type { CameraStatus } from './camera-types';
import { useColors } from '@/hooks/useColors';
import { useI18n } from '@/hooks/useI18n';
import { useGame } from '@/context/GameContext';
import { useWeaponAudio } from '@/hooks/useWeaponAudio';
import EconomyGate from '@/components/EconomyGate';
import {
  getWeapon,
  getWeaponAction,
  WEAPONS,
  WeaponId,
} from '@/lib/weapons';
import WeaponView from './WeaponView';
import WeaponCatalogList from './WeaponCatalogList';
import AimTouchLayer, { AimTouchLayerRef } from './AimTouchLayer';
import FireButton from './FireButton';
import { IronSightOverlay, NormalReticle, ScopeOverlay } from './ScopeOverlay';
import { VisionModeControl, VisionModeOverlay } from './VisionModeControl';
import { useQueryClient } from '@tanstack/react-query';
import {
  getGetBattleStateQueryKey,
  useHeartbeatBattleRoom,
  useFireBattleShot,
  useGetBattleState,
  useLeaveBattleRoom,
  type BattleSession,
} from '@workspace/api-client-react';
import { createMarkerLockState, detectPlayerMarker, updateMarkerLock } from '@/lib/marker-detection';
import type { MarkerLockState } from '@/lib/marker-detection';
import type { VisionMode } from '@/lib/vision-modes';
import PlayerMarker from './PlayerMarker';
import { clampAimOffset } from '@/lib/aim';
import { weaponActionLabel, weaponCategoryLabel, uiText } from '@/lib/i18n';
import { rtlLayout } from '@/lib/rtl';
import { battleHudStatus, isBattleCombatDisabled, isGoneBattleSession, releaseBattleShot, tryAcquireBattleShot } from '@/lib/battle-ui';
import { setBattleSessionToken } from '@/lib/battle-auth';
import { economyText, formatUsdFromCents } from '@/lib/economy-ui';
import {
  createMatchMagazineInventory,
  equipMagazine,
  refillMagazines,
  reloadMagazine,
  setMagazineAmmo,
} from '@/lib/battle-ammo';
import { ActivityIndicator, Alert, AppState, BackHandler, Linking, Modal, Platform, Pressable, StyleSheet, Text, View, Animated, useWindowDimensions } from 'react-native';
import { battleSessionCopy } from '@/lib/battle-session-copy';
import { handleBattleAppStateChange, handleBattleHardwareBack } from '@/lib/battle-session-lifecycle';
import { createShotId, useBattleSocket } from '@/lib/battle-socket';

const HEAVY_COOLDOWN_MS: Partial<Record<WeaponId, number>> = {
  m249: 1100,
  'mg42': 1000,
  mg3: 980,
  pkm: 1150,
  'minigun-m134': 900,
};

function shotStatus(reason?: string) {
  switch (reason) {
    case 'SHOT_TIMEOUT': return 'Vuruş zaman aşımına uğradı';
    case 'SOCKET_OFFLINE': return 'Ağ bağlantısı yok';
    case 'INVALID_TARGET':
    case 'TARGET_NOT_FOUND': return 'Hedef artık geçerli değil';
    case 'COOLDOWN': return 'Silah bekleme süresinde';
    default: return 'Vuruş reddedildi';
  }
}

export default function BattleScreen({
  onExit,
  battleSession,
  onSessionExpired,
}: {
  onExit: () => void;
  battleSession?: BattleSession | null;
  onSessionExpired?: () => void;
}) {
  useKeepAwake();
  const colors = useColors();
  const { locale, t, rtl } = useI18n();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [status, setStatus] = useState<CameraStatus>({ state: 'requesting', message: t('cameraHint') });
  const [restartKey, setRestartKey] = useState(0);
  const [fireSignal, setFireSignal] = useState(0);
  const [cameraFacing, setCameraFacing] = useState<'front' | 'back'>('back');
  const [visionMode, setVisionMode] = useState<VisionMode>('normal');
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  const [sessionExpired, setSessionExpired] = useState(false);
  const live = status.state === 'live';
  const queryClient = useQueryClient();
  const appActiveRef = useRef(appActive);
  const sessionExpiredRef = useRef(false);
  const sessionTokenRef = useRef(battleSession?.sessionToken);
  const sessionIdentityRef = useRef(
    battleSession ? `${battleSession.room.code}:${battleSession.playerId}:${battleSession.sessionToken}` : null,
  );
  appActiveRef.current = appActive;
  // Do not let the generated URL builder receive a bearer token. The explicit
  // query key still isolates cached room data for each authenticated session.
  const stateParams = { code: battleSession?.room.code ?? '000000' };
  const roomQueryKey = ['/api/battle/state', stateParams.code, battleSession?.sessionToken ?? 'inactive-session-token'] as const;
  const authRequest = battleSession?.sessionToken
    ? { headers: { Authorization: `Bearer ${battleSession.sessionToken}` } }
    : undefined;
  const roomQuery = useGetBattleState(stateParams as Parameters<typeof useGetBattleState>[0], {
    request: authRequest,
    query: {
      queryKey: roomQueryKey,
      enabled: !!battleSession && appActive && !sessionExpired,
      refetchInterval: appActive && !sessionExpired ? 450 : false,
      refetchOnWindowFocus: true,
    },
  });
  const room = roomQuery.data?.room ?? battleSession?.room;
  const ownPlayer = room?.players.find((player) => player.id === battleSession?.playerId);
  const [networkHitTest, setNetworkHitTest] = useState(false);
  const [networkTargetId, setNetworkTargetId] = useState<string | null>(null);
  const networkSocket = useBattleSocket(
    battleSession ? { roomCode: battleSession.room.code, sessionToken: battleSession.sessionToken } : null,
    !!battleSession && appActive && !sessionExpired,
  );
  const combatReady = !isBattleCombatDisabled({
    hasBattleSession: !!battleSession && !sessionExpired,
    roomStatus: room?.status,
    roomError: roomQuery.isError || sessionExpired || !appActive,
    cameraLive: live && appActive,
    ownPlayerAlive: !!ownPlayer?.alive,
    adOpen: false,
    reloading: false,
  });
  const [detectedMarkerId, setDetectedMarkerId] = useState<number | null>(null);
  const [reticleHit, setReticleHit] = useState(false);
  const [combatFlash, setCombatFlash] = useState<'hit' | 'hurt' | null>(null);
  const [shotMessage, setShotMessage] = useState('');
  const [clock, setClock] = useState(Date.now());
  const previousHealthRef = useRef<{ hp: number; lives: number } | null>(null);
  const suppressNextHealthFlashRef = useRef(false);
  const suppressHealthFlashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Socket intents are independent: a legal burst can have several server
  // acknowledgements in flight at once. The server remains authoritative for
  // cadence and idempotency; these maps only reconcile local ammo/UI state.
  const networkPendingRef = useRef(new Map<string, { weaponId: WeaponId }>());
  const networkAmmoPendingRef = useRef(new Set<string>());
  const seenNetworkHitIdsRef = useRef(new Set<string>());
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const { selectedWeapon, setSelectedWeapon, activeGold, creditCents } = useGame();
  const { playShot, playReload, playTestSound, prepareWeapon, error } = useWeaponAudio();
  
  const [ammo, setAmmo] = useState(0);
  const [isReloading, setIsReloading] = useState(false);
  const [isKnifeThrowing, setIsKnifeThrowing] = useState(false);
  const [showAd, setShowAd] = useState(false);
  const [isScopeActive, setIsScopeActive] = useState(false);
  const [spareMagazines, setSpareMagazines] = useState(2);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [scopeZero, setScopeZero] = useState({ x: 0, y: 0 });
  const [knifeThrowTarget, setKnifeThrowTarget] = useState({ x: 0, y: 0 });
  const [leaveError, setLeaveError] = useState('');
  const combatControlsDisabled = isBattleCombatDisabled({
    hasBattleSession: !!battleSession && !sessionExpired,
    roomStatus: room?.status,
    roomError: roomQuery.isError || sessionExpired || !appActive,
    cameraLive: live && appActive,
    ownPlayerAlive: !!ownPlayer?.alive,
    adOpen: showAd,
    reloading: isReloading,
    actionLocked: isKnifeThrowing,
  });
  
  const aimAnim = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const aimValue = useRef({ x: 0, y: 0 });
  
  const fireAnim = useRef(new Animated.Value(0)).current;
  const recoilAnim = useRef(new Animated.Value(0)).current;
  const zoomAnim = useRef(new Animated.Value(1)).current;
  const reloadAnim = useRef(new Animated.Value(0)).current;
  const knifeThrowAnim = useRef(new Animated.Value(0)).current;
  const developerTicker = useRef(new Animated.Value(width)).current;
  
  const ammoRef = useRef(0);
  const reloadingRef = useRef(false);
  const isLiveRef = useRef(false);
  const showAdRef = useRef(false);
  const isFiringRef = useRef(false);
  const shotInFlightRef = useRef(false);
  const knifeThrowRunningRef = useRef(false);
  const knifeThrowRunRef = useRef(0);
  const lastFireTimeRef = useRef(0);
  const weaponRef = useRef(selectedWeapon);
  const activeGoldRef = useRef(activeGold);
  
  const aimTouchRef = useRef<AimTouchLayerRef>(null);
  const reloadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const detectedMarkerRef = useRef<number | null>(null);
  const markerLockRef = useRef<MarkerLockState>(createMarkerLockState());
  const reticleHitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingShotRef = useRef<{ weaponId: WeaponId; shotId?: string } | null>(null);
  const fireOneRef = useRef<(fireMode?: 'primary' | 'throw') => boolean>(() => false);
  activeGoldRef.current = activeGold;
  
  const playShotRef = useRef(playShot);
  const playReloadRef = useRef(playReload);
  useEffect(() => { playShotRef.current = playShot; }, [playShot]);
  useEffect(() => { playReloadRef.current = playReload; }, [playReload]);
  useEffect(() => { prepareWeapon(selectedWeapon); }, [prepareWeapon, selectedWeapon]);

  useEffect(() => {
    const nextIdentity = battleSession
      ? `${battleSession.room.code}:${battleSession.playerId}:${battleSession.sessionToken}`
      : null;
    if (nextIdentity !== sessionIdentityRef.current) {
      networkPendingRef.current.clear();
      networkAmmoPendingRef.current.clear();
      pendingShotRef.current = null;
      shotInFlightRef.current = false;
        markerLockRef.current = createMarkerLockState();
        detectedMarkerRef.current = null;
        setDetectedMarkerId(null);
      seenNetworkHitIdsRef.current.clear();
      suppressNextHealthFlashRef.current = false;
      if (suppressHealthFlashTimeoutRef.current) clearTimeout(suppressHealthFlashTimeoutRef.current);
      suppressHealthFlashTimeoutRef.current = null;
      previousHealthRef.current = null;
      setNetworkHitTest(false);
      setNetworkTargetId(null);
    }
    sessionIdentityRef.current = nextIdentity;
    if (battleSession?.sessionToken && battleSession.sessionToken !== sessionTokenRef.current) {
      sessionExpiredRef.current = false;
      setSessionExpired(false);
    }
    sessionTokenRef.current = battleSession?.sessionToken;
  }, [battleSession?.playerId, battleSession?.room.code, battleSession?.sessionToken]);

  const handleSessionExpired = useCallback(() => {
    if (sessionExpiredRef.current) return;
    sessionExpiredRef.current = true;
    setSessionExpired(true);
    if (battleSession) {
      queryClient.removeQueries({
        queryKey: ['/api/battle/state', battleSession.room.code, battleSession.sessionToken],
        exact: true,
      });
    }
    setBattleSessionToken(null);
    onSessionExpired?.();
    const copy = battleSessionCopy(locale);
    Alert.alert(copy.expiredTitle, copy.expiredMessage, [{
      text: t('continue'),
      onPress: onExit,
    }], { cancelable: false });
  }, [battleSession, locale, onExit, onSessionExpired, queryClient, t]);

  const magazineInventoryRef = useRef(
    createMatchMagazineInventory(selectedWeapon, getWeapon(selectedWeapon).capacity),
  );

  useEffect(() => { isLiveRef.current = combatReady; }, [combatReady]);
  useEffect(() => { showAdRef.current = showAd; }, [showAd]);
  useEffect(() => {
    developerTicker.setValue(width);
    const animation = Animated.loop(Animated.timing(developerTicker, {
      toValue: -430,
      duration: 9000,
      useNativeDriver: true,
    }));
    animation.start();
    return () => animation.stop();
  }, [developerTicker, width]);
  
  const stopKnifeThrow = () => {
    knifeThrowRunRef.current += 1;
    knifeThrowRunningRef.current = false;
    knifeThrowAnim.stopAnimation();
    knifeThrowAnim.setValue(0);
    setIsKnifeThrowing(false);
  };

  const stopActions = () => {
      isFiringRef.current = false;
      aimTouchRef.current?.cancel();
       stopKnifeThrow();
      if (reloadTimeoutRef.current) clearTimeout(reloadTimeoutRef.current);
      reloadTimeoutRef.current = null;
      reloadingRef.current = false;
      setIsReloading(false);
      reloadAnim.stopAnimation();
      reloadAnim.setValue(0);
      fireAnim.stopAnimation();
      fireAnim.setValue(0);
      recoilAnim.stopAnimation();
      recoilAnim.setValue(0);
      lastFireTimeRef.current = 0;
  };

  useEffect(() => {
    weaponRef.current = selectedWeapon;
    stopActions();
    const w = getWeapon(selectedWeapon);
    const equipped = w.archetype === 'grenade'
      ? {
          inventory: magazineInventoryRef.current.weapons[selectedWeapon]
            ? magazineInventoryRef.current
            : setMagazineAmmo(magazineInventoryRef.current, selectedWeapon, w.capacity, w.capacity),
          ammo: magazineInventoryRef.current.weapons[selectedWeapon]?.ammo ?? w.capacity,
        }
      : equipMagazine(magazineInventoryRef.current, selectedWeapon, w.capacity);
    magazineInventoryRef.current = equipped.inventory;
    setAmmo(equipped.ammo);
    ammoRef.current = equipped.ammo;
    setSpareMagazines(w.archetype === 'grenade' ? 0 : equipped.inventory.reserveMagazines);
    
    reloadingRef.current = false;
    setIsReloading(false);
    isFiringRef.current = false;
    aimTouchRef.current?.cancel();
    setIsScopeActive(false);
    setScopeZero({ x: 0, y: 0 });

    if (reloadTimeoutRef.current) {
      clearTimeout(reloadTimeoutRef.current);
      reloadTimeoutRef.current = null;
    }
  }, [selectedWeapon]);

  useEffect(() => {
    const w = getWeapon(selectedWeapon);
    Animated.timing(zoomAnim, {
      toValue: isScopeActive ? Math.max(w.zoom, 2.15) : 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [selectedWeapon, isScopeActive, zoomAnim]);
  
  useEffect(() => {
      const handleAppChange = (state: string) => {
        handleBattleAppStateChange(state, {
          hasSession: !!battleSession && !sessionExpired,
          queryKey: roomQueryKey,
          setAppActive: (nextActive) => {
            appActiveRef.current = nextActive;
            setAppActive(nextActive);
          },
          cancelQueries: (filters) => queryClient.cancelQueries(filters),
          refetch: roomQuery.refetch,
          isExpiredError: isGoneBattleSession,
          onExpired: handleSessionExpired,
          onBackground: stopActions,
        });
      };
      const handleBlur = () => stopActions();
      const handleVis = () => { if (typeof document !== 'undefined' && document.visibilityState === 'hidden') stopActions(); };
      
      const sub = AppState.addEventListener('change', handleAppChange);
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.addEventListener('blur', handleBlur);
          document.addEventListener('visibilitychange', handleVis);
      }
      return () => {
          sub.remove();
          if (Platform.OS === 'web' && typeof window !== 'undefined') {
              window.removeEventListener('blur', handleBlur);
              document.removeEventListener('visibilitychange', handleVis);
          }
      };
   }, [battleSession?.room.code, battleSession?.sessionToken, handleSessionExpired, queryClient, roomQuery.refetch, sessionExpired]);
  
  useEffect(() => {
      if (!combatReady || showAd) stopActions();
   }, [combatReady, showAd]);

  const updateAim = useCallback((x: number, y: number) => {
    const nextAim = clampAimOffset({ x, y }, width, height);
    aimValue.current = nextAim;
    aimAnim.setValue(nextAim);
  }, [aimAnim, height, width]);
  
  useEffect(() => {
      return () => {
        if (reloadTimeoutRef.current) clearTimeout(reloadTimeoutRef.current);
        if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
        if (suppressHealthFlashTimeoutRef.current) clearTimeout(suppressHealthFlashTimeoutRef.current);
        if (reticleHitTimeoutRef.current) clearTimeout(reticleHitTimeoutRef.current);
        fireAnim.stopAnimation();
        recoilAnim.stopAnimation();
        knifeThrowRunRef.current += 1;
        knifeThrowRunningRef.current = false;
        knifeThrowAnim.stopAnimation();
        knifeThrowAnim.setValue(0);
      };
   }, [fireAnim, knifeThrowAnim, recoilAnim]);

  useEffect(() => {
    detectedMarkerRef.current = detectedMarkerId;
  }, [detectedMarkerId]);

  useEffect(() => {
    if (!networkHitTest) return;
    const liveOpponents = room?.players.filter((player) =>
      player.id !== ownPlayer?.id && player.alive
    ) ?? [];
    const validTarget = liveOpponents.some((player) => player.id === networkTargetId);
    // In a two-player test there is no ambiguity: make the sole opponent the
    // target so seeing their roster name is not mistaken for a manual lock.
    if (liveOpponents.length === 1 && !validTarget) setNetworkTargetId(liveOpponents[0].id);
    else if (!validTarget) setNetworkTargetId(null);
  }, [networkHitTest, networkTargetId, ownPlayer?.id, room?.players]);

  useEffect(() => {
    const event = networkSocket.lastHit;
    if (!event || !battleSession) return;
    if (seenNetworkHitIdsRef.current.has(event.shotId)) return;
    seenNetworkHitIdsRef.current.add(event.shotId);
    if (event.shooterId === battleSession.playerId) {
      showFlash('hit');
      showReticleHit();
      setShotMessage('Vuruş onaylandı');
    }
    if (event.targetId === battleSession.playerId) {
      suppressNextHealthFlashRef.current = true;
      if (suppressHealthFlashTimeoutRef.current) clearTimeout(suppressHealthFlashTimeoutRef.current);
      suppressHealthFlashTimeoutRef.current = setTimeout(() => {
        suppressNextHealthFlashRef.current = false;
        suppressHealthFlashTimeoutRef.current = null;
      }, 1500);
      showFlash('hurt');
    }
  }, [battleSession?.playerId, networkSocket.lastHit]);

  useEffect(() => {
    for (const ack of networkSocket.ackEvents) {
      if (!ack.shotId || !networkPendingRef.current.has(ack.shotId)) continue;
      const pending = networkPendingRef.current.get(ack.shotId);
      networkPendingRef.current.delete(ack.shotId);
      if (ack.accepted === true) {
        networkAmmoPendingRef.current.delete(ack.shotId);
        setShotMessage('Vuruş gönderildi');
      } else if (ack.accepted === false) {
        if (networkAmmoPendingRef.current.delete(ack.shotId) && pending) {
          const weapon = getWeapon(pending.weaponId);
          if (weaponRef.current === pending.weaponId) {
            const restoredAmmo = Math.min(weapon.capacity, ammoRef.current + 1);
            ammoRef.current = restoredAmmo;
            setAmmo(restoredAmmo);
          } else {
            const saved = magazineInventoryRef.current.weapons[pending.weaponId];
            if (saved) {
              magazineInventoryRef.current = setMagazineAmmo(
                magazineInventoryRef.current,
                pending.weaponId,
                weapon.capacity,
                saved.ammo + 1,
              );
            }
          }
        }
        setShotMessage(shotStatus(ack.reason));
      } else {
        // Transport exhaustion is indeterminate: the server may have applied
        // this shot before the ack was lost. Clear the local capacity but never
        // refund ammo unless the server explicitly rejected the shot.
        networkAmmoPendingRef.current.delete(ack.shotId);
        setShotMessage('Vuruş durumu doğrulanamadı');
      }
    }
  }, [networkSocket.ackEvents]);

  useEffect(() => {
    const snapshot = networkSocket.lastRoomState;
    if (!snapshot?.room || !battleSession) return;
    queryClient.setQueryData(roomQueryKey, (previous: unknown) => ({
      ...(previous && typeof previous === 'object' ? previous : {}),
      playerId: battleSession.playerId,
      sessionToken: battleSession.sessionToken,
      room: snapshot.room,
    }));
  }, [battleSession, networkSocket.lastRoomState, queryClient, roomQueryKey]);

  useEffect(() => {
    if (!battleSession) return;
    const timer = setInterval(() => setClock(Date.now()), 100);
    return () => clearInterval(timer);
  }, [battleSession]);

  const showFlash = (kind: 'hit' | 'hurt') => {
    if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    setCombatFlash(kind);
    flashTimeoutRef.current = setTimeout(() => setCombatFlash(null), 420);
  };

  const showReticleHit = () => {
    setReticleHit(true);
    if (reticleHitTimeoutRef.current) clearTimeout(reticleHitTimeoutRef.current);
    reticleHitTimeoutRef.current = setTimeout(() => {
      setReticleHit(false);
      reticleHitTimeoutRef.current = null;
    }, 650);
  };

  useEffect(() => {
    if (!ownPlayer) return;
    const previous = previousHealthRef.current;
    if (previous && (ownPlayer.hp < previous.hp || ownPlayer.lives < previous.lives)) {
      if (suppressNextHealthFlashRef.current) suppressNextHealthFlashRef.current = false;
      else showFlash('hurt');
    }
    previousHealthRef.current = { hp: ownPlayer.hp, lives: ownPlayer.lives };
  }, [ownPlayer?.hp, ownPlayer?.lives]);

  useEffect(() => {
    if (!battleSession || sessionExpired || !isGoneBattleSession(roomQuery.error)) return;
    handleSessionExpired();
  }, [battleSession, handleSessionExpired, roomQuery.error, sessionExpired]);

  const restoreRejectedShot = () => {
    const pendingShot = pendingShotRef.current;
    if (!pendingShot) return;
    pendingShotRef.current = null;
    const weapon = getWeapon(pendingShot.weaponId);
    const saved = magazineInventoryRef.current.weapons[pendingShot.weaponId];
    if (weaponRef.current === pendingShot.weaponId) {
      const restoredAmmo = Math.min(weapon.capacity, ammoRef.current + 1);
      ammoRef.current = restoredAmmo;
      setAmmo(restoredAmmo);
    } else if (saved) {
      magazineInventoryRef.current = setMagazineAmmo(
        magazineInventoryRef.current,
        pendingShot.weaponId,
        weapon.capacity,
        saved.ammo + 1,
      );
    }
  };

  const shot = useFireBattleShot({
    request: authRequest,
    mutation: {
      onSuccess: (result) => {
        if (result.accepted) {
          pendingShotRef.current = null;
          showReticleHit();
        } else {
          restoreRejectedShot();
        }
        if (battleSession) {
          queryClient.setQueryData(['/api/battle/state', battleSession.room.code, battleSession.sessionToken], {
            playerId: battleSession.playerId,
            sessionToken: battleSession.sessionToken,
            room: result.room,
          });
        }
         setShotMessage(result.accepted ? 'Vuruş onaylandı' : shotStatus((result as { reason?: string }).reason));
        if (result.accepted) showFlash('hit');
      },
      onError: (requestError) => {
         restoreRejectedShot();
         if (isGoneBattleSession(requestError)) {
           handleSessionExpired();
           return;
         }
          setShotMessage('Vuruş gönderilemedi');
      },
      onSettled: () => {
        releaseBattleShot(shotInFlightRef);
      },
    },
  });

  const handleWeaponSelect = (id: WeaponId) => {
      setPickerVisible(false);
      if (id === selectedWeapon) {
          return;
      }
      stopActions();
      magazineInventoryRef.current = setMagazineAmmo(
        magazineInventoryRef.current,
        selectedWeapon,
        getWeapon(selectedWeapon).capacity,
        ammoRef.current,
      );
      setSelectedWeapon(id);
  };

  const openWeaponPicker = () => {
      if (isKnifeThrowing) return;
      stopActions();
      setPickerVisible(true);
  };

  const fireOne = (fireMode: 'primary' | 'throw' = 'primary') => {
    const w = getWeapon(weaponRef.current);
    const now = Date.now();
    const cooldown = HEAVY_COOLDOWN_MS[w.id] ?? w.interval;
    if (fireMode === 'throw' && w.id !== 'knife') return false;
    const hasKnifeInventory = activeGoldRef.current || w.id !== 'knife' || ammoRef.current > 0;
    const hasAmmo = activeGoldRef.current || (w.id === 'knife' ? hasKnifeInventory : ammoRef.current > 0);
    if (knifeThrowRunningRef.current || !isLiveRef.current || showAdRef.current || reloadingRef.current || !hasAmmo || now - lastFireTimeRef.current < cooldown) return false;
    const markerId = detectedMarkerRef.current;
    const networkTarget = room?.players.find((player) => player.id === networkTargetId && player.alive && player.id !== ownPlayer?.id);
    const hasNetworkPath = !!battleSession && networkHitTest && !!networkTarget && networkSocket.connected;
    const hasMarkerPath = !!battleSession && !networkHitTest && markerId !== null;
    if (battleSession && hasMarkerPath && !tryAcquireBattleShot(shotInFlightRef)) return false;
    lastFireTimeRef.current = now;
    // This is intentionally after all local fire guards. The camera component
    // treats the torch as an optional visual aid and safely ignores unsupported
    // hardware without affecting the shot/network path.
    setFireSignal((current) => current + 1);
    if (!activeGoldRef.current && (w.id !== 'knife' || fireMode === 'throw')) {
      ammoRef.current -= 1;
      setAmmo(ammoRef.current);
    }
    playShotRef.current(w.id);
    if (fireMode === 'throw') {
      fireAnim.stopAnimation();
      fireAnim.setValue(0);
    } else {
      fireAnim.setValue(1);
      Animated.timing(fireAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start();
    }
    recoilAnim.setValue(w.recoil * 3);
    Animated.spring(recoilAnim, { toValue: 0, friction: 6, tension: 120, useNativeDriver: true }).start();
    if (networkHitTest && battleSession && networkTarget && networkSocket.connected) {
      const consumedAmmo = !activeGoldRef.current && (w.id !== 'knife' || fireMode === 'throw');
      const shotId = createShotId();
      networkPendingRef.current.set(shotId, { weaponId: w.id });
      if (consumedAmmo) networkAmmoPendingRef.current.add(shotId);
      const sent = networkSocket.sendShotIntent({
        shotId,
        targetPlayerId: networkTarget.id,
        weaponId: w.id,
        fireMode,
        clientFiredAt: now,
      });
      if (!sent) {
        networkPendingRef.current.delete(shotId);
        if (networkAmmoPendingRef.current.delete(shotId)) {
          const restoredAmmo = Math.min(w.capacity, ammoRef.current + 1);
          ammoRef.current = restoredAmmo;
          setAmmo(restoredAmmo);
        }
        setShotMessage('Ağ bağlantısı yok');
      } else {
        setShotMessage('Vuruş gönderiliyor');
      }
    } else if (!networkHitTest && battleSession && markerId !== null) {
      const consumedAmmo = !activeGoldRef.current && (w.id !== 'knife' || fireMode === 'throw');
      if (consumedAmmo) pendingShotRef.current = { weaponId: w.id };
      shot.mutate({
        code: battleSession.room.code,
        data: {
          markerId,
          firedAt: now,
          weaponId: w.id,
          fireMode,
        },
      } as Parameters<typeof shot.mutate>[0]);
    } else if (battleSession && networkHitTest) {
      setShotMessage(networkSocket.connected ? 'Hedef seçilmedi' : 'Ağ bağlantısı yok');
    }
    return true;
  };
  fireOneRef.current = fireOne;

  const leave = useLeaveBattleRoom({ request: authRequest });

  const exitBattle = () => {
    if (!appActiveRef.current) return;
    stopActions();
    setLeaveError('');
    if (leave.isPending) return;
    if (!battleSession) {
      setBattleSessionToken(null);
      onExit();
      return;
    }
    leave.mutate(
      { code: battleSession.room.code } as Parameters<typeof leave.mutate>[0],
      {
        onSuccess: () => {
          setBattleSessionToken(null);
          onExit();
        },
        onError: (requestError) => {
          if (isGoneBattleSession(requestError)) {
            setBattleSessionToken(null);
            onExit();
            return;
          }
          setLeaveError(t('errorMessage'));
        },
      },
    );
  };

  const requestHardwareBack = useCallback(() => {
    const copy = battleSessionCopy(locale);
    return handleBattleHardwareBack({
      hasSession: !!battleSession,
      sessionExpired,
      leavePending: leave.isPending,
      onExit,
      onLeave: exitBattle,
      confirmLeave: ({ onConfirm, onCancel }) => Alert.alert(copy.leaveTitle, copy.leaveMessage, [
        { text: copy.leaveCancel, style: 'cancel', onPress: onCancel },
        { text: copy.leaveConfirm, style: 'destructive', onPress: onConfirm },
      ], { cancelable: true }),
    });
  }, [battleSession, exitBattle, leave.isPending, locale, onExit, sessionExpired]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', requestHardwareBack);
    return () => subscription.remove();
  }, [requestHardwareBack]);

  const handleFirePress = () => {
    // A quick tap must fire even when released before the next animation frame.
    if (combatControlsDisabled) return;
    fireOne();
    isFiringRef.current = getWeapon(weaponRef.current).automatic
      && (activeGoldRef.current || ammoRef.current > 0)
      && !reloadingRef.current
      && isLiveRef.current
      && !showAdRef.current;
  };

  const handleKnifeThrow = () => {
    if (combatControlsDisabled || knifeThrowRunningRef.current || weaponRef.current !== 'knife') return;
    const target = { ...aimValue.current };
    if (!fireOne('throw')) return;
    isFiringRef.current = false;
    aimTouchRef.current?.cancel();
    knifeThrowRunningRef.current = true;
    const runId = ++knifeThrowRunRef.current;
    setKnifeThrowTarget(target);
    setIsKnifeThrowing(true);
    knifeThrowAnim.stopAnimation();
    knifeThrowAnim.setValue(0);
    Animated.timing(knifeThrowAnim, {
      toValue: 1,
      duration: 760,
      useNativeDriver: true,
    }).start(() => {
      if (runId !== knifeThrowRunRef.current) return;
      knifeThrowRunningRef.current = false;
      knifeThrowAnim.setValue(0);
      setIsKnifeThrowing(false);
    });
  };

  useEffect(() => {
    let frameId: number;
    
    const loop = () => {
        // Fire update
        if (isFiringRef.current) fireOneRef.current();
        
        frameId = requestAnimationFrame(loop);
    };
    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, []);

  const handleReload = () => {
    if (
      combatControlsDisabled
      ||
      !isLiveRef.current
      || showAdRef.current
      || reloadingRef.current
      || getWeapon(selectedWeapon).archetype === 'grenade'
      || ammoRef.current === getWeapon(selectedWeapon).capacity
      || (!activeGoldRef.current && spareMagazines <= 0)
    ) return;
    stopActions();
    reloadingRef.current = true;
    setIsReloading(true);
    playReloadRef.current();
    
    reloadAnim.setValue(0);
    Animated.timing(reloadAnim, { toValue: 1, duration: 1500, useNativeDriver: true }).start();
    
    reloadTimeoutRef.current = setTimeout(() => {
        reloadTimeoutRef.current = null;
        const w = getWeapon(weaponRef.current);
        const currentInventory = setMagazineAmmo(
          magazineInventoryRef.current,
          weaponRef.current,
          w.capacity,
          ammoRef.current,
        );
        const reloaded = activeGoldRef.current
          ? { inventory: setMagazineAmmo(currentInventory, weaponRef.current, w.capacity, w.capacity), ammo: w.capacity }
          : reloadMagazine(currentInventory, weaponRef.current, w.capacity);
        magazineInventoryRef.current = reloaded.inventory;
        ammoRef.current = reloaded.ammo;
        setAmmo(reloaded.ammo);
        setSpareMagazines(w.archetype === 'grenade' ? 0 : reloaded.inventory.reserveMagazines);
        
        reloadingRef.current = false;
        setIsReloading(false);
    }, 1500);
  };

  const openAd = () => {
    if (combatControlsDisabled) return;
    stopActions();
    if (activeGoldRef.current) {
      refillWeapon();
      return;
    }
    setShowAd(true);
  };

  const refillWeapon = () => {
    const weaponId = weaponRef.current;
    const wCurrent = getWeapon(weaponId);
    if (wCurrent.archetype === 'grenade') return;
    const currentInventory = setMagazineAmmo(
      magazineInventoryRef.current,
      weaponId,
      wCurrent.capacity,
      ammoRef.current,
    );
    const refilled = refillMagazines(currentInventory, weaponId, wCurrent.capacity);
    magazineInventoryRef.current = refilled.inventory;
    ammoRef.current = refilled.ammo;
    setAmmo(refilled.ammo);
    setSpareMagazines(refilled.inventory.reserveMagazines);
  };

  const openBrowser = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('battle');
      url.searchParams.set('camera', '1');
      window.open(url.toString(), '_blank', 'noopener,noreferrer');
    } else void Linking.openSettings();
  };
  
  const w = getWeapon(selectedWeapon);
  const weaponAction = getWeaponAction(w);
  const targetedEffect = room?.effects?.find((effect) => effect.expiresAt > clock) ?? null;
  const isScopedWeapon = w.zoom >= 2;
  const hudStatus = battleHudStatus({
    hasBattleSession: !!battleSession && !sessionExpired,
    roomStatus: room?.status,
    roomError: roomQuery.isError || sessionExpired || !appActive,
    cameraLive: live && appActive,
    detectedMarkerId,
  });
  const adjustScope = (dx: number, dy: number) => {
    setScopeZero(current => ({
      x: Math.max(-32, Math.min(32, current.x + dx)),
      y: Math.max(-32, Math.min(32, current.y + dy)),
    }));
  };
  
  // Scaling around the viewport center keeps the aimed source point under the
  // moved scope only when the outer translation equals (1 - zoom) * aim.
  const camTranslateX = Animated.multiply(aimAnim.x, Animated.subtract(1, zoomAnim));
  const camTranslateY = Animated.multiply(aimAnim.y, Animated.subtract(1, zoomAnim));

  return (
    <View style={[s.root, rtl && s.rtl, { backgroundColor: colors.background }]} testID="battle-screen">
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateX: camTranslateX }, { translateY: camTranslateY }] }]}>
        <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ scale: zoomAnim }] }]}>
          <LiveBattleCamera
            onStatus={setStatus}
            restartKey={restartKey}
            fireSignal={fireSignal}
            facing={cameraFacing}
            onFacingUnavailable={(failedFacing) => {
              if (failedFacing === 'back') {
                stopActions();
                setCameraFacing('front');
                setRestartKey((key) => key + 1);
              }
            }}
            onFrame={(frame) => {
              if (!room || !ownPlayer) return;
                const detectedId = detectPlayerMarker(
                frame,
               room.players.filter((player) =>
                 player.id !== ownPlayer.id
                  && player.alive,
               ),
                aimValue.current,
                { width, height },
              );
                const markerId = updateMarkerLock(markerLockRef.current, detectedId, Date.now(), {
                  consecutiveFrames: 2,
                  // Compatibility capture cadence is now 1000ms. Keep a
                  // lock across one missed capture without making it stale.
                  holdMs: 1250,
                });
                detectedMarkerRef.current = markerId;
                setDetectedMarkerId((current) => current === markerId ? current : markerId);
            }}
          />
        </Animated.View>
      </Animated.View>

      <AimTouchLayer
        ref={aimTouchRef}
        disabled={!combatReady || showAd || isReloading || isKnifeThrowing}
        onAim={updateAim}
      />
      <VisionModeOverlay mode={visionMode} />
      <ScopeOverlay
        aimAnim={aimAnim}
        isScopeActive={isScopeActive && isScopedWeapon}
        zoom={w.zoom}
        zeroOffset={scopeZero}
        reticleColor={reticleHit ? '#ffd60a' : (detectedMarkerId !== null || (networkHitTest && networkTargetId !== null) ? '#ff453a' : '#00e5ff')}
      />
      <IronSightOverlay
        aimAnim={aimAnim}
        isActive={isScopeActive && !isScopedWeapon && w.archetype !== 'grenade'}
        reticleColor={reticleHit ? '#ffd60a' : (detectedMarkerId !== null || (networkHitTest && networkTargetId !== null) ? '#ff453a' : '#00e5ff')}
      />
      <NormalReticle
        aimAnim={aimAnim}
        isScopeActive={isScopeActive}
        color={reticleHit ? '#ffd60a' : (detectedMarkerId !== null || (networkHitTest && networkTargetId !== null) ? '#ff453a' : '#00e5ff')}
      />
      {targetedEffect && (
        <View
          pointerEvents="none"
          testID={`opponent-effect-${targetedEffect.kind}`}
          style={[
            StyleSheet.absoluteFill,
            s.grenadeEffect,
            targetedEffect.kind === 'flashbang' ? s.flashEffect : targetedEffect.kind === 'smoke' ? s.smokeEffect : s.fragEffect,
          ]}
        >
            <Text style={s.grenadeEffectText}>
             {targetedEffect.kind === 'flashbang' ? uiText(locale, 'flash') : targetedEffect.kind === 'smoke' ? uiText(locale, 'smoke') : uiText(locale, 'explosion')}
          </Text>
        </View>
      )}
      
      {(!isScopeActive || !isScopedWeapon) && <WeaponView weaponId={w.id} archetype={w.archetype} aimAnim={aimAnim} fireAnim={fireAnim} recoilAnim={recoilAnim} reloadAnim={reloadAnim} knifeThrowAnim={knifeThrowAnim} knifeThrowTarget={knifeThrowTarget} isAiming={isScopeActive && !isScopedWeapon} />}

       <View style={[s.uiLayer, { paddingTop: Math.max(insets.top, Platform.OS === 'web' ? 67 : 12), paddingBottom: Math.max(insets.bottom, 20) }]} pointerEvents="box-none">
         <View style={s.topHud} pointerEvents="box-none">
          <View style={s.topBar} pointerEvents="box-none">
           <View style={s.topLeft}>
               <Pressable accessibilityLabel={t('close')} testID="exit-btn" disabled={leave.isPending} onPress={exitBattle} style={[s.close, { backgroundColor: colors.overlay }, leave.isPending && s.disabledBtn]}>
               <Feather name="x" size={24} color={colors.foreground} />
             </Pressable>
            </View>

           <View style={s.topCenter}>
               {ownPlayer ? <Text testID="battle-player-name" numberOfLines={1} style={[s.playerNameHud, { color: colors.foreground }]}>{ownPlayer.name}</Text> : null}
              {battleSession ? <Text testID="battle-room-code" selectable style={[s.serverStatus, { color: colors.cyan }]}>{uiText(locale, 'roomCode')}: {battleSession.room.code}</Text> : null}
              {error ? <Text numberOfLines={1} style={s.errorText} testID="error-text">{error}</Text> : null}
                {battleSession && roomQuery.isError ? <Text numberOfLines={1} style={s.errorText} testID="battle-room-error">{t('errorMessage')}</Text> : null}
                {leaveError ? (
                  <View style={s.leaveError}>
                    <Text numberOfLines={1} style={s.errorText} testID="battle-leave-error">{leaveError}</Text>
                    <Pressable testID="retry-leave-btn" disabled={leave.isPending} onPress={exitBattle} style={[s.retryLeave, leave.isPending && s.disabledBtn]}>
                      <Text style={s.retryLeaveText}>{t('tryAgain')}</Text>
                    </Pressable>
                  </View>
                ) : null}
                {battleSession ? (
                  <Text
                    numberOfLines={1}
                    testID="battle-status-hud"
                    style={[s.serverStatus, { color: hudStatus === 'ready' ? colors.cyan : colors.mutedForeground }]}
                  >
                    {hudStatus === 'error'
                      ? t('errorMessage')
                      : hudStatus === 'finished'
                        ? t('teamBattle')
                        : hudStatus === 'camera'
                          ? uiText(locale, 'cameraUnavailableTitle')
                      : hudStatus === 'waiting'
                            ? t('ready')
                            : hudStatus === 'ready'
                              ? `${t('ready')} ${detectedMarkerId! + 1}`
                              : t('ready')}
                  </Text>
                ) : null}
           </View>

           <View style={s.topRight}>
                <View style={s.creditHud}>
                  <Feather name={activeGold ? 'award' : 'zap'} size={12} color={activeGold ? '#ffd700' : '#72f1d0'} />
                  <Text testID="battle-credit-balance" style={s.creditHudText}>{activeGold ? 'VIP' : formatUsdFromCents(creditCents, locale)}</Text>
                </View>
             <VisionModeControl
               activeMode={visionMode}
               cameraFacing={cameraFacing}
               onFlipCamera={() => {
                 stopActions();
                 setCameraFacing((current) => current === 'back' ? 'front' : 'back');
                 setRestartKey((key) => key + 1);
               }}
               onTestSound={() => playTestSound(selectedWeapon)}
               onModeChange={(nextMode) => {
                 stopActions();
                 setVisionMode(nextMode);
               }}
             />
           </View>
          </View>
          <View style={s.combatToolsRow} pointerEvents="box-none">
            {ownPlayer ? (
              <View style={s.markerHud}>
                <PlayerMarker compact color={ownPlayer.markerColor} markerId={ownPlayer.markerId} />
                <View>
                  <Text style={s.markerHudText}>♥ {ownPlayer.lives} · HP {ownPlayer.hp}%</Text>
                  <Text numberOfLines={1} style={s.markerHudTeam}>{ownPlayer.name}</Text>
                </View>
              </View>
            ) : null}
            <Pressable accessibilityLabel={t('equipmentSelection')} testID="weapon-picker-btn" onPress={openWeaponPicker} style={s.weaponPicker}>
              <View style={s.weaponPickerCopy}>
                <Text numberOfLines={1} style={s.weaponTabText}>{w.name}</Text>
                <Text numberOfLines={1} style={s.weaponCategory}>{weaponCategoryLabel(locale, w.category)}</Text>
              </View>
              <Feather name="chevron-down" size={18} color="#fff" />
            </Pressable>
          </View>
         </View>
          {battleSession && (
            <View style={s.networkTestPanel} pointerEvents="box-none">
              <Pressable
                testID="network-hit-test-toggle"
                accessibilityRole="switch"
                accessibilityState={{ checked: networkHitTest, disabled: !networkSocket.connected }}
                disabled={!networkSocket.connected || combatControlsDisabled}
                onPress={() => {
                  setNetworkHitTest((enabled) => !enabled);
                  if (networkHitTest) setNetworkTargetId(null);
                }}
                style={[s.networkTestToggle, networkHitTest && s.networkTestToggleActive, (!networkSocket.connected || combatControlsDisabled) && s.disabledBtn]}
              >
                <Feather name="radio" size={14} color={networkHitTest ? colors.cyan : colors.foreground} />
                <Text style={s.networkTestText}>{networkHitTest ? 'AĞ TESTİ AÇIK' : 'AĞ VURUŞ TESTİ'}</Text>
                <Text style={s.networkTestStatus}>{networkSocket.connected ? '●' : '○'}</Text>
              </Pressable>
              {networkHitTest && (
                <View style={s.networkTargetRow}>
                  {room?.players.filter((player) => player.id !== ownPlayer?.id && player.alive).map((player) => (
                    <Pressable
                      key={player.id}
                      testID={`network-target-${player.id}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected: networkTargetId === player.id }}
                      onPress={() => setNetworkTargetId(player.id)}
                      style={[s.networkTarget, networkTargetId === player.id && s.networkTargetActive]}
                    >
                      <Text numberOfLines={1} style={s.networkTargetText}>{player.name}</Text>
                    </Pressable>
                  ))}
                  {!room?.players.some((player) => player.id !== ownPlayer?.id && player.alive) && (
                    <Text style={s.networkTargetEmpty}>Canlı hedef bekleniyor</Text>
                  )}
                </View>
              )}
            </View>
          )}
        {isScopeActive && isScopedWeapon && (
           <View style={s.scopeAdjuster} pointerEvents={combatControlsDisabled ? 'none' : 'box-none'}>
             <Text style={s.scopeAdjustTitle}>{uiText(locale, 'scopeAdjust')}</Text>
              <Pressable accessibilityLabel={t('guide')} disabled={combatControlsDisabled} onPress={() => adjustScope(0, -4)} style={[s.scopeAdjustButton, combatControlsDisabled && s.disabledBtn]}><Feather name="chevron-up" size={18} color="#fff" /></Pressable>
            <View style={s.scopeAdjustMiddle}>
                <Pressable accessibilityLabel={t('guide')} disabled={combatControlsDisabled} onPress={() => adjustScope(-4, 0)} style={[s.scopeAdjustButton, combatControlsDisabled && s.disabledBtn]}><Feather name="chevron-left" size={18} color="#fff" /></Pressable>
                <Pressable accessibilityLabel={t('settings')} disabled={combatControlsDisabled} onPress={() => setScopeZero({ x: 0, y: 0 })} style={[s.scopeAdjustButton, s.scopeReset, combatControlsDisabled && s.disabledBtn]}><Text style={s.scopeResetText}>0</Text></Pressable>
                <Pressable accessibilityLabel={t('guide')} disabled={combatControlsDisabled} onPress={() => adjustScope(4, 0)} style={[s.scopeAdjustButton, combatControlsDisabled && s.disabledBtn]}><Feather name="chevron-right" size={18} color="#fff" /></Pressable>
            </View>
              <Pressable accessibilityLabel={t('guide')} disabled={combatControlsDisabled} onPress={() => adjustScope(0, 4)} style={[s.scopeAdjustButton, combatControlsDisabled && s.disabledBtn]}><Feather name="chevron-down" size={18} color="#fff" /></Pressable>
          </View>
        )}
        
         <View style={s.bottomContainer} pointerEvents="box-none">
             <View style={s.statusRow} pointerEvents="box-none">
                 <View style={s.ammoContainer} pointerEvents="none">
                       <Text style={s.ammoText} testID="ammo-text">{activeGold ? '∞' : ammo} / {w.capacity} · {weaponActionLabel(locale, weaponAction === 'grenade' ? 'count' : weaponAction === 'launch' ? 'rocket' : weaponAction === 'energy' ? 'energy' : weaponAction === 'slingshot' ? 'ball' : weaponAction === 'melee' ? 'hit' : 'ammo')}</Text>
                      {isReloading && <Text style={s.reloadingText} testID="reloading-text">{t('waiting')}</Text>}
                 </View>
                 <View style={s.statusRight}>
                      <Text style={s.magazineText} testID="magazine-text">{weaponAction === 'grenade' ? weaponActionLabel(locale, 'single') : `${weaponActionLabel(locale, 'ammo')} × ${activeGold ? '∞' : spareMagazines}`}</Text>
                   {w.archetype !== 'grenade' && (
                      <Pressable
                       testID="reload-btn"
                       accessibilityRole="button"
                         accessibilityLabel={t('continue')}
                         disabled={combatControlsDisabled || (!activeGold && spareMagazines <= 0)}
                        onPress={handleReload}
                         style={[s.reloadButton, (combatControlsDisabled || (!activeGold && spareMagazines <= 0)) && s.disabledBtn]}
                     >
                       <Feather name="rotate-cw" size={17} color="#fff" />
                     </Pressable>
                   )}
                 </View>
             </View>

             <View style={s.controlsRow} pointerEvents="box-none">
               {w.archetype !== 'grenade' && (
                 <Pressable
                   testID="scope-btn"
                   accessibilityRole="button"
                   accessibilityLabel={`${uiText(locale, 'scopeMagnification')} ${Math.max(w.zoom, 2.15)}×`}
                   accessibilityState={{ selected: isScopeActive }}
                    disabled={combatControlsDisabled}
                    onPress={() => { if (!combatControlsDisabled) setIsScopeActive(current => !current); }}
                    style={[s.scopeBtn, isScopeActive && s.scopeBtnActive, combatControlsDisabled && s.disabledBtn]}
                 >
                   <Feather name={isScopeActive ? 'zoom-out' : 'zoom-in'} size={28} color="#8be9ff" />
                   <Text style={s.scopeButtonText}>{isScopeActive ? '1×' : `${Math.max(w.zoom, 2.15)}×`}</Text>
                 </Pressable>
               )}
                 <View style={s.fireArea} pointerEvents="box-none">
                   <FireButton
                     onPressIn={handleFirePress}
                     onPressOut={() => { isFiringRef.current = false; }}
                        disabled={combatControlsDisabled || (!activeGold && ammo === 0)}
                        label={weaponActionLabel(locale, weaponAction === 'grenade' ? 'grenade' : weaponAction === 'launch' ? 'launch' : weaponAction === 'energy' ? 'energy' : weaponAction === 'slingshot' ? 'ball' : weaponAction === 'melee' ? 'melee' : w.automatic ? 'automatic' : 'single')}
                   />
                 </View>
             </View>
             <View style={s.bottomActionBar} pointerEvents="box-none">
                 <Pressable testID="ad-btn" accessibilityRole="button" accessibilityLabel={economyText(locale, 'economyRefill')} disabled={combatControlsDisabled} onPress={openAd} style={[s.actionBtn, s.adBtn, combatControlsDisabled && s.disabledBtn]}>
                 <Feather name="plus" size={14} color="#ffd700" />
                   <Text numberOfLines={1} style={s.actionBtnText}>{economyText(locale, 'economyRefill')}</Text>
               </Pressable>
                {w.id === 'knife' && (
                  <Pressable
                    testID="knife-throw-btn"
                    accessibilityRole="button"
                     accessibilityLabel={weaponActionLabel(locale, 'knifeThrow')}
                    onPress={handleKnifeThrow}
                     disabled={combatControlsDisabled || (!activeGold && ammo === 0)}
                     style={[s.actionBtn, s.throwBtn, (combatControlsDisabled || (!activeGold && ammo === 0)) && s.disabledBtn]}
                  >
                    <Feather name="navigation" size={14} color="#ff9f0a" />
                     <Text numberOfLines={1} style={s.actionBtnText}>{weaponActionLabel(locale, 'knifeThrow')}</Text>
                  </Pressable>
                )}
             </View>
             <View pointerEvents="none" style={s.developerTickerTrack}>
               <Animated.Text numberOfLines={1} style={[s.developerTickerText, { transform: [{ translateX: developerTicker }] }]}>
                 Geliştirici - Halil Özsoy - www.ephesusmedya.com.tr
               </Animated.Text>
             </View>

         </View>
      </View>

      {combatFlash && <View pointerEvents="none" testID={`${combatFlash}-flash`} style={[StyleSheet.absoluteFill, s.combatFlash, { backgroundColor: combatFlash === 'hit' ? 'rgba(48,209,88,0.42)' : 'rgba(255,45,85,0.52)' }]} />}
      {battleSession && ownPlayer && !ownPlayer.alive && ownPlayer.lives > 0 && (
        <View style={s.respawnLayer} pointerEvents="none">
           <Text style={s.respawnTitle}>{t('errorMessage')}</Text>
          <Text style={s.respawnCount}>{Math.max(0, Math.ceil((ownPlayer.respawnAt - clock) / 1000))}</Text>
           <Text style={s.respawnText}>{t('waiting')}</Text>
        </View>
      )}
      {battleSession && room?.status === 'finished' && (
        <View style={s.respawnLayer}>
           <Text style={s.respawnTitle}>{t('teamBattle')}</Text>
           <Text testID="battle-winner" style={s.respawnText}>
             {room.draw || !room.winnerPlayerId
               ? t('teamBattle')
                : `${uiText(locale, 'winner')}: ${room.players.find((player) => player.id === room.winnerPlayerId)?.name ?? t('players')}`}
           </Text>
           <Pressable disabled={leave.isPending} onPress={exitBattle} style={[s.button, { backgroundColor: colors.cyan, marginTop: 20, width: 240 }, leave.isPending && s.disabledBtn]}><Text style={{ color: colors.ink, fontWeight: '900' }}>{t('home')}</Text></Pressable>
        </View>
      )}
      {battleSession && shotMessage ? <View pointerEvents="none" style={s.shotToast}><Text style={s.shotToastText}>{shotMessage}</Text></View> : null}

      {!live && <View style={s.centerErrorLayer} pointerEvents="box-none">
        <View style={[s.card, { backgroundColor: colors.overlay, borderColor: colors.border }]}>
          {status.state === 'requesting' ? <ActivityIndicator color={colors.cyan} /> : <Feather name="camera-off" size={30} color={colors.amber} />}
           <Text style={[s.title, { color: colors.foreground }]}>{status.state === 'requesting' ? t('cameraHint') : status.state === 'paused' ? t('waiting') : uiText(locale, 'cameraUnavailableTitle')}</Text>
          <Text style={[s.message, { color: colors.mutedForeground }]}>{status.message}</Text>
          {status.state !== 'requesting' && <>
            <Pressable onPress={() => setRestartKey(key => key + 1)} style={[s.button, { backgroundColor: colors.cyan }]}>
               <Text style={{ color: colors.ink, fontWeight: '700' }}>{t('openCamera')} · {t('tryAgain')}</Text>
            </Pressable>
            <Pressable onPress={openBrowser} style={[s.button, { borderColor: colors.border, borderWidth: 1 }]}>
               <Text style={{ color: colors.foreground, fontWeight: '700' }}>{Platform.OS === 'web' ? uiText(locale, 'openInNewTab') : t('settings')}</Text>
            </Pressable>
          </>}
        </View>
      </View>}
      
       <EconomyGate
         visible={showAd}
         action="ammoRefill"
         title={economyText(locale, 'economyRefill')}
         body={economyText(locale, 'economyRefillReward')}
         onApproved={() => combatReady}
         onComplete={() => {
           refillWeapon();
           setShowAd(false);
         }}
         onCancel={() => setShowAd(false)}
         testID="ammo-refill-gate"
       />
      <Modal visible={pickerVisible} transparent animationType="slide" onRequestClose={() => setPickerVisible(false)}>
         <View style={[s.modalBackdrop, rtl && s.rtl]}>
          <View style={[s.pickerSheet, { backgroundColor: colors.background, borderColor: colors.border, paddingBottom: Math.max(insets.bottom, 16) }]}>
             <View style={s.pickerHeader}><View style={{ flex: 1 }}><Text style={[s.pickerTitle, { color: colors.foreground }]}>{t('equipmentSelection')}</Text><Text style={[s.pickerSubtitle, { color: colors.mutedForeground }]}>{WEAPONS.length} · {t('equipmentSettings')}</Text></View><Pressable accessibilityLabel={t('close')} onPress={() => setPickerVisible(false)} style={s.pickerClose}><Feather name="x" size={23} color={colors.foreground} /></Pressable></View>
            <WeaponCatalogList compact selectedWeapon={selectedWeapon} onSelect={handleWeaponSelect} />
          </View>
        </View>
      </Modal>
    </View>
  );
}
/*
export default function BattleScreen({
  onExit,
  battleSession,
  onSessionExpired,
}: {
  onExit: () => void;
  battleSession?: BattleSession | null;
  onSessionExpired?: () => void;
}) {
  const colors = useColors();
  const { locale, t, rtl } = useI18n();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [status, setStatus] = useState<CameraStatus>({ state: 'requesting', message: t('cameraHint') });
  const [restartKey, setRestartKey] = useState(0);
  const [cameraFacing, setCameraFacing] = useState<'front' | 'back'>('back');
  const [visionMode, setVisionMode] = useState<VisionMode>('normal');
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  const [sessionExpired, setSessionExpired] = useState(false);
  const live = status.state === 'live';
  const queryClient = useQueryClient();
  const appActiveRef = useRef(appActive);
  const sessionExpiredRef = useRef(false);
  const sessionTokenRef = useRef(battleSession?.sessionToken);
  appActiveRef.current = appActive;
  const stateParams = { code: battleSession?.room.code ?? '000000', sessionToken: battleSession?.sessionToken ?? 'inactive-session-token' };
  const roomQuery = useGetBattleState(stateParams, {
    query: {
      queryKey: getGetBattleStateQueryKey(stateParams),
      enabled: !!battleSession && appActive && !sessionExpired,
      refetchInterval: appActive && !sessionExpired ? 450 : false,
      refetchOnWindowFocus: true,
    },
  });
  const room = roomQuery.data?.room ?? battleSession?.room;
  const ownPlayer = room?.players.find((player) => player.id === battleSession?.playerId);
  const combatReady = !isBattleCombatDisabled({
    hasBattleSession: !!battleSession && !sessionExpired,
    roomStatus: room?.status,
    roomError: roomQuery.isError || sessionExpired || !appActive,
    cameraLive: live && appActive,
    ownPlayerAlive: !!ownPlayer?.alive,
    adOpen: false,
    reloading: false,
  });
  const [detectedMarkerId, setDetectedMarkerId] = useState<number | null>(null);
  const [combatFlash, setCombatFlash] = useState<'hit' | 'hurt' | null>(null);
  const [shotMessage, setShotMessage] = useState('');
  const [clock, setClock] = useState(Date.now());
  const previousAliveRef = useRef<boolean | undefined>(undefined);
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { selectedWeapon, setSelectedWeapon, activeGold } = useGame();
  const {
    creditCents,
    spendAmmoCredits,
    spendKnifeCredits,
    prices,
  } = useEconomy();
  const { playShot, playReload, playTestSound, error } = useWeaponAudio();
  const [ammo, setAmmo] = useState(0);
  const [isReloading, setIsReloading] = useState(false);
  const [showAd, setShowAd] = useState(false);
  const [isScopeActive, setIsScopeActive] = useState(false);
  const [spareMagazines, setSpareMagazines] = useState(3);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [scopeZero, setScopeZero] = useState({ x: 0, y: 0 });
  const [leaveError, setLeaveError] = useState('');
  const combatControlsDisabled = isBattleCombatDisabled({
    hasBattleSession: !!battleSession && !sessionExpired,
    roomStatus: room?.status,
    roomError: roomQuery.isError || sessionExpired || !appActive,
    cameraLive: live && appActive,
    ownPlayerAlive: !!ownPlayer?.alive,
    adOpen: showAd,
    reloading: isReloading,
  });

  useEffect(() => {
    if (battleSession?.sessionToken && battleSession.sessionToken !== sessionTokenRef.current) {
      sessionExpiredRef.current = false;
      setSessionExpired(false);
    }
    sessionTokenRef.current = battleSession?.sessionToken;
  }, [battleSession?.sessionToken]);
  const aimAnim = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const aimValue = useRef({ x: 0, y: 0 });
  const fireAnim = useRef(new Animated.Value(0)).current;
  const recoilAnim = useRef(new Animated.Value(0)).current;
  const zoomAnim = useRef(new Animated.Value(1)).current;
  const reloadAnim = useRef(new Animated.Value(0)).current;
  const ammoRef = useRef(0);
  const reloadingRef = useRef(false);
  const isLiveRef = useRef(false);
  const showAdRef = useRef(false);
  const isFiringRef = useRef(false);
  const shotInFlightRef = useRef(false);
  const lastFireTimeRef = useRef(0);
  const weaponRef = useRef(selectedWeapon);
  const activeGoldRef = useRef(activeGold);
  const aimTouchRef = useRef<AimTouchLayerRef>(null);
  const reloadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const detectedMarkerRef = useRef<number | null>(null);
  const pendingShotRef = useRef<{ weaponId: WeaponId } | null>(null);
  activeGoldRef.current = activeGold;
  const playShotRef = useRef(playShot);
  const playReloadRef = useRef(playReload);
  useEffect(() => { playShotRef.current = playShot; }, [playShot]);
  useEffect(() => { playReloadRef.current = playReload; }, [playReload]);

  const weaponStateRef = useRef<Record<string, { ammo: number; spareMagazines: number }>>({});

  const handleSessionExpired = useCallback(() => {
    if (sessionExpiredRef.current) return;
    sessionExpiredRef.current = true;
    setSessionExpired(true);
    if (battleSession) {
      queryClient.removeQueries({
        queryKey: getGetBattleStateQueryKey({
          code: battleSession.room.code,
          sessionToken: battleSession.sessionToken,
        }),
        exact: true,
      });
    }
    onSessionExpired?.();
    const copy = battleSessionCopy(locale);
    Alert.alert(copy.expiredTitle, copy.expiredMessage, [{
      text: t('continue'),
      onPress: onExit,
    }], { cancelable: false });
  }, [battleSession, locale, onExit, onSessionExpired, queryClient, t]);

  useEffect(() => {
    if (!battleSession || sessionExpired || !isGoneBattleSession(roomQuery.error)) return;
    handleSessionExpired();
  }, [battleSession, handleSessionExpired, roomQuery.error, sessionExpired]);

  useEffect(() => { isLiveRef.current = combatReady; }, [combatReady]);
  useEffect(() => { showAdRef.current = showAd; }, [showAd]);
  const stopActions = () => {
      isFiringRef.current = false;
      aimTouchRef.current?.cancel();
      if (reloadTimeoutRef.current) clearTimeout(reloadTimeoutRef.current);
      reloadTimeoutRef.current = null;
      reloadingRef.current = false;
      setIsReloading(false);
      reloadAnim.stopAnimation();
      reloadAnim.setValue(0);
      fireAnim.stopAnimation();
      fireAnim.setValue(0);
      recoilAnim.stopAnimation();
      recoilAnim.setValue(0);
      lastFireTimeRef.current = 0;
  };

  useEffect(() => {
    weaponRef.current = selectedWeapon;
    stopActions();
    const w = getWeapon(selectedWeapon);
    const saved = weaponStateRef.current[selectedWeapon] || { ammo: w.capacity, spareMagazines: w.archetype === 'grenade' ? 0 : 3 };
    setAmmo(saved.ammo);
    ammoRef.current = saved.ammo;
    setSpareMagazines(saved.spareMagazines);
    reloadingRef.current = false;
    setIsReloading(false);
    isFiringRef.current = false;
    aimTouchRef.current?.cancel();
    setIsScopeActive(false);
    setScopeZero({ x: 0, y: 0 });

    if (reloadTimeoutRef.current) {
      clearTimeout(reloadTimeoutRef.current);
      reloadTimeoutRef.current = null;
    }
  }, [selectedWeapon]);

  useEffect(() => {
    const w = getWeapon(selectedWeapon);
    Animated.timing(zoomAnim, {
      toValue: isScopeActive ? Math.max(w.zoom, 2.15) : 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [selectedWeapon, isScopeActive, zoomAnim]);
  useEffect(() => {
      const handleAppChange = (state: string) => {
        handleBattleAppStateChange(state, {
          hasSession: !!battleSession && !sessionExpired,
          queryKey: getGetBattleStateQueryKey(stateParams),
          setAppActive: (nextActive) => {
            appActiveRef.current = nextActive;
            setAppActive(nextActive);
          },
          cancelQueries: (filters) => queryClient.cancelQueries(filters),
          refetch: roomQuery.refetch,
          isExpiredError: isGoneBattleSession,
          onExpired: handleSessionExpired,
          onBackground: stopActions,
        });
      };
      const handleBlur = () => stopActions();
      const handleVis = () => { if (typeof document !== 'undefined' && document.visibilityState === 'hidden') stopActions(); };
      const sub = AppState.addEventListener('change', handleAppChange);
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.addEventListener('blur', handleBlur);
          document.addEventListener('visibilitychange', handleVis);
      }
      return () => {
          sub.remove();
          if (Platform.OS === 'web' && typeof window !== 'undefined') {
              window.removeEventListener('blur', handleBlur);
              document.removeEventListener('visibilitychange', handleVis);
          }
      };
  }, [battleSession?.room.code, battleSession?.sessionToken, handleSessionExpired, queryClient, roomQuery.refetch, sessionExpired]);
  useEffect(() => {
      if (!combatReady || showAd) stopActions();
   }, [combatReady, showAd]);

  const updateAim = useCallback((x: number, y: number) => {
    const nextAim = clampAimOffset({ x, y }, width, height);
    aimValue.current = nextAim;
    aimAnim.setValue(nextAim);
  }, [aimAnim, height, width]);
  useEffect(() => {
      return () => {
        if (reloadTimeoutRef.current) clearTimeout(reloadTimeoutRef.current);
        if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
        fireAnim.stopAnimation();
        recoilAnim.stopAnimation();
      };
  }, []);

  useEffect(() => {
    detectedMarkerRef.current = detectedMarkerId;
  }, [detectedMarkerId]);

  useEffect(() => {
    if (!battleSession) return;
    const timer = setInterval(() => setClock(Date.now()), 100);
    return () => clearInterval(timer);
  }, [battleSession]);

  const showFlash = (kind: 'hit' | 'hurt') => {
    if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    setCombatFlash(kind);
    flashTimeoutRef.current = setTimeout(() => setCombatFlash(null), 420);
  };

  useEffect(() => {
    if (!ownPlayer) return;
    if (previousAliveRef.current === true && !ownPlayer.alive) showFlash('hurt');
    previousAliveRef.current = ownPlayer.alive;
  }, [ownPlayer?.alive]);

  const restoreRejectedShot = () => {
    const pendingShot = pendingShotRef.current;
    if (!pendingShot) return;
    pendingShotRef.current = null;
    const weapon = getWeapon(pendingShot.weaponId);
    const saved = weaponStateRef.current[pendingShot.weaponId];
    if (weaponRef.current === pendingShot.weaponId) {
      const restoredAmmo = Math.min(weapon.capacity, ammoRef.current + 1);
      ammoRef.current = restoredAmmo;
      setAmmo(restoredAmmo);
    } else if (saved) {
      saved.ammo = Math.min(weapon.capacity, saved.ammo + 1);
    }
  };

  const shot = useFireBattleShot({
    mutation: {
      onSuccess: (result) => {
        if (result.accepted) {
          pendingShotRef.current = null;
        } else {
          restoreRejectedShot();
        }
        if (battleSession) {
          queryClient.setQueryData(getGetBattleStateQueryKey({ code: battleSession.room.code, sessionToken: battleSession.sessionToken }), {
            playerId: battleSession.playerId,
            sessionToken: battleSession.sessionToken,
            room: result.room,
          });
        }
         setShotMessage(result.accepted ? t('ready') : t('waiting'));
        if (result.accepted) showFlash('hit');
      },
       onError: (requestError) => {
         restoreRejectedShot();
         if (isGoneBattleSession(requestError)) {
           handleSessionExpired();
           return;
         }
         setShotMessage(t('errorMessage'));
      },
      onSettled: () => {
        releaseBattleShot(shotInFlightRef);
      },
    },
  });

  const handleWeaponSelect = (id: WeaponId) => {
      if (id === selectedWeapon) {
          setPickerVisible(false);
          return;
      }
      stopActions();
       weaponStateRef.current[selectedWeapon] = { ammo: ammoRef.current, spareMagazines };
      setSelectedWeapon(id);
      setPickerVisible(false);
  };

  const openWeaponPicker = () => {
      stopActions();
      setPickerVisible(true);
  };

  const fireOne = (fireMode: 'primary' | 'throw' = 'primary') => {
    const w = getWeapon(weaponRef.current);
    const now = Date.now();
    const cooldown = HEAVY_COOLDOWN_MS[w.id] ?? w.interval;
    if (fireMode === 'throw' && w.id !== 'knife') return;
    const hasKnifeInventory = activeGoldRef.current || w.id !== 'knife' || ammoRef.current > 0;
    const hasAmmo = activeGoldRef.current || (w.id === 'knife' ? hasKnifeInventory : ammoRef.current > 0);
    if (!appActiveRef.current || sessionExpiredRef.current || !isLiveRef.current || showAdRef.current || reloadingRef.current || !hasAmmo || now - lastFireTimeRef.current < cooldown) return;
    const markerId = detectedMarkerRef.current;
    if (battleSession && markerId === null) {
       setShotMessage(t('waiting'));
      return;
    }
    if (battleSession && !tryAcquireBattleShot(shotInFlightRef)) return;
    lastFireTimeRef.current = now;
    if (!activeGoldRef.current && (w.id !== 'knife' || fireMode === 'throw')) {
      ammoRef.current -= 1;
      setAmmo(ammoRef.current);
    }
    playShotRef.current(w.id);
    fireAnim.setValue(1);
    Animated.timing(fireAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start();
    recoilAnim.setValue(w.recoil * 3);
    Animated.spring(recoilAnim, { toValue: 0, friction: 6, tension: 120, useNativeDriver: true }).start();
    if (battleSession && markerId !== null) {
      const consumedAmmo = !activeGoldRef.current && (w.id !== 'knife' || fireMode === 'throw');
      if (consumedAmmo) pendingShotRef.current = { weaponId: w.id };
      shot.mutate({
        code: battleSession.room.code,
        data: {
          sessionToken: battleSession.sessionToken,
          markerId,
          firedAt: now,
          weaponId: w.id,
          fireMode,
        },
      });
    }
  };

  const leave = useLeaveBattleRoom();

  const exitBattle = () => {
    if (!appActiveRef.current) return;
    stopActions();
    setLeaveError('');
    if (!battleSession || leave.isPending) {
      onExit();
      return;
    }
    leave.mutate(
      { code: battleSession.room.code, data: { sessionToken: battleSession.sessionToken } },
      {
        onSuccess: onExit,
        onError: (requestError) => {
          if (isGoneBattleSession(requestError)) {
            onExit();
            return;
          }
          setLeaveError(t('errorMessage'));
        },
      },
    );
  };

  const requestHardwareBack = useCallback(() => {
    const copy = battleSessionCopy(locale);
    return handleBattleHardwareBack({
      hasSession: !!battleSession,
      sessionExpired,
      leavePending: leave.isPending,
      onExit,
      onLeave: exitBattle,
      confirmLeave: ({ onConfirm, onCancel }) => Alert.alert(copy.leaveTitle, copy.leaveMessage, [
        { text: copy.leaveCancel, style: 'cancel', onPress: onCancel },
        { text: copy.leaveConfirm, style: 'destructive', onPress: onConfirm },
      ], { cancelable: true }),
    });
  }, [battleSession, exitBattle, leave.isPending, locale, onExit, sessionExpired]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', requestHardwareBack);
    return () => subscription.remove();
  }, [requestHardwareBack]);

  const handleFirePress = () => {
    // A quick tap must fire even when released before the next animation frame.
    if (combatControlsDisabled) return;
    fireOne();
    isFiringRef.current = getWeapon(weaponRef.current).automatic
      && (activeGoldRef.current || ammoRef.current > 0)
      && !reloadingRef.current
      && isLiveRef.current
      && !showAdRef.current;
  };

  const handleKnifeThrow = () => {
    if (combatControlsDisabled || weaponRef.current !== 'knife') return;
    fireOne('throw');
  };

  useEffect(() => {
    let frameId: number;
    const loop = () => {
        // Fire update
        if (isFiringRef.current) fireOne();
        frameId = requestAnimationFrame(loop);
    };
    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, []);

  const handleReload = () => {
    if (
      combatControlsDisabled
      ||
      !isLiveRef.current
      || showAdRef.current
      || reloadingRef.current
      || getWeapon(selectedWeapon).archetype === 'grenade'
      || ammoRef.current === getWeapon(selectedWeapon).capacity
      || (!activeGoldRef.current && spareMagazines <= 0)
    ) return;
    stopActions();
    reloadingRef.current = true;
    setIsReloading(true);
    playReloadRef.current();
    reloadAnim.setValue(0);
    Animated.timing(reloadAnim, { toValue: 1, duration: 1500, useNativeDriver: true }).start();
    reloadTimeoutRef.current = setTimeout(() => {
        reloadTimeoutRef.current = null;
        const w = getWeapon(weaponRef.current);
        ammoRef.current = w.capacity;
        setAmmo(w.capacity);
        if (!activeGoldRef.current) setSpareMagazines(current => Math.max(0, current - 1));
        const ws = weaponStateRef.current[weaponRef.current];
        if (ws) {
          ws.ammo = w.capacity;
          if (!activeGoldRef.current) ws.spareMagazines = Math.max(0, ws.spareMagazines - 1);
        }
        reloadingRef.current = false;
        setIsReloading(false);
    }, 1500);
  };

  const openAd = () => {
    if (combatControlsDisabled) return;
    stopActions();
    if (activeGoldRef.current) {
      refillWeapon();
      return;
    }
    setShowAd(true);
  };

  const refillWeapon = () => {
    const wCurrent = getWeapon(selectedWeapon);
    ammoRef.current = wCurrent.capacity;
    setAmmo(wCurrent.capacity);
    setSpareMagazines((current) => current + 1);
    if (weaponStateRef.current[selectedWeapon]) {
      weaponStateRef.current[selectedWeapon].ammo = wCurrent.capacity;
      weaponStateRef.current[selectedWeapon].spareMagazines += 1;
    }
  };

  const refillWithCredits = () => {
    if (combatControlsDisabled) return;
    const result = selectedWeapon === 'knife' ? spendKnifeCredits() : spendAmmoCredits();
     setShotMessage(result.ok ? t('ready') : t('paymentUnavailable'));
     if (result.ok) refillWeapon();
  };

  const openBrowser = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('battle');
      url.searchParams.set('camera', '1');
      window.open(url.toString(), '_blank', 'noopener,noreferrer');
    } else void Linking.openSettings();
  };
  const w = getWeapon(selectedWeapon);
  const weaponAction = getWeaponAction(w);
  const supplyCopy = {
    title: t('adSimulation'),
    body: t('storeNote'),
    rewardLabel: t('continue'),
  };
  const targetedEffect = room?.effects?.find((effect) => effect.expiresAt > clock) ?? null;
  const refillPrice = selectedWeapon === 'knife' ? prices.knifeUseCents : prices.ammoRefillCents;
  const isScopedWeapon = w.zoom >= 2;
  const hudStatus = battleHudStatus({
    hasBattleSession: !!battleSession,
    roomStatus: room?.status,
    roomError: roomQuery.isError,
    detectedMarkerId,
  });
  const adjustScope = (dx: number, dy: number) => {
    setScopeZero(current => ({
      x: Math.max(-32, Math.min(32, current.x + dx)),
      y: Math.max(-32, Math.min(32, current.y + dy)),
    }));
  };
  // Scaling around the viewport center keeps the aimed source point under the
  // moved scope only when the outer translation equals (1 - zoom) * aim.
  const camTranslateX = Animated.multiply(aimAnim.x, Animated.subtract(1, zoomAnim));
  const camTranslateY = Animated.multiply(aimAnim.y, Animated.subtract(1, zoomAnim));

  return (
    <View style={[s.root, rtl && s.rtl, { backgroundColor: colors.background }]} testID="battle-screen">
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateX: camTranslateX }, { translateY: camTranslateY }] }]}>
        <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ scale: zoomAnim }] }]}>
          <LiveBattleCamera
            onStatus={setStatus}
            restartKey={restartKey}
            facing={cameraFacing}
            onFacingUnavailable={(failedFacing) => {
              if (failedFacing === 'back') {
                stopActions();
                setCameraFacing('front');
                setRestartKey((key) => key + 1);
              }
            }}
            onFrame={(frame) => {
              if (!room || !ownPlayer) return;
              const markerId = detectPlayerMarker(
                frame,
               room.players.filter((player) =>
                 player.id !== ownPlayer.id
                 && player.alive,
               ),
                aimValue.current,
                { width, height },
              );
               detectedMarkerRef.current = markerId;
               setDetectedMarkerId((current) => current === markerId ? current : markerId);
            }}
          />
        </Animated.View>
      </Animated.View>

      <AimTouchLayer
        ref={aimTouchRef}
        disabled={!combatReady || showAd || isReloading}
        onAim={updateAim}
      />
      <VisionModeOverlay mode={visionMode} />
      <ScopeOverlay aimAnim={aimAnim} isScopeActive={isScopeActive && isScopedWeapon} zoom={w.zoom} zeroOffset={scopeZero} />
      <IronSightOverlay aimAnim={aimAnim} isActive={isScopeActive && !isScopedWeapon && w.archetype !== 'grenade'} />
      <NormalReticle aimAnim={aimAnim} isScopeActive={isScopeActive} />
      {targetedEffect && (
        <View
          pointerEvents="none"
          testID={`opponent-effect-${targetedEffect.kind}`}
          style={[
            StyleSheet.absoluteFill,
            s.grenadeEffect,
            targetedEffect.kind === 'flashbang' ? s.flashEffect : targetedEffect.kind === 'smoke' ? s.smokeEffect : s.fragEffect,
          ]}
        >
            <Text style={s.grenadeEffectText}>
             {targetedEffect.kind === 'flashbang' ? uiText(locale, 'flash') : targetedEffect.kind === 'smoke' ? uiText(locale, 'smoke') : uiText(locale, 'explosion')}
          </Text>
        </View>
      )}
      {(!isScopeActive || !isScopedWeapon) && <WeaponView weaponId={w.id} archetype={w.archetype} aimAnim={aimAnim} fireAnim={fireAnim} recoilAnim={recoilAnim} reloadAnim={reloadAnim} isAiming={isScopeActive && !isScopedWeapon} />}

       <View style={[s.uiLayer, { paddingTop: Math.max(insets.top, Platform.OS === 'web' ? 67 : 12), paddingBottom: Math.max(insets.bottom, 20) }]} pointerEvents="box-none">
         <View style={s.topBar} pointerEvents="box-none">
           <View style={s.topLeft}>
               <Pressable accessibilityLabel={t('close')} testID="exit-btn" disabled={leave.isPending} onPress={exitBattle} style={[s.close, { backgroundColor: colors.overlay }, leave.isPending && s.disabledBtn]}>
               <Feather name="x" size={24} color={colors.foreground} />
             </Pressable>
            </View>

           <View style={s.topCenter}>
              {battleSession ? <Text testID="battle-room-code" selectable style={[s.serverStatus, { color: colors.cyan }]}>{uiText(locale, 'roomCode')}: {battleSession.room.code}</Text> : null}
              {error ? <Text numberOfLines={1} style={s.errorText} testID="error-text">{error}</Text> : null}
                {battleSession && roomQuery.isError ? <Text numberOfLines={1} style={s.errorText} testID="battle-room-error">{t('errorMessage')}</Text> : null}
                {leaveError ? (
                  <View style={s.leaveError}>
                    <Text numberOfLines={1} style={s.errorText} testID="battle-leave-error">{leaveError}</Text>
                    <Pressable testID="retry-leave-btn" disabled={leave.isPending} onPress={exitBattle} style={[s.retryLeave, leave.isPending && s.disabledBtn]}>
                      <Text style={s.retryLeaveText}>{t('tryAgain')}</Text>
                    </Pressable>
                  </View>
                ) : null}
                {battleSession ? (
                  <Text
                    numberOfLines={1}
                    testID="battle-status-hud"
                    style={[s.serverStatus, { color: hudStatus === 'ready' ? colors.cyan : colors.mutedForeground }]}
                  >
                    {hudStatus === 'error'
                      ? t('errorMessage')
                      : hudStatus === 'finished'
                        ? t('teamBattle')
                        : hudStatus === 'waiting'
                          ? t('waiting')
                          : hudStatus === 'ready'
                            ? `${t('ready')} ${detectedMarkerId! + 1}`
                            : t('ready')}
                  </Text>
                ) : null}
           </View>

           <View style={s.topRight}>
               {ownPlayer ? <View style={s.markerHud}><PlayerMarker compact color={ownPlayer.markerColor} markerId={ownPlayer.markerId} /><Text style={s.markerHudText}>♥ {ownPlayer.lives} · HP {ownPlayer.hp}%</Text></View> :
              <Pressable accessibilityLabel={t('equipmentSelection')} testID="weapon-picker-btn" onPress={openWeaponPicker} style={s.weaponPicker}>
                <View style={s.weaponPickerCopy}><Text numberOfLines={1} style={s.weaponTabText}>{w.name}</Text><Text numberOfLines={1} style={s.weaponCategory}>{weaponCategoryLabel(locale, w.category)}</Text></View>
               <Feather name="chevron-down" size={18} color="#fff" />
             </Pressable>}
             <VisionModeControl
               activeMode={visionMode}
               cameraFacing={cameraFacing}
               onFlipCamera={() => {
                 stopActions();
                 setCameraFacing((current) => current === 'back' ? 'front' : 'back');
                 setRestartKey((key) => key + 1);
               }}
               onTestSound={() => playTestSound(selectedWeapon)}
               onModeChange={(nextMode) => {
                 stopActions();
                 setVisionMode(nextMode);
               }}
             />
           </View>
         </View>
        {isScopeActive && isScopedWeapon && (
           <View style={s.scopeAdjuster} pointerEvents={combatControlsDisabled ? 'none' : 'box-none'}>
             <Text style={s.scopeAdjustTitle}>{uiText(locale, 'scopeAdjust')}</Text>
              <Pressable accessibilityLabel={t('guide')} disabled={combatControlsDisabled} onPress={() => adjustScope(0, -4)} style={[s.scopeAdjustButton, combatControlsDisabled && s.disabledBtn]}><Feather name="chevron-up" size={18} color="#fff" /></Pressable>
            <View style={s.scopeAdjustMiddle}>
                <Pressable accessibilityLabel={t('guide')} disabled={combatControlsDisabled} onPress={() => adjustScope(-4, 0)} style={[s.scopeAdjustButton, combatControlsDisabled && s.disabledBtn]}><Feather name="chevron-left" size={18} color="#fff" /></Pressable>
                <Pressable accessibilityLabel={t('settings')} disabled={combatControlsDisabled} onPress={() => setScopeZero({ x: 0, y: 0 })} style={[s.scopeAdjustButton, s.scopeReset, combatControlsDisabled && s.disabledBtn]}><Text style={s.scopeResetText}>0</Text></Pressable>
                <Pressable accessibilityLabel={t('guide')} disabled={combatControlsDisabled} onPress={() => adjustScope(4, 0)} style={[s.scopeAdjustButton, combatControlsDisabled && s.disabledBtn]}><Feather name="chevron-right" size={18} color="#fff" /></Pressable>
            </View>
              <Pressable accessibilityLabel={t('guide')} disabled={combatControlsDisabled} onPress={() => adjustScope(0, 4)} style={[s.scopeAdjustButton, combatControlsDisabled && s.disabledBtn]}><Feather name="chevron-down" size={18} color="#fff" /></Pressable>
          </View>
        )}
         <View style={s.bottomContainer} pointerEvents="box-none">
             <View style={s.statusRow} pointerEvents="box-none">
                 <View style={s.ammoContainer} pointerEvents="none">
                       <Text style={s.ammoText} testID="ammo-text">{activeGold ? '∞' : ammo} / {w.capacity} · {weaponActionLabel(locale, weaponAction === 'grenade' ? 'count' : weaponAction === 'launch' ? 'rocket' : weaponAction === 'energy' ? 'energy' : weaponAction === 'slingshot' ? 'ball' : weaponAction === 'melee' ? 'hit' : 'ammo')}</Text>
                      {isReloading && <Text style={s.reloadingText} testID="reloading-text">{t('waiting')}</Text>}
                 </View>
                 <View style={s.statusRight}>
                      <Text style={s.magazineText} testID="magazine-text">{weaponAction === 'grenade' ? weaponActionLabel(locale, 'single') : `${weaponActionLabel(locale, 'ammo')} × ${activeGold ? '∞' : spareMagazines}`}</Text>
                   {w.archetype !== 'grenade' && (
                      <Pressable
                       testID="reload-btn"
                       accessibilityRole="button"
                         accessibilityLabel={t('continue')}
                         disabled={combatControlsDisabled || (!activeGold && spareMagazines <= 0)}
                        onPress={handleReload}
                         style={[s.reloadButton, (combatControlsDisabled || (!activeGold && spareMagazines <= 0)) && s.disabledBtn]}
                     >
                       <Feather name="rotate-cw" size={17} color="#fff" />
                     </Pressable>
                   )}
                 </View>
             </View>

             <View style={s.controlsRow} pointerEvents="box-none">
               {w.archetype !== 'grenade' && (
                 <Pressable
                   testID="scope-btn"
                   accessibilityRole="button"
                   accessibilityLabel={`${uiText(locale, 'scopeMagnification')} ${Math.max(w.zoom, 2.15)}×`}
                   accessibilityState={{ selected: isScopeActive }}
                    disabled={combatControlsDisabled}
                    onPress={() => { if (!combatControlsDisabled) setIsScopeActive(current => !current); }}
                    style={[s.scopeBtn, isScopeActive && s.scopeBtnActive, combatControlsDisabled && s.disabledBtn]}
                 >
                   <Feather name={isScopeActive ? 'zoom-out' : 'zoom-in'} size={28} color="#8be9ff" />
                   <Text style={s.scopeButtonText}>{isScopeActive ? '1×' : `${Math.max(w.zoom, 2.15)}×`}</Text>
                 </Pressable>
               )}
                 <View style={s.fireArea} pointerEvents="box-none">
                   <FireButton
                     onPressIn={handleFirePress}
                     onPressOut={() => { isFiringRef.current = false; }}
                        disabled={combatControlsDisabled || (!activeGold && ammo === 0)}
                        label={weaponActionLabel(locale, weaponAction === 'grenade' ? 'grenade' : weaponAction === 'launch' ? 'launch' : weaponAction === 'energy' ? 'energy' : weaponAction === 'slingshot' ? 'ball' : weaponAction === 'melee' ? 'melee' : w.automatic ? 'automatic' : 'single')}
                   />
                 </View>
             </View>
             <View style={s.bottomActionBar} pointerEvents="box-none">
                 <Pressable testID="ad-btn" accessibilityRole="button" accessibilityLabel={t('creditPacks')} disabled={combatControlsDisabled} onPress={openAd} style={[s.actionBtn, s.adBtn, combatControlsDisabled && s.disabledBtn]}>
                 <Feather name="plus" size={14} color="#ffd700" />
                  <Text numberOfLines={1} style={s.actionBtnText}>{t('creditPacks')}</Text>
               </Pressable>
                <Pressable
                  testID="credit-refill-btn"
                  accessibilityRole="button"
                   accessibilityLabel={`${refillPrice}¢ · ${t('continue')}`}
                    disabled={combatControlsDisabled || (!activeGold && creditCents < refillPrice)}
                  onPress={refillWithCredits}
                    style={[s.actionBtn, s.creditBtn, (combatControlsDisabled || (!activeGold && creditCents < refillPrice)) && s.disabledBtn]}
                >
                  <Feather name="zap" size={14} color="#72f1d0" />
                   <Text numberOfLines={1} style={s.actionBtnText}>{refillPrice}¢ · {t('continue')}</Text>
                </Pressable>
                {w.id === 'knife' && (
                  <Pressable
                    testID="knife-throw-btn"
                    accessibilityRole="button"
                     accessibilityLabel={weaponActionLabel(locale, 'knifeThrow')}
                    onPress={handleKnifeThrow}
                     disabled={combatControlsDisabled || (!activeGold && ammo === 0)}
                     style={[s.actionBtn, s.throwBtn, (combatControlsDisabled || (!activeGold && ammo === 0)) && s.disabledBtn]}
                  >
                    <Feather name="navigation" size={14} color="#ff9f0a" />
                     <Text numberOfLines={1} style={s.actionBtnText}>{weaponActionLabel(locale, 'knifeThrow')}</Text>
                  </Pressable>
                )}
             </View>

         </View>
      </View>

      {combatFlash && <View pointerEvents="none" testID={`${combatFlash}-flash`} style={[StyleSheet.absoluteFill, s.combatFlash, { backgroundColor: combatFlash === 'hit' ? 'rgba(48,209,88,0.42)' : 'rgba(255,45,85,0.52)' }]} />}
      {battleSession && ownPlayer && !ownPlayer.alive && ownPlayer.lives > 0 && (
        <View style={s.respawnLayer} pointerEvents="none">
           <Text style={s.respawnTitle}>{t('errorMessage')}</Text>
          <Text style={s.respawnCount}>{Math.max(0, Math.ceil((ownPlayer.respawnAt - clock) / 1000))}</Text>
           <Text style={s.respawnText}>{t('waiting')}</Text>
        </View>
      )}
      {battleSession && room?.status === 'finished' && (
        <View style={s.respawnLayer}>
           <Text style={s.respawnTitle}>{t('teamBattle')}</Text>
           <Text testID="battle-winner" style={s.respawnText}>
              {room.draw || !room.winnerPlayerId
               ? t('teamBattle')
                : `${uiText(locale, 'winner')}: ${room.players.find((player) => player.id === room.winnerPlayerId)?.name ?? t('players')}`}
           </Text>
           <Pressable disabled={leave.isPending} onPress={exitBattle} style={[s.button, { backgroundColor: colors.cyan, marginTop: 20, width: 240 }, leave.isPending && s.disabledBtn]}><Text style={{ color: colors.ink, fontWeight: '900' }}>{t('home')}</Text></Pressable>
        </View>
      )}
      {battleSession && shotMessage ? <View pointerEvents="none" style={s.shotToast}><Text style={s.shotToastText}>{shotMessage}</Text></View> : null}

      {!live && <View style={s.centerErrorLayer} pointerEvents="box-none">
        <View style={[s.card, { backgroundColor: colors.overlay, borderColor: colors.border }]}>
          {status.state === 'requesting' ? <ActivityIndicator color={colors.cyan} /> : <Feather name="camera-off" size={30} color={colors.amber} />}
           <Text style={[s.title, { color: colors.foreground }]}>{status.state === 'requesting' ? t('cameraHint') : status.state === 'paused' ? t('waiting') : uiText(locale, 'cameraUnavailableTitle')}</Text>
          <Text style={[s.message, { color: colors.mutedForeground }]}>{status.message}</Text>
          {status.state !== 'requesting' && <>
            <Pressable onPress={() => setRestartKey(key => key + 1)} style={[s.button, { backgroundColor: colors.cyan }]}>
               <Text style={{ color: colors.ink, fontWeight: '700' }}>{t('openCamera')} · {t('tryAgain')}</Text>
            </Pressable>
            <Pressable onPress={openBrowser} style={[s.button, { borderColor: colors.border, borderWidth: 1 }]}>
               <Text style={{ color: colors.foreground, fontWeight: '700' }}>{Platform.OS === 'web' ? uiText(locale, 'openInNewTab') : t('settings')}</Text>
            </Pressable>
          </>}
        </View>
      </View>}
      {showAd && <AdSimulation
        visible={showAd}
        onClose={() => setShowAd(false)}
        title={supplyCopy.title}
        body={supplyCopy.body}
        rewardLabel={supplyCopy.rewardLabel}
        onReward={() => {
            if (!combatReady) {
              setShowAd(false);
              return;
            }
            refillWeapon();
           setShowAd(false);
        }}
      />}
      <Modal visible={pickerVisible} transparent animationType="slide" onRequestClose={() => setPickerVisible(false)}>
         <View style={[s.modalBackdrop, rtl && s.rtl]}>
          <View style={[s.pickerSheet, { backgroundColor: colors.background, borderColor: colors.border, paddingBottom: Math.max(insets.bottom, 16) }]}>
             <View style={s.pickerHeader}><View style={{ flex: 1 }}><Text style={[s.pickerTitle, { color: colors.foreground }]}>{t('equipmentSelection')}</Text><Text style={[s.pickerSubtitle, { color: colors.mutedForeground }]}>{WEAPONS.length} · {t('equipmentSettings')}</Text></View><Pressable accessibilityLabel={t('close')} onPress={() => setPickerVisible(false)} style={s.pickerClose}><Feather name="x" size={23} color={colors.foreground} /></Pressable></View>
            <WeaponCatalogList compact selectedWeapon={selectedWeapon} onSelect={handleWeaponSelect} />
          </View>
        </View>
      </Modal>
    </View>
  );
}
*/

const s = StyleSheet.create({
  root: { flex: 1 },
  rtl: rtlLayout,
  uiLayer: { ...(StyleSheet.absoluteFill as object), justifyContent: 'space-between', zIndex: 10 },
  topHud: { width: '100%' },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, gap: 6, justifyContent: 'space-between' },
  topLeft: { flexDirection: 'row', flexShrink: 0 },
  topCenter: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center' },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 },
  combatToolsRow: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, paddingHorizontal: 10, marginTop: 8 },
  errorText: { color: 'rgba(255,100,100,0.9)', fontWeight: 'bold', fontSize: 10, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 7, paddingVertical: 4, borderRadius: 6, maxWidth: '100%' },
  leaveError: { alignItems: 'center', gap: 4 },
  retryLeave: { borderWidth: 1, borderColor: 'rgba(255,100,100,0.9)', borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3 },
  retryLeaveText: { color: 'rgba(255,180,180,0.95)', fontSize: 9, fontWeight: '900' },
  serverStatus: { fontWeight: '900', fontSize: 9, backgroundColor: 'rgba(0,0,0,0.68)', paddingHorizontal: 7, paddingVertical: 6, borderRadius: 7, maxWidth: '100%' },
  playerNameHud: { maxWidth: 150, fontWeight: '900', fontSize: 14, backgroundColor: 'rgba(0,0,0,0.72)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, textAlign: 'center' },
  close: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  weaponPicker: { flex: 1, maxWidth: 190, minWidth: 0, minHeight: 46, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.72)', borderRadius: 12, paddingHorizontal: 12, gap: 6, borderWidth: 1, borderColor: 'rgba(114,241,208,0.42)' },
  weaponPickerCopy: { flex: 1, minWidth: 0 },
  weaponTabText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  weaponCategory: { color: 'rgba(255,255,255,0.6)', fontSize: 8, marginTop: 2 },
  markerHud: { minWidth: 90, maxWidth: 116, minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 13, paddingRight: 8 },
  markerHudText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  markerHudTeam: { color: 'rgba(255,255,255,0.68)', fontSize: 8, fontWeight: '800', marginTop: 2 },
  networkTestPanel: { width: '100%', marginTop: 6, gap: 5 },
  networkTestToggle: { alignSelf: 'flex-start', minHeight: 30, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 9, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.72)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)' },
  networkTestToggleActive: { borderColor: '#72f1d0', backgroundColor: 'rgba(0,45,42,0.86)' },
  networkTestText: { color: '#fff', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  networkTestStatus: { color: '#72f1d0', fontSize: 12, fontWeight: '900' },
  networkTargetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  networkTarget: { maxWidth: 130, minHeight: 28, paddingHorizontal: 9, justifyContent: 'center', borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.68)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  networkTargetActive: { borderColor: '#00ccff', backgroundColor: 'rgba(0,60,80,0.9)' },
  networkTargetText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  networkTargetEmpty: { color: 'rgba(255,255,255,0.65)', fontSize: 9, fontWeight: '700', paddingVertical: 7 },
  
  bottomContainer: { paddingHorizontal: 12, width: '100%', gap: 8 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 28 },
  ammoContainer: { alignItems: 'flex-start' },
  ammoText: { color: '#fff', fontSize: 17, fontWeight: '900', textShadowColor: '#000', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  reloadingText: { color: '#ffeb3b', fontWeight: 'bold', fontSize: 10, textShadowColor: '#000', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2, marginTop: 2 },
  statusRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  magazineText: { color: '#72f1d0', fontSize: 11, fontWeight: '900', textShadowColor: '#000', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  reloadButton: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.62)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)' },
  grenadeEffect: { zIndex: 6, alignItems: 'center', justifyContent: 'center' },
  fragEffect: { backgroundColor: 'rgba(255,83,20,.48)' },
  flashEffect: { backgroundColor: 'rgba(255,255,255,.94)' },
  smokeEffect: { backgroundColor: 'rgba(115,125,132,.78)' },
  grenadeEffectText: { color: '#fff', fontSize: 36, fontWeight: '900', letterSpacing: 5, textShadowColor: '#000', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 5 },
  
  bottomActionBar: { alignSelf: 'center', flexDirection: 'row', width: '100%', maxWidth: 330, gap: 6, padding: 4, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.48)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' },
  developerTickerTrack: { width: '100%', height: 14, overflow: 'hidden', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.28)', borderRadius: 4 },
  developerTickerText: { width: 430, color: 'rgba(255,255,255,0.62)', fontSize: 8, fontWeight: '700', letterSpacing: 0.4 },
  controlsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 112 },
  fireArea: { flex: 1, alignItems: 'flex-end' },
  
  actionBtn: { flex: 1, minWidth: 0, minHeight: 36, flexDirection: 'row', gap: 5, backgroundColor: 'rgba(0,0,0,0.6)', paddingVertical: 6, paddingHorizontal: 8, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' },
  disabledBtn: { opacity: 0.4 },
  adBtn: { borderColor: '#ffd700', backgroundColor: 'rgba(40,30,0,0.8)' },
  creditHud: { minHeight: 30, borderRadius: 9, paddingHorizontal: 7, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.68)' },
  creditHudText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  throwBtn: { borderColor: '#ff9f0a', backgroundColor: 'rgba(42,26,0,0.82)' },
  scopeBtn: { width: 72, height: 72, borderRadius: 36, borderWidth: 2, borderColor: '#00ccff', backgroundColor: 'rgba(0,30,40,0.9)', alignItems: 'center', justifyContent: 'center', gap: 3 },
  scopeBtnActive: { backgroundColor: 'rgba(0,90,115,0.95)' },
  scopeButtonText: { color: '#8be9ff', fontSize: 12, fontWeight: '900' },
  scopeAdjuster: { position: 'absolute', right: 18, top: '30%', alignItems: 'center', gap: 4, padding: 8, borderRadius: 14, backgroundColor: 'rgba(0,12,16,.7)', borderWidth: 1, borderColor: 'rgba(0,204,255,.55)' },
  scopeAdjustTitle: { color: '#8be9ff', fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  scopeAdjustMiddle: { flexDirection: 'row', gap: 4 },
  scopeAdjustButton: { width: 34, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15,24,29,.92)', borderWidth: 1, borderColor: 'rgba(255,255,255,.24)' },
  scopeReset: { borderColor: '#00ccff' },
  scopeResetText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  actionBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 10, flexShrink: 1 },
  
  // Keep recovery controls below the battle UI so the vision modes remain
  // usable even when no camera is available. The card itself still receives
  // touches because the full-screen wrapper is box-none.
  centerErrorLayer: { ...(StyleSheet.absoluteFill as object), justifyContent: 'center', padding: 20, zIndex: 5 },
  card: { padding: 24, borderRadius: 22, borderWidth: 1, alignItems: 'center', gap: 12 },
  title: { fontSize: 20, fontWeight: '700' },
  message: { fontSize: 13, lineHeight: 20, textAlign: 'center' },
  button: { minHeight: 46, width: '100%', borderRadius: 12, alignItems: 'center', justifyContent: 'center', padding: 12 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.58)', justifyContent: 'flex-end' },
  pickerSheet: { height: '82%', borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, paddingHorizontal: 18, paddingTop: 14 },
  pickerHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  pickerTitle: { fontSize: 19, fontWeight: '900', letterSpacing: 1 },
  pickerSubtitle: { fontSize: 10, marginTop: 3 },
  pickerClose: { padding: 10 },
  combatFlash: { zIndex: 40 },
  respawnLayer: { ...(StyleSheet.absoluteFill as object), zIndex: 45, backgroundColor: 'rgba(6,13,12,0.9)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  respawnTitle: { color: '#ff4869', fontSize: 34, fontWeight: '900', letterSpacing: 4 },
  respawnCount: { color: '#fff', fontSize: 72, fontWeight: '900', marginVertical: 10 },
  respawnText: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '800', letterSpacing: 1.5, textAlign: 'center' },
  shotToast: { position: 'absolute', zIndex: 50, top: '22%', alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.78)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 },
  shotToastText: { color: '#fff', fontSize: 12, fontWeight: '800' },
});
