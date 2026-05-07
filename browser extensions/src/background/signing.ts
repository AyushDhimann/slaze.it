/**
 * HMAC Request Signing — Extension Side
 *
 * Every API request from the background worker is signed with HMAC-SHA256
 * using a shared secret inlined at build time. The backend verifies the
 * signature before processing the request.
 *
 * Signing payload:  method + ":" + path + ":" + unixTimestamp + ":" + bodyHex
 * Headers added:   X-Slaze-Ts (unix seconds), X-Slaze-Sig (hex HMAC)
 */

import { API_SECRET } from "../shared/config";

const enc = new TextEncoder();

/** Extract the backing ArrayBuffer from a Uint8Array, accounting for byteOffset. */
function toArrayBuffer(v: Uint8Array): ArrayBuffer {
  const ab = v.buffer as ArrayBuffer;
  return ab.slice(v.byteOffset, v.byteOffset + v.byteLength);
}

/** hex encode raw bytes from an ArrayBuffer. */
function hexEncode(ab: ArrayBuffer): string {
  return Array.from(new Uint8Array(ab as unknown as ArrayBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Compute SHA-256 hash of data and return as hex string. */
async function sha256hex(data: ArrayBuffer): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", data);
  return hexEncode(hash as unknown as ArrayBuffer);
}

/** Compute HMAC-SHA256 of payload with key, return hex string. */
async function hmacSha256hex(key: CryptoKey, data: Uint8Array): Promise<string> {
  const sigBytes = await crypto.subtle.sign("HMAC", key, toArrayBuffer(data));
  return hexEncode(sigBytes as unknown as ArrayBuffer);
}

/**
 * Build signed headers for an API request.
 * @param method  HTTP method (GET, POST)
 * @param path    URL path including query string (e.g. "/v1/ratings/reddit.com/t3_abc?h=53")
 * @param body    Request body bytes (omit for GET requests)
 */
export async function buildSignedHeaders(
  method: string,
  path: string,
  body?: Uint8Array,
): Promise<Record<string, string>> {
  const ts = Math.floor(Date.now() / 1000).toString();

  const bodyHex = body && body.length > 0
    ? await sha256hex(toArrayBuffer(body))
    : "0";
  const payload = `${method}:${path}:${ts}:${bodyHex}`;

  const key = await crypto.subtle.importKey(
    "raw",
    toArrayBuffer(enc.encode(API_SECRET)),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const sig = await hmacSha256hex(key, enc.encode(payload));

  return {
    "X-Slaze-Ts": ts,
    "X-Slaze-Sig": sig,
  };
}
