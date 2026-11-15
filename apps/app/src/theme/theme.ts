/**
 * Theme mapping layer between the frozen design tokens (@socrates/core) and
 * React Native / react-native-web styles. Values are read verbatim from the
 * token package; this file only adds scheme resolution and style helpers.
 */
import {
  colorTokens,
  palette,
  fontStack,
  fontSize,
  fontWeight,
  spacing,
  radius,
  motion,
  zIndex,
} from "@socrates/core";
import type { TextStyle } from "react-native";

type FontSizeToken = keyof typeof fontSize;

export type Scheme = "light" | "dark";
export type ThemeMode = Scheme | "system";

export interface ThemeColors {
  primary: string;
  primaryStrong: string;
  primarySoft: string;
  secondary: string;
  secondarySoft: string;
  sage: string;
  sand: string;
  bg: string;
  surface: string;
  surfaceAlt: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textDisabled: string;
  border: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
}

function lightColors(): ThemeColors {
  const t = colorTokens.light;
  return {
    primary: t["color-primary"],
    primaryStrong: t["color-primary-strong"],
    primarySoft: t["color-primary-soft"],
    secondary: t["color-secondary"],
    secondarySoft: t["color-secondary-soft"],
    sage: t["color-accent-sage"],
    sand: t["color-sand"],
    bg: t["color-bg"],
    surface: t["color-surface"],
    surfaceAlt: t["color-surface-alt"],
    textPrimary: t["color-text-primary"],
    textSecondary: t["color-text-secondary"],
    textTertiary: t["color-text-tertiary"],
    textDisabled: t["color-text-disabled"],
    border: t["color-border"],
    success: t["color-success"],
    warning: t["color-warning"],
    danger: t["color-danger"],
    info: t["color-info"],
  };
}

function darkColors(): ThemeColors {
  const t = colorTokens.dark;
  return {
    primary: t["color-primary"],
    primaryStrong: palette.primaryStrong,
    primarySoft: t["color-surface-alt"],
    secondary: t["color-secondary"],
    secondarySoft: t["color-surface-alt"],
    sage: palette.sage,
    sand: t["color-surface-alt"],
    bg: t["color-bg"],
    surface: t["color-surface"],
    surfaceAlt: t["color-surface-alt"],
    textPrimary: t["color-text-primary"],
    textSecondary: t["color-text-secondary"],
    textTertiary: palette.textDisabled,
    textDisabled: palette.textDisabled,
    border: t["color-border"],
    success: t["color-success"],
    warning: t["color-warning"],
    danger: t["color-danger"],
    info: t["color-info"],
  };
}

export const schemeColors: Record<Scheme, ThemeColors> = {
  light: lightColors(),
  dark: darkColors(),
};

export const themeSpacing = spacing;
export const themeRadius = radius;
export const themeMotion = motion;
export const themeZIndex = zIndex;

export function fontStyle(variant: FontSizeToken, serif = false): TextStyle {
  const f = fontSize[variant];
  return {
    fontSize: f.px,
    lineHeight: f.lineHeight * f.px,
    fontWeight: fontWeight[f.weight === 400 ? "regular" : f.weight === 500 ? "medium" : "semibold"],
    fontFamily: serif ? fontStack.serif : fontStack.sans,
  };
}

export const fontFamilies = fontStack;
