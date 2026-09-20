import { decode } from "jpeg-js";
import { CameraView, useCameraPermissions } from "expo-camera";
import Constants from "expo-constants";
import * as FileSystem from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Platform, type AppStateStatus, StyleSheet, View } from "react-native";

import type { LiveBattleCameraProps } from "./camera-types";
import {
  canCommitTorchTimeout,
  canPulseCameraTorch,
  invalidateCameraTorch,
  isPostMountFireSignal,
} from "@/lib/camera-torch";
import { useI18n } from "@/hooks/useI18n";
import { cameraFacingLabel, uiText } from "@/lib/i18n";
import {
  CAMERA_PERFORMANCE_CONFIG,
  chooseAnalysisPictureSize,
  nextCameraCaptureDelayMs,
  nextFasterCameraProfile,
  nextSlowerCameraProfile,
  selectCameraPerformanceProfile,
} from "@/lib/camera-performance";

function base64ToBytes(base64: string): Uint8Array {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const clean = base64.replace(/[^A-Za-z0-9+/]/g, "");
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const character of clean) {
    buffer = (buffer << 6) | alphabet.indexOf(character);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }
  return new Uint8Array(bytes);
}

export default function LiveBattleCamera({
  onFrame,
  onStatus,
  restartKey,
  facing,
  onFacingUnavailable,
  fireSignal,
}: LiveBattleCameraProps) {
  const { locale, t } = useI18n();
  const cameraRef = useRef<CameraView | null>(null);
  const onFrameRef = useRef(onFrame);
  const onStatusRef = useRef(onStatus);
  const mountedRef = useRef(true);
  const readyRef = useRef(false);
  const capturingRef = useRef(false);
  const generationRef = useRef(0);
  const requestedKeyRef = useRef<number | null>(null);
  const activeRef = useRef(AppState.currentState === "active");
  const viewportRef = useRef({ width: 0, height: 0 });
  const initialProfileRef = useRef(selectCameraPerformanceProfile(Constants.deviceYearClass));
  const [performanceProfile, setPerformanceProfile] = useState(initialProfileRef.current);
  const slowCaptureStreakRef = useRef(0);
  const fastCaptureStreakRef = useRef(0);
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraReady, setCameraReady] = useState(false);
  const [layoutReady, setLayoutReady] = useState(false);
  const [pictureSize, setPictureSize] = useState<string | undefined>();
  const pictureSizeConfiguredRef = useRef(false);
  const [appActive, setAppActive] = useState(AppState.currentState === "active");
  const [torchEnabled, setTorchEnabled] = useState(false);
  const torchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const torchGenerationRef = useRef(0);
  const torchLifecycleRef = useRef({ generation: 0, enabled: false });
  const lastFireSignalRef = useRef<number | undefined>(fireSignal);

  onFrameRef.current = onFrame;
  onStatusRef.current = onStatus;

  const invalidateTorch = useCallback(() => {
    if (torchTimerRef.current) clearTimeout(torchTimerRef.current);
    torchTimerRef.current = null;
    const next = invalidateCameraTorch(torchLifecycleRef.current);
    torchLifecycleRef.current = next;
    torchGenerationRef.current = next.generation;
    setTorchEnabled(false);
  }, []);

  const pulseTorch = useCallback(() => {
    // A torch is an optional camera capability, not a separate permission.
    // Never let an unsupported HAL or a front-facing camera affect gameplay.
    if (!canPulseCameraTorch({
      platform: Platform.OS === "web" ? "web" : Platform.OS === "android" ? "android" : Platform.OS === "ios" ? "ios" : "other",
      facing,
      permissionGranted: !!permission?.granted,
      mounted: mountedRef.current,
    })) return;
    try {
      const generation = torchGenerationRef.current;
      torchLifecycleRef.current = { generation, enabled: true };
      setTorchEnabled(true);
      if (torchTimerRef.current) clearTimeout(torchTimerRef.current);
      torchTimerRef.current = setTimeout(() => {
        if (!canCommitTorchTimeout(generation, torchLifecycleRef.current, mountedRef.current)) return;
        try {
          torchLifecycleRef.current = { generation, enabled: false };
          setTorchEnabled(false);
        } catch {
          // Some camera HALs throw while changing torch state during teardown.
        }
      }, 90);
    } catch {
      setTorchEnabled(false);
    }
  }, [facing, permission?.granted]);

  // Invalidate before processing the signal effect so a remount or camera
  // switch cannot leave the previous CameraView torch state enabled.
  useEffect(() => {
    invalidateTorch();
  }, [appActive, facing, permission?.granted, restartKey, invalidateTorch]);

  useEffect(() => {
    const previous = lastFireSignalRef.current;
    lastFireSignalRef.current = fireSignal;
    if (!isPostMountFireSignal(previous, fireSignal)) return;
    pulseTorch();
  }, [fireSignal, pulseTorch]);

  const requestCamera = useCallback(async () => {
    onStatusRef.current({ state: "requesting", message: `${t("cameraAccess")} · ${t("waiting")}` });
    try {
      const result = await requestPermission();
      if (!mountedRef.current) return;
      if (!result.granted) {
        onStatusRef.current({
          state: "blocked",
             message: uiText(locale, "cameraUnavailable"),
        });
      }
    } catch {
      if (mountedRef.current) onStatusRef.current({ state: "error", message: uiText(locale, "cameraUnavailable") });
    }
  }, [requestPermission, t]);

  useEffect(() => {
    mountedRef.current = true;
    if (!permission?.granted && requestedKeyRef.current !== restartKey) {
      requestedKeyRef.current = restartKey;
      void requestCamera();
    }
    return () => {
      mountedRef.current = false;
      invalidateTorch();
    };
  }, [permission?.granted, requestCamera, restartKey, invalidateTorch]);

  const capture = useCallback(async (): Promise<number | null> => {
    if (!onFrameRef.current) return null;
    if (
      !mountedRef.current ||
      !activeRef.current ||
      !readyRef.current ||
      capturingRef.current ||
      !cameraRef.current ||
      viewportRef.current.width <= 0 ||
      viewportRef.current.height <= 0
    ) {
      return null;
    }
    capturingRef.current = true;
    const startedAt = Date.now();
    const performanceConfig = CAMERA_PERFORMANCE_CONFIG[performanceProfile];
    const generation = generationRef.current;
    let photoUri: string | undefined;
    let resizedUri: string | undefined;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: false,
        quality: performanceConfig.photoQuality,
        // Keep Expo's native/EXIF orientation normalization. Without it,
        // Android sensor orientation can rotate the crop and move the marker
        // away from the user's aim, especially on Huawei camera HALs.
        skipProcessing: false,
        shutterSound: false,
      });
      photoUri = photo.uri;
      if (generation !== generationRef.current || !activeRef.current) {
        return null;
      }
      const targetAspect = viewportRef.current.width / viewportRef.current.height;
      const sourceAspect = photo.width / photo.height;
      const cropWidth = Math.floor(sourceAspect > targetAspect ? photo.height * targetAspect : photo.width);
      const cropHeight = Math.floor(sourceAspect > targetAspect ? photo.height : photo.width / targetAspect);
      const resized = await ImageManipulator.manipulateAsync(
        photo.uri,
        [
          {
            crop: {
              originX: Math.max(0, Math.floor((photo.width - cropWidth) / 2)),
              originY: Math.max(0, Math.floor((photo.height - cropHeight) / 2)),
              width: cropWidth,
              height: cropHeight,
            },
          },
          { resize: { width: performanceConfig.frameWidth } },
        ],
        { base64: true, compress: performanceConfig.jpegCompression, format: ImageManipulator.SaveFormat.JPEG },
      );
      resizedUri = resized.uri;
      if (generation !== generationRef.current || !activeRef.current) {
        return null;
      }
      if (!resized.base64) {
         throw new Error(t("errorMessage"));
      }
      const decoded = decode(base64ToBytes(resized.base64), {
        useTArray: true,
        formatAsRGBA: true,
      });
      if (mountedRef.current && activeRef.current && generation === generationRef.current) {
        onFrameRef.current?.({
          width: decoded.width,
          height: decoded.height,
          data: decoded.data,
        });
      }
    } catch (error) {
      if (mountedRef.current && activeRef.current && generation === generationRef.current) {
        readyRef.current = false;
        setCameraReady(false);
        onStatusRef.current({
          state: "error",
           message: uiText(locale, "cameraUnavailable"),
        });
      }
    } finally {
      capturingRef.current = false;
      // Temporary files are not part of the next-frame critical path. Waiting
      // for storage cleanup here serialized native camera captures and made
      // the preview appear to lag under pressure.
      void Promise.all(
        [photoUri, resizedUri].filter((uri): uri is string => !!uri).map((uri) =>
          FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => undefined),
        ),
      );
      const elapsed = Date.now() - startedAt;
      if (elapsed >= performanceConfig.intervalMs * 0.85) {
        fastCaptureStreakRef.current = 0;
        slowCaptureStreakRef.current += 1;
        if (slowCaptureStreakRef.current >= 2) {
          slowCaptureStreakRef.current = 0;
          setPerformanceProfile((current) => nextSlowerCameraProfile(current));
        }
      } else if (elapsed <= performanceConfig.intervalMs * 0.45) {
        slowCaptureStreakRef.current = 0;
        fastCaptureStreakRef.current += 1;
        if (fastCaptureStreakRef.current >= 10) {
          fastCaptureStreakRef.current = 0;
          setPerformanceProfile((current) => nextFasterCameraProfile(current, initialProfileRef.current));
        }
      } else {
        slowCaptureStreakRef.current = 0;
        fastCaptureStreakRef.current = 0;
      }
      return elapsed;
    }
   }, [locale, performanceProfile, t]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState: AppStateStatus) => {
      ++generationRef.current;
      activeRef.current = nextState === "active";
      setAppActive(activeRef.current);
      if (!activeRef.current) {
        readyRef.current = false;
        setCameraReady(false);
         onStatusRef.current({ state: "paused", message: t("waiting") });
      }
    });
    return () => subscription.remove();
  }, [t]);

  useEffect(() => {
    ++generationRef.current;
    readyRef.current = false;
    setCameraReady(false);
    setLayoutReady(false);
    pictureSizeConfiguredRef.current = false;
    setPictureSize(undefined);
    if (permission?.granted && appActive) {
       onStatusRef.current({ state: "requesting", message: `${cameraFacingLabel(locale, facing)} · ${t("waiting")}` });
    }
  }, [appActive, facing, locale, permission?.granted, restartKey, t]);

  useEffect(() => {
    if (
      !permission?.granted ||
      !cameraReady ||
      !layoutReady ||
      !activeRef.current ||
      pictureSizeConfiguredRef.current
    ) {
      return;
    }

    const generation = generationRef.current;
    void cameraRef.current?.getAvailablePictureSizesAsync().then((sizes) => {
      if (!mountedRef.current || generation !== generationRef.current) return;
      const selectedSize = chooseAnalysisPictureSize(sizes, viewportRef.current);
      pictureSizeConfiguredRef.current = true;
      if (selectedSize) {
        // The only intentional still-mode rebind in a camera session.
        setPictureSize(selectedSize);
        readyRef.current = true;
      } else {
        // Do not select a muddy 640x480 fallback when this HAL has no
        // bounded 1080p-class mode; retain Expo's validated native default.
        readyRef.current = true;
      }
    }).catch(() => {
      if (!mountedRef.current || generation !== generationRef.current) return;
      pictureSizeConfiguredRef.current = true;
      readyRef.current = true;
    });
  }, [cameraReady, layoutReady, permission?.granted]);

  useEffect(() => {
    if (!permission?.granted || !cameraReady || !activeRef.current) {
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const scheduleNextCapture = (delayMs: number) => {
      if (cancelled) return;
      timer = setTimeout(async () => {
        if (cancelled) return;
        const elapsed = await capture();
        if (cancelled) return;
        const delay = elapsed === null
          ? CAMERA_PERFORMANCE_CONFIG[performanceProfile].intervalMs
          : nextCameraCaptureDelayMs(performanceProfile, elapsed);
        scheduleNextCapture(delay);
      }, delayMs);
    };

    scheduleNextCapture(0);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [cameraReady, capture, facing, performanceProfile, permission?.granted, restartKey]);

  return (
    <View
      style={StyleSheet.absoluteFill}
      onLayout={(event) => {
        viewportRef.current = event.nativeEvent.layout;
        setLayoutReady(event.nativeEvent.layout.width > 0 && event.nativeEvent.layout.height > 0);
      }}
    >
      {permission?.granted && appActive ? (
        <CameraView
          key={`${restartKey}-${appActive ? "active" : "paused"}`}
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          // Expo Camera defaults to the rear camera, but keep this explicit so
          // the first launch prefers it while tablets can switch to selfie mode.
          facing={facing}
          enableTorch={facing === "back" && torchEnabled}
          // 0 is the unzoomed native lens position. Digital zoom belongs only
          // to the battle scope animation, not to the camera preview.
          zoom={0}
           // Use one stable, bounded still mode for analysis. This is selected
           // only after layout/readiness and never changes with the profile.
          autofocus={Platform.OS === "android" ? "on" : "off"}
           pictureSize={pictureSize}
          animateShutter={false}
          onCameraReady={() => {
            const generation = generationRef.current;
             if (!mountedRef.current || generation !== generationRef.current) return;
              // Wait for the one-time analysis-size selection. A callback
              // after that intentional rebind releases the capture gate.
              readyRef.current = pictureSizeConfiguredRef.current;
             setCameraReady(true);
             onStatusRef.current({ state: "live", message: `${t("cameraReady")} · ${cameraFacingLabel(locale, facing)}` });
          }}
          onMountError={() => {
            readyRef.current = false;
            setCameraReady(false);
            onFacingUnavailable?.(facing);
            onStatusRef.current({
              state: "error",
                message: uiText(locale, "cameraUnavailable"),
            });
          }}
        />
      ) : null}
    </View>
  );
}