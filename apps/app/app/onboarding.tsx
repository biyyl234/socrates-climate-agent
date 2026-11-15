import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "../src/theme/ThemeProvider";
import { Card } from "../src/components/ui/Card";
import { Button } from "../src/components/ui/Button";
import { writeString } from "../src/services/storage";

const ONBOARDED_KEY = "onboarded";

const ITEMS: { title: string; body: string }[] = [
  {
    title: "我们怎么聊：动机式访谈（MI）",
    body: "苏格拉底先反映你的处境，再给信息；多用开放提问，不催促、不评价选择。先倾听，后讨论。",
  },
  {
    title: "数字从哪来：确定性因子库",
    body: "排放区间由本地确定性 LCA 引擎按公开因子计算，分阶段拆解；每个数字都带来源、区间与质量等级，LLM 不做算术。",
  },
  {
    title: "边界与局限",
    body: "不做营养 / 医疗诊断，不评价个人道德；这是平均口径的教育估算，不代表本校窗口每份具体餐品；无来源的数字留空，不编造。",
  },
];

export default function OnboardingScreen() {
  const theme = useTheme();
  const router = useRouter();

  const finish = () => {
    void writeString(ONBOARDED_KEY, "1");
    router.replace("/");
  };

  return (
    <ScrollView style={[styles.screen, { backgroundColor: theme.c.bg }]} contentContainerStyle={styles.content}>
      <Text style={[theme.font("xl", true), { color: theme.c.textPrimary }]}>先了解三件事</Text>
      <View style={styles.list}>
        {ITEMS.map((item) => (
          <Card key={item.title}>
            <Text style={[theme.font("md"), { color: theme.c.textPrimary }]}>{item.title}</Text>
            <Text style={[theme.font("sm"), { color: theme.c.textSecondary, marginTop: 8, lineHeight: 22 }]}>
              {item.body}
            </Text>
          </Card>
        ))}
      </View>
      <Button title="完成引导，开始对话" onPress={finish} style={styles.cta} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 20, gap: 16, maxWidth: 760 },
  list: { gap: 12 },
  cta: { alignSelf: "stretch" },
});
