import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "../src/theme/ThemeProvider";
import { Button } from "../src/components/ui/Button";
import { Card } from "../src/components/ui/Card";
import { StatusBanner } from "../src/components/ui/StatusBanner";
import { STORY_META, type StoryId } from "../src/types/chat";

const STORY_ORDER: StoryId[] = ["water", "beef"];

export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: theme.c.bg }]}
      contentContainerStyle={styles.content}
    >
      <View style={styles.hero}>
        <Text style={[theme.font("xxl", true), { color: theme.c.textPrimary }]}>苏格拉底</Text>
        <Text style={[theme.font("base"), { color: theme.c.textSecondary, marginTop: 8 }]}>
          校园生活方式的碳素养陪伴：不评判、先倾听，用区间与来源说话
        </Text>
      </View>

      <StatusBanner />

      <View style={styles.sectionHead}>
        <Text style={[theme.font("lg", true), { color: theme.c.textPrimary }]}>预置演示故事</Text>
        <Text style={[theme.font("xs"), { color: theme.c.textTertiary }]}>
          两个故事均可独立走完一条端到端 MI 对话流
        </Text>
      </View>

      <View style={styles.storyList}>
        {STORY_ORDER.map((id) => {
          const meta = STORY_META[id];
          return (
            <Card key={id} style={styles.storyCard}>
              <Text style={[theme.font("md"), { color: theme.c.textPrimary }]}>{meta.title}</Text>
              <Text style={[theme.font("sm"), { color: theme.c.textSecondary, marginTop: 6 }]}>
                {meta.subtitle}
              </Text>
              <Text style={[theme.font("xs"), { color: theme.c.textTertiary, marginTop: 6 }]}>
                场景：{meta.scene}
              </Text>
              <Button
                title="进入演示"
                variant="primary"
                style={styles.storyBtn}
                onPress={() => router.push(`/chat?story=${id}`)}
              />
            </Card>
          );
        })}
      </View>

      <View style={styles.navRow}>
        <Button title="了解引导" variant="ghost" onPress={() => router.push("/onboarding")} />
        <Button title="承诺记录" variant="ghost" onPress={() => router.push("/commitments")} />
        <Button title="设置 / 关于" variant="ghost" onPress={() => router.push("/settings")} />
      </View>

      <View style={styles.scope}>
        <Text style={[theme.font("xs"), { color: theme.c.textTertiary }]}>
          范围：3 个窄品类（瓶装水/饮料、牛肉 vs 素食、包装零食）+ 2 个演示故事 + 1 条端到端 MI 流。
        </Text>
        <Text style={[theme.font("xs"), { color: theme.c.textTertiary, marginTop: 4 }]}>
          不做内疚营销、碳抵消、个人碳总账或跨品类绝对排名；无来源数字一律留空。
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 20, gap: 16, maxWidth: 760, alignSelf: "stretch" },
  hero: { paddingVertical: 16 },
  sectionHead: { gap: 4, marginTop: 8 },
  storyList: { gap: 12 },
  storyCard: { gap: 4 },
  storyBtn: { marginTop: 12, alignSelf: "flex-start" },
  navRow: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  scope: { gap: 4, marginTop: 8 },
});
