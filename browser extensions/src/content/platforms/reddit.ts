/**
 * Slaze Reddit Platform Adapter
 *
 * Supports the current "new Reddit" (shreddit web components).
 * Shadow DOM-aware: shreddit-post elements use open shadow roots,
 * so selectors must pierce through when needed.
 */

import type { PlatformAdapter } from '../../shared/types';
import { timeBucketFromISO } from '../config';
import { registerAdapter } from './index';

const redditAdapter: PlatformAdapter = {
  hostname: "reddit.com",

  postSelector: "shreddit-post",

  getPostId(post: Element) {
    // New Reddit: <shreddit-post id="t3_abc123" ...>
    // permalink is intentionally excluded; it's mutable (cross-posts, edited slugs).
    return (
      post.getAttribute("id") ||
      post.getAttribute("content-id") ||
      null
    );
  },

  getTitle(post: Element) {
    return (
      post.getAttribute("post-title") ||
      post.querySelector("[slot='title']")?.textContent?.slice(0, 120) ||
      null
    );
  },

  getInsertionPoint(post: Element) {
    const join = post.querySelector("shreddit-join-button");
    if (join) return join;

    const overflow = post.querySelector("shreddit-post-overflow-menu");
    if (!overflow) return null;

    return overflow.closest("shreddit-async-loader") || overflow;
  },

  getShareAnchor(post: Element) {
    const directSelectors = [
      "shreddit-post-share",
      "shreddit-post-share-button",
      "button[aria-label='Share']",
      "button[aria-label*='Share']",
      "button[title='Share']",
      "button[title*='Share']",
      "faceplate-tracker[noun='share'] button",
    ];

    for (const selector of directSelectors) {
      const el = post.querySelector(selector);
      if (el) return el;
    }

    const shareTextButton = Array.from(
      post.querySelectorAll("button")
    ).find((btn) => {
      const text = (btn.textContent || "").trim().toLowerCase();
      const aria = (btn.getAttribute("aria-label") || "").toLowerCase();
      return text === "share" || aria === "share" || aria.includes("share");
    });

    return shareTextButton || null;
  },

  getActionRow(post: Element) {
    const share = this.getShareAnchor?.(post);
    if (share?.parentElement) return share.parentElement;

    return (
      post.querySelector("[role='group']") ||
      post.querySelector("[slot='action-row']") ||
      post.querySelector("[data-testid*='action']") ||
      null
    );
  },

  getPlatformVotes(post: Element) {
    // <shreddit-post score="1234">
    const raw = post.getAttribute("score");
    if (raw) {
      const n = parseInt(raw, 10);
      if (!isNaN(n) && n >= 0) return n;
    }
    const scoreEl = post.querySelector(
      "faceplate-number, [id*='vote-count'], shreddit-score"
    );
    if (scoreEl) {
      const n = parseInt(
        (scoreEl.textContent ?? "").replace(/[^\d-]/g, ""),
        10
      );
      if (!isNaN(n) && n >= 0) return n;
    }
    return 0;
  },

  getPostTimeBucket(post: Element) {
    const timeEl = post.querySelector(
      "time[datetime], faceplate-timeago time[datetime]"
    );
    if (!timeEl) return 0;
    return timeBucketFromISO(timeEl.getAttribute("datetime") ?? "");
  },
};

registerAdapter(redditAdapter);
