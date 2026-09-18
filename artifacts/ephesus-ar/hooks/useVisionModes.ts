import { useEffect, useMemo, useRef, useState } from "react";

import { useGame } from "@/context/GameContext";
import type { VisionMode } from "@/lib/vision-modes";

export function useVisionModes(activeMode: VisionMode, onModeChange: (mode: VisionMode) => void) {
  const { isVisionModeUnlocked, unlockVisionModeWithCredits, grantVisionModeFromAd, visionUnlocks } = useGame();
  const [now, setNow] = useState(() => Date.now());
  const onModeChangeRef = useRef(onModeChange);
  onModeChangeRef.current = onModeChange;

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const activeModeUnlocked = activeMode === "normal" || isVisionModeUnlocked(activeMode, now);
  const activeModeExpiredRef = useRef(false);
  useEffect(() => {
    if (activeMode !== "normal" && !activeModeUnlocked && !activeModeExpiredRef.current) {
      activeModeExpiredRef.current = true;
      onModeChangeRef.current("normal");
    } else if (activeModeUnlocked) {
      activeModeExpiredRef.current = false;
    }
  }, [activeMode, activeModeUnlocked]);

  const isUnlocked = useMemo(
    () => (mode: VisionMode) => mode === "normal" || isVisionModeUnlocked(mode, now),
    [isVisionModeUnlocked, now],
  );

  return {
    now,
    visionUnlocks,
    isUnlocked,
    activeModeUnlocked,
    unlockVisionModeWithCredits,
    grantVisionModeFromAd,
  };
}