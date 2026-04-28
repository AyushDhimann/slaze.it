import { API_BASE, CATEGORY_COUNT } from '../../shared/config';
import { lookupVerdict } from '../../shared/verdictCatalog';
import { fetchWithRetry } from '../../shared/fetchWithRetry';
import type { BatchItem, BinaryRatingEntry } from '../../shared/types';
import { platformEncode } from '../platformEncode';
import { getToken, refreshToken } from '../token';

const enc = new TextEncoder();

/** Pack an array of items into a compact Uint8Array for the /v1/b endpoint. */
function packBatchRequest(
  items: BatchItem[]
): Uint8Array {
  let size = 1; // N byte
  const encoded = items.map((item) => {
    const { pb, id: strippedId } = platformEncode(item.platform, item.postId);
    const id = enc.encode(strippedId);
    size += 1 + 1 + id.length; // platformByte + idLen + id
    return { pb, id };
  });
  const buf = new Uint8Array(size);
  buf[0] = items.length;
  let pos = 1;
  for (const { pb, id } of encoded) {
    buf[pos++] = pb;
    buf[pos++] = id.length;
    buf.set(id, pos);
    pos += id.length;
  }
  return buf;
}

export async function handleFetchBatch(
  items: BatchItem[]
): Promise<{ ok: boolean; ratings?: Record<string, BinaryRatingEntry | null> }> {
  if (!items || !items.length) return { ok: false };

  let token = await getToken();
  if (!token) token = await refreshToken();
  if (!token) return { ok: false };

  const body = packBatchRequest(items);

  function doFetch(tok: string): () => Promise<Response> {
    return () =>
      fetch(`${API_BASE}/b`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tok}`,
          "Content-Type": "application/octet-stream",
        },
        body: body as BodyInit,
      });
  }

  let res = await fetchWithRetry(doFetch(token));
  if (res.status === 401) {
    token = await refreshToken();
    if (!token) return { ok: false };
    res = await fetchWithRetry(doFetch(token));
  }

  if (!res.ok) return { ok: false };

  const respBuf = new Uint8Array(await res.arrayBuffer());
  const protoVersion = respBuf.length ? respBuf[0] : 0;
  if (protoVersion !== 1 && protoVersion !== 2) {
    return { ok: false };
  }

  const hasVerdict = protoVersion >= 2;
  const recordSize = hasVerdict ? 15 : 11;
  const ratings: Record<string, BinaryRatingEntry | null> = {};

  for (let i = 0; i < items.length; i++) {
    const offset = 1 + i * recordSize;
    if (offset + recordSize > respBuf.length) break;

    const category = respBuf[offset];
    if (category === 0xff) {
      ratings[items[i].cacheKey] = null;
      continue;
    }

    const percent = respBuf[offset + 1];
    const percents: number[] = [];
    for (let c = 0; c < CATEGORY_COUNT; c++) {
      percents.push(respBuf[offset + 2 + c]);
    }

    const entry: BinaryRatingEntry = { category, percent, percents };

    if (hasVerdict) {
      const sigState = respBuf[offset + 11];
      const sigC1 = respBuf[offset + 12];
      const sigC2 = respBuf[offset + 13];
      const sigC3 = respBuf[offset + 14];
      entry.signatureState = sigState;
      entry.signatureCategories = [
        sigC1 === 0xff ? -1 : sigC1,
        sigC2 === 0xff ? -1 : sigC2,
        sigC3 === 0xff ? -1 : sigC3,
      ];
      const verdict = lookupVerdict(sigState, sigC1, sigC2, sigC3);
      entry.labelPhrase = verdict.phrase;
      entry.labelSubtext = verdict.subtext;
    }

    ratings[items[i].cacheKey] = entry;
  }

  return { ok: true, ratings };
}
