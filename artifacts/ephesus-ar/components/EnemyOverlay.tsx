import React, { useEffect, useRef } from 'react';
import { Animated, Image, StyleSheet, View } from 'react-native';
import { enemyCenter, medkitAimCenter, projectileProgress, tankProgress, type EnemyAttack, type EnemyDeath, type EnemyProjectile, type EnemyVariant, type MedkitDrop, type PeekingEnemy } from '@/lib/enemy-combat';

const ENEMY_IMAGES: Record<EnemyVariant, number> = {
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

export default function EnemyOverlay({ enemy, projectile, medkit, death, lastAttack, width, height }: {
  enemy: PeekingEnemy | null;
  projectile: EnemyProjectile | null;
  medkit?: MedkitDrop | null;
  death: EnemyDeath | null;
  lastAttack: EnemyAttack | null;
  width: number;
  height: number;
}) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {enemy && (enemy.variant === 'tank' || enemy.variant === 'jet' || enemy.variant === 'sidecar'
        ? <CrossingVehicleFigure key={`enemy-${enemy.id}`} enemy={enemy} width={width} height={height} />
        : <EnemyFigure key={`enemy-${enemy.id}`} enemy={enemy} width={width} height={height} />)}
      {medkit && <MedkitFigure key={`medkit-${medkit.id}`} medkit={medkit} width={width} height={height} />}
      {death && <DeathFigure key={`death-${death.id}`} death={death} />}
      {projectile && <FlyingRocket key={`projectile-${projectile.id}`} projectile={projectile} width={width} height={height} />}
      {lastAttack?.kind === 'impact' && <Explosion key={`impact-${lastAttack.id}`} width={width} height={height} />}
    </View>
  );
}

