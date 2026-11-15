import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useTheme } from "../src/theme/ThemeProvider";
import { Header } from "../src/components/ui/Header";
import { CompareCard } from "../src/components/chat/CompareCard";
import { STORY_META, type StoryId } from "../src/types/chat";
import { compareForStory } from "../src/services/engine";

function isStoryId(value: string | undefined): value is StoryId {
  return value === "water" || value === "beef";
}

export default function CompareScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ story?: string }>();
  const story = isStoryId(params.story) ? params.story : "water";
  const result = useMemo(() => compareForStory(story), [story]);

  return (
    <ScrollView style={[styles.screen, { backgroundColor: theme.c.bg }]} contentContainerStyle={styles.content}>
      <Header title="对比视图" subtitle={STORY_META[story].subtitle} />
      <View style={styles.body}>
        {result ? (
          <CompareCard result={result} />
        ) : (
          <Text style={[theme.font("sm"), { color: theme.c.textSecondary }]}>
            当前品类缺少可用因子，无法生成对比区间。
          </Text>
        )}
        <View style={styles.note}>
          <Text style={[theme.font("xs"), { color: theme.c.textTertiary }]}>
            口径：一餐 / 一瓶标准份；差异为区间差，不是精确差值；不代表本校窗口实测餐品。
          </Text>
          <Text style={[theme.font("xs"), { color: theme.c.textTertiary, marginTop: 4 }]}>
            区间重叠时不宣称绝对优劣；不做跨品类绝对排名，也不使用抵消 / 中和表述。
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 20, gap: 16, maxWidth: 760 },
  body: { gap: 12 },
  note: { gap: 4 },
});
