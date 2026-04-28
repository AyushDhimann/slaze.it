/**
 * Background Binary Protocol Platform Encoding
 *
 * Maps (platform, postId) tuples to compact { pb, id } pairs
 * used by the binary batch wire format. Each platform gets a
 * unique wire byte; Reddit posts are further split by t1_
 * (comment) and t3_ (submission) prefix.
 *
 * Keep in sync with binaryPlatformEntries in server/handlers.go.
 */
import type { PlatformEncoding } from '../shared/types';

export function platformEncode(
  platform: string,
  postId: string
): PlatformEncoding {
  if (platform === "reddit.com") {
    if (postId.startsWith("t1_")) return { pb: 0x00, id: postId.slice(3) };
    if (postId.startsWith("t3_")) return { pb: 0x01, id: postId.slice(3) };
    console.warn(`[Slaze] Unknown Reddit postId prefix in "${postId}" — treating as t3_ (submission)`);
    return { pb: 0x01, id: postId };
  }
  if (platform === "x.com") return { pb: 0x02, id: postId };
  if (platform === "twitter.com") return { pb: 0x03, id: postId };
  console.warn(`[Slaze] Unknown platform "${platform}" — encoding as Reddit submission (0x01)`);
  return { pb: 0x01, id: postId };
}
