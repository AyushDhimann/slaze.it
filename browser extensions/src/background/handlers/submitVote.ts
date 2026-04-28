import { API_BASE } from '../../shared/config';
import { parseVerdictHeaders } from '../../shared/parseHeaders';
import { fetchWithRetry } from '../../shared/fetchWithRetry';
import type { SubmitVoteRequest, SubmitVoteResponse } from '../../shared/types';
import { getToken, refreshToken } from '../token';

export async function handleSubmitVote(
  msg: SubmitVoteRequest
): Promise<SubmitVoteResponse> {
  const { platform, postId, payload } = msg;

  if (!platform || !postId || !payload) return { ok: false, status: 400, etag: null, verdict: null };

  let token = await getToken();
  if (!token) token = await refreshToken();
  if (!token) return { ok: false, status: 401, etag: null, verdict: null };

  const url =
    `${API_BASE}/ratings/${encodeURIComponent(platform)}/${encodeURIComponent(postId)}` +
    `/vote/${encodeURIComponent(payload)}`;

  function doFetch(tok: string): () => Promise<Response> {
    return () =>
      fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${tok}` },
      });
  }

  let res = await fetchWithRetry(doFetch(token));
  if (res.status === 401) {
    token = await refreshToken();
    if (!token) return { ok: false, status: 401, etag: null, verdict: null };
    res = await fetchWithRetry(doFetch(token));
  }

  const verdict = parseVerdictHeaders(res);

  return {
    ok: res.ok,
    status: res.status,
    etag: res.headers.get("ETag") || null,
    verdict,
  };
}
