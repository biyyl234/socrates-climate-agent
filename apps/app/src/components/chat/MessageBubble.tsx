import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
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
          {
            maxWidth: theme.isWide ? "72%" : "92%",
            backgroundColor: isUser ? theme.c.secondarySoft : theme.c.surface,
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
