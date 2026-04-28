/**
 * Slaze Core Injector
 *
 * Scans the page for unprocessed post elements, collects them into a
 * batch, fetches all ratings in a single API call, then inserts quality
 * badges and vote menus. Uses a MutationObserver to handle infinite-
 * scroll / SPA navigation.
 */

import type { PlatformAdapter, Rating } from '../../shared/types';
import { PROCESSED_ATTR, platformVoteBucket } from '../config';
import { cache, fetchBatchRatings } from './api';
import { createBadge } from '../ui/badge';
import { getVoteMenuInjector } from '../ui/vote-menu/voteMenuRegistry';

interface PendingPost {
  platform: string;
  postId: string;
  cacheKey: string;
  pvBucket: number;
  timeBucket: number;
  resolve: (data: Rating | null) => void;
  reject: () => void;
}

/** Inject the Slaze.it vote menu onto unprocessed post cards. */
function injectVoteMenus(adapter: PlatformAdapter, onlyIn?: Iterable<Element>): void {
  const menu = getVoteMenuInjector(adapter.hostname);
  if (!menu) return;

  const posts = onlyIn
    ? Array.from(onlyIn)
    : Array.from(document.querySelectorAll(`${adapter.postSelector}:not([${PROCESSED_ATTR}])`));
  for (const post of posts) {
    if (
      typeof adapter.isComment === "function" &&
      adapter.isComment(post)
    )
      continue;
    const postId = adapter.getPostId(post);
    if (!postId) continue;
    menu(post, adapter, postId);
  }
}

/**
 * Collect all unprocessed posts, batch-fetch their ratings,
 * then inject badges.
 */
async function scan(adapter: PlatformAdapter): Promise<void> {
  const selector = `${adapter.postSelector}:not([${PROCESSED_ATTR}])`;
  const posts = document.querySelectorAll(selector);
  if (!posts.length) return;

  injectVoteMenus(adapter, posts);

  // Phase 1: Mark all posts and collect metadata
  const pending: PendingPost[] = [];

  for (const post of posts) {
    post.setAttribute(PROCESSED_ATTR, "");

    if (
      typeof adapter.isComment === "function" &&
      adapter.isComment(post)
    )
      continue;

    const postId = adapter.getPostId(post);
    if (!postId) continue;

    const anchor = adapter.getInsertionPoint(post);
    if (!anchor?.parentElement) continue;

    const cacheKey = `${adapter.hostname}::${postId}`;

    // Create badge placeholder for perceived speed
    const { el, resolve, reject } = createBadge();
    anchor.parentElement.insertBefore(el, anchor);

    // Check in-memory cache first
    const cached = cache.get(cacheKey);
    if (cached !== undefined) {
      resolve(cached);
      continue;
    }

    const pvBucket = adapter.getPlatformVotes
      ? platformVoteBucket(adapter.getPlatformVotes(post))
      : 0;
    const timeBucket = adapter.getPostTimeBucket
      ? adapter.getPostTimeBucket(post)
      : 0;

    pending.push({
      platform: adapter.hostname,
      postId,
      cacheKey,
      pvBucket,
      timeBucket,
      resolve,
      reject,
    });
  }

  if (!pending.length) return;

  // Phase 2: Batch-fetch all uncached posts in one API call
  const items = pending.map(
    ({ platform, postId, cacheKey, pvBucket, timeBucket }) => ({
      platform,
      postId,
      cacheKey,
      pvBucket,
      timeBucket,
    })
  );

  const batchResults = await fetchBatchRatings(items);

  // Phase 3: Resolve all badge placeholders
  for (const p of pending) {
    const data = batchResults.get(p.cacheKey) || null;
    p.resolve(data);
  }
}

// ── Public API ────────────────────────────────────────────────────

/**
 * Run an initial scan and then watch for DOM changes
 * (infinite scroll, SPA route changes).
 */
export function observe(adapter: PlatformAdapter): void {
  scan(adapter);

  let debounceTimer: ReturnType<typeof setTimeout>;
  new MutationObserver((mutations) => {
    // Only trigger if an added node could contain a new post.
    const relevant = mutations.some((m) => {
      for (const node of m.addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        const el = node as Element;
        if (el.matches?.(adapter.postSelector)) return true;
        if (el.querySelector?.(adapter.postSelector)) return true;
      }
      return false;
    });
    if (!relevant) return;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => scan(adapter), 150);
  }).observe(document.body, {
    childList: true,
    subtree: true,
  });
}
