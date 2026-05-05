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
        const data = (await res.json()) as { token: string };
        _token = data.token;
        await chrome.storage.local.set({ slaze_auth_token: _token });
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

let _clerk: Awaited<ReturnType<typeof createClerkClient>> | null = null;

async function ensureClerk(): Promise<typeof _clerk> {
  if (!_clerk) {
    _clerk = await createClerkClient({
      publishableKey,
      syncHost,
    });
  }
  return _clerk;
}

/** Return the Clerk user ID if signed in, null otherwise. */
export async function getClerkUserId(): Promise<string | null> {
  try {
    const clerk = await ensureClerk();
    if (!clerk?.session) return null;
    return clerk.user?.id ?? null;
  } catch {
    return null;
  }
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
