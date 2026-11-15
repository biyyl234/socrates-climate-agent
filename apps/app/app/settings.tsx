import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useTheme, type ThemeMode } from "../src/theme/ThemeProvider";
import { Header } from "../src/components/ui/Header";
import { Card } from "../src/components/ui/Card";
import { Chip } from "../src/components/ui/Chip";
import {
  AVATAR_PROTOCOL,
  AVATAR_PROTOCOL_VERSION,
} from "@socrates/core";
import {
  SOURCE_AGRIBALYSE_32,
  SOURCE_FRANKLIN_2009,
  SOURCE_PET_BOTTLE_REVIEW,
  SOURCE_POORE_NEMECEK_2018,
} from "@socrates/data";
import { backendConfigured, env } from "../src/config/env";

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: "system", label: "跟随系统" },
  { value: "light", label: "浅色" },
  { value: "dark", label: "深色" },
];

const LIMITATIONS: string[] = [
  "区间为归因型 LCA 教育估算，不构成采购、认证或标签声明依据。",
  "因子多为全球 / 欧洲平均口径，本地餐食与商品需谨慎解读；未覆盖阶段已在数据卡标注。",
  "不做营养或医疗诊断，不评价个人道德与生活方式；不展开政治、宗教等争议话题。",
  "无来源的数字留空，不编造；不做跨品类绝对排名、内疚营销或碳抵消 / 中和表述。",
  "首版仅覆盖 3 个窄品类：瓶装水 / 饮料、牛肉 vs 素食、包装零食。",
];

const SOURCES = [
  SOURCE_POORE_NEMECEK_2018,
  SOURCE_PET_BOTTLE_REVIEW,
  SOURCE_FRANKLIN_2009,
  SOURCE_AGRIBALYSE_32,
];

export default function SettingsScreen() {
  const theme = useTheme();

  return (
    <ScrollView style={[styles.screen, { backgroundColor: theme.c.bg }]} contentContainerStyle={styles.content}>
      <Header title="设置 / 关于" subtitle="主题、运行配置、数据源与局限" />

      <Card>
        <Text style={[theme.font("md"), { color: theme.c.textPrimary }]}>外观主题</Text>
        <View style={styles.themeRow}>
          {THEME_OPTIONS.map((option) => (
            <Chip
              key={option.value}
              label={option.label}
              active={theme.mode === option.value}
              onPress={() => theme.setMode(option.value)}
            />
          ))}
        </View>
      </Card>

      <Card>
        <Text style={[theme.font("md"), { color: theme.c.textPrimary }]}>运行配置</Text>
        <View style={styles.configRows}>
          <ConfigRow
            label="后端 base URL"
            env="EXPO_PUBLIC_SUPABASE_URL"
            value={env.supabaseUrl || "（未配置 · 离线演示模式）"}
          />
          <ConfigRow
            label="Avatar URL"
            env="EXPO_PUBLIC_AVATAR_URL"
            value={env.avatarUrl || "（未配置 · 虚拟人降级到 L4 文字态）"}
          />
          <ConfigRow label="语言" env="EXPO_PUBLIC_LOCALE" value={env.locale} />
        </View>
        <Text style={[theme.font("xs"), { color: theme.c.textTertiary, marginTop: 8 }]}>
          当前状态：{backendConfigured ? "已连接后端；请求按冻结 SSE / API 契约发起。" : "离线演示；对话与数字来自内置脚本与本地因子库。"}
        </Text>
      </Card>

      <Card>
        <Text style={[theme.font("md"), { color: theme.c.textPrimary }]}>数据源</Text>
        <View style={styles.sourceList}>
          {SOURCES.map((source) => (
            <View key={source.source_name} style={styles.sourceRow}>
              <Text style={[theme.font("sm"), { color: theme.c.textSecondary }]}>{source.source_name}</Text>
              <Text style={[theme.font("xs"), { color: theme.c.textTertiary }]}>{source.source_url}</Text>
              <Text style={[theme.font("xs"), { color: theme.c.textTertiary }]}>许可：{source.license}</Text>
            </View>
          ))}
        </View>
      </Card>

      <Card>
        <Text style={[theme.font("md"), { color: theme.c.textPrimary }]}>局限与边界</Text>
        <View style={styles.limits}>
          {LIMITATIONS.map((item) => (
            <Text key={item} style={[theme.font("sm"), { color: theme.c.textSecondary, lineHeight: 22 }]}>
              · {item}
            </Text>
          ))}
        </View>
      </Card>

      <Card>
        <Text style={[theme.font("md"), { color: theme.c.textPrimary }]}>关于 Socrates</Text>
        <Text style={[theme.font("sm"), { color: theme.c.textSecondary, marginTop: 8, lineHeight: 22 }]}>
          苏格拉底是校园生活方式的碳素养陪伴应用：以动机式访谈（MI）对话引导开放讨论，确定性引擎给出带区间、来源与质量等级的估算。
        </Text>
        <Text style={[theme.font("xs"), { color: theme.c.textTertiary, marginTop: 8 }]}>
          协议：{AVATAR_PROTOCOL} v{AVATAR_PROTOCOL_VERSION} · 界面中文为主，关键英文口径保留。
        </Text>
      </Card>
    </ScrollView>
  );
}

function ConfigRow({ label, env: envName, value }: { label: string; env: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={styles.configRow}>
      <Text style={[theme.font("sm"), { color: theme.c.textPrimary, width: 110 }]}>{label}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[theme.font("sm"), { color: theme.c.textSecondary }]} numberOfLines={2}>{value}</Text>
        <Text style={[theme.font("xs"), { color: theme.c.textTertiary }]}>{envName}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 20, gap: 16, maxWidth: 760 },
  themeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  configRows: { gap: 10, marginTop: 10 },
  configRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  sourceList: { gap: 12, marginTop: 10 },
  sourceRow: { gap: 3 },
  limits: { gap: 4, marginTop: 10 },
});
