/**
 * Slaze Badge UI Factory
 *
 * Creates and updates the visible dominant-category pill injected into
 * each post. Imported directly by the injector and mount modules
 * with no window.Slaze namespace needed.
 */

import type { Rating } from '../../shared/types';
import { LABEL_DISPLAY, VOTE_BUCKET_RANGES, type CategoryId } from '../config';

// Map label/category IDs to CSS modifier classes.
const LABEL_MOD: Record<string, string> = {
  genuine: "genuine",
  helpful: "helpful",
  wholesome: "wholesome",
  "ad-promo": "ad-promo",
  "ai-slop": "ai-slop",
  bait: "bait",
  brainrot: "brainrot",
  misleading: "misleading",
  rant: "rant",
};

/**
 * Apply a rating (or absence thereof) to an existing badge element.
 *
 * @param el - The badge <span> element.
 * @param data - Rating object (rated), null (unrated), or undefined (offline/error).
 */
export function updateBadge(
  el: HTMLElement,
  data: Rating | null | undefined
): void {
  if (data === undefined) {
    el.className = "slaze-badge slaze-badge--offline";
    el.textContent = "Offline";
    el.setAttribute("aria-label", "Slaze: could not reach the API");
    el.title = el.getAttribute("aria-label") ?? "";
    return;
  }
  if (data === null) {
    el.className = "slaze-badge slaze-badge--unrated";
    el.textContent = "Unrated";
    el.setAttribute(
      "aria-label",
      "Slaze: no community ratings yet. Be the first!"
    );
    el.title = el.getAttribute("aria-label") ?? "";
    return;
  }

  const mod = LABEL_MOD[data.label] || "genuine";
  const categoryDisplay = (LABEL_DISPLAY as Record<string, string>)[data.label] || data.label;
  const voteRange = VOTE_BUCKET_RANGES[data.voteBucket] || "";
  const pct = Number.isInteger(data.percent) ? `${data.percent}%` : "";

  // Prefer the verdict engine's authored phrase when present.
  // Skip the "Too Few Votes" sparse entry (signatureState === 0).
  const hasVerdict =
    typeof data.labelPhrase === "string" &&
    data.labelPhrase.length > 0 &&
    data.signatureState !== undefined &&
    data.signatureState !== 0;

  const display: string = hasVerdict ? (data.labelPhrase as string) : categoryDisplay;

  el.className = `slaze-badge slaze-badge--${mod}`;
  el.textContent = display;
  el.setAttribute(
    "aria-label",
    hasVerdict
      ? `Slaze verdict: ${display}${data.labelSubtext ? `: ${data.labelSubtext}` : ""}`
      : `Slaze: ${display}${pct ? ` (${pct})` : ""}${voteRange ? `, ~${voteRange} platform votes` : ""}`
  );
  el.title = el.getAttribute("aria-label") ?? "";
}

/** Return value from create(): element plus resolve/reject callbacks. */
export interface BadgeHandle {
  el: HTMLSpanElement;
  resolve: (data: Rating | null) => void;
  reject: () => void;
}

/**
 * Create a new badge element in the loading state.
 * Returns the element (insert into DOM immediately) and resolve/reject
 * callbacks to update it once the API responds.
 */
export function createBadge(): BadgeHandle {
  const el = document.createElement("span");
  el.className = "slaze-badge slaze-badge--loading";
  el.setAttribute("aria-label", "Slaze: fetching community rating");
  el.textContent = "···"; // three middle dots

  return {
    el,
    resolve: (data: Rating | null) => updateBadge(el, data),
    reject: () => updateBadge(el, undefined),
  };
}
