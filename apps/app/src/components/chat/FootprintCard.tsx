import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { FootprintResult } from "@socrates/data";
import { useTheme } from "../../theme/ThemeProvider";
import { Badge } from "../ui/Badge";
import { fmtInterval, fmtPercent, fmtValue } from "../../format/numbers";

interface Props {
  result: FootprintResult;
}

const SEGMENT_COLORS = ["#2F5D50", "#9DB8A3", "#C97B5A", "#E8DFCF", "#4A7FA6", "#7FAF9E"];

export function FootprintCard({ result }: Props) {
  const theme = useTheme();
  const [showSources, setShowSources] = useState(false);
  const total = result.total.value;

  return (
    <View style={[styles.card, { borderColor: theme.c.border, backgroundColor: theme.c.surface }]}>
      <View style={styles.header}>
        <Text style={[theme.font("md"), { color: theme.c.textPrimary, flex: 1 }]}>
          {result.functional_unit}
        </Text>
        <Badge grade={result.data_quality.overall} />
      </View>

      <Text style={[theme.font("xl"), { color: theme.c.primary, marginVertical: 8 }]}>
        {fmtInterval(result.total.interval, result.total.unit)}
      </Text>

      {/* Stacked phase bar */}
      <View style={[styles.stack, { backgroundColor: theme.c.surfaceAlt }]}>
        {result.phases.map((phase, i) => {
          const share = total > 0 ? phase.value / total : 0;
          return (
            <View
              key={phase.stage}
              style={{
                width: `${share * 100}%`,
                backgroundColor: SEGMENT_COLORS[i % SEGMENT_COLORS.length],
              }}
            />
          );
        })}
      </View>

      <View style={styles.phaseList}>
        {result.phases.map((phase, i) => (
          <View key={phase.stage} style={styles.phaseRow}>
            <View
              style={[
                styles.swatch,
                { backgroundColor: SEGMENT_COLORS[i % SEGMENT_COLORS.length] },
              ]}
            />
            <Text style={[theme.font("sm"), { color: theme.c.textSecondary, flex: 1 }]}>
              {phase.label}
            </Text>
            <Text style={[theme.font("sm"), { color: theme.c.textPrimary }]}>
              {fmtValue(phase.value)} · {fmtPercent(phase.value, total)}
            </Text>
          </View>
        ))}
      </View>

      <Pressable onPress={() => setShowSources((v) => !v)} style={styles.sourceToggle}>
        <Text style={[theme.font("xs"), { color: theme.c.primary }]}>
          {showSources ? "收起来源" : `展开来源（${result.factors.length}）`}
        </Text>
      </Pressable>

      {showSources ? (
        <View style={styles.sourceList}>
          {result.factors.map((f) => (
            <View key={f.factor_id} style={styles.sourceRow}>
              <Text style={[theme.font("xs"), { color: theme.c.textSecondary }]}>
                [{f.factor_id}] {f.source_name} · 质量 {f.dq.overall}
              </Text>
              <Text style={[theme.font("xs"), { color: theme.c.textTertiary }]}>{f.source_url}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.notes}>
        {result.data_quality.notes.map((note, i) => (
          <Text key={i} style={[theme.font("xs"), { color: theme.c.textTertiary }]}>
            · {note}
          </Text>
        ))}
        <Text style={[theme.font("xs"), { color: theme.c.textTertiary }]}>{result.disclaimer}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 12, borderWidth: 1, padding: 12, gap: 8 },
  header: { flexDirection: "row", alignItems: "center", gap: 8 },
  stack: { flexDirection: "row", height: 12, borderRadius: 6, overflow: "hidden" },
  phaseList: { gap: 6, marginTop: 4 },
  phaseRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  swatch: { width: 10, height: 10, borderRadius: 3 },
  sourceToggle: { paddingVertical: 4 },
  sourceList: { gap: 6 },
  sourceRow: { gap: 2 },
  notes: { gap: 3, marginTop: 4 },
});
