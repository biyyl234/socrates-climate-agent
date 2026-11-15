import { ActivityIndicator, Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";

type Variant = "primary" | "secondary" | "ghost" | "danger";

interface Props {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}

export function Button({ title, onPress, variant = "primary", disabled, loading, style }: Props) {
  const theme = useTheme();

  const palette: Record<Variant, { bg: string; fg: string; border: string }> = {
    primary: { bg: theme.c.primary, fg: "#FFFFFF", border: theme.c.primary },
    secondary: { bg: theme.c.secondarySoft, fg: theme.c.primaryStrong, border: theme.c.secondarySoft },
    ghost: { bg: "transparent", fg: theme.c.primary, border: theme.c.border },
    danger: { bg: theme.c.danger, fg: "#FFFFFF", border: theme.c.danger },
  };
  const p = palette[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: disabled ? theme.c.surfaceAlt : p.bg,
          borderColor: p.border,
          opacity: pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={disabled ? theme.c.textDisabled : p.fg} />
      ) : (
        <View style={styles.row}>
          <Text
            style={[
              theme.font("sm"),
              { color: disabled ? theme.c.textDisabled : p.fg, fontWeight: "500" },
            ]}
          >
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
});
