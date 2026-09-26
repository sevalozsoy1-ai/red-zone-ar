import React, { createContext, useContext, useEffect, useRef } from 'react';
import { Animated, Image, StyleSheet, View } from 'react-native';
import { enemyCenter, enemyAimCenter, medkitAimCenter, projectileProgress, tankProgress, tankTurretAngle, type EnemyAttack, type EnemyDeath, type EnemyMember, type EnemyProjectile, type FallenEnemyMember, type MedkitDrop, type PeekingEnemy } from '@/lib/enemy-combat';
import { useColors } from '@/hooks/useColors';

const ENEMY_IMAGES: Record<'rifle' | 'scout' | 'heavy' | 'sniper' | 'rocketeer' | 'cobra' | 'tank' | 'jet' | 'sidecar', number> = {
  rifle: require('../assets/images/enemy-peek.png'),
  scout: require('../assets/images/enemy-scout.png'),
  heavy: require('../assets/images/enemy-heavy.png'),
  sniper: require('../assets/images/enemy-sniper.png'),
  rocketeer: require('../assets/images/enemy-rocketeer.png'),
  cobra: require('../assets/images/enemy-cobra.png'),
  tank: require('../assets/images/enemy-tank-cropped.png'),
  jet: require('../assets/images/enemy-jet-cropped.png'),
  sidecar: require('../assets/images/enemy-sidecar-cropped.png'),
};

const AnimationPauseContext = createContext(false);
const AnimationPausedAtContext = createContext<number | null>(null);

export default function EnemyOverlay({ enemy, projectile, medkit, death, lastAttack, width, height, paused = false }: {
  enemy: PeekingEnemy | null;
  projectile: EnemyProjectile | null;
  medkit?: MedkitDrop | null;
  death: EnemyDeath | null;
  lastAttack: EnemyAttack | null;
  width: number;
  height: number;
  paused?: boolean;
}) {
  const pausedAt = useRef<number | null>(paused ? Date.now() : null);
  if (paused && pausedAt.current === null) pausedAt.current = Date.now();
  if (!paused) pausedAt.current = null;
  return (
    <AnimationPauseContext.Provider value={paused}>
    <AnimationPausedAtContext.Provider value={pausedAt.current}>
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {enemy && (enemy.variant === 'tank' || enemy.variant === 'jet' || enemy.variant === 'sidecar'
        ? <CrossingVehicleFigure key={`enemy-${enemy.id}`} enemy={enemy as PeekingEnemy & { variant: 'tank' | 'jet' | 'sidecar' }} width={width} height={height} />
        : enemy.variant === 'mortar-team' || enemy.variant === 'machinegun-team' || enemy.variant === 'squad'
          ? <TacticalTeamFigure key={`enemy-${enemy.id}`} enemy={enemy} width={width} height={height} />
          : enemy.variant === 'laser'
            ? <LaserSoldier key={`enemy-${enemy.id}`} enemy={enemy} width={width} height={height} />
            : enemy.variant === 'robot'
              ? <RobotFigure key={`enemy-${enemy.id}`} enemy={enemy} width={width} height={height} />
              : <EnemyFigure key={`enemy-${enemy.id}`} enemy={enemy as PeekingEnemy & { variant: keyof typeof ENEMY_IMAGES }} width={width} height={height} />)}
      {medkit && <MedkitFigure key={`medkit-${medkit.id}`} medkit={medkit} width={width} height={height} />}
      {death && <DeathFigure key={`death-${death.id}`} death={death} />}
      {projectile && <FlyingRocket key={`projectile-${projectile.id}`} projectile={projectile} width={width} height={height} />}
      {lastAttack?.kind === 'impact' && <Explosion key={`impact-${lastAttack.id}`} attackAt={lastAttack.at} width={width} height={height} />}
      {enemy && lastAttack?.kind === 'laser' && lastAttack.variant === 'laser' && <LaserBeam key={`laser-${lastAttack.id}`} enemy={enemy} attackAt={lastAttack.at} width={width} height={height} />}
    </View>
    </AnimationPausedAtContext.Provider>
    </AnimationPauseContext.Provider>
  );
}

function useAnimationClock() {
  const paused = useContext(AnimationPauseContext);
  const pausedAt = useContext(AnimationPausedAtContext);
  return { paused, pausedAt };
}

function useAnimatedMotion(value: Animated.Value, initialDirection: 1 | -1) {
  const motion = useRef({ direction: initialDirection as 1 | -1, value: 0 });
  useEffect(() => {
    const listener = value.addListener(({ value: current }) => {
      if (current > motion.current.value) motion.current.direction = 1;
      else if (current < motion.current.value) motion.current.direction = -1;
      motion.current.value = current;
    });
    return () => value.removeListener(listener);
  }, [value]);
  return motion;
}

function pingPongAnimation(value: Animated.Value, motion: { current: { direction: 1 | -1; value: number } }, low: number, high: number, upMs: number, downMs: number) {
  const current = motion.current.value;
  const direction = motion.current.direction;
  const firstTarget = direction > 0 ? high : low;
  const firstDuration = direction > 0 ? upMs : downMs;
  const firstDistance = direction > 0 ? high - current : current - low;
  const range = Math.max(1, high - low);
  const nextTarget = direction > 0 ? low : high;
  const nextDuration = direction > 0 ? downMs : upMs;
  return Animated.sequence([
    Animated.timing(value, {
      toValue: firstTarget,
      duration: Math.max(1, firstDuration * Math.max(0, Math.min(1, firstDistance / range))),
      useNativeDriver: true,
    }),
    Animated.loop(Animated.sequence([
      Animated.timing(value, { toValue: nextTarget, duration: nextDuration, useNativeDriver: true }),
      Animated.timing(value, { toValue: firstTarget, duration: firstDuration, useNativeDriver: true }),
    ])),
  ]);
}

