import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, useWindowDimensions, View } from 'react-native';
import { WEAPON_FPS_IMAGES, WEAPON_IMAGES } from '@/lib/weapon-assets';
import { getWeaponAction, type WeaponAction, type WeaponArchetype, type WeaponId } from '@/lib/weapons';
import { FIRE_EFFECT_RANGES } from '@/lib/fire-effects';

type KnifeThrowTarget = { x: number; y: number };

const KNIFE_PROJECTILE_SIZE = 132;

const MuzzleFlash = ({ fireAnim }: { fireAnim: Animated.Value }) => {
  const smokeOpacity = fireAnim.interpolate({
    inputRange: [0, 0.08, 0.65, 1],
    outputRange: [0, 0.1, 0.3, 0.06],
  });
  const smokeY = fireAnim.interpolate({ inputRange: [0, 1], outputRange: [-38, 0] });
  const flashScale = fireAnim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.15] });

  return (
    <View pointerEvents="none" style={styles.flash}>
      <Animated.View style={[styles.smoke, { opacity: smokeOpacity, transform: [{ translateY: smokeY }] }]}>
        <View style={[styles.smokePuff, styles.smokePuffLarge]} />
        <View style={[styles.smokePuff, styles.smokePuffMedium]} />
        <View style={[styles.smokePuff, styles.smokePuffSmall]} />
      </Animated.View>
      <Animated.View style={[styles.hotGas, { opacity: fireAnim, transform: [{ scaleX: flashScale }] }]}>
        <View style={styles.hotCore} />
      </Animated.View>
      <Animated.View style={[styles.spark, styles.sparkOne, { opacity: fireAnim }]} />
      <Animated.View style={[styles.spark, styles.sparkTwo, { opacity: fireAnim }]} />
      <Animated.View style={[styles.spark, styles.sparkThree, { opacity: fireAnim }]} />
    </View>
  );
};

const LauncherEffect = ({ fireAnim }: { fireAnim: Animated.Value }) => (
  <View pointerEvents="none" style={styles.launchEffect}>
    <Animated.View
      style={[
        styles.launchFlame,
        {
          opacity: fireAnim,
          transform: [
            { scaleY: fireAnim.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1.25] }) },
            { translateY: fireAnim.interpolate({ inputRange: [0, 1], outputRange: [18, -10] }) },
          ],
        },
      ]}
    />
    <Animated.View
      style={[
        styles.launchSmoke,
        {
          opacity: fireAnim.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0, 0.2, 0.62] }),
          transform: [{ translateY: fireAnim.interpolate({ inputRange: [0, 1], outputRange: FIRE_EFFECT_RANGES.launchSmokeY }) }],
        },
      ]}
    />
    <Animated.View
      style={[
        styles.launchTrail,
        {
          opacity: fireAnim.interpolate({ inputRange: [0, 0.18, 0.72, 1], outputRange: [0, 0.24, 0.72, 1] }),
          transform: [{ scaleY: fireAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }],
        },
      ]}
    />
  </View>
);

const EnergyEffect = ({ fireAnim, isArc }: { fireAnim: Animated.Value; isArc: boolean }) => (
  <View pointerEvents="none" style={styles.energyEffect}>
    <Animated.View
      style={[
        styles.energyCore,
        {
          opacity: fireAnim,
          transform: [{ scale: fireAnim.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1.35] }) }],
        },
      ]}
    />
    <Animated.View
      style={[
        styles.energyRing,
        {
          opacity: fireAnim.interpolate({ inputRange: [0, 0.15, 0.8, 1], outputRange: [0, 0.35, 0.75, 1] }),
          transform: [{ scale: fireAnim.interpolate({ inputRange: [0, 1], outputRange: FIRE_EFFECT_RANGES.energyRingScale }) }],
        },
      ]}
    />
    <Animated.View
      style={[
        styles.energyBeam,
        {
          opacity: fireAnim.interpolate({ inputRange: [0, 0.12, 0.7, 1], outputRange: [0, 0.28, 0.72, 1] }),
          transform: [{ translateY: fireAnim.interpolate({ inputRange: [0, 1], outputRange: FIRE_EFFECT_RANGES.energyBeamY }) }],
        },
      ]}
    />
    {isArc && (
      <>
        <Animated.View
          style={[
            styles.arcBolt,
            styles.arcBoltTop,
            {
              opacity: fireAnim.interpolate({ inputRange: [0, 0.12, 0.7, 1], outputRange: [0, 0.22, 0.72, 1] }),
              transform: [
                { rotate: '-11deg' },
                { scaleX: fireAnim.interpolate({ inputRange: [0, 1], outputRange: FIRE_EFFECT_RANGES.arcBoltScale }) },
              ],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.arcBolt,
            styles.arcBoltBottom,
            {
              opacity: fireAnim.interpolate({ inputRange: [0, 0.18, 0.75, 1], outputRange: [0, 0.18, 0.58, 1] }),
              transform: [
                { rotate: '14deg' },
                { scaleX: fireAnim.interpolate({ inputRange: [0, 1], outputRange: FIRE_EFFECT_RANGES.arcBoltScale }) },
              ],
            },
          ]}
        />
      </>
    )}
  </View>
);

