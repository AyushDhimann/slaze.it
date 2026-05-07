/**
 * Slaze Popup Design Tokens
 *
 * Single source of truth for all visual values.
 * Apple/Adobe-inspired: generous whitespace, subtle blur,
 * SF-style type scale, soft rounded rects.
 */

// ── Brand ───────────────────────────────────────────────────────

export const brand = {
  primary: "#4F46E5",
  primaryLight: "#6366F1",
  primaryDark: "#4338CA",
  primaryBg: "rgba(79, 70, 229, 0.06)",
  primaryBgHover: "rgba(79, 70, 229, 0.10)",
};

// ── Neutral (Slate scale) ────────────────────────────────────────

export const neutral = {
  50: "#F8FAFC",
  100: "#F1F5F9",
  200: "#E2E8F0",
  300: "#CBD5E1",
  400: "#94A3B8",
  500: "#64748B",
  600: "#475569",
  700: "#334155",
  800: "#1E293B",
  900: "#0F172A",
  950: "#020617",
};

// ── Semantic ─────────────────────────────────────────────────────

export const semantic = {
  success: "#059669",
  successBg: "rgba(5, 150, 105, 0.08)",
  warning: "#D97706",
  warningBg: "rgba(217, 119, 6, 0.08)",
  danger: "#DC2626",
  dangerBg: "rgba(220, 38, 38, 0.08)",
  info: "#2563EB",
  infoBg: "rgba(37, 99, 235, 0.08)",
};

// ── Spacing (4px grid) ───────────────────────────────────────────

export const space = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
};

// ── Typography ───────────────────────────────────────────────────

export const font = {
  family: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  mono: '"SF Mono", "Fira Code", "Fira Mono", "Roboto Mono", monospace',
  size: {
    xs: 10,
    sm: 11,
    base: 12,
    md: 13,
    lg: 14,
    xl: 16,
    "2xl": 18,
    "3xl": 20,
    "4xl": 24,
  },
  weight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  leading: {
    tight: 1.15,
    snug: 1.35,
    normal: 1.5,
    relaxed: 1.65,
  },
};

// ── Radii ────────────────────────────────────────────────────────

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
  full: 9999,
};

// ── Shadows ──────────────────────────────────────────────────────

export const shadow = {
  sm: "0 1px 2px rgba(0, 0, 0, 0.04)",
  md: "0 2px 8px rgba(0, 0, 0, 0.06)",
  lg: "0 4px 16px rgba(0, 0, 0, 0.08)",
  xl: "0 8px 32px rgba(0, 0, 0, 0.10)",
  ring: "0 0 0 3px rgba(79, 70, 229, 0.12)",
  ringSuccess: "0 0 0 3px rgba(5, 150, 105, 0.12)",
};

// ── Transitions ──────────────────────────────────────────────────

export const ease = {
  default: "cubic-bezier(0.25, 0.1, 0.25, 1)",
  spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
  smooth: "cubic-bezier(0.4, 0, 0.2, 1)",
};

export const duration = {
  fast: "120ms",
  normal: "200ms",
  slow: "300ms",
  molasses: "400ms",
};

// ── Glass ────────────────────────────────────────────────────────

export const glass = {
  bg: "rgba(255, 255, 255, 0.72)",
  blur: "blur(12px)",
  border: "rgba(0, 0, 0, 0.06)",
};
