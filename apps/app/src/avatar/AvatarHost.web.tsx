/**
 * Web avatar host: loads the standalone avatar bundle in an iframe and bridges
 * the frozen versioned postMessage protocol. Degrades to the L4 placeholder when
 * the URL is unconfigured or the bundle never reports `ready`.
 */
import { createElement, useEffect, useMemo, useRef, useState } from "react";
import { View, StyleSheet } from "react-native";
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

export function AvatarHost({ bridgeRef, onReady, onError, style }: AvatarHostProps) {
  const theme = useTheme();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const [ready, setReady] = useState(false);
  const [level, setLevel] = useState<AvatarLevel>(4);
  const [capabilities, setCapabilities] = useState<AvatarCapabilities | null>(null);
  const [lastError, setLastError] = useState<{ code: string; message: string } | null>(null);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  const urlConfigured = env.avatarUrl.length > 0;

  const send = (msg: AppToAvatar) => {
    iframeRef.current?.contentWindow?.postMessage(wrap(msg), "*");
  };

  // Incoming bridge events.
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const raw = event.data;
      if (!isEnvelope(raw)) return;
      if (iframeRef.current && event.source && event.source !== iframeRef.current.contentWindow) {
        return;
      }
      const envelope = raw;
      switch (envelope.type) {
        case "ready": {
          const payload = envelope.payload as { capabilities: AvatarCapabilities; level: AvatarLevel };
          setReady(true);
          setLevel(payload.level);
          setCapabilities(payload.capabilities);
          onReady?.(payload.level);
          send({
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
        case "speak_started":
        case "speak_ended":
        case "hit":
        case "metrics":
          /* tracked by the bundle; the shell only needs state-level cues */
          break;
        default:
          break;
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [theme.scheme, onReady, onError]);

  // First user gesture unlocks audio: browsers block autoplay until a gesture.
  useEffect(() => {
    if (audioUnlocked) return;
    const unlock = () => {
      setAudioUnlocked(true);
      send({ type: "set_tts", payload: { enabled: true } });
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [audioUnlocked]);

  // Load timeout: treat no `ready` as a hard degradation to L4.
  useEffect(() => {
    if (!urlConfigured || ready) return;
    const timer = setTimeout(() => {
      setLoadFailed(true);
      setLevel(4);
      setLastError({ code: "AVATAR_TIMEOUT", message: "虚拟人 bundle 在超时时间内未就绪，已切换文字态。" });
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
        send({ type: "set_tts", payload: { enabled: true } });
      },
      speak: (utteranceId, text, audioUrl) =>
        send({ type: "speak", payload: { utteranceId, text, audioUrl: audioUrl ?? null } }),
      stopSpeak: () => send({ type: "stop_speak", payload: {} }),
      setState: (state) => send({ type: "set_state", payload: { state } }),
      expression: (expressionId) => send({ type: "expression", payload: { expressionId } }),
      motion: (motionId) => send({ type: "motion", payload: { motionId } }),
      setLevel: (l) => send({ type: "set_level", payload: { level: l } }),
      setTts: (enabled) => send({ type: "set_tts", payload: { enabled } }),
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
        createElement("iframe", {
          ref: iframeRef,
          src: env.avatarUrl,
          title: "苏格拉底虚拟人",
          sandbox: "allow-scripts allow-same-origin",
          allow: "autoplay; microphone",
          style: { border: "none", width: "100%", height: "100%", display: "block" },
          onError: () => {
            setLoadFailed(true);
            setLevel(4);
          },
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    overflow: "hidden",
  },
});
