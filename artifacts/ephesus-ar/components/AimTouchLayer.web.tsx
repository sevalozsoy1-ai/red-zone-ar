import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
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
  const pointerIdRef = useRef<number | null>(null);
  const onAimRef = useRef(onAim);
  onAimRef.current = onAim;

  const cancel = useCallback(() => {
    pointerIdRef.current = null;
  }, []);

  useImperativeHandle(ref, () => ({ cancel }), [cancel]);
  useEffect(() => cancel, [cancel]);

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLElement>) => {
    if (disabled || pointerIdRef.current !== null) return;
    pointerIdRef.current = event.pointerId;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Synthetic events and browsers without pointer capture still receive
      // the full-screen move stream; real touch pointers are captured above.
    }
    const offset = aimOffsetForScreenPoint(event.clientX, event.clientY, width, height);
    onAimRef.current(offset.x, offset.y);
  }, [disabled, height, width]);

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLElement>) => {
    if (event.pointerId !== pointerIdRef.current) return;
    const offset = aimOffsetForScreenPoint(event.clientX, event.clientY, width, height);
    onAimRef.current(offset.x, offset.y);
  }, [height, width]);

  const handlePointerEnd = useCallback((event: React.PointerEvent<HTMLElement>) => {
    if (event.pointerId === pointerIdRef.current) cancel();
  }, [cancel]);

  const pointerHandlers = {
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerEnd,
    onPointerCancel: handlePointerEnd,
    onLostPointerCapture: handlePointerEnd,
  } as unknown as React.ComponentProps<typeof View>;

  return <View {...pointerHandlers} pointerEvents={disabled ? 'none' : 'box-only'} testID="camera-aim-layer" style={styles.layer} />;
});

AimTouchLayer.displayName = 'AimTouchLayer';

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFill,
    touchAction: 'none',
  },
});

export default AimTouchLayer;