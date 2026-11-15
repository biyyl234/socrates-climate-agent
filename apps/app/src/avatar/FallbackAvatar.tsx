/**
 * L4 fallback placeholder: shown when the avatar URL is unconfigured, the
 * bundle fails to load, or the bridge reports a non-recoverable error. The
 * conversation text remains fully usable in this state.
 */
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import type { AvatarLevel } from "@socrates/core";

interface Props {
  level: AvatarLevel;
  message?: string | null;
}

export function FallbackAvatar({ level, message }: Props) {
  const theme = useTheme();
  const label = level >= 4 ? "L4 文字态" : `L${level} 降级态`;
  return (
    <View
      style={[
        styles.wrap,
        { backgroundColor: theme.c.surfaceAlt, borderColor: theme.c.border },
      ]}
      accessibilityRole="image"
      accessibilityLabel="苏格拉底虚拟人（降级占位）"
    >
      <View
        style={[
          styles.orb,
          { backgroundColor: theme.c.primarySoft, borderColor: theme.c.primary },
        ]}
      >
        <Text style={[styles.initial, { color: theme.c.primary }]}>苏</Text>
      </View>
      <Text style={[theme.font("sm"), { color: theme.c.textSecondary }]}>{label}</Text>
      {message ? (
        <Text style={[theme.font("xs"), { color: theme.c.textTertiary }]} numberOfLines={2}>
          {message}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  orb: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  initial: {
    fontSize: 32,
    fontFamily: '"Noto Serif SC", Georgia, serif',
  },
});
