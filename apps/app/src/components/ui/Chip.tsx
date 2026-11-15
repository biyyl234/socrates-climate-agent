import { Pressable, StyleSheet, Text } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";

interface Props {
  label: string;
  onPress?: () => void;
  active?: boolean;
  disabled?: boolean;
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
          backgroundColor: active ? theme.c.primarySoft : theme.c.surface,
          borderColor: active ? theme.c.primary : theme.c.border,
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
