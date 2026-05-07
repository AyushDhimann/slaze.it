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
import { invalidateToken, linkTokenToClerk, linkTokenToClerkWithRetry, getPlanInfo, getClerkUserId } from './token';
import { handleFetchBatch } from './handlers/fetchBatch';
import { handleFetchSingle } from './handlers/fetchSingle';
import { handleSubmitVote } from './handlers/submitVote';

// ── Initialisation ──────────────────────────────────────────────────

// Pre-warm the Clerk client at service-worker startup so the first
// vote/fetch doesn't incur the ~5s Clerk load() latency. Best-effort.
getClerkUserId().catch(() => { /* SW may restart before Clerk is needed */ });

chrome.storage.onChanged.addListener((changes) => {
  if ("slaze_auth_token" in changes) invalidateToken();

  // Auto-link token when Clerk session appears (user signed in).
  for (const key of Object.keys(changes)) {
    if (
      (key.startsWith("__clerk") || key === "clerk-db-jwt") &&
      changes[key]?.newValue
    ) {
      linkTokenToClerkWithRetry().catch(() => {
        /* best-effort — vote handler will retry on next attempt */
      });
      break;
    }
  }
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
  SLAZE_LINK_TOKEN: (_msg) =>
    linkTokenToClerkWithRetry().then((ok) => ({ ok })),
  SLAZE_GET_PLAN: (_msg) =>
    getPlanInfo().then((plan) => ({ ok: plan !== null, plan })),
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
        if (
          data &&
          typeof data === "object" &&
          typeof (data as Record<string, unknown>).token === "string"
        ) {
          const d = data as Record<string, unknown>;
          updates.slaze_auth_token = d.token as string;

          if (d.plan && d.quota) {
            const info: import("../shared/types").PlanInfo = {
              tier: (d.tier as string) || "anonymous",
              plan: d.plan as string,
              planType: "free",
              clerkLinked: false,
              quota: {
                dailyChecks: (d.quota as Record<string, number>).dailyChecks || 0,
                dailyVotes: (d.quota as Record<string, number>).dailyVotes || 0,
                monthlyVotes: (d.quota as Record<string, number>).monthlyVotes || 0,
                hourlyChecks: 0,
                hourlyVotes: 0,
              },
              usage: { dailyChecks: 0, dailyVotes: 0, monthlyVotes: 0 },
            };
            await chrome.storage.local.set({ slaze_plan_info: JSON.stringify(info) });
          }
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