const SlingshotEffect = ({ fireAnim }: { fireAnim: Animated.Value }) => (
  <View pointerEvents="none" style={styles.slingshotEffect}>
    <Animated.View
      style={[
        styles.slingshotBall,
        {
          opacity: fireAnim.interpolate({ inputRange: [0, 0.08, 0.7, 1], outputRange: [0, 0.7, 0.9, 1] }),
          transform: [
            { translateY: fireAnim.interpolate({ inputRange: [0, 1], outputRange: FIRE_EFFECT_RANGES.slingshotBallY }) },
            { scale: fireAnim.interpolate({ inputRange: [0, 0.16, 1], outputRange: [0.55, 1, 0.7] }) },
          ],
        },
      ]}
    />
    <Animated.View
      style={[
        styles.slingshotStreak,
        {
          opacity: fireAnim.interpolate({ inputRange: [0, 0.12, 0.72, 1], outputRange: [0, 0.18, 0.52, 1] }),
          transform: [{ scaleY: fireAnim.interpolate({ inputRange: [0, 1], outputRange: FIRE_EFFECT_RANGES.slingshotStreakScaleY }) }],
        },
      ]}
    />
  </View>
);

const MeleeEffect = ({ fireAnim }: { fireAnim: Animated.Value }) => (
  <View pointerEvents="none" style={styles.meleeEffect}>
    <Animated.View
      style={[
        styles.meleeSlash,
        {
          opacity: fireAnim.interpolate({ inputRange: [0, 0.18, 0.65, 1], outputRange: [0, 0.35, 0.75, 1] }),
          transform: [
            { rotate: fireAnim.interpolate({ inputRange: [0, 1], outputRange: ['26deg', '-36deg'] }) },
            { translateX: fireAnim.interpolate({ inputRange: [0, 1], outputRange: [34, -30] }) },
            { scaleX: fireAnim.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.8, 1.2, 0.35] }) },
          ],
        },
      ]}
    />
  </View>
);

const ActionEffect = ({ action, fireAnim, weaponId }: { action: WeaponAction; fireAnim: Animated.Value; weaponId: WeaponId }) => {
  switch (action) {
    case 'launch':
      return <LauncherEffect fireAnim={fireAnim} />;
    case 'energy':
      return <EnergyEffect fireAnim={fireAnim} isArc={weaponId === 'electric-arc'} />;
    case 'slingshot':
      return <SlingshotEffect fireAnim={fireAnim} />;
    case 'melee':
      return <MeleeEffect fireAnim={fireAnim} />;
    case 'firearm':
      return <MuzzleFlash fireAnim={fireAnim} />;
    default:
      return null;
  }
};

