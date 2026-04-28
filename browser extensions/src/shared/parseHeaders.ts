/**
 * Slaze Verdict Header Parser
 *
 * Extracts TW-DCS-RGB verdict engine data from HTTP response headers.
 * Used by both fetchSingle and submitVote background handlers.
 */
import type { VerdictHeader } from './types';

/** Parse X-Slaze-* response headers into a VerdictHeader struct. */
export function parseVerdictHeaders(res: Response): VerdictHeader | null {
  const engineRaw = res.headers.get("X-Slaze-Engine");
  if (!engineRaw) return null;

  const sigRaw = res.headers.get("X-Slaze-Sig");
  return {
    labelPhrase: res.headers.get("X-Slaze-Label") || "",
    labelSubtext: res.headers.get("X-Slaze-Subtext") || "",
    signatureState: parseInt(res.headers.get("X-Slaze-State") || "0", 10),
    signatureCategories: sigRaw
      ? sigRaw.split(",").map((n) => {
          const v = parseInt(n, 10);
          return Number.isNaN(v) ? -1 : v;
        })
      : [-1, -1, -1],
    weightedVotes: parseInt(res.headers.get("X-Slaze-WVotes") || "0", 10),
    engineVersion: parseInt(engineRaw, 10),
  };
}
