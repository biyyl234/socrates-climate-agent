/**
 * Socrates Design Tokens (frozen).
 * Source: Socrates final project report §2.6. Natural / academic direction:
 * ink-green primary, cream + terracotta. No indigo/purple as primary.
 * Both web (react-native-web) and native (Expo) consume these values.
 */

export const palette = {
  // Light mode
  primary: "#2F5D50",
  primaryStrong: "#24483E",
  primarySoft: "#E4EDE8",
  secondary: "#C97B5A",
  secondarySoft: "#F6E7DF",
  sage: "#9DB8A3",
  sand: "#E8DFCF",
  bg: "#F7F3EA",
  surface: "#FFFFFF",
  surfaceAlt: "#F1EBDD",
  textPrimary: "#1F2A26",
  textSecondary: "#56645E",
  textTertiary: "#8A968F",
  textDisabled: "#B9C2BD",
  border: "#D9D2C4",
  success: "#3E8E6E",
  warning: "#C98A2D",
  danger: "#B5504A",
  info: "#4A7FA6",
  // Dark mode
  bgDark: "#141B18",
  surfaceDark: "#1D2622",
  surfaceAltDark: "#26312C",
  primaryDark: "#7FAF9E",
  secondaryDark: "#D99A7E",
  textPrimaryDark: "#E9EFEB",
  textSecondaryDark: "#AEB9B3",
  borderDark: "#38443E",
  successDark: "#6BB593",
  warningDark: "#E0A955",
  dangerDark: "#D4736C",
  infoDark: "#7FA8C9",
} as const;

export const colorTokens = {
  light: {
    "color-primary": palette.primary,
    "color-primary-strong": palette.primaryStrong,
    "color-primary-soft": palette.primarySoft,
    "color-secondary": palette.secondary,
    "color-secondary-soft": palette.secondarySoft,
    "color-accent-sage": palette.sage,
    "color-sand": palette.sand,
    "color-bg": palette.bg,
    "color-surface": palette.surface,
    "color-surface-alt": palette.surfaceAlt,
    "color-text-primary": palette.textPrimary,
    "color-text-secondary": palette.textSecondary,
    "color-text-tertiary": palette.textTertiary,
    "color-text-disabled": palette.textDisabled,
    "color-border": palette.border,
    "color-success": palette.success,
    "color-warning": palette.warning,
    "color-danger": palette.danger,
    "color-info": palette.info,
  },
  dark: {
    "color-bg": palette.bgDark,
    "color-surface": palette.surfaceDark,
    "color-surface-alt": palette.surfaceAltDark,
    "color-primary": palette.primaryDark,
    "color-secondary": palette.secondaryDark,
    "color-text-primary": palette.textPrimaryDark,
    "color-text-secondary": palette.textSecondaryDark,
    "color-border": palette.borderDark,
    "color-success": palette.successDark,
    "color-warning": palette.warningDark,
    "color-danger": palette.dangerDark,
    "color-info": palette.infoDark,
  },
} as const;

export const fontStack = {
  serif: '"Noto Serif SC", "Source Han Serif SC", "Songti SC", "STSong", Georgia, serif',
  sans: '"Noto Sans SC", "Source Han Sans SC", "PingFang SC", "Microsoft YaHei", Inter, system-ui, -apple-system, sans-serif',
  mono: '"JetBrains Mono", Consolas, "Courier New", monospace',
} as const;

export const fontSize = {
  xs: { px: 12, rem: 0.75, lineHeight: 1.5, weight: 400 },
  sm: { px: 14, rem: 0.875, lineHeight: 1.5, weight: 400 },
  base: { px: 16, rem: 1.0, lineHeight: 1.6, weight: 400 },
  md: { px: 18, rem: 1.125, lineHeight: 1.5, weight: 500 },
  lg: { px: 20, rem: 1.25, lineHeight: 1.4, weight: 500 },
  xl: { px: 24, rem: 1.5, lineHeight: 1.3, weight: 600 },
  xxl: { px: 32, rem: 2.0, lineHeight: 1.2, weight: 600 },
} as const;

export const fontWeight = { regular: 400, medium: 500, semibold: 600 } as const;

export const spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  12: 48,
  16: 64,
} as const;

export const radius = { s: 8, m: 12, l: 16, pill: 999 } as const;

export const shadow = {
  card: "0 1px 2px rgba(31,42,38,0.08), 0 2px 8px rgba(31,42,38,0.06)",
  raised: "0 4px 12px rgba(31,42,38,0.12), 0 2px 4px rgba(31,42,38,0.08)",
  overlay: "0 12px 32px rgba(31,42,38,0.18)",
} as const;

export const zIndex = { base: 0, content: 10, sticky: 50, modal: 100, toast: 200 } as const;

export const motion = {
  fast: 150,
  normal: 250,
  slow: 400,
  easeStandard: "cubic-bezier(0.2, 0, 0, 1)",
  easeEmphasis: "cubic-bezier(0.2, 0, 0.2, 1)",
} as const;

/** CSS custom properties block for the light theme (web). */
export function cssVariables(theme: "light" | "dark" = "light"): string {
  const tokens = colorTokens[theme];
  return Object.entries(tokens)
    .map(([k, v]) => `--${k}: ${v};`)
    .join("\n");
}
