/**
 * Background Auth Token Management
 *
 * Caches the bearer token in memory and refreshes from the
 * server when expired (401) or on demand. Persisted to
 * chrome.storage.local so content scripts can read it too.
 */
import { API_BASE } from '../shared/config';

let _token: string | null = null;
/** Prevents concurrent refreshToken() calls from firing duplicate requests. */
let _pendingRefresh: Promise<string | null> | null = null;

/** Return the cached token, or read it from chrome.storage.local. */
export async function getToken(): Promise<string | null> {
  if (_token) return _token;
  try {
    const result = (await chrome.storage.local.get(
      "slaze_auth_token"
    )) as { slaze_auth_token?: string };
    _token = result.slaze_auth_token || null;
  } catch {
    /* storage unavailable */
  }
  return _token;
}

/** Force-refresh the token from the server and persist it. */
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