function MedkitFigure({ medkit, width, height }: { medkit: MedkitDrop; width: number; height: number }) {
  const { paused, pausedAt } = useAnimationClock();
  const fall = useRef(new Animated.Value(0)).current;
  const start = medkitAimCenter(medkit, width, height, medkit.droppedAt);
  useEffect(() => {
    const now = pausedAt ?? Date.now();
    const progress = Math.min(1, Math.max(0, (now - medkit.droppedAt) / 900));
    fall.setValue(progress);
    if (paused) return;
    const animation = Animated.timing(fall, {
      toValue: 1,
      duration: Math.max(1, 900 * (1 - progress)),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [fall, medkit.droppedAt, medkit.id, paused, pausedAt]);
  return (
    <Animated.View testID="medkit-drop" style={[styles.medkitDrop, {
      left: start.x - 25,
      top: start.y - 23,
      transform: [
        { translateY: fall.interpolate({ inputRange: [0, 1], outputRange: [0, height * 0.21] }) },
        { rotate: fall.interpolate({ inputRange: [0, 1], outputRange: ['-12deg', '8deg'] }) },
      ],
    }]}>
      <View style={styles.medkitHandle} />
      <View style={styles.medkitBag}>
        <View style={styles.medkitCrossVertical} />
        <View style={styles.medkitCrossHorizontal} />
      </View>
    </Animated.View>
  );
}

function TacticalTeamFigure({ enemy, width, height }: { enemy: PeekingEnemy; width: number; height: number }) {
  const { paused, pausedAt } = useAnimationClock();
  const colors = useColors();
  const entrance = useRef(new Animated.Value(0)).current;
  const march = useRef(new Animated.Value(0)).current;
  const marchMotion = useAnimatedMotion(march, 1);
  const now = pausedAt ?? Date.now();
  const setupProgress = Math.min(1, Math.max(0, (now - enemy.appearedAt) / Math.max(1, enemy.firesAt - enemy.appearedAt)));
  const setup = useRef(new Animated.Value(setupProgress)).current;
  const fromLeft = enemy.corner.endsWith('left');
  const center = enemyAimCenter(enemy, width, height, now);
  const members = enemy.members ?? [];
  const isSquad = enemy.variant === 'squad';
  const isMortar = enemy.variant === 'mortar-team';
  useEffect(() => {
    const animationNow = pausedAt ?? Date.now();
    const progress = Math.min(1, Math.max(0, (animationNow - enemy.appearedAt) / Math.max(1, enemy.firesAt - enemy.appearedAt)));
    setup.setValue(progress);
    if (paused) return;
    const reveal = Animated.spring(entrance, { toValue: 1, friction: 9, tension: 46, useNativeDriver: true });
    const marchLoop = pingPongAnimation(march, marchMotion, 0, 1, 260, 260);
    reveal.start();
    marchLoop.start();
    const elapsed = animationNow;
    const build = Animated.timing(setup, {
      toValue: 1,
      duration: Math.max(1, enemy.firesAt - elapsed),
      useNativeDriver: true,
    });
    build.start();
    return () => { reveal.stop(); marchLoop.stop(); build.stop(); };
  }, [enemy.appearedAt, enemy.firesAt, entrance, march, paused, pausedAt, setup]);

  return (
    <Animated.View
      testID={isSquad ? 'squad-wave' : isMortar ? 'mortar-team' : 'machinegun-team'}
      style={[styles.tacticalFormation, {
        left: center.x - 120,
        top: center.y - (isSquad ? 59 : 68),
        opacity: entrance,
        transform: [
          { translateX: entrance.interpolate({ inputRange: [0, 1], outputRange: [fromLeft ? -150 : 150, 0] }) },
        ],
      }]}
    >
      {members.map((member) => (
        <AnimatedSoldier
          key={member.id}
          member={member}
          colors={colors}
          walk={march}
          squad={isSquad}
          fromLeft={fromLeft}
          width={isSquad ? 48 : 56}
          height={isSquad ? 65 : 73}
        />
      ))}
      {enemy.fallen?.map((fallen) => (
        <FallenSoldier key={`fallen-${fallen.member.id}`} fallen={fallen} colors={colors} squad={isSquad} />
      ))}
      {!isSquad && (
        <Animated.View
          testID={isMortar ? 'mortar-setup' : 'machinegun-setup'}
          style={[
            isMortar ? styles.mortar : styles.crewGun,
            {
              opacity: setup.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.42, 1, 1] }),
              transform: [{
                rotate: setup.interpolate({
                  inputRange: [0, 1],
                  outputRange: [isMortar ? '-31deg' : '54deg', isMortar ? '-70deg' : '0deg'],
                }),
              }],
            },
          ]}
        >
          <View style={[styles.weaponBarrel, { backgroundColor: colors.foreground }]} />
          <View style={[styles.weaponBase, { backgroundColor: colors.accent }]} />
          <View style={[styles.weaponLeg, { backgroundColor: colors.foreground }]} />
        </Animated.View>
      )}
      {isSquad && <View style={[styles.squadSignal, { backgroundColor: colors.accent }]} />}
      {enemy.shotsFired > 0 && (
        <Animated.View style={[styles.teamMuzzle, { backgroundColor: colors.accent }]} />
      )}
    </Animated.View>
  );
}

