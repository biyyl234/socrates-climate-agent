/**
 * Global theme provider: resolves light/dark (system default, manual override),
 * exposes frozen-token colors, spacing/radius/motion helpers and responsive
 * breakpoints. Persists the manual choice locally.
 */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useColorScheme, useWindowDimensions } from "react-native";
import type { TextStyle } from "react-native";
import {
  schemeColors,
  themeSpacing,
  themeRadius,
  themeMotion,
  fontStyle,
  fontFamilies,
  type Scheme,
  type ThemeColors,
  type ThemeMode,
} from "./theme";

export type { ThemeMode };

type FontToken = "xs" | "sm" | "base" | "md" | "lg" | "xl" | "xxl";
import { readString, writeString } from "../services/storage";

const THEME_KEY = "theme";

interface ThemeContextValue {
  scheme: Scheme;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  c: ThemeColors;
  space: typeof themeSpacing;
  radius: typeof themeRadius;
  motion: typeof themeMotion;
  width: number;
  height: number;
  isWide: boolean;
  font: (variant: FontToken, serif?: boolean) => TextStyle;
  fontFamilies: typeof fontFamilies;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("system");
  const { width, height } = useWindowDimensions();

  useEffect(() => {
    void readString(THEME_KEY).then((saved) => {
      if (saved === "light" || saved === "dark" || saved === "system") {
        setModeState(saved);
      }
    });
  }, []);

  const scheme: Scheme =
    mode === "system" ? (systemScheme === "dark" ? "dark" : "light") : mode;

  const setMode = (next: ThemeMode) => {
    setModeState(next);
    void writeString(THEME_KEY, next);
  };

  const value = useMemo<ThemeContextValue>(
    () => ({
      scheme,
      mode,
      setMode,
      c: schemeColors[scheme],
      space: themeSpacing,
      radius: themeRadius,
      motion: themeMotion,
      width,
      height,
      isWide: width >= 900,
      font: (variant, serif) => fontStyle(variant, serif),
      fontFamilies,
    }),
    [scheme, mode, width, height],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
