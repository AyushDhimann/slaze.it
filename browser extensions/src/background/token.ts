/**
 * Background Auth Token Management — Hybrid: Anonymous + Clerk.
 *
 * API calls use the anonymous Slaze device token (same as before migration).
 * Clerk identity is passed as X-Slaze-User header for quota/identity tracking.
 *
 * Public API (getToken/refreshToken/invalidateToken) is unchanged
 * so existing handlers need zero modifications.
 */

import { createClerkClient } from "@clerk/chrome-extension/background";
import { API_BASE } from "../shared/config";

const publishableKey = process.env.PLASMO_PUBLIC_CLERK_PUBLISHABLE_KEY;
const syncHost = process.env.PLASMO_PUBLIC_CLERK_SYNC_HOST;

// ── Anonymous token cache ────────────────────────────────────────────

let _token: string | null = null;
let _pendingRefresh: Promise<string | null> | null = null;

/** Return the cached anonymous token, or read from chrome.storage.local. */
export async function getToken(): Promise<string | null> {
  if (_token) return _token;
  try {
    const result = (await chrome.storage.local.get("slaze_auth_token")) as {
      slaze_auth_token?: string;
    };
    _token = result.slaze_auth_token || null;
  } catch {
    /* storage unavailable */
  }
  return _token;
}

