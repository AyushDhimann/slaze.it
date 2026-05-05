import { API_BASE } from '../../shared/config';
import { parseVerdictHeaders } from '../../shared/parseHeaders';
import { fetchWithRetry } from '../../shared/fetchWithRetry';
import type { SingleFetchRequest, SingleFetchResponse } from '../../shared/types';
import { getToken, refreshToken, getClerkUserId } from '../token';

export async function handleFetchSingle(
  msg: SingleFetchRequest
): Promise<SingleFetchResponse> {
  const { platform, postId, pvBucket, timeBucket, staleEtag } = msg;

  let token = await getToken();
  if (!token) token = await refreshToken();
  if (!token) return { ok: false, status: 0, etag: null, cacheControl: null, verdict: null };

  const url =
    `${API_BASE}/ratings/${encodeURIComponent(platform)}/${encodeURIComponent(postId)}` +
    `?h=${pvBucket}${timeBucket}`;

  async function doFetch(tok: string): Promise<Response> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${tok}`,
    };
    if (staleEtag) headers["If-None-Match"] = staleEtag;
    const clerkId = await getClerkUserId();
    if (clerkId) headers["X-Slaze-User"] = clerkId;
    return fetch(url, { method: "GET", headers });
  }

  let res = await fetchWithRetry(() => doFetch(token));
  if (res.status === 401) {
    token = await refreshToken();
    if (!token) return { ok: false, status: 401, etag: null, cacheControl: null, verdict: null };
    res = await fetchWithRetry(() => doFetch(token));
  }

  const verdict = parseVerdictHeaders(res);

  return {
    ok: res.ok,
    status: res.status,
    etag: res.headers.get("ETag") || null,
    cacheControl: res.headers.get("Cache-Control") || null,
    verdict,
  };
}
