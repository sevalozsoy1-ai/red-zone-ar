import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, Modal } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { uiText } from "@/lib/i18n";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown, useReducedMotion } from "react-native-reanimated";

interface TargetSetupTutorialProps {
  visible: boolean;
  playerNumber: string | number;
  onClose: () => void;
}

export default function TargetSetupTutorial({ visible, playerNumber, onClose }: TargetSetupTutorialProps) {
  const colors = useColors();
  const { locale, rtl } = useI18n();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (visible) setStep(0);
  }, [visible]);

  if (!visible) return null;

  const maxSteps = 4;
  const isLast = step === maxSteps - 1;

  const handleNext = () => {
    if (isLast) onClose();
    else setStep((s) => s + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  const renderVisual = () => {
    switch (step) {
      case 0:
        return (
          <View style={styles.visualWrap}>
            <Feather name="file-text" size={72} color={colors.cyan} />
            <Feather name="monitor" size={48} color={colors.mutedForeground} style={styles.subIcon} />
          </View>
        );
      case 1:
        return (
          <View style={styles.visualWrap}>
            <Feather name="printer" size={72} color={colors.amber} />
            <View style={[styles.badge, { backgroundColor: colors.background, borderColor: colors.amber }]}>
              <Text style={[styles.badgeText, { color: colors.amber }]}>100%</Text>
            </View>
          </View>
        );
      case 2:
        return (
          <View style={styles.visualWrap}>
            <View style={[styles.cardCut, { borderColor: colors.border }]}>
              <Text style={[styles.cardCutText, { color: colors.foreground }]}>{uiText(locale, "assignedPlayer")}</Text>
              <Text style={[styles.cardCutNumber, { color: colors.cyan }]}>{playerNumber}</Text>
            </View>
            <Feather name="scissors" size={32} color={colors.mutedForeground} style={styles.scissors} />
          </View>
        );
      case 3:
        return (
          <View style={styles.visualWrap}>
            <View style={[styles.phoneMock, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <View style={[styles.phoneCamera, { backgroundColor: colors.signal }]} />
              <View style={[styles.attachedCard, { backgroundColor: colors.cyan }]}>
                <Text style={[styles.attachedCardText, { color: colors.ink }]}>{playerNumber}</Text>
              </View>
            </View>
            <View style={[styles.warningBox, { borderColor: colors.signal }]}>
              <Feather name="alert-triangle" size={16} color={colors.signal} />
              <Text style={[styles.warningText, { color: colors.signal }]}>{uiText(locale, "tutorialCameraWarning")}</Text>
            </View>
          </View>
        );
    }
    return null;
  };

  const stepKeys = ["tutorialStep1", "tutorialStep2", "tutorialStep3", "tutorialStep4"] as const;
  const currentKey = stepKeys[step];

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} accessibilityViewIsModal>
      <View style={[styles.overlay, { backgroundColor: "rgba(0,0,0,0.8)" }]}>
        <Animated.View
          entering={reducedMotion ? FadeIn : SlideInDown.duration(300)}
          exiting={reducedMotion ? FadeOut : SlideOutDown.duration(200)}
          style={[styles.modalContent, { backgroundColor: colors.card, paddingBottom: Math.max(insets.bottom, 24) }]}
        >
          <View style={styles.header}>
            <Text accessibilityRole="header" style={[styles.title, { color: colors.foreground }]}>{uiText(locale, "tutorialTitle")}</Text>
            <Pressable
              testID="tutorial-skip-btn"
              accessibilityRole="button"
              accessibilityLabel={uiText(locale, "tutorialSkip")}
              onPress={onClose}
              style={styles.skipBtn}
            >
              <Text style={[styles.skipText, { color: colors.mutedForeground }]}>{uiText(locale, "tutorialSkip")}</Text>
            </Pressable>
          </View>

          <View
            accessibilityRole="progressbar"
            accessibilityLabel={`${step + 1} / ${maxSteps}`}
            accessibilityValue={{ min: 1, max: maxSteps, now: step + 1 }}
            style={styles.progressRow}
          >
            {Array.from({ length: maxSteps }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  { backgroundColor: i <= step ? colors.cyan : colors.border },
                ]}
              />
            ))}
          </View>

          <View style={styles.body}>
            {renderVisual()}
            <Text
              accessibilityRole="text"
              accessibilityLiveRegion="polite"
              style={[styles.stepText, { color: colors.foreground }]}
            >
              {uiText(locale, currentKey)}
              {step >= 2 ? ` · ${uiText(locale, "assignedPlayer")} ${playerNumber}` : ""}
            </Text>
          </View>

          <View style={[styles.footer, rtl && styles.rtlFooter]}>
            <Pressable
              testID="tutorial-back-btn"
              accessibilityRole="button"
              accessibilityLabel={uiText(locale, "tutorialBack")}
              accessibilityState={{ disabled: step === 0 }}
              onPress={handleBack}
              disabled={step === 0}
              style={[styles.btn, step === 0 && styles.disabled]}
            >
              {step > 0 ? (
                <Text style={[styles.btnText, { color: colors.mutedForeground }]}>{uiText(locale, "tutorialBack")}</Text>
              ) : <View />}
            </Pressable>

            <Pressable
              testID="tutorial-next-btn"
              accessibilityRole="button"
              accessibilityLabel={uiText(locale, isLast ? "tutorialDone" : "tutorialNext")}
              onPress={handleNext}
              style={[styles.primaryBtn, { backgroundColor: colors.cyan }]}
            >
              <Text style={[styles.primaryText, { color: colors.ink }]}>{uiText(locale, isLast ? "tutorialDone" : "tutorialNext")}</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    letterSpacing: -0.5,
  },
  skipBtn: {
    padding: 8,
    marginRight: -8,
  },
  skipText: {
    fontSize: 14,
    fontWeight: "500",
  },
  progressRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 32,
  },
  dot: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  body: {
    alignItems: "center",
    minHeight: 220,
    marginBottom: 32,
  },
  visualWrap: {
    height: 120,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  subIcon: {
    position: "absolute",
    bottom: 10,
    right: "30%",
  },
  badge: {
    position: "absolute",
    top: 20,
    right: "30%",
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: "700",
  },
  cardCut: {
    width: 140,
    height: 80,
    borderWidth: 2,
    borderStyle: "dashed",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  cardCutText: {
    fontSize: 10,
    fontWeight: "600",
    marginBottom: 4,
  },
  cardCutNumber: {
    fontSize: 24,
    fontWeight: "800",
  },
  scissors: {
    position: "absolute",
    bottom: -10,
    right: "25%",
  },
  phoneMock: {
    width: 80,
    height: 160,
    borderWidth: 2,
    borderRadius: 16,
    alignItems: "center",
  },
  phoneCamera: {
    width: 24,
    height: 24,
    borderRadius: 8,
    marginTop: 12,
    alignSelf: "flex-start",
    marginLeft: 12,
  },
  attachedCard: {
    width: 48,
    height: 32,
    borderRadius: 4,
    marginTop: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  attachedCardText: {
    fontSize: 14,
    fontWeight: "800",
  },
  warningBox: {
    position: "absolute",
    bottom: -10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "rgba(0,0,0,0.8)",
  },
  warningText: {
    fontSize: 12,
    fontWeight: "600",
  },
  stepText: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rtlFooter: {
    flexDirection: "row-reverse",
  },
  btn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  disabled: {
    opacity: 0,
  },
  btnText: {
    fontSize: 16,
    fontWeight: "600",
  },
  primaryBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  primaryText: {
    fontSize: 16,
    fontWeight: "700",
  },
});
