import { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";

import type { CameraStatus, LiveBattleCameraProps } from "./camera-types";
import { useI18n } from "@/hooks/useI18n";
import { cameraFacingLabel, uiText } from "@/lib/i18n";

function cameraError(error: unknown, t: (key: any) => string, locale: Parameters<typeof uiText>[0]): CameraStatus {
  const name = error instanceof DOMException ? error.name : "";

  if (name === "NotAllowedError" || name === "SecurityError") {
    return {
      state: "blocked",
      message: uiText(locale, "cameraPermissionDenied"),
    };
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") {
    return {
      state: "error",
      message: uiText(locale, "cameraUnavailable"),
    };
  }
  return {
    state: "error",
    message: uiText(locale, "cameraUnavailable"),
  };
}

function facingLabel(facing: "front" | "back") {
  return facing === "back" ? "Arka" : "Ön";
}

export default function LiveBattleCamera({
  onFrame,
  onStatus,
  restartKey,
  facing,
  onFacingUnavailable,
}: LiveBattleCameraProps) {
  const { locale, t } = useI18n();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const onFrameRef = useRef(onFrame);
  const onStatusRef = useRef(onStatus);
  const generationRef = useRef(0);
  const playingRef = useRef(false);
  const viewportRef = useRef({ width: 0, height: 0 });
  const [viewport, setViewport] = useState({ width: 0, height: 0 });

  onFrameRef.current = onFrame;
  onStatusRef.current = onStatus;
  viewportRef.current = viewport;

  const stopStream = useCallback(() => {
    playingRef.current = false;
    const stream = streamRef.current;
    streamRef.current = null;
    stream?.getTracks().forEach((track) => track.stop());
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const captureFrame = useCallback(() => {
    if (!onFrameRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const { width: viewportWidth, height: viewportHeight } = viewportRef.current;
    if (
      !playingRef.current ||
      !video ||
      !canvas ||
      video.readyState < 2 ||
      video.videoWidth === 0 ||
      video.videoHeight === 0 ||
      viewportWidth <= 0 ||
      viewportHeight <= 0
    ) {
      return;
    }

   const targetWidth = 160;
    const targetHeight = Math.max(1, Math.round((targetWidth * viewportHeight) / viewportWidth));
    const viewportAspect = viewportWidth / viewportHeight;
    const sourceAspect = video.videoWidth / video.videoHeight;
    let sourceWidth = video.videoWidth;
    let sourceHeight = video.videoHeight;
    let sourceX = 0;
    let sourceY = 0;

    if (sourceAspect > viewportAspect) {
      sourceWidth = sourceHeight * viewportAspect;
      sourceX = (video.videoWidth - sourceWidth) / 2;
    } else {
      sourceHeight = sourceWidth / viewportAspect;
      sourceY = (video.videoHeight - sourceHeight) / 2;
    }

    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) {
      return;
    }
    context.drawImage(
      video,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      targetWidth,
      targetHeight,
    );
    onFrameRef.current?.({
      width: targetWidth,
      height: targetHeight,
      data: context.getImageData(0, 0, targetWidth, targetHeight).data,
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    const start = async () => {
      const generation = ++generationRef.current;
      stopStream();
      if (document.visibilityState === "hidden") {
         onStatusRef.current({ state: "paused", message: t("waiting") });
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        onStatusRef.current({
          state: "error",
            message: uiText(locale, "cameraUnavailable"),
        });
        return;
      }

       onStatusRef.current({ state: "requesting", message: `${cameraFacingLabel(locale, facing)} · ${t("cameraAccess")}` });
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
           // `exact` intentionally prevents a browser from silently selecting
           // an unintended camera when the requested lens is unavailable.
           video: {
             facingMode: { exact: facing === "back" ? "environment" : "user" },
             width: { ideal: 1280 },
             height: { ideal: 720 },
           },
          audio: false,
        });
        if (cancelled || generation !== generationRef.current || document.hidden) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) {
          stopStream();
          return;
        }
        video.srcObject = stream;
        await video.play();
        if (cancelled || generation !== generationRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        stream.getVideoTracks().forEach((track) => {
          track.addEventListener("ended", () => {
            if (generation === generationRef.current && !cancelled) {
              stopStream();
              onStatusRef.current({ state: "error", message: uiText(locale, "cameraUnavailable") });
            }
          });
        });
        playingRef.current = true;
          onStatusRef.current({ state: "live", message: `${t("cameraReady")} · ${cameraFacingLabel(locale, facing)}` });
      } catch (error) {
        if (!cancelled && generation === generationRef.current) {
          stopStream();
           if (error instanceof DOMException && (error.name === "NotFoundError" || error.name === "OverconstrainedError")) {
             onFacingUnavailable?.(facing);
           }
            const status = cameraError(error, t, locale);
           onStatusRef.current({
             ...status,
             message: status.state === "error" && (error instanceof DOMException) && (error.name === "NotFoundError" || error.name === "OverconstrainedError")
                 ? `${uiText(locale, "cameraUnavailable")} · ${cameraFacingLabel(locale, facing)}`
               : status.message,
           });
        }
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        ++generationRef.current;
        stopStream();
         onStatusRef.current({ state: "paused", message: t("waiting") });
      } else {
        void start();
      }
    };

    void start();
    document.addEventListener("visibilitychange", handleVisibility);
    const timer = window.setInterval(captureFrame, 200);
    return () => {
      cancelled = true;
      ++generationRef.current;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibility);
      stopStream();
    };
   }, [captureFrame, facing, locale, restartKey, stopStream, t]);

  return (
    <View
      style={StyleSheet.absoluteFill}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setViewport((current) =>
          current.width === width && current.height === height ? current : { width, height },
        );
      }}
    >
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        style={videoStyle}
         aria-label={`${t("cameraReady")} · ${cameraFacingLabel(locale, facing)}`}
      />
      <canvas ref={canvasRef} style={hiddenCanvasStyle} aria-hidden />
    </View>
  );
}

const videoStyle = {
  position: "absolute" as const,
  width: "100%",
  height: "100%",
  objectFit: "cover" as const,
};

const hiddenCanvasStyle = { display: "none" };