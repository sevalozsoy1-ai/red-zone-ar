import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

type Props = {
  onPressIn: () => void;
  onPressOut: () => void;
  disabled?: boolean;
  label: string;
};

export default function FireButton({ onPressIn, onPressOut, disabled, label }: Props) {
  const [pressed, setPressed] = useState(false);
  const pointerIdRef = useRef<number | 'keyboard' | null>(null);
  const onPressInRef = useRef(onPressIn);
  const onPressOutRef = useRef(onPressOut);
  onPressInRef.current = onPressIn;
  onPressOutRef.current = onPressOut;

  const cancelPress = useCallback(() => {
    if (pointerIdRef.current === null) return;
    pointerIdRef.current = null;
    setPressed(false);
    onPressOutRef.current();
  }, []);

  useEffect(() => {
    if (disabled) cancelPress();
  }, [cancelPress, disabled]);

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLElement>) => {
    if (disabled || pointerIdRef.current !== null) return;
    pointerIdRef.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    setPressed(true);
    onPressInRef.current();
  }, [disabled]);

  const handlePointerEnd = useCallback((event: React.PointerEvent<HTMLElement>) => {
    if (event.pointerId === pointerIdRef.current) cancelPress();
  }, [cancelPress]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLElement>) => {
    if (
      disabled
      || pointerIdRef.current !== null
      || (event.key !== 'Enter' && event.key !== ' ')
      || event.repeat
    ) return;
    event.preventDefault();
    pointerIdRef.current = 'keyboard';
    setPressed(true);
    onPressInRef.current();
  }, [disabled]);

  const handleKeyUp = useCallback((event: React.KeyboardEvent<HTMLElement>) => {
    if (
      pointerIdRef.current === 'keyboard'
      && (event.key === 'Enter' || event.key === ' ')
    ) {
      event.preventDefault();
      cancelPress();
    }
  }, [cancelPress]);

  const domHandlers = {
    onPointerDown: handlePointerDown,
    onPointerUp: handlePointerEnd,
    onPointerCancel: handlePointerEnd,
    onLostPointerCapture: handlePointerEnd,
    onKeyDown: handleKeyDown,
    onKeyUp: handleKeyUp,
    onBlur: cancelPress,
    tabIndex: disabled ? -1 : 0,
  } as unknown as React.ComponentProps<typeof View>;

  return (
    <View
      {...domHandlers}
      testID="fire-btn"
      accessibilityRole="button"
      accessibilityLabel={label}
      aria-disabled={!!disabled}
      accessibilityState={{ disabled: !!disabled }}
      style={[styles.btn, disabled && styles.btnDisabled, pressed && !disabled && styles.btnPressed]}
    >
      <Text pointerEvents="none" style={[styles.text, disabled && styles.textDisabled]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(255, 60, 60, 0.8)',
    borderWidth: 4, borderColor: 'rgba(255, 120, 120, 0.9)',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#f00', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 10,
    touchAction: 'none',
  },
  btnPressed: {
    backgroundColor: 'rgba(255, 30, 30, 0.95)',
    transform: [{ scale: 0.92 }],
  },
  btnDisabled: {
    backgroundColor: 'rgba(100, 30, 30, 0.8)',
    borderColor: 'rgba(150, 50, 50, 0.9)',
    shadowOpacity: 0,
  },
  text: {
    color: '#fff', fontWeight: '900', fontSize: 20,
    textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 3,
  },
  textDisabled: {
    color: '#ccc', textShadowColor: 'transparent',
  },
});