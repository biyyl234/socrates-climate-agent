import { StyleSheet, Text, View, type ViewStyle } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";

function rgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Frosted panel: blur on web, translucent rgba fallback on native. */
function frost(color: string, alpha: number): ViewStyle {
  return {
    backgroundColor: rgba(color, alpha),
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
  } as ViewStyle;
}
import type { ChatMessage } from "../../types/chat";
import { FootprintCard } from "./FootprintCard";
import { CompareCard } from "./CompareCard";
import { LoadingDots } from "../ui/LoadingDots";
import { Button } from "../ui/Button";

interface Props {
  message: ChatMessage;
  onAcceptCommitment?: (message: ChatMessage) => void;
}

export function MessageBubble({ message, onAcceptCommitment }: Props) {
  const theme = useTheme();
  const isUser = message.role === "user";

  return (
    <View style={[styles.row, { justifyContent: isUser ? "flex-end" : "flex-start" }]}>
      <View
        style={[
          styles.bubble,
          frost(isUser ? theme.c.secondarySoft : theme.c.surface, isUser ? 0.9 : 0.86),
          {
            maxWidth: theme.isWide ? "72%" : "92%",
            borderColor: theme.c.border,
          },
        ]}
      >
        {message.text.length > 0 ? (
          <Text
            style={[
              theme.font("base"),
              { color: theme.c.textPrimary, lineHeight: 25 },
            ]}
          >
            {message.text}
          </Text>
        ) : null}
        {message.streaming && message.text.length === 0 ? <LoadingDots /> : null}

        {message.datacard ? (
          <View style={styles.cardSlot}>
            <FootprintCard result={message.datacard} />
          </View>
        ) : null}

        {message.compare ? (
          <View style={styles.cardSlot}>
            <CompareCard result={message.compare} />
          </View>
        ) : null}

        {message.commitmentSuggestion && !message.streaming ? (
          <View style={styles.commitment}>
            <Text style={[theme.font("sm"), { color: theme.c.textSecondary }]}>
              候选承诺：{message.commitmentSuggestion.text}
            </Text>
            <Button
              title="记成承诺"
              variant="secondary"
              onPress={() => onAcceptCommitment?.(message)}
              style={styles.commitmentBtn}
            />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { width: "100%", gap: 8 },
  bubble: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  cardSlot: { gap: 8 },
  commitment: { gap: 8, alignItems: "flex-start" },
  commitmentBtn: { minHeight: 36, paddingVertical: 8, paddingHorizontal: 14 },
});
