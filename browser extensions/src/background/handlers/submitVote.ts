import { API_BASE } from '../../shared/config';
import { parseVerdictHeaders } from '../../shared/parseHeaders';
import { fetchWithRetry } from '../../shared/fetchWithRetry';
import type { SubmitVoteRequest, SubmitVoteResponse } from '../../shared/types';
import { getToken, refreshToken, getClerkUserId, getClerkSessionToken, trackUsage, updatePlanFromHeaders } from '../token';
import { buildSignedHeaders } from '../signing';

export async function handleSubmitVote(
  msg: SubmitVoteRequest
): Promise<SubmitVoteResponse> {
  const { platform, postId, payload } = msg;

  if (!platform || !postId || !payload) return { ok: false, status: 400, etag: null, verdict: null };

  let token = await getToken();
  if (!token) token = await refreshToken();
  if (!token) return { ok: false, status: 401, etag: null, verdict: null };

  const urlPath =
    `/ratings/${encodeURIComponent(platform)}/${encodeURIComponent(postId)}` +
    `/vote/${encodeURIComponent(payload)}`;
  const url = `${API_BASE}${urlPath}`;
  const signingPath = `/v1${urlPath}`;

  async function doFetch(tok: string): Promise<Response> {
    const headers: Record<string, string> = { Authorization: `Bearer ${tok}` };
    const [clerkId, clerkToken] = await Promise.all([
      getClerkUserId(),
      getClerkSessionToken(),
    ]);
    if (clerkId) headers["X-Slaze-User"] = clerkId;
    if (clerkToken) headers["X-Clerk-Token"] = clerkToken;
    const sigHeaders = await buildSignedHeaders("POST", signingPath);
    Object.assign(headers, sigHeaders);
    return fetch(url, { method: "POST", headers });
  }

  let res = await fetchWithRetry(() => doFetch(token));
  if (res.status === 401) {
    token = await refreshToken();
    if (!token) return { ok: false, status: 401, etag: null, verdict: null };
    res = await fetchWithRetry(() => doFetch(token));
  }

  const verdict = parseVerdictHeaders(res);
  const errorLabel = res.headers.get("X-Slaze-Error") || undefined;

  if (res.ok) {
    trackUsage("vote").catch(() => {});
  }
  updatePlanFromHeaders(res.headers);

  return {
    ok: res.ok,
    status: res.status,
    etag: res.headers.get("ETag") || null,
    verdict,
    errorLabel,
  };
}
