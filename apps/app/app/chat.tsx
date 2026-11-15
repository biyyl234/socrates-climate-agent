import { useCallback, useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ScrollViewInstance,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { MIState, AvatarState, ExpressionId, MotionId, ChatRequest } from "@socrates/core";
import { useTheme } from "../src/theme/ThemeProvider";
import { AvatarHost } from "../src/avatar/AvatarHost";
import type { AvatarBridge } from "../src/avatar/types";
import { MessageBubble } from "../src/components/chat/MessageBubble";
import { Chip } from "../src/components/ui/Chip";
import { Header } from "../src/components/ui/Header";
import { StatusBanner } from "../src/components/ui/StatusBanner";
import { Button } from "../src/components/ui/Button";
import {
  MI_STATE_LABELS,
  STORY_META,
  type ChatMessage,
  type CommitmentSuggestion,
  type StoryId,
} from "../src/types/chat";
import { DEMO_SCRIPTS, FALLBACK_STEP, type DemoStep } from "../src/services/demo/stories";
import { streamChat, BackendError } from "../src/services/api";
import { addCommitment } from "../src/services/commitments";
import { backendConfigured } from "../src/config/env";

let msgSeq = 0;
function uid(): string {
  msgSeq += 1;
  return `msg_${Date.now().toString(36)}_${msgSeq}`;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function chunkText(text: string, size: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < text.length; i += size) out.push(text.slice(i, i + size));
  return out;
}

function isStoryId(value: string | undefined): value is StoryId {
  return value === "water" || value === "beef";
}

export default function ChatScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ story?: string }>();
  const story = isStoryId(params.story) ? params.story : null;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [miState, setMiState] = useState<MIState>("WELCOME");

  const bridgeRef = useRef<AvatarBridge | null>(null);
  const scrollRef = useRef<ScrollViewInstance>(null);
  const stepIndexRef = useRef(0);
  const greetedRef = useRef(false);

  const patchMessage = useCallback((id: string, patch: Partial<ChatMessage>) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }, []);

  const applyCues = useCallback((bridge: AvatarBridge, step: DemoStep) => {
    bridge.setState(step.avatarState);
    if (step.expression) bridge.expression(step.expression);
    if (step.motion) bridge.motion(step.motion);
  }, []);

  const runDemoStep = useCallback(
    async (step: DemoStep) => {
      const bridge = bridgeRef.current;
      const msgId = uid();
      const message: ChatMessage = {
        id: msgId,
        role: "assistant",
        text: "",
        miState: step.miState,
        avatarState: step.avatarState,
        expression: step.expression,
        motion: step.motion,
        datacard: step.datacard,
        compare: step.compare,
        commitmentSuggestion: step.commitment,
        createdAt: Date.now(),
        streaming: true,
      };
      setMessages((prev) => [...prev, message]);
      setMiState(step.miState);
      if (bridge) applyCues(bridge, step);

      let acc = "";
      for (const chunk of chunkText(step.text, 8)) {
        acc += chunk;
        patchMessage(msgId, { text: acc });
        await sleep(55);
      }
      patchMessage(msgId, { streaming: false });
      if (bridge) bridge.speak(msgId, step.text);
    },
    [applyCues, patchMessage, setMiState],
  );

  const runBackendTurn = useCallback(
    async (text: string) => {
      const bridge = bridgeRef.current;
      const msgId = uid();
      const message: ChatMessage = {
        id: msgId,
        role: "assistant",
        text: "",
        miState,
        avatarState: "Thinking",
        datacard: null,
        compare: null,
        commitmentSuggestion: null,
        createdAt: Date.now(),
        streaming: true,
      };
      setMessages((prev) => [...prev, message]);
      if (bridge) bridge.setState("Thinking");

      let acc = "";
      const req: ChatRequest = {
        message: text,
        mode: "demo",
        context: { entry_scene: story ?? undefined, product_hint: null },
      };

      try {
        await streamChat(req, {
          onState: (d) => {
            const state = d.mi_state as MIState;
            setMiState(state);
            patchMessage(msgId, { miState: state });
          },
          onToken: (delta) => {
            acc += delta;
            patchMessage(msgId, { text: acc });
          },
          onDatacard: (result) => patchMessage(msgId, { datacard: result }),
          onCompare: (result) => patchMessage(msgId, { compare: result }),
          onError: (d) => setError(d.message),
          onDone: () => patchMessage(msgId, { streaming: false }),
        });
        if (bridge) {
          bridge.setState("Speaking");
          bridge.speak(msgId, acc);
        }
      } catch (cause) {
        const message = cause instanceof BackendError ? cause.message : "后端连接失败";
        setError(message);
        patchMessage(msgId, { streaming: false });
        // Degrade to the offline demo flow for this turn.
        await runDemoStep(FALLBACK_STEP);
      }
    },
    [miState, story, runDemoStep, patchMessage],
  );

  // Greeting on entry: first scripted step.
  useEffect(() => {
    if (greetedRef.current) return;
    greetedRef.current = true;
    if (story) {
      const script = DEMO_SCRIPTS[story];
      const greeting = script[0];
      if (greeting) {
        stepIndexRef.current = 1;
        void runDemoStep(greeting);
      }
    } else {
      const greeting: DemoStep = {
        miState: "RAPPORT",
        avatarState: "Listening",
        expression: "exp-smile",
        motion: "m-idle-breath",
        text: "你好，我是苏格拉底。不急着下判断——今天想先聊聊哪一餐，还是哪一瓶水？",
        datacard: null,
        compare: null,
        commitment: null,
      };
      void runDemoStep(greeting);
    }
  }, [story, runDemoStep]);

  const send = useCallback(async (override?: string) => {
    const text = (override ?? input).trim();
    if (!text || busy) return;
    setInput("");
    setBusy(true);
    setError(null);

    setMessages((prev) => [
      ...prev,
      {
        id: uid(),
        role: "user",
        text,
        miState,
        avatarState: "Listening",
        datacard: null,
        compare: null,
        commitmentSuggestion: null,
        createdAt: Date.now(),
        streaming: false,
      },
    ]);
    bridgeRef.current?.setState("Listening");

    if (backendConfigured) {
      await runBackendTurn(text);
    } else if (story) {
      const script = DEMO_SCRIPTS[story];
      const step = script[stepIndexRef.current] ?? FALLBACK_STEP;
      stepIndexRef.current += 1;
      await runDemoStep(step);
    } else {
      await runDemoStep(FALLBACK_STEP);
    }

    setBusy(false);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
  }, [input, busy, miState, story, runBackendTurn, runDemoStep]);

  const acceptCommitment = useCallback(
    async (message: ChatMessage) => {
      const suggestion: CommitmentSuggestion | null = message.commitmentSuggestion;
      if (!suggestion) return;
      patchMessage(message.id, { commitmentSuggestion: null });
      await addCommitment({
        text: suggestion.text,
        categoryId: suggestion.categoryId,
        alternative: suggestion.alternative,
        barrier: suggestion.barrier ?? null,
        plan: suggestion.plan ?? null,
      });

      // Follow-up celebrate step from the script, when present.
      if (story) {
        const script = DEMO_SCRIPTS[story];
        const next = script[stepIndexRef.current];
        stepIndexRef.current += 1;
        if (next) {
          await runDemoStep(next);
          return;
        }
      }
      const celebrate: DemoStep = {
        miState: "CLOSING",
        avatarState: "Celebrate",
        expression: "exp-celebrate",
        motion: "m-raise-hand",
        text: "记下了。从这一步开始，你已经在观察自己的选择了。",
        datacard: null,
        compare: null,
        commitment: null,
      };
      await runDemoStep(celebrate);
    },
    [story, runDemoStep, patchMessage],
  );

  const title = story ? STORY_META[story].title : "自由对话";
  const chips = story ? STORY_META[story].chips : [];

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: theme.c.bg }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Header
        title={title}
        subtitle={story ? STORY_META[story].subtitle : "离线可演示的 MI 对话"}
        right={
          <View style={styles.headerRight}>
            <Pressable accessibilityRole="button" onPress={() => router.push("/commitments")}>
              <Text style={[theme.font("sm"), { color: theme.c.primary }]}>承诺</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => router.push("/settings")}>
              <Text style={[theme.font("sm"), { color: theme.c.primary }]}>设置</Text>
            </Pressable>
          </View>
        }
      />

      <View style={styles.statusRow}>
        <StatusBanner />
        <Text style={[theme.font("xs"), { color: theme.c.textTertiary }]}>
          MI 阶段：{MI_STATE_LABELS[miState]} · 虚拟人层级 L{bridgeRef.current?.level ?? 4}
        </Text>
      </View>

      <View
        style={[styles.body, { flexDirection: theme.isWide ? "row" : "column" }]}
        onTouchStart={() => bridgeRef.current?.unlockAudio()}
      >
        <View style={[styles.avatarCol, { width: theme.isWide ? 300 : "100%" }]}>
          <AvatarHost bridgeRef={bridgeRef} />
        </View>

        <View style={styles.chatCol}>
          <ScrollView ref={scrollRef} style={styles.messages} contentContainerStyle={styles.messagesInner}>
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} onAcceptCommitment={acceptCommitment} />
            ))}
            {error ? (
              <Text style={[theme.font("xs"), { color: theme.c.danger, padding: 8 }]}>{error}</Text>
            ) : null}
          </ScrollView>

          {chips.length > 0 ? (
            <View style={styles.chips}>
              {chips.map((chip) => (
                <Chip key={chip} label={chip} onPress={() => { setInput(chip); void send(chip); }} />
              ))}
            </View>
          ) : null}

          <View style={[styles.inputBar, { borderColor: theme.c.border, backgroundColor: theme.c.surfaceAlt }]}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="想聊聊哪一餐，还是哪一瓶水？"
              placeholderTextColor={theme.c.textTertiary}
              multiline
              style={[theme.font("base"), { color: theme.c.textPrimary, flex: 1 }]}
              onSubmitEditing={() => void send()}
              returnKeyType="send"
            />
            <Button title="发送" variant="primary" onPress={() => void send()} loading={busy} style={styles.send} />
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  headerRight: { flexDirection: "row", gap: 14 },
  statusRow: { gap: 6, paddingHorizontal: 16, paddingVertical: 8 },
  body: { flex: 1, gap: 12, paddingHorizontal: 16 },
  avatarCol: { height: 240, marginBottom: 4 },
  chatCol: { flex: 1, gap: 8 },
  messages: { flex: 1 },
  messagesInner: { gap: 12, paddingVertical: 8 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  send: { minHeight: 40, paddingVertical: 8 },
});
