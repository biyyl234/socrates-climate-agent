import { StyleSheet, Text, View } from "react-native";
import type { CompareResult } from "@socrates/data";
import { useTheme } from "../../theme/ThemeProvider";
import { Badge } from "../ui/Badge";
import { fmtInterval, fmtValue } from "../../format/numbers";

interface Props {
  result: CompareResult;
}

export function CompareCard({ result }: Props) {
  const theme = useTheme();
  const maxHigh = Math.max(...result.items.map((i) => i.footprint.interval[1]), 1);

  return (
    <View style={[styles.card, { borderColor: theme.c.border, backgroundColor: theme.c.surface }]}>
      <Text style={[theme.font("md"), { color: theme.c.textPrimary }]}>
        同口径对比 · {result.functional_unit}
      </Text>

      <View style={[styles.columns, { flexDirection: theme.isWide ? "row" : "column" }]}>
        {result.items.map((item) => {
          const share = item.footprint.interval[1] / maxHigh;
          return (
            <View key={item.index} style={styles.column}>
              <View style={styles.columnHead}>
                <Text style={[theme.font("sm"), { color: theme.c.textPrimary, flex: 1 }]}>
                  {item.label}
                </Text>
                <Badge grade={item.dq} />
              </View>
              <Text style={[theme.font("lg"), { color: theme.c.primary, marginVertical: 6 }]}>
                {fmtInterval(item.footprint.interval, item.footprint.unit)}
              </Text>
              <View style={[styles.barTrack, { backgroundColor: theme.c.surfaceAlt }]}>
                <View
                  style={{
                    width: `${share * 100}%`,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor:
                      item.index === 0 ? theme.c.secondary : theme.c.primary,
                  }}
                />
              </View>
              <Text style={[theme.font("xs"), { color: theme.c.textTertiary, marginTop: 4 }]}>
                点估计 {fmtValue(item.footprint.value)} {item.footprint.unit}
              </Text>
            </View>
          );
        })}
      </View>

      {result.overlap ? (
        <Text style={[theme.font("xs"), { color: theme.c.warning }]}>
          区间存在重叠：不据此宣称绝对优劣。
        </Text>
      ) : null}

      <View style={styles.caveats}>
        {result.caveats.map((caveat, i) => (
          <Text key={i} style={[theme.font("xs"), { color: theme.c.textTertiary }]}>
            · {caveat}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 12, borderWidth: 1, padding: 12, gap: 10 },
  columns: { gap: 16 },
  column: { flex: 1 },
  columnHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  barTrack: { borderRadius: 5, overflow: "hidden" },
  caveats: { gap: 3 },
});
