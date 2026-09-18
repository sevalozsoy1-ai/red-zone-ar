import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import EconomyGate from "@/components/EconomyGate";
import { useGame } from "@/context/GameContext";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { useVisionModes } from "@/hooks/useVisionModes";
import { visionModeLabel } from "@/lib/i18n";
import {
  VISION_MODES,
  type VisionMode,
} from "@/lib/vision-modes";
import { cameraFacingLabel } from "@/lib/i18n";
import { rtlLayout } from "@/lib/rtl";
import { economyText } from "@/lib/economy-ui";
import { GENERIC_ACTION_COST_CENTS } from "@/lib/economy";

type Props = {
  activeMode: VisionMode;
  onModeChange: (mode: VisionMode) => void;
  cameraFacing?: "front" | "back";
  onFlipCamera?: () => void;
  onTestSound?: () => void;
};

function formatRemaining(expiresAt: number | undefined, now: number, expiryLabel: string, locked: string) {
  if (!expiresAt || expiresAt <= now) return locked;
  const hours = Math.min(24, Math.max(1, Math.ceil((expiresAt - now) / (60 * 60 * 1000))));
  return `${expiryLabel} ${hours}h`;
}

export function VisionModeControl({
  activeMode,
  onModeChange,
  cameraFacing,
  onFlipCamera,
  onTestSound,
}: Props) {
  const colors = useColors();
  const { locale, t, rtl } = useI18n();
  const {
    activeGold,
    creditCents,
    unlockVisionModeWithCredits,
  } = useGame();
  const {
    now,
    visionUnlocks,
    isUnlocked,
  } = useVisionModes(activeMode, onModeChange);
  const [pendingMode, setPendingMode] = useState<Exclude<VisionMode, "normal"> | null>(null);
  const [gateVisible, setGateVisible] = useState(false);
  const [notice, setNotice] = useState("");
  const [menuVisible, setMenuVisible] = useState(false);
  const observedModeRef = useRef(activeMode);

  useEffect(() => {
    if (activeMode !== "normal" && observedModeRef.current === activeMode && !isUnlocked(activeMode)) {
       setNotice(`${visionModeLabel(locale, activeMode)} · ${t("waiting")}`);
    }
    observedModeRef.current = activeMode;
  }, [activeMode, isUnlocked, locale, t]);

  useEffect(() => {
    if (notice) {
      const timer = setTimeout(() => setNotice(""), 3200);
      return () => clearTimeout(timer);
    }
  }, [notice]);

  const choose = (mode: VisionMode) => {
    if (mode === "normal" || isUnlocked(mode)) {
      setNotice("");
      setMenuVisible(false);
      onModeChange(mode);
      return;
    }
    setMenuVisible(false);
    if (activeGold || creditCents >= GENERIC_ACTION_COST_CENTS) {
      const result = unlockVisionModeWithCredits(mode);
      if (result.ok) {
        setNotice("");
        onModeChange(mode);
        return;
      }
      setNotice(result.message);
    }
    setPendingMode(mode);
  };

  const closeUnlock = () => {
    setPendingMode(null);
    setNotice("");
  };

  const unlockWithGate = () => {
    if (!pendingMode) return;
    setGateVisible(true);
  };

  return (
    <>
      <Pressable
        testID="vision-mode-control"
        accessibilityRole="button"
        accessibilityLabel={`${t("camera")}: ${visionModeLabel(locale, activeMode)}`}
        onPress={() => setMenuVisible(true)}
        style={[styles.menuButton, { backgroundColor: "rgba(5,16,14,0.84)", borderColor: colors.border }]}
      >
        <Feather
          name={activeMode === "normal" ? "eye" : activeMode === "nightVision" ? "moon" : "thermometer"}
          size={18}
          color={colors.cyan}
        />
        <Feather name="menu" size={13} color={colors.foreground} />
      </Pressable>

      <Modal testID="vision-mode-menu" visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        <View style={[styles.modalBackdrop, rtl && styles.rtl]}>
          <Pressable accessibilityLabel={t("close")} style={StyleSheet.absoluteFill} onPress={() => setMenuVisible(false)} />
          <View style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <View style={styles.barTitleRow}>
                <Feather name="eye" size={14} color={colors.cyan} />
                <View>
                  <Text style={[styles.barTitle, { color: colors.foreground }]}>{t("camera")}</Text>
                  <Text style={[styles.simulatedTag, { color: colors.amber }]}>{t("adSimulation")}</Text>
                </View>
              </View>
              <Pressable accessibilityLabel={t("close")} onPress={() => setMenuVisible(false)} style={styles.closeButton}>
                <Feather name="x" size={21} color={colors.foreground} />
              </Pressable>
            </View>
            <View style={styles.modeRow}>
              {VISION_MODES.map((mode) => {
                const unlocked = isUnlocked(mode);
                const selected = activeMode === mode && unlocked;
                return (
                  <Pressable
                    key={mode}
                    testID={`vision-mode-${mode}`}
                    accessibilityRole="button"
                    accessibilityLabel={`${visionModeLabel(locale, mode)}${unlocked ? "" : ` · ${t("waiting")}`}`}
                    onPress={() => choose(mode)}
                    style={[
                      styles.modeButton,
                      { borderColor: selected ? colors.cyan : colors.border, backgroundColor: selected ? "rgba(102,227,208,0.18)" : "rgba(0,0,0,0.22)" },
                    ]}
                  >
                    <Feather
                      name={mode === "normal" ? "eye" : mode === "nightVision" ? "moon" : "thermometer"}
                      size={14}
                      color={selected ? colors.cyan : unlocked ? colors.foreground : colors.mutedForeground}
                    />
                    <Text style={[styles.modeLabel, { color: selected ? colors.cyan : colors.foreground }]}>{visionModeLabel(locale, mode)}</Text>
                    {!unlocked && <Feather name="lock" size={10} color={colors.mutedForeground} />}
                    {unlocked && mode !== "normal" && <Text style={[styles.expiry, { color: colors.mutedForeground }]}>{formatRemaining(visionUnlocks[mode], now, economyText(locale, "economyExpiry"), t("waiting"))}</Text>}
                  </Pressable>
                );
              })}
            </View>
            {notice ? <Text style={[styles.notice, { color: colors.amber }]}>{notice}</Text> : null}

            {(onFlipCamera || onTestSound) ? (
              <View style={[styles.utilityRow, { borderTopColor: colors.border }]}>
                {onFlipCamera ? (
                   <Pressable testID="flip-camera-btn" accessibilityRole="button" accessibilityLabel={t("camera")} onPress={() => { setMenuVisible(false); onFlipCamera(); }} style={styles.utilityButton}>
                    <Feather name="refresh-cw" size={16} color={colors.foreground} />
                     <Text style={[styles.utilityLabel, { color: colors.foreground }]}>{cameraFacingLabel(locale, cameraFacing === "back" ? "front" : "back")}</Text>
                  </Pressable>
                ) : null}
                {onTestSound ? (
                    <Pressable testID="test-sound-btn" accessibilityRole="button" accessibilityLabel={t("soundTest")} onPress={() => { setMenuVisible(false); onTestSound(); }} style={styles.utilityButton}>
                    <Feather name="volume" size={16} color={colors.cyan} />
                      <Text style={[styles.utilityLabel, { color: colors.cyan }]}>{t("soundTest")}</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </View>
        </View>
      </Modal>

      <Modal visible={!!pendingMode} transparent animationType="fade" onRequestClose={closeUnlock}>
        <View style={[styles.modalBackdrop, rtl && styles.rtl]}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalKicker, { color: colors.amber }]}>{t("camera")} · {t("waiting")}</Text>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                  {pendingMode ? visionModeLabel(locale, pendingMode) : ""}
                </Text>
              </View>
              <Pressable accessibilityLabel={t("close")} onPress={closeUnlock} style={styles.closeButton}>
                <Feather name="x" size={21} color={colors.foreground} />
              </Pressable>
            </View>
            <Text style={[styles.modalBody, { color: colors.mutedForeground }]}>
              {pendingMode ? economyText(locale, "economyVision") : ""}
            </Text>
            <View style={[styles.disclaimer, { borderColor: colors.border, backgroundColor: colors.secondary }]}>
              <Feather name="info" size={15} color={colors.cyan} />
              <Text style={[styles.disclaimerText, { color: colors.mutedForeground }]}>
                {t("onDeviceProcessing")}
              </Text>
            </View>
            <Pressable accessibilityRole="button" onPress={unlockWithGate} style={[styles.unlockButton, { backgroundColor: colors.secondary, borderColor: colors.cyan }]}>
              <Feather name="play-circle" size={19} color={colors.cyan} />
              <View style={styles.buttonCopy}>
                <Text style={[styles.buttonTitle, { color: colors.cyan }]}>{economyText(locale, "economyVision")} · {economyText(locale, "economyAdValue")}</Text>
                <Text style={[styles.buttonSub, { color: colors.mutedForeground }]}>{economyText(locale, "economyGateBody")}</Text>
              </View>
            </Pressable>
            {notice ? <Text style={[styles.modalNotice, { color: colors.signal }]}>{notice}</Text> : null}
            <Text style={[styles.modalNote, { color: colors.mutedForeground }]}>
              {economyText(locale, "economyGateNoRefund")}
            </Text>
          </View>
        </View>
      </Modal>

      {pendingMode ? (
        <EconomyGate
          visible={gateVisible}
          action={pendingMode}
          title={visionModeLabel(locale, pendingMode)}
          body={economyText(locale, "economyVision")}
          onApproved={() => true}
          onComplete={() => {
            onModeChange(pendingMode);
            setGateVisible(false);
            closeUnlock();
          }}
          onCancel={() => setGateVisible(false)}
          testID={`vision-${pendingMode}-gate`}
        />
      ) : null}
    </>
  );
}

export function VisionModeOverlay({ mode }: { mode: VisionMode }) {
  const { locale, t } = useI18n();
  if (mode === "normal") return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {mode === "nightVision" ? (
        <>
          <View style={styles.nightOverlay} />
          <View style={styles.scanLines}>
            {Array.from({ length: 12 }, (_, index) => <View key={index} style={styles.scanLine} />)}
          </View>
          <View style={styles.nightVignette} />
          <View style={styles.modeBadge}><Feather name="moon" size={12} color="#baffbf" /><Text style={styles.modeBadgeText}>{visionModeLabel(locale, "nightVision")} · {t("adSimulation")}</Text></View>
        </>
      ) : (
        <>
          <LinearGradient
            colors={["rgba(13,31,121,0.45)", "rgba(17,155,181,0.3)", "rgba(255,192,46,0.36)", "rgba(224,47,30,0.3)"]}
            locations={[0, 0.35, 0.7, 1]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.thermalBands}>
            {Array.from({ length: 8 }, (_, index) => <View key={index} style={[styles.thermalBand, { opacity: 0.08 + index * 0.012 }]} />)}
          </View>
          <View style={styles.modeBadge}><Feather name="thermometer" size={12} color="#ffe9ae" /><Text style={styles.modeBadgeText}>{visionModeLabel(locale, "thermal")} · {t("adSimulation")}</Text></View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  menuButton: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 2 },
  rtl: rtlLayout,
  menuCard: { width: "100%", maxWidth: 430, alignSelf: "center", borderRadius: 22, borderWidth: 1, padding: 16 },
  modalHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  barHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  barTitleRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  barTitle: { fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  simulatedTag: { fontSize: 8, fontWeight: "900", letterSpacing: 0.7 },
  modeRow: { flexDirection: "row", gap: 5, marginTop: 14 },
  modeButton: { flex: 1, minHeight: 38, borderRadius: 8, borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingHorizontal: 3 },
  modeLabel: { fontSize: 9, fontWeight: "900", letterSpacing: 0.3 },
  expiry: { fontSize: 7, fontWeight: "800" },
  notice: { fontSize: 10, fontWeight: "800", textAlign: "center", marginTop: 6 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "center", padding: 20 },
  modalCard: { width: "100%", maxWidth: 430, alignSelf: "center", borderRadius: 22, borderWidth: 1, padding: 20 },
  modalKicker: { fontSize: 9, fontWeight: "900", letterSpacing: 1.4 },
  modalTitle: { fontSize: 24, fontWeight: "900", marginTop: 7 },
  closeButton: { minWidth: 42, minHeight: 42, alignItems: "center", justifyContent: "center" },
  utilityRow: { flexDirection: "row", borderTopWidth: 1, marginTop: 15, paddingTop: 12, gap: 6 },
  utilityButton: { flex: 1, minHeight: 44, borderRadius: 10, backgroundColor: "rgba(0,0,0,0.22)", alignItems: "center", justifyContent: "center", gap: 4, paddingHorizontal: 3 },
  utilityLabel: { fontSize: 8, fontWeight: "900", textAlign: "center" },
  modalBody: { fontSize: 13, lineHeight: 19, marginTop: 14 },
  disclaimer: { borderRadius: 10, borderWidth: 1, padding: 11, flexDirection: "row", alignItems: "flex-start", gap: 8, marginTop: 15 },
  disclaimerText: { flex: 1, fontSize: 11, lineHeight: 16 },
  unlockButton: { minHeight: 58, borderRadius: 13, borderWidth: 1, flexDirection: "row", alignItems: "center", paddingHorizontal: 13, gap: 11, marginTop: 12 },
  buttonCopy: { flex: 1 },
  buttonTitle: { fontSize: 11, fontWeight: "900", letterSpacing: 0.6 },
  buttonSub: { fontSize: 10, marginTop: 3 },
  modalNotice: { fontSize: 11, fontWeight: "800", textAlign: "center", marginTop: 10 },
  modalNote: { fontSize: 10, lineHeight: 15, textAlign: "center", marginTop: 15 },
  nightOverlay: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(20,130,50,0.27)" },
  scanLines: { ...StyleSheet.absoluteFill, justifyContent: "space-around", opacity: 0.24 },
  scanLine: { height: 1, backgroundColor: "#baffbf" },
  nightVignette: { ...StyleSheet.absoluteFill, borderWidth: 28, borderColor: "rgba(0,35,8,0.22)" },
  thermalBands: { ...StyleSheet.absoluteFill, justifyContent: "space-around", transform: [{ rotate: "-2deg" }], opacity: 0.7 },
  thermalBand: { height: 10, backgroundColor: "#ffd95a", marginHorizontal: -20 },
  modeBadge: { position: "absolute", top: "18%", alignSelf: "center", borderRadius: 6, borderWidth: 1, borderColor: "rgba(255,255,255,0.55)", backgroundColor: "rgba(0,0,0,0.62)", paddingHorizontal: 9, paddingVertical: 5, flexDirection: "row", alignItems: "center", gap: 5 },
  modeBadgeText: { color: "#fff", fontSize: 9, fontWeight: "900", letterSpacing: 0.8 },
});