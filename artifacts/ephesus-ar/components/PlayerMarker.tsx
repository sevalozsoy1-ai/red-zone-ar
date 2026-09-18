import { StyleSheet, Text, View } from "react-native";

export default function PlayerMarker({ color, markerId, compact = false }: { color: string; markerId: number; compact?: boolean }) {
  return (
    <View style={[styles.outer, compact && styles.compactOuter, { borderColor: color, backgroundColor: `${color}33` }]}>
      <View style={[styles.inner, compact && styles.compactInner, { backgroundColor: color }]}>
        <Text style={[styles.text, compact && styles.compactText]}>{markerId + 1}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { width: 86, height: 86, borderRadius: 22, borderWidth: 7, alignItems: "center", justifyContent: "center" },
  inner: { width: 54, height: 54, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  text: { color: "#07110F", fontSize: 28, fontWeight: "900" },
  compactOuter: { width: 48, height: 48, borderRadius: 13, borderWidth: 4 },
  compactInner: { width: 30, height: 30, borderRadius: 8 },
  compactText: { fontSize: 16 },
});