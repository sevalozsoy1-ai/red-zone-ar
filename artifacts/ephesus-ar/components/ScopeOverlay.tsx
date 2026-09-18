import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing, Text, useWindowDimensions } from 'react-native';
import Svg, { Path, Circle, Line, Defs, RadialGradient, Stop } from 'react-native-svg';
import { useI18n } from '@/hooks/useI18n';
import { uiText } from '@/lib/i18n';

export function ScopeOverlay({ aimAnim, isScopeActive, zoom, zeroOffset }: {
  aimAnim: Animated.ValueXY;
  isScopeActive: boolean;
  zoom: number;
  zeroOffset: { x: number; y: number };
}) {
  const { width, height } = useWindowDimensions();
  const { locale } = useI18n();
  const enterAnim = useRef(new Animated.Value(0)).current;
  // Keep the SVG inside the viewport. A 3x off-screen canvas can allocate a
  // large native surface on Android when the scope mounts and is unnecessary
  // because the parent already follows the aim offset.
  const viewportWidth = Math.max(1, width);
  const viewportHeight = Math.max(1, height);
  const lensRadius = Math.max(1, Math.min(180, Math.min(viewportWidth, viewportHeight) * 0.38));
  const centerX = viewportWidth / 2 + zeroOffset.x;
  const centerY = viewportHeight / 2 + zeroOffset.y;

  useEffect(() => {
    enterAnim.stopAnimation();
    if (!isScopeActive) {
      enterAnim.setValue(0);
      return;
    }
    enterAnim.setValue(0);
    Animated.timing(enterAnim, {
      toValue: 1,
      duration: 360,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [enterAnim, isScopeActive]);

  if (!isScopeActive || width <= 0 || height <= 0) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
            width: viewportWidth,
            height: viewportHeight,
            top: 0,
            left: 0,
            opacity: enterAnim,
            transform: [
              { translateX: aimAnim.x },
              { translateY: aimAnim.y },
              { scale: enterAnim.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1] }) },
            ],
        }
      ]}
      pointerEvents="none"
      testID="scope-overlay"
    >
      <Svg width={viewportWidth} height={viewportHeight} viewBox={`0 0 ${viewportWidth} ${viewportHeight}`}>
        <Defs>
           <RadialGradient id="vignette" cx="50%" cy="50%" rx="50%" ry="50%">
             <Stop offset="85%" stopColor="transparent" />
             <Stop offset="95%" stopColor="rgba(0,0,0,0.5)" />
             <Stop offset="100%" stopColor="rgba(0,0,0,1)" />
           </RadialGradient>
        </Defs>

        {/* Mask out the scope hole */}
        <Path 
          d={`M 0 0 H ${viewportWidth} V ${viewportHeight} H 0 Z M ${centerX} ${centerY - lensRadius} A ${lensRadius} ${lensRadius} 0 1 0 ${centerX} ${centerY + lensRadius} A ${lensRadius} ${lensRadius} 0 1 0 ${centerX} ${centerY - lensRadius} Z`}
          fill="#000"
          fillRule="evenodd"
        />

        {/* Lens vignette */}
        <Circle cx={centerX} cy={centerY} r={lensRadius} fill="url(#vignette)" />

        {/* Crosshairs */}
        <Line x1={centerX} y1={centerY - lensRadius} x2={centerX} y2={centerY + lensRadius} stroke="rgba(20,255,20,0.8)" strokeWidth="2" />
        <Line x1={centerX - lensRadius} y1={centerY} x2={centerX + lensRadius} y2={centerY} stroke="rgba(20,255,20,0.8)" strokeWidth="2" />

        {/* Inner thin lines */}
        <Line x1={centerX} y1={centerY - 50} x2={centerX} y2={centerY + 50} stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
        <Line x1={centerX - 50} y1={centerY} x2={centerX + 50} y2={centerY} stroke="rgba(255,255,255,0.5)" strokeWidth="1" />

        {/* Mil dots */}
        {[...Array(15)].map((_, i) => i !== 7 && (
            <Line key={`h${i}`} x1={centerX - 8} y1={centerY - lensRadius * 0.78 + i * lensRadius * 0.13} x2={centerX + 8} y2={centerY - lensRadius * 0.78 + i * lensRadius * 0.13} stroke="rgba(20,255,20,0.9)" strokeWidth="2" />
        ))}
        {[...Array(15)].map((_, i) => i !== 7 && (
            <Line key={`v${i}`} x1={centerX - lensRadius * 0.78 + i * lensRadius * 0.13} y1={centerY - 8} x2={centerX - lensRadius * 0.78 + i * lensRadius * 0.13} y2={centerY + 8} stroke="rgba(20,255,20,0.9)" strokeWidth="2" />
        ))}

        {/* Rangefinder curved line bottom left */}
        <Path d={`M ${centerX - lensRadius * 0.78} ${centerY + lensRadius * 0.22} Q ${centerX - lensRadius * 0.56} ${centerY + lensRadius * 0.67} ${centerX - lensRadius * 0.22} ${centerY + lensRadius * 0.78}`} fill="none" stroke="rgba(20,255,20,0.6)" strokeWidth="2" strokeDasharray="4,4" />

        <Circle cx={centerX} cy={centerY} r={3} fill="#ff3b30" />
      </Svg>

       <View style={{ position: 'absolute', top: centerY - lensRadius * 0.89, alignSelf: 'center', backgroundColor: 'rgba(0,255,0,0.1)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 4, borderWidth: 1, borderColor: 'rgba(20,255,20,0.5)' }}>
           <Text style={{ color: '#14ff14', fontWeight: '900', fontSize: 14, letterSpacing: 3, textShadowColor: '#000', textShadowRadius: 2, textShadowOffset: {width: 0, height: 1} }}>{zoom.toFixed(1)}× {uiText(locale, 'scopeMagnification')}</Text>
      </View>
       <View style={{ position: 'absolute', top: centerY + lensRadius * 0.67, left: centerX + lensRadius * 0.22 }}>
           <Text style={{ color: 'rgba(20,255,20,0.8)', fontWeight: 'bold', fontSize: 10, fontFamily: 'monospace' }}>{uiText(locale, 'scopeDistance')}: ---</Text>
           <Text style={{ color: 'rgba(20,255,20,0.8)', fontWeight: 'bold', fontSize: 10, fontFamily: 'monospace' }}>{uiText(locale, 'scopeWind')}: 0.0</Text>
      </View>
    </Animated.View>
  );
}

