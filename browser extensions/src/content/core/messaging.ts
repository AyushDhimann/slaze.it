/**
 * Slaze Content Script Messaging
 *
 * Handles messages from the popup:
 *
 *   SLAZE_GET_POSTS      → returns list of detected posts on the page
 *   SLAZE_REFRESH_BADGE  → re-fetches rating for a specific post
 *   SLAZE_TOKEN_CHANGED  → clears cached token (dev mode toggle)
 */

import { PROCESSED_ATTR } from '../config';
import { cache, fetchRating } from './api';
import { updateBadge } from '../ui/badge';
import { detectPlatform } from '../platforms/index';
import type { PlatformPost } from '../../shared/types';

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  const m = msg as { type: string; platform?: string; postId?: string };

  if (m.type === "SLAZE_GET_POSTS") {
    sendResponse(collectPosts());
    return false;
  }

  if (m.type === "SLAZE_REFRESH_BADGE") {
    if (!m.platform || !m.postId) {
      sendResponse({ ok: false, error: "missing platform or postId" });
      return false;
    }
    refreshBadge(m.platform, m.postId).catch((err: unknown) => {
      console.warn("[Slaze] refreshBadge failed:", err instanceof Error ? err.message : String(err));
    });
    sendResponse({ ok: true });
    return false;
  }

  if (m.type === "SLAZE_TOKEN_CHANGED") {
    // Token was changed externally — background worker handles the actual refresh.
    sendResponse({ ok: true });
    return false;
  }
});

/**
 * Gather all posts on the page that Slaze has already processed.
 * Returns an array of { postId, platform, title }.
 */
function collectPosts(): PlatformPost[] {
  const adapter = detectPlatform();
  if (!adapter) return [];

  const posts = document.querySelectorAll(`[${PROCESSED_ATTR}]`);
  const result: PlatformPost[] = [];

  for (const post of posts) {
    const postId = adapter.getPostId(post);
    if (!postId) continue;

    const title =
      (adapter.getTitle ? adapter.getTitle(post) : null) || postId;

    result.push({
      postId,
      platform: adapter.hostname,
      title: title.trim(),
    });
  }

  return result;
}

/**
 * Invalidate cache for a post and update its badge in-place.
 */
async function refreshBadge(
  platform: string,
  postId: string
): Promise<void> {
  // Evict the cached entry so the next fetch hits the API.
  const cacheKey = `${platform}::${postId}`;
  cache.invalidate(cacheKey);

  const adapter = detectPlatform();
  if (!adapter) return;

  const attr = PROCESSED_ATTR;
  for (const post of document.querySelectorAll(`[${attr}]`)) {
    if (adapter.getPostId(post) !== postId) continue;

    const badge = post.querySelector(".slaze-badge");
    if (!badge) continue;

    // Re-extract platform signals for the re-fetch
    const platformVotes = adapter.getPlatformVotes
      ? adapter.getPlatformVotes(post)
      : 0;
    const timeBucket = adapter.getPostTimeBucket
      ? adapter.getPostTimeBucket(post)
      : 0;

    const data = await fetchRating(
      platform,
      postId,
      platformVotes,
      timeBucket
    );
    updateBadge(badge as HTMLElement, data);
    break;
  }
}
