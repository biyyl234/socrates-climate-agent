import { Text, View, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "../src/theme/ThemeProvider";

export default function NotFound() {
  const theme = useTheme();
  const router = useRouter();
  return (
    <View style={[styles.wrap, { backgroundColor: theme.c.bg }]}>
      <Text style={[theme.font("lg", true), { color: theme.c.textPrimary }]}>页面不存在</Text>
      <Text style={[theme.font("sm"), { color: theme.c.textSecondary, marginTop: 8 }]}>
        你访问的路径没有对应界面。
      </Text>
      <Pressable accessibilityRole="button" onPress={() => router.replace("/")}>
        <Text style={[theme.font("sm"), { color: theme.c.primary, marginTop: 12 }]}>回到首页</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
});
