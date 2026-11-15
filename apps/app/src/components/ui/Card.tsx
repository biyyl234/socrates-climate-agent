import { StyleSheet, View, type ViewStyle } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  style?: ViewStyle;
  padded?: boolean;
}

export function Card({ children, style, padded = true }: Props) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.c.surface,
          borderColor: theme.c.border,
          padding: padded ? theme.space[4] : 0,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
  },
});
