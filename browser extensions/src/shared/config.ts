/**
 * Slaze Shared Configuration
 *
 * Single source of truth for constants shared across background, content, and popup.
 * Import from this module instead of hardcoding API_BASE, cache sizes, or category counts.
 */

/** Base URL for the Slaze backend API. */
export const API_BASE = "https://api.slaze.it.com/v1";

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
