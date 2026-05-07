/**
 * Slaze API Client (Content Script Side)
 *
 * Fetches and submits category verdicts from/to the Slaze backend.
 * All requests route through the background service worker (no CORS).
 *
 * Return value semantics:
 *   Rating object: post has been rated; served from cache after first load
 *   null: post exists but has no ratings yet (404); cached
 *   undefined: network/server error; NOT cached so next scroll retries
 */

import type {
  Rating,
  RatingResult,
  BatchItem,
  BatchFetchResponse,
  SingleFetchResponse,
  SubmitVoteResponse,
  BinaryRatingEntry,
  VerdictHeader,
} from '../../shared/types';
import {
  CACHE_TTL_MS,
  unpackVerdict,
  categoryIndexToId,
  platformVoteBucket,
  packVotePayload,
  adaptiveTTL,
  API_BASE,
} from '../config';
import { TtlCache } from './cache';

// ── Cache singleton ────────────────────────────────────────────────

const cache = new TtlCache<Rating | null>();

// ── ETag / Batch Parsing ───────────────────────────────────────────

/** Parse an ETag into a stripped-down Rating object (no verdict engine fields). */
function parseVerdictETag(
  etag: string | null,
  pvBucket: number
): Omit<Rating, keyof VerdictHeader> | null {
  if (!etag) return null;

  const packed = etag.replace(/^W\//, "").replace(/^"|"$/g, "");

  const verdict = unpackVerdict(packed);
  if (!verdict) return null;

  return {
    category: verdict.category,
    label: verdict.label,
    percent: verdict.percent,
    voteBucket: pvBucket,
    categoryPercents: null,
  };
}

/** Convert a binary-batch record to a normalized Rating object. */
function parseBatchRecord(
  record: BinaryRatingEntry | null,
  pvBucket: number
): Rating | null {
  if (!record) return null;

  const label = categoryIndexToId(record.category);
  if (!label) return null;

  const categoryPercents =
    Array.isArray(record.percents) && record.percents.length === 9
      ? record.percents.slice(0, 9)
      : null;

  const data: Rating = {
    category: record.category,
    label,
    percent: record.percent,
    voteBucket: pvBucket,
    categoryPercents,
  };

  // Verdict engine fields from v2 binary batch protocol
  if (record.labelPhrase) data.labelPhrase = record.labelPhrase;
  if (record.labelSubtext) data.labelSubtext = record.labelSubtext;
  if (record.signatureState !== undefined)
    data.signatureState = record.signatureState;
  if (record.signatureCategories)
    data.signatureCategories = record.signatureCategories;

  return data;
}

// ── Public API ─────────────────────────────────────────────────────

/**
 * Fetch the community rating for a single post.
 *
 * @returns Rating object (rated), null (unrated/404), or undefined (error).
 */
export async function fetchRating(
  platform: string,
  postId: string,
  platformVotes = 0,
  timeBucket = 0
): Promise<RatingResult> {
  const cacheKey = `${platform}::${postId}`;

  // undefined = cache miss; null = "cached unrated"
  const cached = cache.get(cacheKey);
  if (cached !== undefined) return cached;

  const pvBucket = platformVoteBucket(platformVotes);
  const stale = cache.getStale(cacheKey);
  const staleEtag = stale?.etag ?? null;

  let response: SingleFetchResponse;
  try {
    response = (await chrome.runtime.sendMessage({
      type: "SLAZE_FETCH_SINGLE",
      platform,
      postId,
      pvBucket,
      timeBucket,
      staleEtag,
    })) as SingleFetchResponse;
  } catch {
    return undefined;
  }

  if (!response || !response.ok) return undefined;

  const { status, etag, cacheControl } = response;

  let ttlMs = CACHE_TTL_MS;
  if (cacheControl) {
    const match = cacheControl.match(/max-age=(\d+)/);
    if (match) ttlMs = parseInt(match[1], 10) * 1000;
  }

  if (status === 404) {
    cache.set(cacheKey, null, CACHE_TTL_MS);
    return null;
  }

  if (status === 429) return undefined;

  if (status === 304 && stale?.value) {
    cache.set(cacheKey, stale.value, ttlMs, etag ?? staleEtag);
    return stale.value as Rating;
  }

  if (status === 204) {
    const data = parseVerdictETag(etag, pvBucket);
    if (!data) return undefined;
    // Merge verdict label surfaced via X-Slaze-* response headers.
    const merged: Rating = response.verdict
      ? { ...data, ...response.verdict }
      : (data as unknown as Rating);
    cache.set(cacheKey, merged, ttlMs, etag);
    return merged;
  }

  return undefined;
}

/**
 * Fetch ratings for multiple posts in a single binary-protocol request.
 * Routes via background service worker with no CORS.
 * Returns a Map<cacheKey, Rating> for found posts.
 */
export async function fetchBatchRatings(
  items: BatchItem[]
): Promise<Map<string, Rating>> {
  const results = new Map<string, Rating>();
  if (!items.length) return results;

  // Filter out items already in cache
  const uncached = items.filter((item) => {
    const cached = cache.get(item.cacheKey);
    if (cached !== undefined) {
      if (cached !== null) results.set(item.cacheKey, cached);
      return false;
    }
    return true;
  });

  if (!uncached.length) return results;

  let response: BatchFetchResponse;
  try {
    response = (await chrome.runtime.sendMessage({
      type: "SLAZE_FETCH_BATCH",
      items: uncached,
    })) as BatchFetchResponse;
  } catch {
    return results;
  }

  if (!response || !response.ok || !response.ratings) return results;

  for (const item of uncached) {
    const record = response.ratings[item.cacheKey];
    if (record === undefined) {
      console.warn("[Slaze] Expected key missing from batch response:", item.cacheKey);
      continue;
    }

    if (record === null) {
      // Server has no rating for this post; cache as null
      cache.set(item.cacheKey, null, CACHE_TTL_MS);
      continue;
    }

    const ttlMs = adaptiveTTL(item.pvBucket ?? 0, item.timeBucket ?? 0);

    const rating = parseBatchRecord(record, item.pvBucket ?? 0);
    if (!rating) continue;

    cache.set(item.cacheKey, rating, ttlMs);
    results.set(item.cacheKey, rating);
  }

  return results;
}

/**
 * Submit compact category vote payload via background service worker.
 *
 * @param categoryIds - 1..3 unique category IDs
 * @param contextCode - 0 = feed vote, 1 = post-page vote
 * @param dwellMs - time (ms) between menu open and vote submit
 */
export async function submitVote(
  platform: string,
  postId: string,
  categoryIds: string[],
  contextCode = 0,
  platformVotes = 0,
  timeBucket = 0,
  dwellMs = 0
): Promise<{
  ok: boolean;
  status: number;
  etag?: string | null;
  rating?: Rating;
  errorLabel?: string;
}> {
  const pvBucket = platformVoteBucket(platformVotes);
  const payload = packVotePayload(
    categoryIds,
    contextCode,
    pvBucket,
    timeBucket,
    dwellMs
  );
  if (!payload) return { ok: false, status: 400 };

  let response: SubmitVoteResponse;
  try {
    response = (await chrome.runtime.sendMessage({
      type: "SLAZE_SUBMIT_VOTE",
      platform,
      postId,
      payload,
    })) as SubmitVoteResponse;
  } catch {
    return { ok: false, status: 0 };
  }

  if (!response) return { ok: false, status: 0 };
  if (!response.ok || response.status !== 204) return { ...response, errorLabel: response.errorLabel };

  // ── Build rating from vote response (verdict via ETag + headers) ──
  const cacheKey = `${platform}::${postId}`;
  const ttlMs = adaptiveTTL(pvBucket, timeBucket);

  let rating = parseVerdictETag(response.etag, pvBucket) as Rating | null;
  if (rating && response.verdict) {
    rating = { ...rating, ...response.verdict };
  }
  if (rating) {
    cache.set(cacheKey, rating, ttlMs, response.etag ?? null);
  }

  // Fire batch refresh asynchronously — don't block the UI on it.
  // Vote response already has verdict via ETag + X-Slaze-* headers.
  // Batch refresh only adds category percent bars for the dropdown.
  const finalRating = rating;
  fetchBatchRatings([
    { platform, postId, cacheKey, pvBucket, timeBucket },
  ]).then((refreshed) => {
    if (refreshed.has(cacheKey)) {
      const merged: Rating = { ...refreshed.get(cacheKey)! };
      if (finalRating?.labelPhrase) merged.labelPhrase = finalRating.labelPhrase;
      if (finalRating?.labelSubtext) merged.labelSubtext = finalRating.labelSubtext;
      if (finalRating?.signatureState !== undefined)
        merged.signatureState = finalRating.signatureState;
      cache.set(cacheKey, merged, ttlMs);
    }
  }).catch(() => { /* non-critical — verdict already shown */ });

  return { ...response, rating: rating ?? undefined };
}

/** Expose cache for use by injector, messaging, badge modules. */
export { cache };
