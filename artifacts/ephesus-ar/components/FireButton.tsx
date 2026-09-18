import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

export default function FireButton({ onPressIn, onPressOut, disabled, label }: { onPressIn: () => void, onPressOut: () => void, disabled?: boolean, label: string }) {
  const [pressed, setPressed] = useState(false);
  const touchIdRef = useRef<boolean>(false);
  const onPressInRef = useRef(onPressIn);
  const onPressOutRef = useRef(onPressOut);
  onPressInRef.current = onPressIn;
  onPressOutRef.current = onPressOut;

  const cancelPress = useCallback(() => {
    if (!touchIdRef.current) return;
    touchIdRef.current = false;
    setPressed(false);
    onPressOutRef.current();
  }, []);

  useEffect(() => {
    if (disabled) cancelPress();
  }, [cancelPress, disabled]);

  const handlePressIn = useCallback(() => {
    if (disabled || touchIdRef.current) return;
    touchIdRef.current = true;
    setPressed(true);
    onPressInRef.current();
  }, [disabled]);

  const handlePressOut = useCallback(() => cancelPress(), [cancelPress]);

  return (
    <Pressable
      testID="fire-btn"
      disabled={disabled}
      accessible
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.btn, disabled && styles.btnDisabled, pressed && !disabled && styles.btnPressed]}
    >
      <Text pointerEvents="none" style={[styles.text, disabled && styles.textDisabled]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(255, 60, 60, 0.8)',
    borderWidth: 4, borderColor: 'rgba(255, 120, 120, 0.9)',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#f00', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 10,
    elevation: 8
  },
  btnPressed: {
    backgroundColor: 'rgba(255, 30, 30, 0.95)',
    transform: [{ scale: 0.92 }]
  },
  btnDisabled: {
    backgroundColor: 'rgba(100, 30, 30, 0.8)',
    borderColor: 'rgba(150, 50, 50, 0.9)',
    shadowOpacity: 0,
  },
  text: {
    color: '#fff', fontWeight: '900', fontSize: 20, 
    textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 3
  },
  textDisabled: {
    color: '#ccc', textShadowColor: 'transparent'
  }
});