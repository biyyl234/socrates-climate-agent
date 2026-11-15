import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { backendConfigured, env } from "../../config/env";

/**
 * Mode banner: backend configured = connected; otherwise offline demo mode
 * using the local factor library and scripted demo flow.
 */
export function StatusBanner() {
  const theme = useTheme();
  const configured = backendConfigured;
  const color = configured ? theme.c.success : theme.c.secondary;
  return (
    <View
      style={[
        styles.banner,
        { backgroundColor: configured ? theme.c.primarySoft : theme.c.secondarySoft, borderColor: color },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[theme.font("xs"), { color: theme.c.textSecondary, flex: 1 }]}>
        {configured
          ? `已连接后端：${env.supabaseUrl}`
          : "离线演示模式：使用内置示例流程；排放数字来自本地确定性因子库"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
