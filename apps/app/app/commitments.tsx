import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "../src/theme/ThemeProvider";
import { Header } from "../src/components/ui/Header";
import { Card } from "../src/components/ui/Card";
import { Button } from "../src/components/ui/Button";
import { Badge } from "../src/components/ui/Badge";
import { cancelCommitment, loadCommitments } from "../src/services/commitments";
import type { CommitmentRecord } from "../src/types/chat";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toISOString().slice(0, 10);
}

export default function CommitmentsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [records, setRecords] = useState<CommitmentRecord[]>([]);

  useEffect(() => {
    void loadCommitments().then(setRecords);
  }, []);

  const onCancel = async (id: string) => {
    const next = await cancelCommitment(id);
    setRecords(next);
  };

  const active = records.filter((r) => r.status === "active");
  const cancelled = records.filter((r) => r.status === "cancelled");

  return (
    <ScrollView style={[styles.screen, { backgroundColor: theme.c.bg }]} contentContainerStyle={styles.content}>
      <Header title="承诺记录" subtitle="本地优先；后端可达时同步到云端" />

      {records.length === 0 ? (
        <Card>
          <Text style={[theme.font("md"), { color: theme.c.textPrimary }]}>还没有承诺</Text>
          <Text style={[theme.font("sm"), { color: theme.c.textSecondary, marginTop: 8 }]}>
            完成一次对话后，可以把愿意尝试的小选择记在这里；承诺不勉强，随时可以取消。
          </Text>
          <Button title="回到对话" variant="primary" style={styles.cta} onPress={() => router.push("/")} />
        </Card>
      ) : (
        <View style={styles.list}>
          {active.map((record) => (
            <Card key={record.id}>
              <View style={styles.cardHead}>
                <Text style={[theme.font("md"), { color: theme.c.textPrimary, flex: 1 }]}>
                  {record.text}
                </Text>
                <Badge grade="A" label={record.source === "backend" ? "云端" : "本地"} />
              </View>
              <Text style={[theme.font("sm"), { color: theme.c.textSecondary, marginTop: 6 }]}>
                替代选择：{record.alternative}
              </Text>
              {record.plan ? (
                <Text style={[theme.font("xs"), { color: theme.c.textTertiary, marginTop: 4 }]}>
                  计划：{record.plan}
                </Text>
              ) : null}
              <View style={styles.meta}>
                <Text style={[theme.font("xs"), { color: theme.c.textTertiary }]}>
                  记录于 {formatDate(record.createdAt)} · 跟进 {formatDate(record.followUpDue)}
                </Text>
              </View>
              <Button
                title="取消承诺"
                variant="ghost"
                style={styles.cancel}
                onPress={() => void onCancel(record.id)}
              />
            </Card>
          ))}

          {cancelled.length > 0 ? (
            <View style={styles.cancelledBlock}>
              <Text style={[theme.font("xs"), { color: theme.c.textTertiary }]}>已取消</Text>
              {cancelled.map((record) => (
                <View key={record.id} style={styles.cancelledRow}>
                  <Text style={[theme.font("sm"), { color: theme.c.textTertiary }]}>{record.text}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 20, gap: 16, maxWidth: 760 },
  list: { gap: 12 },
  cardHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  meta: { marginTop: 6 },
  cancel: { alignSelf: "flex-start", marginTop: 10, minHeight: 36 },
  cta: { alignSelf: "stretch", marginTop: 12 },
  cancelledBlock: { gap: 6, marginTop: 8 },
  cancelledRow: { paddingVertical: 6 },
});