/** Fetch a fresh anonymous token from the server and persist it. */
export async function refreshToken(): Promise<string | null> {
  if (_pendingRefresh) return _pendingRefresh;

  _pendingRefresh = (async () => {
    _token = null;
    try {
      const res = await fetch(`${API_BASE}/auth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        const data = (await res.json()) as { token: string; plan?: string; tier?: string; quota?: Record<string, number> };
        _token = data.token;
        await chrome.storage.local.set({ slaze_auth_token: _token });

        // Store plan info from the token response.
        if (data.plan && data.quota) {
          const info: import("../shared/types").PlanInfo = {
            tier: data.tier || "anonymous",
            plan: data.plan,
            planType: "free",
            clerkLinked: false,
            quota: {
              dailyChecks: data.quota.dailyChecks || 0,
              dailyVotes: data.quota.dailyVotes || 0,
              monthlyVotes: data.quota.monthlyVotes || 0,
              hourlyChecks: 0,
              hourlyVotes: 0,
            },
            usage: { dailyChecks: 0, dailyVotes: 0, monthlyVotes: 0 },
          };
          await setPlanInfo(info);
        }
      }
    } catch {
      /* network error */
    }
    return _token;
  })();

  const result = await _pendingRefresh;
  _pendingRefresh = null;
  return result;
}

/** Drop the in-memory token so the next request re-reads from storage. */
export function invalidateToken(): void {
  _token = null;
}

// ── Clerk identity (lazy, for X-Slaze-User header) ──────────────────

const CLERK_INIT_TIMEOUT_MS = 5000;

let _clerkInit: Promise<Awaited<ReturnType<typeof createClerkClient>>> | null = null;
let _clerk: Awaited<ReturnType<typeof createClerkClient>> | null = null;

/** Lazily initialise the Clerk background client. Uses a promise-lock so
 *  concurrent callers share a single init and don't create duplicate clients. */
async function ensureClerk(): Promise<typeof _clerk> {
  if (_clerk) return _clerk;

  if (!_clerkInit) {
    _clerkInit = createClerkClient({ publishableKey, syncHost });
    // On success, cache the resolved instance for zero-latency subsequent calls.
    // On failure, reset so the next call can retry.
    _clerkInit.then((c) => { _clerk = c; }).catch(() => { _clerkInit = null; });
  }

  try {
    _clerk = await Promise.race([
      _clerkInit,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Clerk init timeout")), CLERK_INIT_TIMEOUT_MS),
      ),
    ]);
    return _clerk;
  } catch (err) {
    console.warn("[Slaze] Clerk init failed:", err);
    _clerkInit = null;
    return null;
  }
}

/** Return the Clerk user ID if signed in, null otherwise. */
export async function getClerkUserId(): Promise<string | null> {
  try {
    const clerk = await ensureClerk();
    if (!clerk?.session) return null;
    return clerk.user?.id ?? null;
  } catch (err) {
    console.warn("[Slaze] getClerkUserId failed:", err);
    return null;
  }
}

/** Return the Clerk session JWT if signed in, null otherwise. */
export async function getClerkSessionToken(): Promise<string | null> {
  try {
    const clerk = await ensureClerk();
    if (!clerk?.session) return null;
    return await clerk.session.getToken();
  } catch (err) {
    console.warn("[Slaze] getClerkSessionToken failed:", err);
    return null;
  }
}

/** Link the current anonymous token to the active Clerk identity.
 *  Calls POST /v1/auth/link on the backend. Returns true on success. */
export async function linkTokenToClerk(): Promise<boolean> {
  try {
    const token = await getToken();
    const sessionToken = await getClerkSessionToken();
    if (!token || !sessionToken) return false;

    const res = await fetch(`${API_BASE}/auth/link`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Clerk-Token": sessionToken,
        "Content-Type": "application/json",
      },
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Retry wrapper for linkTokenToClerk with exponential backoff.
 *  Tries up to 3 times (1s / 2s / 4s). Returns true once linking succeeds. */
export async function linkTokenToClerkWithRetry(): Promise<boolean> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const ok = await linkTokenToClerk();
    if (ok) return true;
    if (attempt < 2) {
      await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
    }
  }
  return false;
}

// ── Cached plan info ─────────────────────────────────────────────────

let _planInfo: import("../shared/types").PlanInfo | null = null;

/** Return cached plan info, or read from chrome.storage. Plan info is stored
 *  alongside the token during token creation and updated from quota response
 *  headers on every API call. */
export async function getPlanInfo(): Promise<import("../shared/types").PlanInfo | null> {
  if (_planInfo) return _planInfo;
  try {
    const result = (await chrome.storage.local.get("slaze_plan_info")) as {
      slaze_plan_info?: string;
    };
    if (result.slaze_plan_info) {
      _planInfo = JSON.parse(result.slaze_plan_info);
    }
  } catch {
    /* storage unavailable */
  }
  return _planInfo;
}

/** Persist plan info to chrome.storage so the popup can read it. */
export async function setPlanInfo(info: import("../shared/types").PlanInfo): Promise<void> {
  _planInfo = info;
  try {
    await chrome.storage.local.set({ slaze_plan_info: JSON.stringify(info) });
  } catch {
    /* storage unavailable */
  }
}

/**
 * Increment local usage counters for a check or vote call.
 * Keeps extension-side usage in sync between API responses.
 */
export async function trackUsage(kind: "check" | "vote"): Promise<void> {
  const info = await getPlanInfo();
  if (!info) return;
  if (kind === "check") info.usage.dailyChecks++;
  else info.usage.dailyVotes++;
  await setPlanInfo(info);
}

/**
 * Update cached plan info from X-Quota-* response headers.
 * Server sends these on rate-limit responses and optionally on all responses.
 */
export function updatePlanFromHeaders(headers: Headers): void {
  const error = headers.get("X-Slaze-Error");
  const tier = headers.get("X-Quota-Tier");
  const plan = headers.get("X-Quota-Plan");
  const limit = headers.get("X-Quota-Limit");
  const used = headers.get("X-Quota-Used");
  const remaining = headers.get("X-Quota-Remaining");

  if (!error && !tier && !plan && !limit && !used && !remaining) return;

  getPlanInfo().then((info) => {
    if (!info) return;
    let changed = false;

    if (tier && info.tier !== tier) {
      info.tier = tier;
      changed = true;
    }
    if (plan && info.plan !== plan) {
      info.plan = plan;
      changed = true;
    }

    const usedNum = used ? parseInt(used, 10) : null;
    const limitNum = limit ? parseInt(limit, 10) : null;
    const remainingNum = remaining ? parseInt(remaining, 10) : null;

    // Backend sends X-Quota-Used for both check and vote quota errors.
    if (usedNum !== null && !Number.isNaN(usedNum)) {
      // Check if this is a vote error by looking at X-Slaze-Error message.
      if (error && error.includes("vote")) {
        info.usage.dailyVotes = usedNum;
      } else {
        info.usage.dailyChecks = usedNum;
      }
      changed = true;
    }
    if (limitNum !== null && !Number.isNaN(limitNum)) {
      if (error && error.includes("vote")) {
        info.quota.dailyVotes = limitNum;
      } else {
        info.quota.dailyChecks = limitNum;
      }
      changed = true;
    }
    if (remainingNum !== null && !Number.isNaN(remainingNum) && limitNum !== null && !Number.isNaN(limitNum)) {
      const computedUsed = limitNum - remainingNum;
      if (error && error.includes("vote")) {
        info.usage.dailyVotes = computedUsed;
      } else {
        info.usage.dailyChecks = computedUsed;
      }
      changed = true;
    }

    if (changed) setPlanInfo(info);
  }).catch(() => { /* non-critical */ });
}

/** Build standard API headers with anonymous token auth + optional Clerk identity. */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await getToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const clerkId = await getClerkUserId();
  if (clerkId) {
    headers["X-Slaze-User"] = clerkId;
  }
  return headers;
}