export function NormalReticle({ aimAnim, isScopeActive }: { aimAnim: Animated.ValueXY, isScopeActive?: boolean }) {
    const { width, height } = useWindowDimensions();

    if (isScopeActive) return null;
    
    return (
        <Animated.View style={[
            {
               position: 'absolute', top: height/2 - 24, left: width/2 - 24,
               width: 48, height: 48, justifyContent: 'center', alignItems: 'center'
            },
            { transform: [{ translateX: aimAnim.x }, { translateY: aimAnim.y }] }
        ]} pointerEvents="none" testID="normal-reticle">
            {/* White crosshairs with black shadow for maximum visibility on all backgrounds */}
            <View style={[styles.reticleLine, { width: 3, height: 16, top: 0 }]} />
            <View style={[styles.reticleLine, { width: 3, height: 16, bottom: 0 }]} />
            <View style={[styles.reticleLine, { width: 16, height: 3, left: 0 }]} />
            <View style={[styles.reticleLine, { width: 16, height: 3, right: 0 }]} />

            {/* Center dot */}
            <View style={styles.reticleDot} />
        </Animated.View>
    );
}

export function IronSightOverlay({ aimAnim, isActive }: { aimAnim: Animated.ValueXY; isActive: boolean }) {
  const { width, height } = useWindowDimensions();
  if (!isActive) return null;

  return (
    <Animated.View
      pointerEvents="none"
      testID="iron-sight-overlay"
      style={[
        styles.ironSight,
        {
          left: width / 2 - 115,
          top: height / 2 - 106,
          transform: [{ translateX: aimAnim.x }, { translateY: aimAnim.y }],
        },
      ]}
    >
      <View style={styles.rearSight}>
        <View style={styles.rearNotch} />
      </View>
      <View style={styles.frontSightGuard}>
        <View style={styles.frontSightPost} />
        <View style={styles.frontSightDot} />
      </View>
      <View style={styles.sightCenterDot} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
  },
  reticleLine: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.95)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 4,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.5)',
  },
  reticleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ff3b30',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#fff',
  },
  ironSight: {
    position: 'absolute',
    width: 230,
    height: 212,
    alignItems: 'center',
    zIndex: 5,
  },
  rearSight: {
    position: 'absolute',
    bottom: 0,
    width: 224,
    height: 112,
    borderTopWidth: 17,
    borderLeftWidth: 22,
    borderRightWidth: 22,
    borderColor: 'rgba(8,10,12,.96)',
    borderTopLeftRadius: 112,
    borderTopRightRadius: 112,
  },
  rearNotch: {
    position: 'absolute',
    top: -18,
    left: 79,
    width: 20,
    height: 28,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderColor: '#050607',
    backgroundColor: 'transparent',
  },
  frontSightGuard: {
    position: 'absolute',
    top: 58,
    width: 60,
    height: 74,
    borderWidth: 7,
    borderColor: 'rgba(16,18,20,.96)',
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  frontSightPost: {
    width: 7,
    height: 43,
    backgroundColor: '#080a0b',
  },
  frontSightDot: {
    position: 'absolute',
    top: 13,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#e9edf0',
    borderWidth: 2,
    borderColor: '#080a0b',
  },
  sightCenterDot: {
    position: 'absolute',
    top: 89,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ff342e',
  },
});