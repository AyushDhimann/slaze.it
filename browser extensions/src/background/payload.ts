/**
 * Background Vote Payload Decoder
 *
 * Decodes compact vote payload strings produced by
 * packVotePayload() on the content-script side.
 * Grammar: v<cats>p<pvBucket>u<upBucket>t<timeBucket>[d<dwellMs>]
 */
import type { PayloadDecoded } from '../shared/types';

/**
 * Decode a compact vote payload string into its semantic parts.
 * Grammar: v<cats>p<pvBucket>u<upBucket>t<timeBucket>[d<dwell_ms>]
 */
export function decodePayload(p: string): PayloadDecoded | null {
  const m = /^v(\d*)p(\d)u(\d)t(\d)(?:d(\d+))?$/.exec(p);
  if (!m) return null;
  return {
    categories: m[1] ? m[1].split("").map(Number) : [],
    pvBucket: parseInt(m[2], 10),
    upBucket: parseInt(m[3], 10),
    timeBucket: parseInt(m[4], 10),
    dwellMs: m[5] !== undefined ? parseInt(m[5], 10) : null,
  };
}
