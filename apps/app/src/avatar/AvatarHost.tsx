/**
 * Native avatar host (Android/iOS): loads the same standalone avatar bundle in a
 * react-native-webview and bridges the frozen postMessage protocol. Falls back
 * to the L4 placeholder when the URL is unconfigured, the load errors out, or
 * the bundle never reports `ready`.
 */
import { useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from "react";
import { View, StyleSheet } from "react-native";
import { WebView as WebViewRaw, type WebViewMessageEvent } from "react-native-webview";
import {
  wrap,
  isEnvelope,
  type AppToAvatar,
  type AvatarCapabilities,
  type AvatarLevel,
} from "@socrates/core";
import { env } from "../config/env";
import { useTheme } from "../theme/ThemeProvider";
import { FallbackAvatar } from "./FallbackAvatar";
import type { AvatarBridge, AvatarHostProps } from "./types";

const READY_TIMEOUT_MS = 8000;

// react-native-webview v14 的 props 类型与 RN 0.88 生成类型存在交集冲突，
// 原生壳使用显式宽松组件类型；Web 端由 AvatarHost.web.tsx 的 iframe 实现。
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const WebView: ComponentType<Record<string, unknown> & { ref?: any; children?: ReactNode }> =
  WebViewRaw as unknown as ComponentType<Record<string, unknown>>;

export function AvatarHost({ bridgeRef, onReady, onError, style }: AvatarHostProps) {
  const theme = useTheme();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const webRef = useRef<any>(null);

  const [ready, setReady] = useState(false);
  const [level, setLevel] = useState<AvatarLevel>(4);
  const [capabilities, setCapabilities] = useState<AvatarCapabilities | null>(null);
  const [lastError, setLastError] = useState<{ code: string; message: string } | null>(null);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  const urlConfigured = env.avatarUrl.length > 0;

  const post = (msg: AppToAvatar) => {
    const envelope = wrap(msg);
    const js =
      `(function(){try{var m=new MessageEvent("message",{data:${JSON.stringify(envelope)}});` +
      `window.dispatchEvent(m);}catch(e){}true;})();`;
    webRef.current?.injectJavaScript(js);
  };

  const handleIncoming = (raw: unknown) => {
    if (!isEnvelope(raw)) return;
    const envelope = raw;
    switch (envelope.type) {
      case "ready": {
        const payload = envelope.payload as { capabilities: AvatarCapabilities; level: AvatarLevel };
        setReady(true);
        setLevel(payload.level);
        setCapabilities(payload.capabilities);
        onReady?.(payload.level);
        post({
          type: "init",
          payload: { level: payload.level, theme: theme.scheme, locale: env.locale },
        });
        break;
      }
      case "level_changed": {
        const payload = envelope.payload as { level: AvatarLevel; reason: string };
        setLevel(payload.level);
        break;
      }
      case "error": {
        const payload = envelope.payload as { code: string; message: string; recoverable: boolean };
        setLastError({ code: payload.code, message: payload.message });
        onError?.(payload.code, payload.message);
        if (!payload.recoverable) setLevel(4);
        break;
      }
      default:
        break;
    }
  };

  const onMessage = (event: WebViewMessageEvent) => {
    let raw: unknown = event.nativeEvent.data;
    if (typeof raw === "string") {
      try {
        raw = JSON.parse(raw);
      } catch {
        return;
      }
    }
    handleIncoming(raw);
  };

  // First gesture unlock: native WebView blocks media until user interaction.
  useEffect(() => {
    if (audioUnlocked) return;
    const unlock = () => {
      setAudioUnlocked(true);
      post({ type: "set_tts", payload: { enabled: true } });
    };
    // On native the gesture arrives through the host screen; this bridge exposes
    // unlockAudio for the screen to call from its touch handler.
    void unlock;
  }, [audioUnlocked]);

  useEffect(() => {
    if (!urlConfigured || ready) return;
    const timer = setTimeout(() => {
      setLoadFailed(true);
      setLevel(4);
      setLastError({ code: "AVATAR_TIMEOUT", message: "虚拟人在超时时间内未就绪，已切换文字态。" });
      onError?.("AVATAR_TIMEOUT", "avatar ready timeout");
    }, READY_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [urlConfigured, ready, onError]);

  const bridge: AvatarBridge = useMemo(
    () => ({
      ready,
      level,
      capabilities,
      audioUnlocked,
      lastError,
      unlockAudio: () => {
        setAudioUnlocked(true);
        post({ type: "set_tts", payload: { enabled: true } });
      },
      speak: (utteranceId, text, audioUrl) =>
        post({ type: "speak", payload: { utteranceId, text, audioUrl: audioUrl ?? null } }),
      stopSpeak: () => post({ type: "stop_speak", payload: {} }),
      setState: (state) => post({ type: "set_state", payload: { state } }),
      expression: (expressionId) => post({ type: "expression", payload: { expressionId } }),
      motion: (motionId) => post({ type: "motion", payload: { motionId } }),
      setLevel: (l) => post({ type: "set_level", payload: { level: l } }),
      setTts: (enabled) => post({ type: "set_tts", payload: { enabled } }),
    }),
    [ready, level, capabilities, audioUnlocked, lastError],
  );

  useEffect(() => {
    if (bridgeRef) bridgeRef.current = bridge;
  }, [bridge, bridgeRef]);

  const degraded = !urlConfigured || loadFailed;

  return (
    <View style={[styles.host, style]}>
      {degraded ? (
        <FallbackAvatar level={level} message={lastError?.message ?? null} />
      ) : (
        <WebView
          ref={webRef}
          source={{ uri: env.avatarUrl }}
          onMessage={onMessage}
          onError={() => {
            setLoadFailed(true);
            setLevel(4);
          }}
          onHttpError={() => {
            setLoadFailed(true);
            setLevel(4);
          }}
          javaScriptEnabled
          originWhitelist={["*"]}
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction
          startInLoadingState
          style={styles.webview}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  host: { overflow: "hidden" },
  webview: { backgroundColor: "transparent" },
});
