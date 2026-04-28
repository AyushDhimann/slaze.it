/**
 * twitterMount.tsx: Slaze X/Twitter Vote Menu injection.
 *
 * Registers vote menu injectors for both "x.com" and "twitter.com".
 * Called by injector.ts on every post scan.
 *
 * ── Insertion strategy ──────────────────────────────────────────
 *
 * X/Twitter action bar uses a role="group" container. We insert before
 * the Share button so Slaze sits between Bookmark and Share.
 *
 * The dropdown is portal-rendered to document.body to escape X's
 * overflow:hidden on tweet cards. The button stays inline in the
 * action bar for natural tab order.
 */

import { createRoot, type Root } from 'react-dom/client';
import VoteMenu from './VoteMenu';
import { CATEGORIES } from './categories';
import { updateBadge } from '../badge';
import { registerVoteMenu } from './voteMenuRegistry';
import type { PlatformAdapter, Rating } from '../../../shared/types';

const X_ATTR = "data-slaze-x-vote-menu";
const _reactRoots = new WeakMap<Element, Root>();

function detectXVoteContextCode(): number {
  return location.pathname.includes("/status/") ? 1 : 0;
}

/* ── Injector ──────────────────────────────────────────────────── */

function injectTwitterVoteMenu(
  post: Element,
  adapter: PlatformAdapter,
  postId: string
): boolean {
  if (post.hasAttribute(X_ATTR)) {
    const existing = post.querySelector(".slaze-vote-root");
    if (existing) return false;
    post.removeAttribute(X_ATTR);
  }

  const actionBar =
    (typeof adapter.getActionRow === "function"
      ? adapter.getActionRow(post)
      : null) || post.querySelector('[role="group"]');
  if (!actionBar) return false;

  const shareAnchor =
    typeof adapter.getShareAnchor === "function"
      ? adapter.getShareAnchor(post)
      : null;

  let insertBefore: Element | null = null;
  if (shareAnchor) {
    let el: Element = shareAnchor;
    while (el && el.parentElement !== actionBar) {
      el = el.parentElement!;
    }
    if (el && el.parentElement === actionBar) {
      insertBefore = el;
    }
  }

  const nativeBtn =
    (typeof adapter.getNativeActionButton === "function"
      ? adapter.getNativeActionButton(post)
      : null) || actionBar.querySelector("button");
  if (!nativeBtn) return false;

  const container = document.createElement("div");
  container.className = "slaze-vote-root";
  container.setAttribute("data-slaze-platform", "x");
  // Inline flex styles to match native X action items (no hardcoded hashed classes).
  container.style.display = "inline-flex";
  container.style.alignItems = "center";

  if (insertBefore) {
    actionBar.insertBefore(container, insertBefore);
  } else {
    actionBar.appendChild(container);
  }

  const platformVotes =
    typeof adapter.getPlatformVotes === "function"
      ? adapter.getPlatformVotes(post)
      : 0;
  const timeBucket =
    typeof adapter.getPostTimeBucket === "function"
      ? adapter.getPostTimeBucket(post)
      : 0;
  const contextCode = detectXVoteContextCode();

  const existingRoot = _reactRoots.get(container);
  if (existingRoot) {
    existingRoot.unmount();
    _reactRoots.delete(container);
  }
  const root = createRoot(container);
  _reactRoots.set(container, root);
  root.render(
    <VoteMenu
      categories={CATEGORIES}
      platform={adapter.hostname}
      postId={postId}
      nativeButton={nativeBtn}
      platformVotes={platformVotes}
      timeBucket={timeBucket}
      contextCode={contextCode}
      usePortal={true}
      onVoteCommitted={(rating: Rating | null) => {
        if (!rating) return;
        const badgeEl = post.querySelector(".slaze-badge");
        if (badgeEl) {
          updateBadge(badgeEl as HTMLElement, rating);
        }
      }}
    />
  );

  post.setAttribute(X_ATTR, "");
  return true;
}

// Register for both hostname variants; same DOM, different URLs.
registerVoteMenu("x.com", injectTwitterVoteMenu);
registerVoteMenu("twitter.com", injectTwitterVoteMenu);
