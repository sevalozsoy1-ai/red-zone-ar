import React, { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

export interface JoystickRef {
  reset: () => void;
}

const Joystick = forwardRef<JoystickRef, { onMove: (dx: number, dy: number) => void }>(
  ({ onMove }, ref) => {
    const thumbAnim = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
    const onMoveRef = useRef(onMove);
    const pointerIdRef = useRef<number | null>(null);
    const originRef = useRef({ x: 0, y: 0 });
    onMoveRef.current = onMove;

    const reset = useCallback(() => {
      pointerIdRef.current = null;
      Animated.spring(thumbAnim, {
        toValue: { x: 0, y: 0 },
        useNativeDriver: false,
      }).start();
      onMoveRef.current(0, 0);
    }, [thumbAnim]);

    useImperativeHandle(ref, () => ({ reset }), [reset]);

    const handlePointerDown = useCallback((event: React.PointerEvent<HTMLElement>) => {
      if (pointerIdRef.current !== null) return;
      pointerIdRef.current = event.pointerId;
      originRef.current = { x: event.clientX, y: event.clientY };
      event.currentTarget.setPointerCapture(event.pointerId);
    }, []);

    const handlePointerMove = useCallback((event: React.PointerEvent<HTMLElement>) => {
      if (event.pointerId !== pointerIdRef.current) return;
      const radius = 40;
      let dx = event.clientX - originRef.current.x;
      let dy = event.clientY - originRef.current.y;
      const distance = Math.hypot(dx, dy);
      if (distance > radius) {
        dx = (dx / distance) * radius;
        dy = (dy / distance) * radius;
      }
      thumbAnim.setValue({ x: dx, y: dy });
      onMoveRef.current(dx / radius, dy / radius);
    }, [thumbAnim]);

    const handlePointerEnd = useCallback((event: React.PointerEvent<HTMLElement>) => {
      if (event.pointerId === pointerIdRef.current) reset();
    }, [reset]);

    const pointerHandlers = {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerEnd,
      onPointerCancel: handlePointerEnd,
      onLostPointerCapture: handlePointerEnd,
    } as unknown as React.ComponentProps<typeof View>;

    return (
      <View style={styles.base} {...pointerHandlers} testID="joystick-base">
        <Animated.View
          pointerEvents="none"
          style={[styles.thumb, { transform: thumbAnim.getTranslateTransform() }]}
          testID="joystick-thumb"
        />
      </View>
    );
  },
);

const styles = StyleSheet.create({
  base: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center', alignItems: 'center',
    touchAction: 'none',
  },
  thumb: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.9)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.5, shadowRadius: 4,
  },
});

export default Joystick;