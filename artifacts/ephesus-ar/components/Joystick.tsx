import React, { useCallback, useRef, useImperativeHandle, forwardRef } from 'react';
import { View, StyleSheet, Animated, GestureResponderEvent, NativeTouchEvent } from 'react-native';

export interface JoystickRef {
    reset: () => void;
}

const Joystick = forwardRef<JoystickRef, { onMove: (dx: number, dy: number) => void }>(({ onMove }, ref) => {
  const thumbAnim = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const onMoveRef = useRef(onMove);
  const touchIdRef = useRef<string | null>(null);
  const originRef = useRef({ x: 0, y: 0 });
  onMoveRef.current = onMove;

  const reset = useCallback(() => {
    touchIdRef.current = null;
    Animated.spring(thumbAnim, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: false,
    }).start();
    onMoveRef.current(0, 0);
  }, [thumbAnim]);

  useImperativeHandle(ref, () => ({ reset }), [reset]);

  const findOwnedTouch = useCallback((event: GestureResponderEvent): NativeTouchEvent | undefined => {
    const touchId = touchIdRef.current;
    return touchId === null
      ? undefined
      : event.nativeEvent.changedTouches.find((touch) => touch.identifier === touchId);
  }, []);

  const handleTouchStart = useCallback((event: GestureResponderEvent) => {
    if (touchIdRef.current !== null) return;
    const touch = event.nativeEvent.changedTouches[0];
    if (!touch) return;
    touchIdRef.current = touch.identifier;
    originRef.current = { x: touch.pageX, y: touch.pageY };
  }, []);

  const handleTouchMove = useCallback((event: GestureResponderEvent) => {
    const touch = findOwnedTouch(event);
    if (!touch) return;

    const radius = 40;
    let dx = touch.pageX - originRef.current.x;
    let dy = touch.pageY - originRef.current.y;
    const distance = Math.hypot(dx, dy);
    if (distance > radius) {
      dx = (dx / distance) * radius;
      dy = (dy / distance) * radius;
    }
    thumbAnim.setValue({ x: dx, y: dy });
    onMoveRef.current(dx / radius, dy / radius);
  }, [findOwnedTouch, thumbAnim]);

  const handleTouchEnd = useCallback((event: GestureResponderEvent) => {
    if (findOwnedTouch(event)) reset();
  }, [findOwnedTouch, reset]);

  return (
    <View
      style={styles.base}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      testID="joystick-base"
    >
      <Animated.View
        pointerEvents="none"
        style={[styles.thumb, { transform: thumbAnim.getTranslateTransform() }]}
        testID="joystick-thumb"
      />
    </View>
  );
});

const styles = StyleSheet.create({
  base: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center', alignItems: 'center'
  },
  thumb: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.9)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.5, shadowRadius: 4,
    elevation: 5
  }
});

export default Joystick;