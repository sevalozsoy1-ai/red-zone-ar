import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import type { TrackedImpact } from '@/lib/impact-tracker';

const fireImage = require('../assets/images/impact-fire-cutout.png');
const blastImage = require('../assets/images/impact-blast-cutout.png');
const smokeImage = require('../assets/images/impact-smoke.png');

const FRAGMENTS = Array.from({ length: 16 }, (_, index) => {
  const angle = (index / 16) * Math.PI * 2 + 0.14;
  return { x: Math.cos(angle) * (95 + (index % 3) * 19), y: Math.sin(angle) * (85 + (index % 4) * 15), angle };
});

function FlashWash() {
  const opacity = useRef(new Animated.Value(0.75)).current;
  useEffect(() => {
    const animation = Animated.timing(opacity, { toValue: 0, duration: 900, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [opacity]);
  return <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#f4f9ff', opacity }]} />;
}

function ImpactVisual({ impact, width, height }: { impact: TrackedImpact; width: number; height: number }) {
  const intro = useRef(new Animated.Value(0)).current;
  const flicker = useRef(new Animated.Value(0)).current;
  const smoke = impact.kind === 'smoke';
  const fragmentation = impact.kind === 'frag' || impact.kind === 'rocket' || impact.kind === 'blast';
  const intense = impact.kind === 'rocket';
  const isFire = ['ember', 'firestorm', 'scorch', 'frag', 'rocket', 'burn'].includes(impact.kind);
  const size = intense ? 240 : impact.kind === 'frag' ? 190 : smoke ? 176
    : impact.kind === 'firestorm' ? 132 : fragmentation ? 148
    : impact.kind === 'plasma' ? 104 : impact.kind === 'flash' ? 116
    : impact.kind === 'scorch' ? 90 : 66;

  useEffect(() => {
    const animation = Animated.timing(intro, {
      toValue: 1,
      duration: smoke ? Math.min(impact.expiresAt - impact.createdAt, 11_000) : fragmentation ? 1_200 : 850,
      useNativeDriver: true,
    });
    animation.start();
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(flicker, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(flicker, { toValue: 0, duration: 830, useNativeDriver: true }),
      ]),
    );
    if (isFire && impact.visible) pulse.start();
    return () => { animation.stop(); pulse.stop(); };
  }, [flicker, impact.createdAt, impact.expiresAt, impact.visible, intro, isFire, fragmentation, smoke]);

  if (!impact.visible) return null;
  const center = size / 2;
  const explosionOpacity = intro.interpolate({ inputRange: [0, 0.1, 0.7, 1], outputRange: [0, 1, 0.9, 0] });
  const smallHit = ['bullet', 'ember', 'firestorm', 'scorch', 'pellets', 'pebble'].includes(impact.kind);

  return (
    <View
      pointerEvents="none"
      testID={`impact-${impact.id}`}
      style={[styles.position, {
        left: impact.x * width - center,
        top: impact.y * height - (isFire ? size * 0.72 : center),
        width: size,
        height: size,
      }]}
    >
      {fragmentation && (
        <>
          <Animated.Image source={blastImage} resizeMode="contain" style={[styles.image, {
            opacity: explosionOpacity,
            transform: [{ scale: intro.interpolate({ inputRange: [0, 1], outputRange: [0.15, intense ? 1.5 : 1.15] }) }],
          }]} />
          <Animated.View style={[styles.blastRing, {
            left: center - 35, top: center - 35,
            borderColor: intense ? '#fff0a2' : '#ffc058',
            opacity: intro.interpolate({ inputRange: [0, 0.1, 1], outputRange: [0.9, 0.85, 0] }),
            transform: [{ scale: intro.interpolate({ inputRange: [0, 1], outputRange: [0.3, intense ? 3.8 : 2.8] }) }],
          }]} />
          {impact.kind !== 'blast' && FRAGMENTS.map((fragment, index) => (
            <Animated.View key={index} style={[styles.fragment, {
              left: center - 2, top: center - 2,
              backgroundColor: index % 3 === 0 ? '#fff4bd' : '#ff862e',
              opacity: intro.interpolate({ inputRange: [0, 0.15, 0.8, 1], outputRange: [0, 1, 0.8, 0] }),
              transform: [
                { translateX: intro.interpolate({ inputRange: [0, 1], outputRange: [0, fragment.x * (intense ? 1.45 : 1)] }) },
                { translateY: intro.interpolate({ inputRange: [0, 1], outputRange: [0, fragment.y * (intense ? 1.45 : 1)] }) },
                { rotate: `${fragment.angle}rad` },
              ],
            }]} />
          ))}
        </>
      )}
      {isFire && (
        <Animated.Image source={fireImage} resizeMode="contain" style={[styles.image, {
          width: impact.kind === 'ember' ? size * 0.67 : impact.kind === 'scorch' ? size * 0.8 : size,
          alignSelf: 'center',
          opacity: fragmentation
            ? Animated.multiply(
                intro.interpolate({ inputRange: [0, 0.55, 1], outputRange: [0, 0.2, 1] }),
                flicker.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1] }),
              )
            : flicker.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }),
          transform: [{ translateY: flicker.interpolate({ inputRange: [0, 1], outputRange: [3, -4] }) }],
        }]} />
      )}
      {smallHit && (
        <>
          <View style={[styles.scorchMark, { left: center - 7, top: isFire ? size * 0.72 - 7 : center - 7 }]} />
          <Animated.View style={[styles.hitSpark, {
            left: center - 11, top: center - 11,
            opacity: intro.interpolate({ inputRange: [0, 1], outputRange: [0.9, 0] }),
            transform: [{ scale: intro.interpolate({ inputRange: [0, 1], outputRange: [0.35, impact.kind === 'pellets' ? 2.4 : 1.6] }) }],
          }]} />
          {impact.kind === 'pellets' && [[-23, -17], [25, -13], [-17, 23], [21, 18], [3, -28]].map(([x, y], index) => (
            <Animated.View key={index} style={[styles.pellet, {
              left: center + x, top: center + y,
              opacity: intro.interpolate({ inputRange: [0, 1], outputRange: [1, 0.28] }),
            }]} />
          ))}
        </>
      )}
      {smoke && [0, 1, 2].map((index) => (
        <Animated.Image key={index} source={smokeImage} resizeMode="contain" style={[styles.smokeTexture, {
          left: center - 100 + (index - 1) * 26,
          top: center - 96 + (index % 2) * 14,
          opacity: intro.interpolate({ inputRange: [0, 0.09, 0.55, 0.85, 1], outputRange: [0, 0.58, 0.72, 0.4, 0] }),
          transform: [
            { translateX: intro.interpolate({ inputRange: [0, 1], outputRange: [0, (index - 1) * 46] }) },
            { translateY: intro.interpolate({ inputRange: [0, 1], outputRange: [0, -45 - index * 10] }) },
            { scale: intro.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1.75 + index * 0.15] }) },
          ],
        }]} />
      ))}
      {impact.kind === 'flash' && (
        <>
          <Animated.View style={[styles.flashCore, {
            left: center - 32, top: center - 32,
            opacity: intro.interpolate({ inputRange: [0, 0.2, 1], outputRange: [1, 0.9, 0] }),
            transform: [{ scale: intro.interpolate({ inputRange: [0, 1], outputRange: [0.3, 2.1] }) }],
          }]} />
          <Animated.View style={[styles.blastRing, {
            left: center - 35, top: center - 35, borderColor: '#ecf9ff',
            opacity: intro.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
            transform: [{ scale: intro.interpolate({ inputRange: [0, 1], outputRange: [0.2, 3] }) }],
          }]} />
        </>
      )}
      {impact.kind === 'plasma' && (
        <>
          <Animated.View style={[styles.plasmaCore, {
            left: center - 20, top: center - 20,
            opacity: intro.interpolate({ inputRange: [0, 0.18, 1], outputRange: [0.95, 0.9, 0.3] }),
            transform: [{ scale: intro.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1.5] }) }],
          }]} />
          <Animated.View style={[styles.blastRing, {
            left: center - 35, top: center - 35, borderColor: '#53eaff',
            opacity: intro.interpolate({ inputRange: [0, 1], outputRange: [0.9, 0.2] }),
            transform: [{ scale: intro.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.5] }) }],
          }]} />
        </>
      )}
      {impact.kind === 'slash' && (
        <Animated.View style={[styles.slash, {
          left: center - 32, top: center - 20,
          opacity: intro.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
          transform: [{ rotate: '-40deg' }, { scaleX: intro.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1.8] }) }],
        }]} />
      )}
    </View>
  );
}

