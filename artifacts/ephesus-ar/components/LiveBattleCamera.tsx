import { decode } from "jpeg-js";
import { CameraView, useCameraPermissions } from "expo-camera";
import Constants from "expo-constants";
import * as FileSystem from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus, StyleSheet, View } from "react-native";

import type { LiveBattleCameraProps } from "./camera-types";
import { useI18n } from "@/hooks/useI18n";
import { cameraFacingLabel, uiText } from "@/lib/i18n";
import {
  CAMERA_PERFORMANCE_CONFIG,
  nextFasterCameraProfile,
  nextSlowerCameraProfile,
  selectCameraPerformanceProfile,
  type CameraPerformanceConfig,
} from "@/lib/camera-performance";

function choosePictureSize(sizes: string[], viewport: { width: number; height: number }, config: CameraPerformanceConfig) {
  const viewportAspect = viewport.width > 0 && viewport.height > 0
    ? viewport.width / viewport.height
    : 9 / 16;
  // Camera stills are normally reported in landscape sensor orientation even
  // while the app is portrait. Match the sensor aspect, not the cropped UI.
  const targetAspect = viewportAspect < 1 ? 1 / viewportAspect : viewportAspect;
  const parsed = sizes
    .map((size) => {
      const [width, height] = size.split("x").map(Number);
      return { size, width, height, area: width * height, aspect: width / height };
    })
    .filter((size) => size.width > 0 && size.height > 0 && Number.isFinite(size.area));
  if (!parsed.length) return undefined;

  const bounded = parsed.filter((size) => size.area >= config.minCaptureArea && size.area <= config.maxCaptureArea);
  const candidates = bounded.length ? bounded : parsed;
  return [...candidates].sort((left, right) => {
    const leftScore = Math.abs(Math.log(left.aspect / targetAspect)) * 3
      + Math.abs(left.area - config.targetCaptureArea) / config.targetCaptureArea;
    const rightScore = Math.abs(Math.log(right.aspect / targetAspect)) * 3
      + Math.abs(right.area - config.targetCaptureArea) / config.targetCaptureArea;
    return leftScore - rightScore;
  })[0]?.size;
}

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
  const availablePictureSizesRef = useRef<string[]>([]);
  const initialProfileRef = useRef(selectCameraPerformanceProfile(Constants.deviceYearClass));
  const [performanceProfile, setPerformanceProfile] = useState(initialProfileRef.current);
  const slowCaptureStreakRef = useRef(0);
  const fastCaptureStreakRef = useRef(0);
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraReady, setCameraReady] = useState(false);
  const [pictureSize, setPictureSize] = useState<string | undefined>();
  const [appActive, setAppActive] = useState(AppState.currentState === "active");

  onFrameRef.current = onFrame;
  onStatusRef.current = onStatus;

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
    };
  }, [permission?.granted, requestCamera, restartKey]);

  const capture = useCallback(async () => {
    if (!onFrameRef.current) return;
    if (
      !mountedRef.current ||
      !activeRef.current ||
      !readyRef.current ||
      capturingRef.current ||
      !cameraRef.current ||
      viewportRef.current.width <= 0 ||
      viewportRef.current.height <= 0
    ) {
      return;
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
        skipProcessing: false,
        shutterSound: false,
      });
      photoUri = photo.uri;
      if (generation !== generationRef.current || !activeRef.current) {
        return;
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
        return;
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
      await Promise.all(
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
    setPictureSize(undefined);
    if (permission?.granted && appActive) {
       onStatusRef.current({ state: "requesting", message: `${cameraFacingLabel(locale, facing)} · ${t("waiting")}` });
    }
  }, [appActive, facing, locale, permission?.granted, restartKey, t]);

  useEffect(() => {
    if (!availablePictureSizesRef.current.length) return;
    const selectedSize = choosePictureSize(
      availablePictureSizesRef.current,
      viewportRef.current,
      CAMERA_PERFORMANCE_CONFIG[performanceProfile],
    );
    if (selectedSize) setPictureSize(selectedSize);
  }, [performanceProfile]);

  useEffect(() => {
    if (!permission?.granted || !cameraReady || !activeRef.current) {
      return;
    }
    const timer = setInterval(() => void capture(), CAMERA_PERFORMANCE_CONFIG[performanceProfile].intervalMs);
    return () => clearInterval(timer);
  }, [cameraReady, capture, facing, performanceProfile, permission?.granted, restartKey]);

  return (
    <View
      style={StyleSheet.absoluteFill}
      onLayout={(event) => {
        viewportRef.current = event.nativeEvent.layout;
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
          // 0 is the unzoomed native lens position. Digital zoom belongs only
          // to the battle scope animation, not to the camera preview.
          zoom={0}
          // Expo 57's iOS "on" mode locks after one focus pass. Leave the
          // default/off mode so the rear and front lenses keep continuous AF.
          autofocus="off"
          pictureSize={pictureSize}
          // Do not force a ratio: Expo Go keeps the FILL preview while the
          // bounded analysis capture below crops to the actual viewport aspect.
          animateShutter={false}
          onCameraReady={() => {
            const generation = generationRef.current;
            void cameraRef.current?.getAvailablePictureSizesAsync().then((sizes) => {
              if (!mountedRef.current || generation !== generationRef.current) return;
              availablePictureSizesRef.current = sizes;
              const selectedSize = choosePictureSize(sizes, viewportRef.current, CAMERA_PERFORMANCE_CONFIG[performanceProfile]);
              if (selectedSize) setPictureSize(selectedSize);
              readyRef.current = true;
              setCameraReady(true);
               onStatusRef.current({ state: "live", message: `${t("cameraReady")} · ${cameraFacingLabel(locale, facing)}` });
            }).catch(() => {
              if (!mountedRef.current || generation !== generationRef.current) return;
              // Keep Expo's supported default if size discovery is unavailable.
              readyRef.current = true;
              setCameraReady(true);
               onStatusRef.current({ state: "live", message: `${t("cameraReady")} · ${cameraFacingLabel(locale, facing)}` });
            });
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