function FallenSoldier({ fallen, colors, squad }: { fallen: FallenEnemyMember; colors: ReturnType<typeof useColors>; squad: boolean }) {
  const { paused, pausedAt } = useAnimationClock();
  const fall = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const now = pausedAt ?? Date.now();
    const elapsed = Math.max(0, now - fallen.diedAt);
    fall.setValue(Math.min(1, elapsed / 820));
    if (paused) return;
    const animation = Animated.timing(fall, { toValue: 1, duration: Math.max(1, 820 - elapsed), useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [fall, fallen.diedAt, paused, pausedAt]);
  return (
    <Animated.View testID="fallen-squad-member" style={[styles.fallenSoldier, {
      left: 120 + fallen.member.offsetX - 24,
      top: (squad ? 59 : 68) + fallen.member.offsetY - 33,
      opacity: fall.interpolate({ inputRange: [0, 0.3, 1], outputRange: [1, 1, 0] }),
      transform: [
        { translateY: fall.interpolate({ inputRange: [0, 1], outputRange: [0, 14] }) },
        { rotate: fall.interpolate({ inputRange: [0, 1], outputRange: ['0deg', fallen.member.offsetX < 0 ? '84deg' : '-84deg'] }) },
      ],
    }]}>
      <View style={[styles.soldierHelmet, { backgroundColor: colors.accent, borderColor: colors.foreground }]} />
      <View style={[styles.soldierTorso, { backgroundColor: colors.mutedForeground, borderColor: colors.border }]} />
    </Animated.View>
  );
}

function AnimatedSoldier({ member, colors, walk, squad, fromLeft, width, height }: {
  member: EnemyMember;
  colors: ReturnType<typeof useColors>;
  walk: Animated.Value;
  squad: boolean;
  fromLeft: boolean;
  width: number;
  height: number;
}) {
  const left = 120 + member.offsetX - width / 2;
  const top = (squad ? 59 : 65) + member.offsetY - height / 2;
  return (
    <Animated.View
      testID={squad ? 'squad-member' : 'crew-soldier'}
      style={[styles.soldier, {
        left, top, width, height,
        transform: [
          { translateY: walk.interpolate({ inputRange: [0, 1], outputRange: [0, squad ? -2 : 1] }) },
          { scaleX: fromLeft ? 1 : -1 },
        ],
      }]}
    >
      <View style={[styles.soldierHelmet, { backgroundColor: colors.accent, borderColor: colors.foreground }]} />
      <View style={[styles.soldierTorso, { backgroundColor: colors.mutedForeground, borderColor: colors.border }]} />
      <View style={[styles.soldierRifle, { backgroundColor: colors.foreground }]} />
      <View style={[styles.soldierLeg, { backgroundColor: colors.mutedForeground, left: width * 0.39 }]} />
      <View style={[styles.soldierLeg, { backgroundColor: colors.mutedForeground, left: width * 0.57 }]} />
    </Animated.View>
  );
}

function LaserSoldier({ enemy, width, height }: { enemy: PeekingEnemy; width: number; height: number }) {
  const { paused } = useAnimationClock();
  const colors = useColors();
  const reveal = useRef(new Animated.Value(0)).current;
  const hover = useRef(new Animated.Value(0)).current;
  const hoverMotion = useAnimatedMotion(hover, -1);
  const { x, y } = enemyCenter(enemy.corner, width, height);
  useEffect(() => {
    if (paused) return;
    const spring = Animated.spring(reveal, { toValue: 1, friction: 8, tension: 48, useNativeDriver: true });
    const hoverLoop = pingPongAnimation(hover, hoverMotion, -5, 5, 580, 580);
    spring.start();
    hoverLoop.start();
    return () => { spring.stop(); hoverLoop.stop(); };
  }, [hover, paused, reveal]);
  return (
    <Animated.View testID="laser-soldier" style={[styles.laserSoldier, {
      left: x - 68, top: y - 77, opacity: reveal,
      transform: [
        { translateY: hover },
        { translateX: reveal.interpolate({ inputRange: [0, 1], outputRange: [enemy.corner.endsWith('left') ? -100 : 100, 0] }) },
      ],
    }]}>
      <Image source={ENEMY_IMAGES.rifle} style={styles.image} resizeMode="contain" />
      <View style={[styles.laserVisor, { backgroundColor: colors.primary }]} />
      <View style={[styles.laserWeapon, { backgroundColor: colors.foreground }]} />
      {enemy.armor < enemy.maxArmor && <View style={[styles.laserArmor, { backgroundColor: colors.primary }]} />}
    </Animated.View>
  );
}

function LaserBeam({ enemy, attackAt, width, height }: { enemy: PeekingEnemy; attackAt: number; width: number; height: number }) {
  const { paused, pausedAt } = useAnimationClock();
  const colors = useColors();
  const pulse = useRef(new Animated.Value(1)).current;
  const now = pausedAt ?? Date.now();
  const source = enemyAimCenter(enemy, width, height, now);
  const target = { x: width / 2, y: height * 0.68 };
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const length = Math.hypot(dx, dy);
  useEffect(() => {
    const animationNow = pausedAt ?? Date.now();
    const fadeProgress = Math.min(1, Math.max(0, (animationNow - attackAt) / 360));
    const opacity = 1 - fadeProgress;
    pulse.setValue(opacity);
    if (paused) return;
    const fade = Animated.timing(pulse, { toValue: 0, duration: Math.max(1, 360 * opacity), useNativeDriver: true });
    fade.start();
    return () => fade.stop();
  }, [attackAt, paused, pausedAt, pulse]);
  return (
    <Animated.View
      testID="laser-beam"
      style={{
        position: 'absolute', width: length, height: 3,
        left: source.x + dx / 2 - length / 2,
        top: source.y + dy / 2 - 1.5,
        opacity: pulse,
        backgroundColor: colors.primary,
        transform: [{ rotate: `${Math.atan2(dy, dx) * 180 / Math.PI}deg` }],
      }}
    />
  );
}

function RobotFigure({ enemy, width, height }: { enemy: PeekingEnemy; width: number; height: number }) {
  const { paused } = useAnimationClock();
  const colors = useColors();
  const hover = useRef(new Animated.Value(0)).current;
  const reveal = useRef(new Animated.Value(0)).current;
  const hoverMotion = useAnimatedMotion(hover, -1);
  const { x, y } = enemyCenter(enemy.corner, width, height);
  useEffect(() => {
    if (paused) return;
    const appear = Animated.spring(reveal, { toValue: 1, friction: 7, tension: 45, useNativeDriver: true });
    const float = pingPongAnimation(hover, hoverMotion, -8, 4, 420, 420);
    appear.start();
    float.start();
    return () => { appear.stop(); float.stop(); };
  }, [hover, paused, reveal]);
  return (
    <Animated.View testID="robot-enemy" style={[styles.robot, {
      left: x - 39, top: y - 70,
      opacity: reveal,
      transform: [{ translateY: hover }, { rotate: hover.interpolate({ inputRange: [-8, 4], outputRange: ['-5deg', '4deg'] }) }],
    }]}>
      <View style={[styles.robotAntenna, { backgroundColor: colors.accent }]} />
      <View style={[styles.robotHead, { borderColor: colors.foreground, backgroundColor: colors.secondary }]}>
        <View style={[styles.robotVisor, { backgroundColor: colors.primary }]} />
      </View>
      <View style={[styles.robotTorso, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <View style={[styles.robotCore, { backgroundColor: colors.primary }]} />
      </View>
      <View style={[styles.robotArm, styles.robotArmLeft, { backgroundColor: colors.secondary }]} />
      <View style={[styles.robotArm, styles.robotArmRight, { backgroundColor: colors.secondary }]} />
      <View style={[styles.robotLeg, styles.robotLegLeft, { backgroundColor: colors.mutedForeground }]} />
      <View style={[styles.robotLeg, styles.robotLegRight, { backgroundColor: colors.mutedForeground }]} />
      {enemy.armor < enemy.maxArmor && <View style={[styles.robotArmor, { backgroundColor: colors.primary }]} />}
    </Animated.View>
  );
}

function EnemyFigure({ enemy, width, height }: { enemy: PeekingEnemy & { variant: keyof typeof ENEMY_IMAGES }; width: number; height: number }) {
  const { paused } = useAnimationClock();
  const reveal = useRef(new Animated.Value(0)).current;
  const muzzle = useRef(new Animated.Value(0)).current;
  const bob = useRef(new Animated.Value(0)).current;
  const rotor = useRef(new Animated.Value(0)).current;
  const glint = useRef(new Animated.Value(0)).current;
  const bobMotion = useAnimatedMotion(bob, -1);
  const glintMotion = useAnimatedMotion(glint, 1);
  const muzzleMotion = useAnimatedMotion(muzzle, -1);
  const previousShots = useRef(enemy.shotsFired);
  const { x, y } = enemyCenter(enemy.corner, width, height);
  const fromLeft = enemy.corner.endsWith('left');
  const isCobra = enemy.variant === 'cobra';
  useEffect(() => {
    if (paused) return;
    const animation = Animated.spring(reveal, { toValue: 1, friction: 8, tension: 52, useNativeDriver: true });
    animation.start();
    const flight = isCobra ? pingPongAnimation(bob, bobMotion, -9, 6, 850, 850) : null;
    const blades = isCobra ? Animated.loop(Animated.timing(rotor, { toValue: 1, duration: 180, useNativeDriver: true })) : null;
    const aim = enemy.variant === 'sniper' ? pingPongAnimation(glint, glintMotion, 0, 1, 240, 500) : null;
    flight?.start();
    blades?.start();
    aim?.start();
    return () => { animation.stop(); flight?.stop(); blades?.stop(); aim?.stop(); };
  }, [bob, enemy.variant, glint, isCobra, paused, reveal, rotor]);
  useEffect(() => {
    if (previousShots.current !== enemy.shotsFired) {
      muzzleMotion.current.value = 1;
      muzzle.setValue(1);
      previousShots.current = enemy.shotsFired;
    }
    if (enemy.shotsFired === 0 || paused) return;
    const animation = Animated.timing(muzzle, { toValue: 0, duration: Math.max(1, 220 * muzzleMotion.current.value), useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [enemy.shotsFired, muzzle, muzzleMotion, paused]);

  return (
    <Animated.View
      testID="peeking-enemy"
       style={[isCobra ? styles.cobraFigure : styles.figure, {
         left: x - (isCobra ? 105 : 68), top: y - (isCobra ? 69 : 77),
        opacity: reveal,
        transform: [
           { translateX: reveal.interpolate({ inputRange: [0, 1], outputRange: [fromLeft ? (isCobra ? -220 : -110) : (isCobra ? 220 : 110), 0] }) },
           { translateY: bob },
           { rotate: reveal.interpolate({ inputRange: [0, 1], outputRange: [fromLeft ? '-12deg' : '12deg', '0deg'] }) },
           { scaleX: fromLeft ? 1 : -1 },
        ],
      }]}
    >
       <Image source={ENEMY_IMAGES[enemy.variant]} style={isCobra ? styles.cobraImage : styles.image} resizeMode="contain" />
       {isCobra && <Animated.View style={[styles.rotor, { transform: [{ rotate: rotor.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }]} />}
        {isCobra && enemy.armor < enemy.maxArmor && <View style={styles.armorTrack}><View style={[styles.armorFill, { width: `${100 * enemy.armor / enemy.maxArmor}%` }]} /></View>}
       {enemy.variant === 'sniper' && <Animated.View style={[styles.scopeGlint, { opacity: glint }]} />}
      <Animated.View style={[styles.muzzle, {
        opacity: muzzle,
        transform: [{ scale: muzzle.interpolate({ inputRange: [0, 1], outputRange: [0.15, 1.4] }) }],
      }]} />
    </Animated.View>
  );
}

function CrossingVehicleFigure({ enemy, width, height }: { enemy: PeekingEnemy & { variant: 'tank' | 'jet' | 'sidecar' }; width: number; height: number }) {
  const { paused, pausedAt } = useAnimationClock();
  const colors = useColors();
  const now = pausedAt ?? Date.now();
  const travel = useRef(new Animated.Value(tankProgress(enemy, now))).current;
  const muzzle = useRef(new Animated.Value(0)).current;
  const muzzleMotion = useAnimatedMotion(muzzle, -1);
  const previousShots = useRef(enemy.shotsFired);
  const fromLeft = enemy.corner.endsWith('left');
  const isJet = enemy.variant === 'jet';
  const isSidecar = enemy.variant === 'sidecar';
  const turretAngles = [0, 0.5, 1].map((progress) => `${tankTurretAngle(enemy, width, height, progress)}deg`);
  useEffect(() => {
    const startedAt = pausedAt ?? Date.now();
    travel.setValue(tankProgress(enemy, startedAt));
    if (paused) return;
    const animation = Animated.timing(travel, { toValue: 1, duration: Math.max(1, enemy.leavesAt - startedAt), useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [enemy.appearedAt, enemy.leavesAt, paused, pausedAt, travel]);
  useEffect(() => {
    if (previousShots.current !== enemy.shotsFired) {
      muzzleMotion.current.value = 1;
      muzzle.setValue(1);
      previousShots.current = enemy.shotsFired;
    }
    if (!enemy.shotsFired || paused) return;
    const animation = Animated.timing(muzzle, { toValue: 0, duration: Math.max(1, 320 * muzzleMotion.current.value), useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [enemy.shotsFired, muzzle, muzzleMotion, paused]);
  return (
    <Animated.View testID="peeking-enemy" style={[isSidecar ? styles.sidecarFigure : styles.tankFigure, {
      left: fromLeft ? -240 : width, top: height * (isJet ? 0.31 : isSidecar ? 0.58 : 0.49) - (isSidecar ? 78 : 65),
      transform: [
        { translateX: travel.interpolate({ inputRange: [0, 1], outputRange: [0, fromLeft ? width + 240 : -(width + 240)] }) },
        { scaleX: fromLeft ? -1 : 1 },
      ],
    }]}>
      <Image testID={isJet ? 'crossing-jet' : isSidecar ? 'crossing-sidecar' : 'crossing-tank'} source={ENEMY_IMAGES[enemy.variant]} style={isSidecar ? styles.sidecarImage : styles.tankImage} resizeMode="contain" />
      {enemy.variant === 'tank' && <Animated.View testID="tank-turret" style={[styles.tankTurret, {
        transform: [{ rotate: travel.interpolate({ inputRange: [0, 0.5, 1], outputRange: turretAngles }) }],
      }]}>
        <View style={[styles.tankTurretBarrel, { backgroundColor: colors.secondary, borderColor: colors.border }]} />
        <Animated.View style={[styles.tankTurretFlash, { backgroundColor: colors.accent, opacity: muzzle }]} />
      </Animated.View>}
      {enemy.armor < enemy.maxArmor && <View style={styles.tankArmorTrack}><View style={[styles.armorFill, { width: `${100 * enemy.armor / enemy.maxArmor}%` }]} /></View>}
      <Animated.View style={[styles.tankMuzzle, { opacity: muzzle, transform: [{ scale: muzzle.interpolate({ inputRange: [0, 1], outputRange: [0.25, 1.3] }) }] }]} />
    </Animated.View>
  );
}

function DeathFigure({ death }: { death: EnemyDeath }) {
  const { paused, pausedAt } = useAnimationClock();
  const fall = useRef(new Animated.Value(0)).current;
  const legacyImage = death.variant in ENEMY_IMAGES;
  const vehicle = death.variant === 'tank' || death.variant === 'cobra' || death.variant === 'jet' || death.variant === 'sidecar' || death.variant === 'robot';
  const size = death.variant === 'sidecar' ? { width: 240, height: 155 } : death.variant === 'tank' || death.variant === 'jet' ? { width: 240, height: 130 } : death.variant === 'cobra' ? { width: 210, height: 138 } : { width: 136, height: 154 };
  useEffect(() => {
    const now = pausedAt ?? Date.now();
    const duration = vehicle ? 900 : 780;
    const progress = Math.min(1, Math.max(0, (now - death.diedAt) / duration));
    fall.setValue(progress);
    if (paused) return;
    const animation = Animated.timing(fall, { toValue: 1, duration: Math.max(1, duration * (1 - progress)), useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [death.diedAt, fall, paused, pausedAt, vehicle]);
  return (
    <Animated.View testID={vehicle ? 'vehicle-destruction' : 'enemy-falling'} style={{
      position: 'absolute', left: death.x - size.width / 2, top: death.y - size.height / 2,
      width: size.width, height: size.height, alignItems: 'center', justifyContent: 'center',
      opacity: fall.interpolate({ inputRange: [0, 0.45, 1], outputRange: [1, 0.9, 0] }),
      transform: [
        { translateY: fall.interpolate({ inputRange: [0, 1], outputRange: [0, vehicle ? 45 : 95] }) },
        { rotate: fall.interpolate({ inputRange: [0, 1], outputRange: ['0deg', vehicle ? '14deg' : (death.fromLeft ? '82deg' : '-82deg')] }) },
        { scale: fall.interpolate({ inputRange: [0, 1], outputRange: [1, vehicle ? 0.72 : 0.8] }) },
      ],
    }}>
      {legacyImage && <Image source={ENEMY_IMAGES[death.variant as keyof typeof ENEMY_IMAGES]} style={{ width: size.width, height: size.height, transform: [{ scaleX: death.fromLeft ? -1 : 1 }] }} resizeMode="contain" />}
      {vehicle && (death.variant === 'jet' || death.variant === 'cobra' || death.variant === 'robot') && <FragmentBurst death={death} />}
      {vehicle && <>
        <Animated.View style={[styles.destructionBlast, { opacity: fall.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 1, 0.8, 0] }), transform: [{ scale: fall.interpolate({ inputRange: [0, 1], outputRange: [0.3, 2] }) }] }]} />
        <Animated.View style={[styles.destructionSmoke, { opacity: fall.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 0.85, 0] }), transform: [{ translateY: fall.interpolate({ inputRange: [0, 1], outputRange: [0, -55] }) }, { scale: fall.interpolate({ inputRange: [0, 1], outputRange: [0.4, 2.2] }) }] }]} />
      </>}
    </Animated.View>
  );
}

function FragmentBurst({ death }: { death: EnemyDeath }) {
  const { paused, pausedAt } = useAnimationClock();
  const colors = useColors();
  const explode = useRef(new Animated.Value(0)).current;
  const debris: ReadonlyArray<readonly [number, number]> = death.variant === 'cobra'
    ? [[-1, -1], [1, -0.8], [-0.8, 0.3], [0.8, 0.4], [0, 1]]
    : [[-1, -0.8], [-0.5, -1], [0.3, -1], [1, -0.7], [-1, 0.4], [0.2, 0.4], [1, 0.6]];
  const fragments = death.variant === 'robot'
    ? [colors.primary, colors.accent, colors.foreground, colors.signal, colors.secondary, colors.mutedForeground, colors.primary]
    : [colors.accent, colors.signal, colors.foreground, colors.amber, colors.destructive, colors.mutedForeground, colors.primary];
  const frameWidth = death.variant === 'cobra' ? 210 : death.variant === 'jet' ? 240 : 136;
  const frameHeight = death.variant === 'cobra' ? 138 : death.variant === 'jet' ? 130 : 154;
  useEffect(() => {
    const now = pausedAt ?? Date.now();
    const progress = Math.min(1, Math.max(0, (now - death.diedAt) / 1100));
    explode.setValue(progress);
    if (paused) return;
    const animation = Animated.timing(explode, { toValue: 1, duration: Math.max(1, 1100 * (1 - progress)), useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [death.diedAt, explode, paused, pausedAt]);
  return (
    <View pointerEvents="none" testID="vehicle-fragment-burst" style={StyleSheet.absoluteFill}>
      {debris.map(([dx, dy], index) => (
        <Animated.View
          key={`${death.id}-${index}`}
          testID="vehicle-fragment"
          style={{
            position: 'absolute',
            left: frameWidth / 2 - 9 + (index % 3) * 5,
            top: frameHeight / 2 - 8 + (index % 2) * 8,
            width: index % 2 ? 18 : 24,
            height: index % 3 ? 12 : 18,
            borderRadius: index % 2 ? 2 : 7,
            backgroundColor: fragments[index % fragments.length],
            opacity: explode.interpolate({ inputRange: [0, 0.15, 1], outputRange: [1, 1, 0] }),
            transform: [
              { translateX: explode.interpolate({ inputRange: [0, 1], outputRange: [0, dx * (70 + index * 4)] }) },
              { translateY: explode.interpolate({ inputRange: [0, 1], outputRange: [0, dy * (78 + index * 3)] }) },
              { rotate: explode.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${(index % 2 ? 1 : -1) * (120 + index * 28)}deg`] }) },
              { scale: explode.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.6, 1.15, 0.4] }) },
            ],
          }}
        />
      ))}
    </View>
  );
}

function FlyingRocket({ projectile, width, height }: { projectile: EnemyProjectile; width: number; height: number }) {
  const { paused, pausedAt } = useAnimationClock();
  const colors = useColors();
  const now = pausedAt ?? Date.now();
  const travel = useRef(new Animated.Value(projectileProgress(projectile, now))).current;
  const origin = enemyCenter(projectile.corner, width, height);
  const dx = width / 2 - origin.x;
  const dy = height / 2 - origin.y;
  const mortar = projectile.variant === 'mortar-team';
  const robot = projectile.variant === 'robot';
  useEffect(() => {
    const startedAt = pausedAt ?? Date.now();
    travel.setValue(projectileProgress(projectile, startedAt));
    if (paused) return;
    const animation = Animated.timing(travel, {
      toValue: 1, duration: Math.max(1, projectile.impactsAt - startedAt), useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [paused, pausedAt, projectile.impactsAt, projectile.launchedAt, travel]);
  return (
    <Animated.View testID={mortar ? 'mortar-shell' : robot ? 'robot-projectile' : 'enemy-rocket'} style={[styles.rocket, {
      left: origin.x - 12, top: origin.y - 8,
      transform: [
        { translateX: travel.interpolate({ inputRange: [0, 1], outputRange: [0, dx] }) },
        { translateY: mortar
          ? travel.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, dy / 2 - 125, dy] })
          : travel.interpolate({ inputRange: [0, 1], outputRange: [0, dy] }) },
        { rotate: `${Math.atan2(dy, dx) * 180 / Math.PI}deg` },
        { scale: travel.interpolate({ inputRange: [0, 1], outputRange: [0.5, 2.6] }) },
      ],
    }]}>
      <View style={[styles.rocketTrail, { backgroundColor: robot ? colors.primary : colors.signal }]} />
      <View style={[styles.rocketCore, { backgroundColor: mortar ? colors.accent : colors.foreground }]} />
      {mortar && <View style={[styles.shellBody, { backgroundColor: colors.accent }]} />}
    </Animated.View>
  );
}

function Explosion({ attackAt, width, height }: { attackAt: number; width: number; height: number }) {
  const { paused, pausedAt } = useAnimationClock();
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const now = pausedAt ?? Date.now();
    const progress = Math.min(1, Math.max(0, (now - attackAt) / 620));
    pulse.setValue(progress);
    if (paused) return;
    const animation = Animated.timing(pulse, { toValue: 1, duration: Math.max(1, 620 * (1 - progress)), useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [attackAt, paused, pausedAt, pulse]);
  return (
    <Animated.View testID="enemy-impact" style={[styles.explosion, {
      left: width / 2 - 58, top: height / 2 - 58,
      opacity: pulse.interpolate({ inputRange: [0, 0.12, 1], outputRange: [0, 0.9, 0] }),
      transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1.9] }) }],
    }]}>
      <View style={styles.explosionCore} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  tacticalFormation: { position: 'absolute', width: 240, height: 146, alignItems: 'center', justifyContent: 'center' },
  soldier: { position: 'absolute', alignItems: 'center', justifyContent: 'flex-start' },
  fallenSoldier: { position: 'absolute', width: 48, height: 66, alignItems: 'center', justifyContent: 'flex-start' },
  soldierHelmet: { width: 19, height: 14, borderWidth: 1, borderRadius: 7, marginTop: 4 },
  soldierTorso: { width: 23, height: 23, borderWidth: 1, borderRadius: 5, marginTop: -1 },
  soldierRifle: { position: 'absolute', top: 22, left: 17, width: 29, height: 4, borderRadius: 2 },
  soldierLeg: { position: 'absolute', top: 41, width: 4, height: 15, borderRadius: 2 },
  mortar: { position: 'absolute', left: 104, top: 90, width: 55, height: 38, alignItems: 'center', justifyContent: 'center' },
  crewGun: { position: 'absolute', left: 105, top: 87, width: 60, height: 30, alignItems: 'center', justifyContent: 'center' },
  weaponBarrel: { position: 'absolute', left: 20, top: 3, width: 40, height: 5, borderRadius: 3 },
  weaponBase: { position: 'absolute', left: 17, top: 10, width: 22, height: 13, borderRadius: 5 },
  weaponLeg: { position: 'absolute', left: 25, top: 17, width: 4, height: 25, borderRadius: 2 },
  squadSignal: { position: 'absolute', left: 113, top: 4, width: 14, height: 14, borderRadius: 7, opacity: 0.9 },
  teamMuzzle: { position: 'absolute', left: 155, top: 86, width: 15, height: 15, borderRadius: 8, opacity: 0.9 },
  laserSoldier: { position: 'absolute', width: 136, height: 154, alignItems: 'center', justifyContent: 'center' },
  laserVisor: { position: 'absolute', top: 41, left: 68, width: 21, height: 5, borderRadius: 2, shadowOpacity: 1, shadowRadius: 10 },
  laserWeapon: { position: 'absolute', top: 79, left: 78, width: 35, height: 5, borderRadius: 3 },
  laserArmor: { position: 'absolute', bottom: 7, left: 38, width: 60, height: 4, borderRadius: 2 },
  robot: { position: 'absolute', width: 78, height: 112, alignItems: 'center', justifyContent: 'flex-start' },
  robotAntenna: { width: 3, height: 9, marginBottom: -1 },
  robotHead: { width: 31, height: 24, borderWidth: 2, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  robotVisor: { width: 22, height: 5, borderRadius: 3, shadowOpacity: 1, shadowRadius: 7 },
  robotTorso: { width: 39, height: 34, borderWidth: 2, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 3 },
  robotCore: { width: 14, height: 14, borderRadius: 7 },
  robotArm: { position: 'absolute', top: 39, width: 10, height: 31, borderRadius: 5 },
  robotArmLeft: { left: 7, transform: [{ rotate: '18deg' }] },
  robotArmRight: { right: 7, transform: [{ rotate: '-18deg' }] },
  robotLeg: { position: 'absolute', top: 73, width: 11, height: 27, borderRadius: 5 },
  robotLegLeft: { left: 24, transform: [{ rotate: '8deg' }] },
  robotLegRight: { right: 24, transform: [{ rotate: '-8deg' }] },
  robotArmor: { position: 'absolute', bottom: 1, width: 42, height: 4, borderRadius: 2 },
  figure: { position: 'absolute', width: 136, height: 154, alignItems: 'center', justifyContent: 'center' },
  image: { width: 136, height: 154 },
  cobraFigure: { position: 'absolute', width: 210, height: 138, alignItems: 'center', justifyContent: 'center' },
  cobraImage: { width: 210, height: 138 },
  rotor: { position: 'absolute', top: 22, width: 146, height: 3, borderRadius: 2, backgroundColor: '#a8b5bc', opacity: 0.8 },
  scopeGlint: { position: 'absolute', width: 12, height: 12, borderRadius: 6, left: 81, top: 62, backgroundColor: '#f3f8ff', shadowColor: '#fff', shadowOpacity: 1, shadowRadius: 9 },
  muzzle: { position: 'absolute', left: 65, top: 75, width: 38, height: 38, borderRadius: 19, backgroundColor: '#ffe69a', borderWidth: 8, borderColor: '#ff812b' },
  armorTrack: { position: 'absolute', bottom: 5, left: 24, width: 160, height: 5, borderRadius: 3, backgroundColor: '#321918', overflow: 'hidden' },
  tankFigure: { position: 'absolute', width: 240, height: 130, alignItems: 'center', justifyContent: 'center' },
  tankImage: { width: 240, height: 115 },
  tankTurret: { position: 'absolute', left: 92, top: 48, width: 70, height: 18, alignItems: 'flex-start', justifyContent: 'center' },
  tankTurretBarrel: { position: 'absolute', left: 20, width: 63, height: 8, borderRadius: 4, backgroundColor: 'rgba(40,52,46,0.92)', borderWidth: 1, borderColor: 'rgba(220,224,210,0.9)' },
  tankTurretFlash: { position: 'absolute', left: 79, width: 12, height: 12, borderRadius: 6, backgroundColor: '#ffe3a2', opacity: 0.7 },
  sidecarFigure: { position: 'absolute', width: 240, height: 155, alignItems: 'center', justifyContent: 'center' },
  sidecarImage: { width: 240, height: 145 },
  tankArmorTrack: { position: 'absolute', bottom: 0, width: 170, height: 5, borderRadius: 3, backgroundColor: '#321918', overflow: 'hidden' },
  armorFill: { height: '100%', backgroundColor: '#f5a341' },
  tankMuzzle: { position: 'absolute', left: 5, top: 39, width: 33, height: 33, borderRadius: 17, backgroundColor: '#ffe3a2', borderWidth: 6, borderColor: '#fc642e' },
  destructionBlast: { position: 'absolute', width: 86, height: 86, borderRadius: 43, backgroundColor: '#ff7b24', borderWidth: 17, borderColor: '#ffe3a0' },
  destructionSmoke: { position: 'absolute', top: 8, width: 64, height: 64, borderRadius: 32, backgroundColor: '#495456' },
  rocket: { position: 'absolute', width: 24, height: 16, flexDirection: 'row', alignItems: 'center' },
  rocketTrail: { width: 15, height: 8, borderRadius: 5, backgroundColor: '#ff783d', shadowColor: '#ff9b52', shadowOpacity: 0.9, shadowRadius: 12 },
  rocketCore: { width: 13, height: 6, borderRadius: 3, backgroundColor: '#f8f1d7' },
  shellBody: { position: 'absolute', left: 7, width: 12, height: 7, borderRadius: 4 },
  explosion: { position: 'absolute', width: 116, height: 116, borderRadius: 58, backgroundColor: '#ff6926', alignItems: 'center', justifyContent: 'center' },
  explosionCore: { width: 62, height: 62, borderRadius: 31, backgroundColor: '#ffe7a0' },
  medkitDrop: { position: 'absolute', width: 50, height: 46, alignItems: 'center', justifyContent: 'flex-end', shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 7, elevation: 6 },
  medkitHandle: { position: 'absolute', top: 2, width: 18, height: 10, borderWidth: 3, borderColor: '#e4d9c3', borderBottomWidth: 0, borderTopLeftRadius: 6, borderTopRightRadius: 6 },
  medkitBag: { width: 42, height: 36, borderRadius: 7, borderWidth: 2, borderColor: '#bcb3a2', backgroundColor: '#f3ead7', alignItems: 'center', justifyContent: 'center' },
  medkitCrossVertical: { position: 'absolute', width: 8, height: 24, borderRadius: 2, backgroundColor: '#ce493d' },
  medkitCrossHorizontal: { position: 'absolute', width: 24, height: 8, borderRadius: 2, backgroundColor: '#ce493d' },
});