function MedkitFigure({ medkit, width, height }: { medkit: MedkitDrop; width: number; height: number }) {
  const fall = useRef(new Animated.Value(0)).current;
  const start = medkitAimCenter(medkit, width, height, medkit.droppedAt);
  const progress = Math.min(1, Math.max(0, (Date.now() - medkit.droppedAt) / 900));
  useEffect(() => {
    fall.setValue(progress);
    const animation = Animated.timing(fall, {
      toValue: 1,
      duration: Math.max(1, 900 * (1 - progress)),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [fall, medkit.id]);
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

function EnemyFigure({ enemy, width, height }: { enemy: PeekingEnemy; width: number; height: number }) {
  const reveal = useRef(new Animated.Value(0)).current;
  const muzzle = useRef(new Animated.Value(0)).current;
  const bob = useRef(new Animated.Value(0)).current;
  const rotor = useRef(new Animated.Value(0)).current;
  const glint = useRef(new Animated.Value(0)).current;
  const { x, y } = enemyCenter(enemy.corner, width, height);
  const fromLeft = enemy.corner.endsWith('left');
  const isCobra = enemy.variant === 'cobra';
  useEffect(() => {
    const animation = Animated.spring(reveal, { toValue: 1, friction: 8, tension: 52, useNativeDriver: true });
    animation.start();
    const flight = isCobra ? Animated.loop(Animated.sequence([
      Animated.timing(bob, { toValue: -9, duration: 850, useNativeDriver: true }),
      Animated.timing(bob, { toValue: 6, duration: 850, useNativeDriver: true }),
    ])) : null;
    const blades = isCobra ? Animated.loop(Animated.timing(rotor, { toValue: 1, duration: 180, useNativeDriver: true })) : null;
    const aim = enemy.variant === 'sniper' ? Animated.loop(Animated.sequence([
      Animated.timing(glint, { toValue: 1, duration: 240, useNativeDriver: true }),
      Animated.timing(glint, { toValue: 0, duration: 500, useNativeDriver: true }),
    ])) : null;
    flight?.start();
    blades?.start();
    aim?.start();
    return () => { animation.stop(); flight?.stop(); blades?.stop(); aim?.stop(); };
  }, [bob, enemy.variant, glint, isCobra, reveal, rotor]);
  useEffect(() => {
    if (enemy.shotsFired === 0) return;
    muzzle.setValue(1);
    const animation = Animated.timing(muzzle, { toValue: 0, duration: 220, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [enemy.shotsFired, muzzle]);

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

function CrossingVehicleFigure({ enemy, width, height }: { enemy: PeekingEnemy; width: number; height: number }) {
  const travel = useRef(new Animated.Value(tankProgress(enemy, Date.now()))).current;
  const muzzle = useRef(new Animated.Value(0)).current;
  const fromLeft = enemy.corner.endsWith('left');
  const isJet = enemy.variant === 'jet';
  const isSidecar = enemy.variant === 'sidecar';
  useEffect(() => {
    const startedAt = Date.now();
    travel.setValue(tankProgress(enemy, startedAt));
    const animation = Animated.timing(travel, { toValue: 1, duration: Math.max(1, enemy.leavesAt - startedAt), useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [enemy.leavesAt, travel]);
  useEffect(() => {
    if (!enemy.shotsFired) return;
    muzzle.setValue(1);
    const animation = Animated.timing(muzzle, { toValue: 0, duration: 320, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [enemy.shotsFired, muzzle]);
  return (
    <Animated.View testID="peeking-enemy" style={[isSidecar ? styles.sidecarFigure : styles.tankFigure, {
      left: fromLeft ? -240 : width, top: height * (isJet ? 0.31 : isSidecar ? 0.58 : 0.49) - (isSidecar ? 78 : 65),
      transform: [
        { translateX: travel.interpolate({ inputRange: [0, 1], outputRange: [0, fromLeft ? width + 240 : -(width + 240)] }) },
        { scaleX: fromLeft ? -1 : 1 },
      ],
    }]}>
      <Image testID={isJet ? 'crossing-jet' : isSidecar ? 'crossing-sidecar' : 'crossing-tank'} source={ENEMY_IMAGES[enemy.variant]} style={isSidecar ? styles.sidecarImage : styles.tankImage} resizeMode="contain" />
      {enemy.armor < enemy.maxArmor && <View style={styles.tankArmorTrack}><View style={[styles.armorFill, { width: `${100 * enemy.armor / enemy.maxArmor}%` }]} /></View>}
      <Animated.View style={[styles.tankMuzzle, { opacity: muzzle, transform: [{ scale: muzzle.interpolate({ inputRange: [0, 1], outputRange: [0.25, 1.3] }) }] }]} />
    </Animated.View>
  );
}

function DeathFigure({ death }: { death: EnemyDeath }) {
  const fall = useRef(new Animated.Value(0)).current;
  const vehicle = death.variant === 'tank' || death.variant === 'cobra' || death.variant === 'jet' || death.variant === 'sidecar';
  const size = death.variant === 'sidecar' ? { width: 240, height: 155 } : death.variant === 'tank' || death.variant === 'jet' ? { width: 240, height: 130 } : death.variant === 'cobra' ? { width: 210, height: 138 } : { width: 136, height: 154 };
  useEffect(() => {
    const animation = Animated.timing(fall, { toValue: 1, duration: vehicle ? 900 : 780, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [fall, vehicle]);
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
      <Image source={ENEMY_IMAGES[death.variant]} style={{ width: size.width, height: size.height, transform: [{ scaleX: death.fromLeft ? -1 : 1 }] }} resizeMode="contain" />
      {vehicle && <>
        <Animated.View style={[styles.destructionBlast, { opacity: fall.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 1, 0.8, 0] }), transform: [{ scale: fall.interpolate({ inputRange: [0, 1], outputRange: [0.3, 2] }) }] }]} />
        <Animated.View style={[styles.destructionSmoke, { opacity: fall.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 0.85, 0] }), transform: [{ translateY: fall.interpolate({ inputRange: [0, 1], outputRange: [0, -55] }) }, { scale: fall.interpolate({ inputRange: [0, 1], outputRange: [0.4, 2.2] }) }] }]} />
      </>}
    </Animated.View>
  );
}

function FlyingRocket({ projectile, width, height }: { projectile: EnemyProjectile; width: number; height: number }) {
  const travel = useRef(new Animated.Value(projectileProgress(projectile, Date.now()))).current;
  const origin = enemyCenter(projectile.corner, width, height);
  const dx = width / 2 - origin.x;
  const dy = height / 2 - origin.y;
  useEffect(() => {
    const startedAt = Date.now();
    travel.setValue(projectileProgress(projectile, startedAt));
    const animation = Animated.timing(travel, {
      toValue: 1, duration: Math.max(1, projectile.impactsAt - startedAt), useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [projectile.impactsAt, projectile.launchedAt, travel]);
  return (
    <Animated.View testID="enemy-rocket" style={[styles.rocket, {
      left: origin.x - 12, top: origin.y - 8,
      transform: [
        { translateX: travel.interpolate({ inputRange: [0, 1], outputRange: [0, dx] }) },
        { translateY: travel.interpolate({ inputRange: [0, 1], outputRange: [0, dy] }) },
        { rotate: `${Math.atan2(dy, dx) * 180 / Math.PI}deg` },
        { scale: travel.interpolate({ inputRange: [0, 1], outputRange: [0.5, 2.6] }) },
      ],
    }]}>
      <View style={styles.rocketTrail} />
      <View style={styles.rocketCore} />
    </Animated.View>
  );
}

function Explosion({ width, height }: { width: number; height: number }) {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const animation = Animated.timing(pulse, { toValue: 1, duration: 620, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [pulse]);
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
  explosion: { position: 'absolute', width: 116, height: 116, borderRadius: 58, backgroundColor: '#ff6926', alignItems: 'center', justifyContent: 'center' },
  explosionCore: { width: 62, height: 62, borderRadius: 31, backgroundColor: '#ffe7a0' },
  medkitDrop: { position: 'absolute', width: 50, height: 46, alignItems: 'center', justifyContent: 'flex-end', shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 7, elevation: 6 },
  medkitHandle: { position: 'absolute', top: 2, width: 18, height: 10, borderWidth: 3, borderColor: '#e4d9c3', borderBottomWidth: 0, borderTopLeftRadius: 6, borderTopRightRadius: 6 },
  medkitBag: { width: 42, height: 36, borderRadius: 7, borderWidth: 2, borderColor: '#bcb3a2', backgroundColor: '#f3ead7', alignItems: 'center', justifyContent: 'center' },
  medkitCrossVertical: { position: 'absolute', width: 8, height: 24, borderRadius: 2, backgroundColor: '#ce493d' },
  medkitCrossHorizontal: { position: 'absolute', width: 24, height: 8, borderRadius: 2, backgroundColor: '#ce493d' },
});