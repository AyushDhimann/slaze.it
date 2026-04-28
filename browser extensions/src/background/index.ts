/**
 * Slaze Service Worker (Background Script)
 *
 * Acts as a fetch proxy for content scripts. Because this runs with
 * chrome-extension:// origin + host_permissions, the browser never issues
 * a CORS preflight, avoiding the OPTIONS round-trip on every page load.
 *
 * Message protocol:
 *   SLAZE_FETCH_BATCH   → binary batch POST to /v1/b
 *   SLAZE_FETCH_SINGLE  → GET /v1/ratings/:platform/:postId
 *   SLAZE_SUBMIT_VOTE   → POST /v1/ratings/:platform/:postId/vote/:payload
 */
import { API_BASE } from '../shared/config';
import { invalidateToken } from './token';
import { handleFetchBatch } from './handlers/fetchBatch';
import { handleFetchSingle } from './handlers/fetchSingle';
import { handleSubmitVote } from './handlers/submitVote';

// ── Initialisation ──────────────────────────────────────────────────

chrome.storage.onChanged.addListener((changes) => {
  if ("slaze_auth_token" in changes) invalidateToken();
});

// ── Message Dispatch Table ──────────────────────────────────────────

type AsyncHandler = (msg: any) => Promise<unknown>;

const ASYNC_HANDLERS: Record<string, AsyncHandler> = {
  SLAZE_FETCH_BATCH: (msg) =>
    handleFetchBatch((msg as { items: Parameters<typeof handleFetchBatch>[0] }).items),
  SLAZE_FETCH_SINGLE: (msg) =>
    handleFetchSingle(msg as Parameters<typeof handleFetchSingle>[0]),
  SLAZE_SUBMIT_VOTE: (msg) =>
    handleSubmitVote(msg as Parameters<typeof handleSubmitVote>[0]),
};

const SYNC_HANDLERS: Record<string, (msg: any, send: (r: unknown) => void) => void> = {
  SLAZE_TOKEN_CHANGED: (_msg, send) => {
    invalidateToken();
    send({ ok: true });
  },
};

// ── Message Listener ────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  const m = msg as { type: string };

  const asyncHandler = ASYNC_HANDLERS[m.type];
  if (asyncHandler) {
    asyncHandler(msg)
      .then(sendResponse)
      .catch((err: unknown) => {
        console.error(`[Slaze] ${m.type} handler failed:`, err);
        sendResponse({
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        });
      });
    return true;
  }

  const syncHandler = SYNC_HANDLERS[m.type];
  if (syncHandler) {
    syncHandler(msg, sendResponse);
    return false;
  }
});

// ── Install / Update ────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(async () => {
  const result = await chrome.storage.local.get("slaze_auth_token");

  const updates: Record<string, string> = { slaze_api_base: API_BASE };

  // Only request a new token on the very first install. Preserving it
  // across reloads keeps the user's vote history consistent.
  if (!result.slaze_auth_token) {
    try {
      const res = await fetch(`${API_BASE}/auth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        const data: unknown = await res.json();
        if (data && typeof data === "object" && typeof (data as Record<string, unknown>).token === "string") {
          updates.slaze_auth_token = (data as Record<string, string>).token;
        }
      } else {
        console.error("[Slaze] Token creation failed:", res.status);
      }
    } catch (err) {
      console.error("[Slaze] Token creation error:", err);
    }
  }

  await chrome.storage.local.set(updates);
});
