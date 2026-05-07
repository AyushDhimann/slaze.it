/**
 * Slaze Shared Configuration
 *
 * Single source of truth for constants shared across background, content, and popup.
 * Import from this module instead of hardcoding API_BASE, cache sizes, or category counts.
 */

/** Base URL for the Slaze backend API. Inlined at build time by Plasmo. */
export const API_BASE = process.env.PLASMO_PUBLIC_SLAZE_API_BASE || "https://api.slaze.it.com/v1";

/** Shared secret for HMAC request signing. Inlined at build time by Plasmo. */
export const API_SECRET = process.env.PLASMO_PUBLIC_SLAZE_API_SECRET || "";

/** Maximum clock skew for signed requests (seconds). */
export const SIGNING_WINDOW_SEC = 300;

/** Number of category indices in the rating system (0–8). */
export const CATEGORY_COUNT = 9;

/** Default cache capacity (entries). */
export const CACHE_MAX_SIZE = 500;

/** Minimum adaptive TTL in milliseconds. */
export const ADAPTIVE_TTL_MIN_MS = 5_000;

/** Maximum adaptive TTL in milliseconds (24 hours). */
export const ADAPTIVE_TTL_MAX_MS = 86_400_000;

/** Separator used in cache keys: `${platform}${SEP}${postId}`. */
export const CACHE_KEY_SEP = "::";

// ── Plan display names (mirrors slaze.it-website/lib/constants.ts) ────

export const PLAN_DISPLAY: Record<string, string> = {
  free: "Free",
  hour_boost: "Hour Boost",
  day_boost: "Day Boost",
  week_boost: "Week Boost",
  month_pass: "Month Pass",
  quarter_pass: "Quarter Pass",
  year_pass: "Year Pass",
};

/** Upgrade URL — opens the website pricing page. Uses Clerk sync host as base. */
export const UPGRADE_URL = `${process.env.PLASMO_PUBLIC_CLERK_SYNC_HOST || "https://slaze.it.com"}/pricing`;