const GrenadeImpact = ({ fireAnim, weaponId }: { fireAnim: Animated.Value; weaponId: WeaponId }) => {
  if (weaponId === 'frag-grenade') {
    const blastScale = fireAnim.interpolate({ inputRange: [0, 0.05, 0.15], outputRange: [1.8, 1.5, 0.2] });
    const blastOpacity = fireAnim.interpolate({ inputRange: [0, 0.05, 0.1, 0.15], outputRange: [0, 0.8, 1, 0] });
    const shardScale = fireAnim.interpolate({ inputRange: [0, 0.15], outputRange: [2, 0.1] });
    return (
      <View style={styles.impactContainer}>
        <Animated.View style={[styles.fragBlast, { opacity: blastOpacity, transform: [{ scale: blastScale }] }]} />
        <Animated.View style={[styles.fragCore, { opacity: blastOpacity, transform: [{ scale: blastScale }] }]} />
        <Animated.View style={[styles.fragShard, { opacity: blastOpacity, transform: [{ scale: shardScale }, { translateX: -40 }, { translateY: -50 }, { rotate: '-40deg' }] }]} />
        <Animated.View style={[styles.fragShard, { opacity: blastOpacity, transform: [{ scale: shardScale }, { translateX: 40 }, { translateY: -40 }, { rotate: '40deg' }] }]} />
        <Animated.View style={[styles.fragShard, { opacity: blastOpacity, transform: [{ scale: shardScale }, { translateX: -40 }, { translateY: 50 }, { rotate: '-140deg' }] }]} />
        <Animated.View style={[styles.fragShard, { opacity: blastOpacity, transform: [{ scale: shardScale }, { translateX: 40 }, { translateY: 50 }, { rotate: '140deg' }] }]} />
      </View>
    );
  }

  if (weaponId === 'flashbang') {
    const flashScale = fireAnim.interpolate({ inputRange: [0, 0.1, 0.15], outputRange: [4, 1.5, 0.1] });
    const flashOpacity = fireAnim.interpolate({ inputRange: [0, 0.05, 0.15], outputRange: [0, 1, 0] });
    return (
      <View style={styles.impactContainer}>
        <Animated.View style={[styles.flashbangCore, { opacity: flashOpacity, transform: [{ scale: flashScale }] }]} />
        <Animated.View style={[styles.flashbangGlare, { opacity: flashOpacity, transform: [{ scale: flashScale }, { rotate: '45deg' }] }]} />
        <Animated.View style={[styles.flashbangGlare, { opacity: flashOpacity, transform: [{ scale: flashScale }, { rotate: '-45deg' }] }]} />
      </View>
    );
  }

  if (weaponId === 'smoke-grenade') {
    const smokeScale = fireAnim.interpolate({ inputRange: [0, 0.1, 0.15], outputRange: [3.5, 1, 0.1] });
    const smokeOpacity = fireAnim.interpolate({ inputRange: [0, 0.02, 0.1, 0.15], outputRange: [0, 0.8, 1, 0] });
    return (
      <View style={styles.impactContainer}>
        <Animated.View style={[styles.smokeCloud, { width: 140, height: 140, left: -70, top: -70, opacity: smokeOpacity, transform: [{ scale: smokeScale }, { translateX: -30 }, { translateY: -10 }] }]} />
        <Animated.View style={[styles.smokeCloud, { width: 120, height: 120, left: -60, top: -60, backgroundColor: 'rgba(130, 145, 155, 0.9)', opacity: smokeOpacity, transform: [{ scale: smokeScale }, { translateX: 30 }, { translateY: -25 }] }]} />
        <Animated.View style={[styles.smokeCloud, { width: 160, height: 160, left: -80, top: -80, opacity: smokeOpacity, transform: [{ scale: smokeScale }, { translateY: 20 }] }]} />
      </View>
    );
  }

  return null;
};

const GrenadeEffect = ({ fireAnim, weaponId }: { fireAnim: Animated.Value; weaponId: WeaponId }) => {
  const projY = fireAnim.interpolate({ inputRange: [0, 0.15, 1], outputRange: [-250, -250, 100] });
  const projScale = fireAnim.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0.15, 0.15, 0.8] });
  const projRotate = fireAnim.interpolate({ inputRange: [0, 1], outputRange: ['720deg', '0deg'] });
  const projOpacity = fireAnim.interpolate({ inputRange: [0, 0.05, 0.15, 0.95, 1], outputRange: [0, 0, 1, 1, 0] });

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View
        style={[
          styles.grenadeProjectile,
          {
            opacity: projOpacity,
            transform: [
              { translateY: projY },
              { scale: projScale },
              { rotate: projRotate },
            ],
          },
        ]}
      >
        <Image source={WEAPON_IMAGES[weaponId]} resizeMode="contain" style={styles.image} />
      </Animated.View>
      <GrenadeImpact fireAnim={fireAnim} weaponId={weaponId} />
    </View>
  );
};

