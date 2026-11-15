import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";

interface Props {
  grade: string;
  label?: string;
}

/** Data-quality badge: A=success, B=warning, C=terracotta, D/E=muted. */
export function Badge({ grade, label }: Props) {
  const theme = useTheme();
  const colorByGrade: Record<string, string> = {
    A: theme.c.success,
    B: theme.c.warning,
    C: theme.c.secondary,
    D: theme.c.textTertiary,
    E: theme.c.textTertiary,
  };
  const color = colorByGrade[grade] ?? theme.c.textTertiary;
  return (
    <View style={[styles.badge, { borderColor: color }]}>
      <Text style={[theme.font("xs"), { color, fontWeight: "600" }]}>
        {label ?? `质量 ${grade}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 2,
    paddingHorizontal: 8,
    alignSelf: "flex-start",
  },
});
