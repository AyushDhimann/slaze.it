/**
 * Slaze Content Script Configuration & Helpers
 *
 * Central constants, category definitions, vote-bucket math, and
 * verdict packing/unpacking. Everything that doesn't need its own module.
 */

import { API_BASE, CACHE_KEY_SEP, CATEGORY_COUNT } from '../shared/config';
import { CATEGORY_IDS } from './ui/vote-menu/categories';

// ── Configuration ──────────────────────────────────────────────────

export { API_BASE, CACHE_KEY_SEP, CATEGORY_COUNT, CATEGORY_IDS };

/** How long to keep a rating cached in memory (5 min default). */
export const CACHE_TTL_MS = 5 * 60 * 1000;

/** HTML attribute stamped on every post element that has already been processed. */
export const PROCESSED_ATTR = "data-slaze-processed";

export type CategoryId = (typeof CATEGORY_IDS)[number];

export const LABEL_DISPLAY: Record<CategoryId, string> = {
  genuine: "Genuine",
  helpful: "Helpful",
  wholesome: "Wholesome",
  "ad-promo": "Ad & Promo",
  "ai-slop": "AI Slop",
  bait: "Bait",
  brainrot: "Brainrot",
  misleading: "Misleading",
  rant: "Rant",
};

const CATEGORY_ID_TO_INDEX: Record<CategoryId, number> = CATEGORY_IDS.reduce(
  (acc, id, idx) => {
    acc[id] = idx;
    return acc;
  },
  {} as Record<string, number>
);

export const VOTE_BUCKET_RANGES = [
  "0–10",
  "11–36",
  "37–100",
  "101–367",
  "368–1024",
  "1025–3072",
  "3073–10000",
  "10001–30000",
  "30001–50000",
  "50001+",
];

// ── Runtime config override ────────────────────────────────────────

/** Allow popup/dev tools to store a runtime API base override in chrome.storage. */
export function setApiBase(_url: string): void {
  // API_BASE is now const from shared/config. Override via chrome.storage.local
  // with key "slaze_api_base" — the background worker reads this on startup.
}

// ── Category Helpers ───────────────────────────────────────────────

/** Convert numeric category index (0–8) to canonical category ID. */
export function categoryIndexToId(index: number): CategoryId | null {
  if (index < 0 || index >= CATEGORY_IDS.length) return null;
  return CATEGORY_IDS[index];
}

/** Convert category ID to numeric index used by the compact protocol. */
export function categoryIdToIndex(id: string): number | undefined {
  return CATEGORY_ID_TO_INDEX[id as CategoryId];
}

/**
 * Decode packed verdict from ETag-safe payload: c<cat>p<pct3>.
 * Example: "c3p067" → { category: 3, label: "ad-promo", percent: 67 }
 */
export function unpackVerdict(
  s: string
): { category: number; label: string; percent: number } | null {
  if (!s || s.length !== 6 || s[0] !== "c" || s[2] !== "p") return null;
  const category = parseInt(s[1], 10);
  const percent = parseInt(s.slice(3), 10);
  if (Number.isNaN(category) || category < 0 || category > 8) return null;
  if (Number.isNaN(percent) || percent < 0 || percent > 100) return null;
  const label = categoryIndexToId(category);
  if (!label) return null;
  return { category, label, percent };
}

/**
 * Build compact vote payload: v<cats>p<0|1>u<0-9>t<0-9>[d<dwellMs>]
 *
 * @param categoryIds - 1..3 unique category IDs (e.g. ["genuine", "helpful"])
 * @param contextCode - 0 = feed vote, 1 = post-page vote
 * @param upvoteBucket - platform vote bucket 0-9
 * @param ageBucket - post age bucket 0-9
 * @param dwellMs - optional dwell time clamped to [0, 9999999]
 */
export function packVotePayload(
  categoryIds: string[],
  contextCode: number,
  upvoteBucket: number,
  ageBucket: number,
  dwellMs?: number
): string | null {
  if (!Array.isArray(categoryIds)) return null;
  const unique = new Set(categoryIds);
  if (unique.size === 0 || unique.size > 3) return null;

  const indexes: number[] = [];
  for (const id of unique) {
    const idx = categoryIdToIndex(id);
    if (idx === undefined) return null; // reject invalid category IDs
    indexes.push(idx);
  }
  indexes.sort((a, b) => a - b);

  if (indexes.length === 0 || indexes.length > 3) {
    return null;
  }

  const p = contextCode === 1 ? 1 : 0;
  const u = Math.max(0, Math.min(9, Math.floor(upvoteBucket) || 0));
  const t = Math.max(0, Math.min(9, Math.floor(ageBucket) || 0));

  let base = `v${indexes.join("")}p${p}u${u}t${t}`;

  const dwell = parseInt(String(dwellMs), 10);
  if (Number.isFinite(dwell) && dwell > 0) {
    const clamped = Math.min(9_999_999, Math.max(0, Math.floor(dwell)));
    base += `d${clamped}`;
  }
  return base;
}

// ── Vote Bucket Helpers ────────────────────────────────────────────

/** Maps a raw platform upvote count to a vote bucket 0–9. */
export function platformVoteBucket(n: number): number {
  if (n <= 10) return 0;
  if (n <= 36) return 1;
  if (n <= 100) return 2;
  if (n <= 367) return 3;
  if (n <= 1024) return 4;
  if (n <= 3072) return 5;
  if (n <= 10000) return 6;
  if (n <= 30000) return 7;
  if (n <= 50000) return 8;
  return 9;
}

/** Convert an ISO datetime string to a time bucket 0–9. */
export function timeBucketFromISO(isoString: string): number {
  try {
    const ageMs = Date.now() - new Date(isoString).getTime();
    return timeBucketFromMs(ageMs);
  } catch {
    return 0;
  }
}

/**
 * Convert age in milliseconds to a time bucket 0–9.
 *
 *  0: <1 h     1: 1-6 h     2: 6-24 h     3: 1-3 d     4: 3-7 d
 *  5: 1-4 w    6: 1-3 mo    7: 3-6 mo    8: 6-24 mo   9: 24+ mo
 */
export function timeBucketFromMs(ageMs: number): number {
  const hours = ageMs / 3_600_000;
  if (hours < 1) return 0;
  if (hours < 6) return 1;
  if (hours < 24) return 2;
  if (hours < 72) return 3;
  if (hours < 168) return 4;
  if (hours < 720) return 5;   // 30 days
  if (hours < 2160) return 6;  // 90 days
  if (hours < 4380) return 7;  // 6 months
  if (hours < 17520) return 8; // 2 years
  return 9;
}

// ── Adaptive TTL ───────────────────────────────────────────────────

/**
 * Compute an adaptive cache TTL from client-side hint buckets.
 * Mirrors the server-side Go AdaptiveTTLWithContext with base=5 s.
 */
export function adaptiveTTL(pvBucket: number, timeBucket: number): number {
  const baseMs = 5_000;
  const ageMultiplier = [1, 1, 1.5, 2, 3, 4, 6, 10, 16, 24];
  const activityDivisor = [1, 1, 1, 1, 1.5, 2, 2.5, 3, 3, 3];
  const am =
    timeBucket >= 0 && timeBucket <= 9 ? ageMultiplier[timeBucket] : 1;
  const ad = pvBucket >= 0 && pvBucket <= 9 ? activityDivisor[pvBucket] : 1;
  const ttlMs = (baseMs * am) / ad;
  // Clamp: 5 s – 24 h
  return Math.max(5_000, Math.min(ttlMs, 86_400_000));
}
