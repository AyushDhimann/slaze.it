/**
 * Vote Menu entry point.
 *
 * Side-effect imports both platform-specific mount modules so they
 * register themselves in the vote menu registry before injector.ts runs.
 *
 * Also suppresses "Extension context invalidated" errors that fire when
 * the extension is reloaded while a page is still open.
 */

// Side-effect imports: these register themselves on load
import './redditMount';
import './twitterMount';

// ── Error suppression ──────────────────────────────────────────

function _isSlazeContextError(val: unknown): boolean {
  const msg =
    val instanceof Error
      ? val.message
      : String(
          (val as { reason?: unknown; message?: unknown })?.reason ??
            val ??
            ""
        );
  return msg.includes("Extension context invalidated");
}

window.addEventListener(
  "error",
  (e) => {
    if (_isSlazeContextError(e.error ?? e.message)) e.preventDefault();
  },
  { capture: true }
);

window.addEventListener(
  "unhandledrejection",
  (e) => {
    if (_isSlazeContextError(e.reason)) e.preventDefault();
  },
  { capture: true }
);
