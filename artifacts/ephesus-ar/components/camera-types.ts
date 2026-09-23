export type CameraFrame = {
  width: number;
  height: number;
  data: Uint8Array | Uint8ClampedArray;
};

export type CameraStatus = {
  state: "requesting" | "live" | "blocked" | "error" | "paused" | "unsupported";
  message: string;
};

export type LiveBattleCameraProps = {
  onFrame?: (frame: CameraFrame) => void;
  onFlashObservation?: (observation: { observedAt: number; confidence: number }) => void;
  onStatus: (status: CameraStatus) => void;
  restartKey: number;
  facing: "front" | "back";
  onFacingUnavailable?: (facing: "front" | "back") => void;
  fireSignal?: number;
  flashlightEnabled?: boolean;
};