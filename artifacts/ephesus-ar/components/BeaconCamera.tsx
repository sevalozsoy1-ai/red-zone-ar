import { requireNativeComponent, StyleSheet, UIManager, View, Platform, type StyleProp, type ViewStyle } from "react-native";
import { useCameraPermissions } from "expo-camera";
import { useEffect } from "react";
import LiveBattleCamera from "./LiveBattleCamera";
import type { CameraStatus } from "./camera-types";

type NativeProps = {
  style?: StyleProp<ViewStyle>;
  ownBeaconId: number;
  enabled: boolean;
  zoomRatio: number;
  onBeaconDetected?: (event: { nativeEvent: { markerId: number; confidence: number } }) => void;
  onCameraStatus?: (event: { nativeEvent: { state: CameraStatus["state"]; message: string } }) => void;
};

// The Replit Android simulation runs in Expo Go, which does not contain our
// app-specific native view. Never register a missing view: React Native throws
// before the camera screen can show a useful explanation.
const nativeCameraAvailable = Platform.OS === "android"
  && !!UIManager.getViewManagerConfig("RedZoneBeaconCamera");
const NativeBeaconCamera = nativeCameraAvailable
  ? requireNativeComponent<NativeProps>("RedZoneBeaconCamera") : null;

export default function BeaconCamera({
  ownBeaconId,
  enabled,
  zoomRatio,
  onBeaconDetected,
  onStatus,
  restartKey,
}: {
  ownBeaconId: number;
  enabled: boolean;
  zoomRatio: number;
  onBeaconDetected: (markerId: number, confidence: number) => void;
  onStatus: (status: CameraStatus) => void;
  restartKey: number;
}) {
  const [permission, requestPermission] = useCameraPermissions();
  useEffect(() => {
    if (Platform.OS === "android" && !nativeCameraAvailable) return;
    if (!permission?.granted) void requestPermission();
  }, [permission?.granted, requestPermission, restartKey]);
  useEffect(() => {
    if (Platform.OS === "android" && !nativeCameraAvailable) {
      onStatus({
        state: "unsupported",
        message: "Bu önizleme özel oda kamerasını içermiyor. Arka flaşla hedefleme yalnızca uygulamanın Android sürümünde çalışır.",
      });
      return;
    }
    if (!permission?.granted) onStatus({ state: "requesting", message: "Arka kamera izni bekleniyor" });
  }, [onStatus, permission?.granted]);

  if (Platform.OS !== "android") {
    return (
      <LiveBattleCamera
        onStatus={onStatus}
        restartKey={restartKey}
        facing="back"
        flashlightEnabled={false}
      />
    );
  }

  if (!NativeBeaconCamera) {
    return <View style={StyleSheet.absoluteFill} />;
  }

  if (!permission?.granted) {
    return <View style={StyleSheet.absoluteFill} />;
  }

  return (
    <NativeBeaconCamera
      key={restartKey}
      style={StyleSheet.absoluteFill}
      ownBeaconId={ownBeaconId}
      enabled={enabled}
      zoomRatio={zoomRatio}
      onBeaconDetected={(event) => {
        const { markerId, confidence } = event.nativeEvent;
        onBeaconDetected(markerId, confidence);
      }}
      onCameraStatus={(event) => onStatus(event.nativeEvent)}
    />
  );
}