export default function ImpactEffects({ impacts, width, height }: {
  impacts: TrackedImpact[];
  width: number;
  height: number;
}) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {impacts.map((impact) => (
        <ImpactVisual key={impact.id} impact={impact} width={width} height={height} />
      ))}
      {impacts.filter((impact) => impact.kind === 'flash').map((impact) => (
        <FlashWash key={`wash-${impact.id}`} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  position: { position: 'absolute' },
  image: { width: '100%', height: '100%', position: 'absolute' },
  blastRing: { position: 'absolute', width: 70, height: 70, borderRadius: 35, borderWidth: 3 },
  fragment: { position: 'absolute', width: 15, height: 4, borderRadius: 2 },
  scorchMark: { position: 'absolute', width: 14, height: 14, borderRadius: 8, backgroundColor: 'rgba(20,19,18,0.78)', borderWidth: 2, borderColor: '#6b5142' },
  hitSpark: { position: 'absolute', width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff3c8', borderWidth: 3, borderColor: '#ff993b' },
  pellet: { position: 'absolute', width: 7, height: 7, borderRadius: 4, backgroundColor: '#e4aa6a', borderWidth: 1, borderColor: '#4b342c' },
  smokeTexture: { position: 'absolute', width: 200, height: 200 },
  flashCore: { position: 'absolute', width: 64, height: 64, borderRadius: 32, backgroundColor: '#fff' },
  plasmaCore: { position: 'absolute', width: 40, height: 40, borderRadius: 20, backgroundColor: '#45d8ff', borderWidth: 8, borderColor: '#dbffff' },
  slash: { position: 'absolute', width: 64, height: 6, borderRadius: 4, backgroundColor: '#f7f4e9', borderWidth: 1, borderColor: '#e39154' },
});