const KnifeThrowProjectile = ({
  animation,
  target,
  width,
  height,
}: {
  animation: Animated.Value;
  target: KnifeThrowTarget;
  width: number;
  height: number;
}) => {
  const originY = height - 112;
  const targetX = target.x;
  const targetY = height / 2 + target.y - originY;
  const translateX = animation.interpolate({
    inputRange: [0, 0.12, 0.78, 0.9, 1],
    outputRange: [0, 0, targetX, targetX, targetX],
  });
  const translateY = animation.interpolate({
    inputRange: [0, 0.12, 0.78, 0.9, 1],
    outputRange: [0, 0, targetY, targetY, targetY],
  });
  const opacity = animation.interpolate({
    inputRange: [0, 0.08, 0.12, 0.78, 0.88, 1],
    outputRange: [0, 0, 1, 1, 0, 0],
  });
  const scale = animation.interpolate({
    inputRange: [0, 0.12, 0.78, 0.88, 1],
    outputRange: [0.7, 1, 0.32, 0.18, 0.18],
  });
  const rotate = animation.interpolate({
    inputRange: [0, 0.12, 0.78, 0.88, 1],
    outputRange: ['0deg', '0deg', '540deg', '720deg', '720deg'],
  });
  const trailOpacity = animation.interpolate({
    inputRange: [0, 0.12, 0.2, 0.78, 0.88, 1],
    outputRange: [0, 0.72, 0.28, 0.65, 0, 0],
  });

  return (
    <Animated.View
      pointerEvents="none"
      testID="knife-projectile"
      style={[
        styles.projectile,
        {
          left: width / 2 - KNIFE_PROJECTILE_SIZE / 2,
          top: originY - KNIFE_PROJECTILE_SIZE / 2,
          opacity,
          transform: [{ translateX }, { translateY }, { rotate }, { scale }],
        },
      ]}
    >
      <Animated.View style={[styles.projectileTrail, { opacity: trailOpacity }]} />
      <Image
        source={WEAPON_FPS_IMAGES.knife ?? WEAPON_IMAGES.knife}
        resizeMode="contain"
        style={styles.projectileImage}
      />
    </Animated.View>
  );
};

