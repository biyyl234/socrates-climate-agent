import { Pressable, StyleSheet, Text } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";

interface Props {
  label: string;
  onPress?: () => void;
  active?: boolean;
  disabled?: boolean;
}

function rgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function Chip({ label, onPress, active, disabled }: Props) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: rgba(active ? theme.c.primarySoft : theme.c.surface, 0.5),
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          borderColor: rgba(active ? theme.c.primary : theme.c.border, 0.7),
          opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
        },
      ]}
    >
      <Text style={[theme.font("sm"), { color: active ? theme.c.primaryStrong : theme.c.textSecondary }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
});
