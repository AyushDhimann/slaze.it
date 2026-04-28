/**
 * Slaze Twitter / X Platform Adapter
 *
 * Handles both x.com and twitter.com (they share the same DOM structure).
 * Registers two adapter entries with identical logic but different hostnames.
 */

import type { PlatformAdapter } from '../../shared/types';
import { timeBucketFromISO } from '../config';
import { registerAdapter } from './index';

function createTwitterAdapter(hostname: string): PlatformAdapter {
  return {
    hostname,

    // Every tweet is an <article data-testid="tweet">
    postSelector: 'article[data-testid="tweet"]',

    getPostId(post: Element) {
      // Look for the permalink inside the tweet:
      //   <a href="/<handle>/status/1234567890" ...>
      const link = post.querySelector('a[href*="/status/"]');
      if (!link) return null;

      try {
        const parts = new URL((link as HTMLAnchorElement).href).pathname.split(
          "/status/"
        );
        return parts[1]?.split("/")[0] || null;
      } catch {
        return null;
      }
    },

    getInsertionPoint(post: Element) {
      // Insert badge in the tweet header, left of the Grok/More button area.
      // Primary: the generated CSS class (fragile but accurate).
      // Fallback: find the time element, walk up to the header flex row.
      const grokArea = post.querySelector(".r-1kkk96v");
      if (grokArea) return grokArea;

      const timeEl = post.querySelector("time[datetime]");
      if (timeEl) {
        let el: Element | null = timeEl.parentElement;
        while (el && el !== post) {
          if (el.children.length >= 2) return el.children[el.children.length - 1];
          el = el.parentElement;
        }
      }
      // Last resort: action bar (below content — badge may render low).
      return post.querySelector('[role="group"]') || null;
    },

    getShareAnchor(post: Element) {
      const actionBar = post.querySelector('[role="group"]');
      if (!actionBar) return null;

      // Share is always the last button in the action bar
      const buttons = Array.from(actionBar.querySelectorAll("button"));
      for (let i = buttons.length - 1; i >= 0; i--) {
        const aria = (
          buttons[i].getAttribute("aria-label") || ""
        ).toLowerCase();
        if (aria.includes("share")) return buttons[i];
      }
      // Fallback: last button in the group
      return buttons[buttons.length - 1] || null;
    },

    getActionRow(post: Element) {
      return post.querySelector('[role="group"]') || null;
    },

    getNativeActionButton(post: Element) {
      const actionBar = post.querySelector('[role="group"]');
      if (!actionBar) return null;
      return actionBar.querySelector("button") || null;
    },

    getTitle(post: Element) {
      return (
        post
          .querySelector('[data-testid="tweetText"]')
          ?.textContent?.slice(0, 120) || null
      );
    },

    getPlatformVotes(post: Element) {
      // Like count lives inside the like button group
      const likeBtn = post.querySelector(
        '[data-testid="like"], [data-testid="unlike"]'
      );
      if (likeBtn) {
        const span = likeBtn.querySelector(
          'span[data-testid="app-text-transition-container"]'
        );
        if (span) {
          const n = parseInt(
            (span.textContent ?? "").replace(/[^\d]/g, ""),
            10
          );
          if (!isNaN(n) && n >= 0) return n;
        }
      }
      return 0;
    },

    getPostTimeBucket(post: Element) {
      const timeEl = post.querySelector("time[datetime]");
      if (!timeEl) return 0;
      return timeBucketFromISO(timeEl.getAttribute("datetime") ?? "");
    },

    /**
     * On X post detail pages (/status/…), replies are also
     * <article data-testid="tweet"> elements. Only the main post whose ID
     * matches the URL path should be processed; everything else is a comment.
     */
    isComment(post: Element) {
      if (!location.pathname.includes("/status/")) return false;
      const postId = this.getPostId(post);
      if (!postId) return false;
      const pathId =
        location.pathname.split("/status/")[1]?.split("/")[0] || "";
      if (!pathId) return false;
      return postId !== pathId;
    },
  };
}

// Register both hostname variants; same DOM, different URLs.
registerAdapter(createTwitterAdapter("x.com"));
registerAdapter(createTwitterAdapter("twitter.com"));
