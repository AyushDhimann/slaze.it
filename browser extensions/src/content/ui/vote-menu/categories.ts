/**
 * Slaze Shared Vote Categories
 *
 * Single source of truth for category definitions and IDs. All modules
 * that need category IDs or labels should import from here or via config.ts.
 * Keep in sync with verdictCatalog.ts (Go backend mirror).
 */

import type { CategoryDef } from '../../../shared/types';

export const CATEGORIES: CategoryDef[] = [
  // Positive (indices 0–2)
  {
    id: "genuine",
    label: "Genuine",
    icon: "genuine",
    color: "#22c55e",
    bg: "rgba(34,197,94,0.12)",
    group: "positive",
  },
  {
    id: "helpful",
    label: "Helpful",
    icon: "helpful",
    color: "#10b981",
    bg: "rgba(16,185,129,0.12)",
    group: "positive",
  },
  {
    id: "wholesome",
    label: "Wholesome",
    icon: "wholesome",
    color: "#06b6d4",
    bg: "rgba(6,182,212,0.12)",
    group: "positive",
  },
  // Negative (indices 3–8)
  {
    id: "ad-promo",
    label: "Ad & Promo",
    icon: "ad-promo",
    color: "#e11d48",
    bg: "rgba(225,29,72,0.12)",
    group: "negative",
  },
  {
    id: "ai-slop",
    label: "AI Slop",
    icon: "ai-slop",
    color: "#ef4444",
    bg: "rgba(239,68,68,0.12)",
    group: "negative",
  },
  {
    id: "bait",
    label: "Bait",
    icon: "bait",
    color: "#f97316",
    bg: "rgba(249,115,22,0.12)",
    group: "negative",
  },
  {
    id: "brainrot",
    label: "Brainrot",
    icon: "brainrot",
    color: "#a855f7",
    bg: "rgba(168,85,247,0.12)",
    group: "negative",
  },
  {
    id: "misleading",
    label: "Misleading",
    icon: "misleading",
    color: "#3b82f6",
    bg: "rgba(59,130,246,0.12)",
    group: "negative",
  },
  {
    id: "rant",
    label: "Rant",
    icon: "rant",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.12)",
    group: "negative",
  },
];

/** Category IDs in index order (0–8). Must stay in sync with CATEGORIES array above. */
export const CATEGORY_IDS = [
  "genuine",
  "helpful",
  "wholesome",
  "ad-promo",
  "ai-slop",
  "bait",
  "brainrot",
  "misleading",
  "rant",
] as const;

export type CategoryId = (typeof CATEGORY_IDS)[number];