export default function WeaponView({ weaponId, archetype, aimAnim, fireAnim, recoilAnim, reloadAnim, knifeThrowAnim, knifeThrowTarget, isAiming = false }: {
  weaponId: WeaponId;
  archetype: WeaponArchetype;
  aimAnim: Animated.ValueXY;
  fireAnim: Animated.Value;
  recoilAnim: Animated.Value;
  reloadAnim: Animated.Value;
  knifeThrowAnim: Animated.Value;
  knifeThrowTarget: KnifeThrowTarget;
  isAiming?: boolean;
}) {
  const { width, height } = useWindowDimensions();
  const action = getWeaponAction({ archetype });
  const isGrenade = action === 'grenade';
  const isKnife = weaponId === 'knife';
  const equipAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    equipAnim.stopAnimation();
    equipAnim.setValue(0);
    const animation = Animated.sequence([
      Animated.delay(280),
      Animated.timing(equipAnim, {
        toValue: 1,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [equipAnim, weaponId]);

  const translateX = aimAnim.x.interpolate({
    inputRange: [-width / 2, width / 2],
    outputRange: [45, -45],
    extrapolate: 'clamp',
  });
  const aimY = aimAnim.y.interpolate({
    inputRange: [-height / 2, height / 2],
    outputRange: [28, -28],
    extrapolate: 'clamp',
  });
  const reloadY = reloadAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 190, 0] });
  const actionY = isGrenade
    ? aimY
    : Animated.add(Animated.add(aimY, recoilAnim), reloadY);
  const totalY = Animated.add(actionY, isAiming && !isGrenade ? -62 : 0);
  const knifeDrawY = knifeThrowAnim.interpolate({
    inputRange: [0, 0.08, 0.72, 0.9, 1],
    outputRange: [0, 82, 82, 18, 0],
  });
  const knifeHeldOpacity = knifeThrowAnim.interpolate({
    inputRange: [0, 0.08, 0.72, 0.88, 1],
    outputRange: [1, 0, 0, 0.72, 1],
  });
  const rotate = reloadAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['0deg', '18deg', '0deg'] });
  const meleeRotate = fireAnim.interpolate({ inputRange: [0, 0.35, 1], outputRange: ['0deg', '-8deg', '4deg'] });
  const equipY = equipAnim.interpolate({ inputRange: [0, 0.2, 1], outputRange: [28, 28, 0] });
  const equipScale = equipAnim.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.84, 0.84, 1] });

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View
        testID="weapon-view"
        style={[styles.container, {
          transform: [
            { translateX },
            { translateY: totalY },
            { rotate: action === 'melee' ? meleeRotate : rotate },
            { scale: isAiming && !isGrenade ? 1.52 : 1 },
          ],
        }]}
      >
        <Animated.View style={{ width: '100%', height: '100%', opacity: isKnife ? knifeHeldOpacity : 1 }}>
          <View style={styles.shadow} />
          <Animated.View
            style={[
              styles.equipLayer,
              {
                transform: [
                  { perspective: 900 },
                  { translateY: equipY },
                  { scale: equipScale },
                  ...(isKnife ? [{ translateY: knifeDrawY }] : []),
                ],
              },
            ]}
          >
            {isGrenade ? (
              <>
                <GrenadeEffect fireAnim={fireAnim} weaponId={weaponId} />
                <Animated.View style={[styles.heldGrenadeContainer, {
                  opacity: fireAnim.interpolate({ inputRange: [0, 0.1, 0.2, 1], outputRange: [1, 1, 0, 0] }),
                  transform: [{ translateY: fireAnim.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 80, 80] }) }]
                }]}>
                  <Image source={WEAPON_IMAGES[weaponId]} resizeMode="contain" style={styles.heldGrenadeImage} />
                </Animated.View>
              </>
            ) : (
              <>
                <ActionEffect action={action} fireAnim={fireAnim} weaponId={weaponId} />
                <Image source={WEAPON_FPS_IMAGES[weaponId] ?? WEAPON_IMAGES[weaponId]} resizeMode="contain" style={styles.image} />
              </>
            )}
          </Animated.View>
        </Animated.View>
      </Animated.View>
      {isKnife && <KnifeThrowProjectile animation={knifeThrowAnim} target={knifeThrowTarget} width={width} height={height} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: -64,
    width: 430,
    height: 270,
  },
  projectile: {
    position: 'absolute',
    width: KNIFE_PROJECTILE_SIZE,
    height: KNIFE_PROJECTILE_SIZE,
    zIndex: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  projectileImage: {
    width: '100%',
    height: '100%',
  },
  projectileTrail: {
    position: 'absolute',
    width: 6,
    height: 112,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,.48)',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 9,
    elevation: 5,
  },
  heldGrenadeContainer: {
    position: 'absolute',
    left: 430 / 2 - 50,
    top: 150,
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heldGrenadeImage: {
    width: '100%',
    height: '100%',
  },
  grenadeProjectile: {
    position: 'absolute',
    left: 430 / 2 - 30,
    top: 270 / 2 - 30,
    width: 60,
    height: 60,
    zIndex: 2,
  },
  impactContainer: {
    position: 'absolute',
    left: 430 / 2,
    top: 135 - 250,
    zIndex: 1,
  },
  fragBlast: {
    position: 'absolute',
    width: 160,
    height: 160,
    left: -80,
    top: -80,
    borderRadius: 80,
    backgroundColor: '#ff7700',
  },
  fragCore: {
    position: 'absolute',
    width: 100,
    height: 100,
    left: -50,
    top: -50,
    borderRadius: 50,
    backgroundColor: '#ffcc00',
  },
  fragShard: {
    position: 'absolute',
    width: 6,
    height: 24,
    backgroundColor: '#ffffff',
    borderRadius: 3,
    left: -3,
    top: -12,
  },
  flashbangCore: {
    position: 'absolute',
    width: 120,
    height: 120,
    left: -60,
    top: -60,
    borderRadius: 60,
    backgroundColor: '#ffffff',
  },
  flashbangGlare: {
    position: 'absolute',
    width: 400,
    height: 12,
    left: -200,
    top: -6,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 6,
  },
  smokeCloud: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(160, 175, 185, 0.95)',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  equipLayer: {
    width: '100%',
    height: '100%',
  },
  shadow: {
    position: 'absolute',
    left: '12%',
    right: '12%',
    bottom: 22,
    height: 24,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,.42)',
  },
  flash: {
    position: 'absolute',
    zIndex: 3,
    top: -8,
    left: 179,
    width: 72,
    height: 44,
    justifyContent: 'center',
  },
  hotGas: {
    position: 'absolute',
    top: 0,
    left: 29,
    width: 13,
    height: 62,
    borderRadius: 8,
    backgroundColor: 'rgba(255,119,24,.68)',
    shadowColor: '#ff7a18',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 10,
    elevation: 7,
  },
  hotCore: {
    position: 'absolute',
    left: 4,
    top: 1,
    width: 5,
    height: 38,
    borderRadius: 3,
    backgroundColor: 'rgba(255,244,196,.96)',
  },
  smoke: {
    position: 'absolute',
    left: 8,
    top: -35,
    width: 56,
    height: 44,
  },
  smokePuff: {
    position: 'absolute',
    backgroundColor: 'rgba(180,188,190,.5)',
    borderRadius: 999,
  },
  smokePuffLarge: {
    width: 27,
    height: 21,
    left: 2,
    top: 11,
  },
  smokePuffMedium: {
    width: 20,
    height: 17,
    left: 23,
    top: 5,
  },
  smokePuffSmall: {
    width: 14,
    height: 12,
    left: 32,
    top: 24,
  },
  spark: {
    position: 'absolute',
    left: 34,
    top: 7,
    width: 2,
    height: 23,
    borderRadius: 1,
    backgroundColor: '#ffd36a',
  },
  sparkOne: {
    transform: [{ rotate: '-24deg' }, { translateY: -13 }],
  },
  sparkTwo: {
    transform: [{ rotate: '18deg' }, { translateY: -18 }],
  },
  sparkThree: {
    height: 15,
    transform: [{ rotate: '42deg' }, { translateY: -10 }],
  },
  launchEffect: {
    position: 'absolute',
    zIndex: 3,
    top: -36,
    left: 158,
    width: 114,
    height: 178,
    alignItems: 'center',
  },
  launchFlame: {
    position: 'absolute',
    top: 14,
    width: 27,
    height: 108,
    borderRadius: 18,
    backgroundColor: 'rgba(255,119,24,.82)',
    shadowColor: '#ff7a18',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 13,
    elevation: 8,
  },
  launchSmoke: {
    position: 'absolute',
    top: 12,
    width: 84,
    height: 66,
    borderRadius: 999,
    backgroundColor: 'rgba(173,183,186,.46)',
  },
  launchTrail: {
    position: 'absolute',
    top: 72,
    width: 10,
    height: 94,
    borderRadius: 999,
    backgroundColor: 'rgba(255,224,153,.88)',
  },
  energyEffect: {
    position: 'absolute',
    zIndex: 3,
    top: -28,
    left: 171,
    width: 88,
    height: 176,
    alignItems: 'center',
  },
  energyCore: {
    position: 'absolute',
    top: 2,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(121,243,255,.95)',
    shadowColor: '#4be9ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.95,
    shadowRadius: 18,
    elevation: 8,
  },
  energyRing: {
    position: 'absolute',
    top: 0,
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: 'rgba(99,233,255,.9)',
  },
  energyBeam: {
    position: 'absolute',
    top: 24,
    width: 9,
    height: 124,
    borderRadius: 8,
    backgroundColor: 'rgba(90,230,255,.75)',
    shadowColor: '#68efff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 6,
  },
  arcBolt: {
    position: 'absolute',
    left: 8,
    width: 72,
    height: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(188,230,255,.92)',
    shadowColor: '#8aa8ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 7,
    elevation: 6,
  },
  arcBoltTop: {
    top: 22,
    transform: [{ rotate: '-11deg' }],
  },
  arcBoltBottom: {
    top: 42,
    transform: [{ rotate: '14deg' }],
  },
  slingshotEffect: {
    position: 'absolute',
    zIndex: 3,
    top: -16,
    left: 185,
    width: 60,
    height: 240,
    alignItems: 'center',
  },
  slingshotBall: {
    position: 'absolute',
    top: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#d9e2e6',
    borderWidth: 1,
    borderColor: '#fff',
    shadowColor: '#d9e2e6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 5,
  },
  slingshotStreak: {
    position: 'absolute',
    top: 10,
    width: 3,
    height: 150,
    borderRadius: 4,
    backgroundColor: 'rgba(204,230,239,.74)',
  },
  meleeEffect: {
    position: 'absolute',
    zIndex: 3,
    top: 18,
    left: 82,
    width: 260,
    height: 168,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meleeSlash: {
    width: 230,
    height: 9,
    borderRadius: 8,
    backgroundColor: 'rgba(235,250,255,.9)',
    shadowColor: '#d8f7ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 5,
  },
});