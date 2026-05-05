/**
 * redditMount.tsx: Slaze Reddit Vote Menu injection.
 *
 * Registers the Reddit vote menu injector called by injector.ts on every
 * post scan. Works on both the feed (many shreddit-post cards) and the
 * single-post detail page.
 *
 * ── Insertion strategy ──────────────────────────────────────────
 *
 * Reddit's shreddit-post uses an OPEN Shadow DOM. The action row lives
 * entirely inside that shadow root. We use two paths:
 *
 * PRIMARY (shadow DOM):
 *   1. Access post.shadowRoot
 *   2. Find div[data-testid="action-row"]
 *   3. Insert our <span> BEFORE the ms-auto spacer div
 *   4. Adopt our CSS into the shadow root
 *
 * FALLBACK (light DOM, older Reddit surfaces):
 *   1. Locate Share via adapter.getShareAnchor()
 *   2. Walk up to the action-row flex container
 *   3. Insert next to the share element
 */

import { createRoot, type Root } from 'react-dom/client';
import VoteMenu from './VoteMenu';
import { CATEGORIES } from './categories';
import { updateBadge } from '../badge';
import { registerVoteMenu } from './voteMenuRegistry';
import type { PlatformAdapter, Rating } from '../../../shared/types';

// Import CSS as a raw string at build time for shadow DOM injection
import slazeCSSText from "data-text:~content.css";

const ATTR = "data-slaze-vote-menu";
const _reactRoots = new WeakMap<Element, Root>();
const _styledRoots = new WeakSet<ShadowRoot>();

/* ── Shadow DOM CSS injection ──────────────────────────────────── */

let _adoptedSheet: CSSStyleSheet | null = null;

try {
  _adoptedSheet = new CSSStyleSheet();
  _adoptedSheet.replaceSync(slazeCSSText);
} catch {
  _adoptedSheet = null;
}

function ensureShadowStyles(shadowRoot: ShadowRoot): void {
  if (!shadowRoot || _styledRoots.has(shadowRoot)) return;
  if (!_adoptedSheet) return;

  _styledRoots.add(shadowRoot);

  try {
    shadowRoot.adoptedStyleSheets = [
      ...(shadowRoot.adoptedStyleSheets || []),
      _adoptedSheet,
    ];
  } catch {
    try {
      const style = document.createElement("style");
      style.textContent = slazeCSSText;
      shadowRoot.appendChild(style);
    } catch {
      /* give up gracefully */
    }
  }
}

/* ── DOM helpers ───────────────────────────────────────────────── */

interface WalkResult {
  rowItem: Element;
  row: Element;
}

function walkToActionRowLevel(
  el: Element,
  root: Element,
  minSiblings = 2
): WalkResult | null {
  let cur: Element = el;
  while (cur.parentElement && cur.parentElement !== root) {
    if (cur.parentElement.children.length >= minSiblings) {
      return { rowItem: cur, row: cur.parentElement };
    }
    cur = cur.parentElement;
  }
  if (cur.parentElement === root && root.children.length >= minSiblings) {
    return { rowItem: cur, row: root };
  }
  return null;
}

function findActionRowFallback(post: Element): Element | null {
  return (
    post.querySelector("shreddit-action-row") ||
    post.querySelector("[slot='action-row']") ||
    post.querySelector("[role='toolbar']") ||
    post.querySelector("[role='group']") ||
    post.querySelector("[data-testid*='action']") ||
    null
  );
}

function findNativeButton(el: Element | null): Element | null {
  if (!el) return null;
  if (el.tagName === "BUTTON") return el;
  return el.querySelector("button, [role='button']") || null;
}

function findMsAutoChild(parent: Element): Element | null {
  return parent.querySelector(":scope > [class*='ms-auto']") || null;
}

function detectVoteContextCode(): number {
  return location.pathname.includes("/comments/") ? 1 : 0;
}

/* ── Injector ──────────────────────────────────────────────────── */

function injectRedditVoteMenu(
  post: Element,
  adapter: PlatformAdapter,
  postId: string
): boolean {
  const isShredditPost = post.tagName === "SHREDDIT-POST";
  const sr = (
    post as Element & { shadowRoot?: ShadowRoot | null }
  ).shadowRoot;

  if (post.hasAttribute(ATTR)) {
    const inShadow = sr ? sr.querySelector(".slaze-vote-root") : null;
    const inLight = post.querySelector(".slaze-vote-root");

    if (isShredditPost) {
      if (inShadow) return false;
      if (inLight) {
        inLight.remove();
      }
    } else if (inShadow || inLight) {
      return false;
    }

    post.removeAttribute(ATTR);
  }

  let actionRow: Element | null = null;
  let insertBeforeEl: Element | null = null;
  let usingShadow = false;

  if (sr) {
    actionRow = sr.querySelector('[data-testid="action-row"]');
    if (actionRow) {
      usingShadow = true;
      insertBeforeEl =
        findMsAutoChild(actionRow) ||
        actionRow.querySelector(
          ":scope > slot[name='action-row-whitespace']"
        );
    }
  }

  let shareItem: Element | null = null;

  if (isShredditPost && !actionRow) return false;

  if (!actionRow) {
    const shareAnchor =
      typeof adapter.getShareAnchor === "function"
        ? adapter.getShareAnchor(post)
        : null;

    if (shareAnchor) {
      const found = walkToActionRowLevel(shareAnchor, post);
      if (found) {
        actionRow = found.row;
        shareItem = found.rowItem;
      }
    }

    if (!actionRow) {
      actionRow = findActionRowFallback(post);
    }
  }

  if (!actionRow) return false;

  let nativeBtn: Element | null = null;
  if (usingShadow) {
    nativeBtn =
      actionRow.querySelector("[name='comments-action-button']") ||
      actionRow.querySelector("button");
  } else {
    nativeBtn = shareItem
      ? findNativeButton(shareItem)
      : actionRow.querySelector("button, [role='button']");
  }

  const container = document.createElement("span");
  container.className = "slaze-vote-root";

  const platformVotes =
    typeof adapter.getPlatformVotes === "function"
      ? adapter.getPlatformVotes(post)
      : 0;
  const timeBucket =
    typeof adapter.getPostTimeBucket === "function"
      ? adapter.getPostTimeBucket(post)
      : 0;
  const contextCode = detectVoteContextCode();

  // Unmount existing React root if re-injecting
  const existingRoot = _reactRoots.get(container);
  if (existingRoot) {
    existingRoot.unmount();
    _reactRoots.delete(container);
  }

  if (usingShadow) {
    ensureShadowStyles(sr!);

    if (insertBeforeEl) {
      actionRow.insertBefore(container, insertBeforeEl);
    } else {
      actionRow.appendChild(container);
    }
  } else if (shareItem && shareItem.parentElement === actionRow) {
    actionRow.insertBefore(container, shareItem.nextSibling);
  } else {
    actionRow.appendChild(container);
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
      onVoteCommitted={(rating: Rating | null) => {
        if (!rating) return;
        const badgeEl = post.querySelector(".slaze-badge");
        if (badgeEl) {
          updateBadge(badgeEl as HTMLElement, rating);
        }
      }}
    />
  );

  post.setAttribute(ATTR, "");
  return true;
}

registerVoteMenu("reddit.com", injectRedditVoteMenu);
