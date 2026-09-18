import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import { GestureResponderEvent, StyleSheet, View, useWindowDimensions } from 'react-native';
import { aimOffsetForScreenPoint } from '@/lib/aim';

export interface AimTouchLayerRef {
  cancel: () => void;
}

type Props = {
  onAim: (x: number, y: number) => void;
  disabled?: boolean;
};

const AimTouchLayer = forwardRef<AimTouchLayerRef, Props>(({ onAim, disabled = false }, ref) => {
  const { width, height } = useWindowDimensions();
  const touchIdRef = useRef<number | string | null>(null);
  const onAimRef = useRef(onAim);
  onAimRef.current = onAim;

  const cancel = useCallback(() => {
    touchIdRef.current = null;
  }, []);

  useImperativeHandle(ref, () => ({ cancel }), [cancel]);
  useEffect(() => cancel, [cancel]);

  const findOwnedTouch = useCallback((event: GestureResponderEvent) => {
    const touchId = touchIdRef.current;
    if (touchId === null) return undefined;
    return event.nativeEvent.changedTouches.find((touch) => touch.identifier === touchId);
  }, []);

  const handleTouchStart = useCallback((event: GestureResponderEvent) => {
    if (disabled || touchIdRef.current !== null) return;
    const touch = event.nativeEvent.changedTouches[0];
    if (!touch) return;
    touchIdRef.current = touch.identifier;
    const offset = aimOffsetForScreenPoint(touch.locationX, touch.locationY, width, height);
    onAimRef.current(offset.x, offset.y);
  }, [disabled, height, width]);

  const handleTouchMove = useCallback((event: GestureResponderEvent) => {
    const touch = findOwnedTouch(event);
    if (!touch) return;
    const offset = aimOffsetForScreenPoint(touch.locationX, touch.locationY, width, height);
    onAimRef.current(offset.x, offset.y);
  }, [findOwnedTouch, height, width]);

  const handleTouchEnd = useCallback((event: GestureResponderEvent) => {
    if (findOwnedTouch(event)) cancel();
  }, [cancel, findOwnedTouch]);

  return (
    <View
      pointerEvents={disabled ? 'none' : 'box-only'}
      testID="camera-aim-layer"
      style={styles.layer}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    />
  );
});

AimTouchLayer.displayName = 'AimTouchLayer';

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFill,
  },
});

export default AimTouchLayer;