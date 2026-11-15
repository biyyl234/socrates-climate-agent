import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";

/** Minimal three-dot streaming indicator (no looped CSS animation on native). */
export function LoadingDots() {
  const theme = useTheme();
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => (t + 1) % 3), 260);
    return () => clearInterval(timer);
  }, []);
  return (
    <View style={styles.row}>
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={[
            styles.dot,
            { backgroundColor: i === tick ? theme.c.primary : theme.c.sage },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 5, alignItems: "center", paddingVertical: 4 },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
