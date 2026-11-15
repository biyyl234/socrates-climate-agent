import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "../../theme/ThemeProvider";
import type { ReactNode } from "react";

interface Props {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  hideBack?: boolean;
  /** Transparent, borderless variant used when the bar floats over the avatar. */
  floating?: boolean;
}

export function Header({ title, subtitle, right, hideBack, floating }: Props) {
  const theme = useTheme();
  const router = useRouter();
  return (
    <View
      style={[
        styles.bar,
        floating
          ? { borderBottomWidth: 0, backgroundColor: "transparent" }
          : { borderColor: theme.c.border, backgroundColor: theme.c.bg },
      ]}
    >
      <View style={styles.left}>
        {!hideBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="返回"
            onPress={() => router.back()}
            style={styles.back}
          >
            <Text style={[theme.font("base"), { color: theme.c.primary }]}>‹</Text>
          </Pressable>
        ) : null}
        <View>
          <Text style={[theme.font("lg", true), { color: theme.c.textPrimary }]}>{title}</Text>
          {subtitle ? (
            <Text style={[theme.font("xs"), { color: theme.c.textTertiary }]}>{subtitle}</Text>
          ) : null}
        </View>
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  left: { flexDirection: "row", alignItems: "center", gap: 10 },
  back: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  right: { flexDirection: "row", alignItems: "center", gap: 12 },
});
