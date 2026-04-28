// =========================================================================
// Slaze Shared Type Definitions
//
// Used by background service worker, content scripts, and popup.
// Centralising types here keeps the three JS contexts in agreement
// without duplicating interface definitions.
// =========================================================================

// ── Platform Adapter Interface ──────────────────────────────────────

/** Function a platform adapter provides to inject its vote menu into a post. */
export type VoteMenuInjector = (post: Element, adapter: PlatformAdapter, postId: string) => boolean;

/** Every supported platform must satisfy this contract so the injector
 *  and scanner can work without platform-specific branches. */
export interface PlatformAdapter {
  hostname: string;
  postSelector: string;
  getPostId(post: Element): string | null;
  getTitle?(post: Element): string | null;
  getInsertionPoint(post: Element): Element | null;
  getShareAnchor?(post: Element): Element | null;
  getActionRow?(post: Element): Element | null;
  getNativeActionButton?(post: Element): Element | null;
  getPlatformVotes?(post: Element): number;
  getPostTimeBucket?(post: Element): number;
  isComment?(post: Element): boolean;
}

// ── Category Definitions ────────────────────────────────────────────

export type CategoryGroup = "positive" | "negative";

export interface CategoryDef {
  id: string;
  label: string;
  icon: string;
  color: string;
  bg: string;
  group: CategoryGroup;
}

// ── Rating / Verdict Types ──────────────────────────────────────────

/** A fully-resolved rating that the badge and VoteMenu can render. */
export interface Rating {
  category: number;
  label: string;
  percent: number;
  voteBucket: number;
  categoryPercents: number[] | null;
  labelPhrase?: string;
  labelSubtext?: string;
  signatureState?: number;
  signatureCategories?: number[];
  weightedVotes?: number;
  engineVersion?: number;
}

/**
 * null  = the server returned 404; post is known-unrated.
 * undefined = network/token error; treat as "offline", do not cache.
 */
export type RatingResult = Rating | null | undefined;

/** What the batch endpoint returns per cache key. */
export interface BinaryRatingEntry {
  category: number;
  percent: number;
  percents: number[];
  signatureState?: number;
  signatureCategories?: number[];
  labelPhrase?: string;
  labelSubtext?: string;
}

// ── Verdict Header (parsed from HTTP response headers) ──────────────

export interface VerdictHeader {
  labelPhrase: string;
  labelSubtext: string;
  signatureState: number;
  signatureCategories: number[];
  weightedVotes: number;
  engineVersion: number;
}

// ── Message Protocol ────────────────────────────────────────────────

export const MESSAGE_TYPES = [
  "SLAZE_FETCH_BATCH",
  "SLAZE_FETCH_SINGLE",
  "SLAZE_SUBMIT_VOTE",
  "SLAZE_TOKEN_CHANGED",
  "SLAZE_GET_POSTS",
  "SLAZE_REFRESH_BADGE",
] as const;

export type MessageType = (typeof MESSAGE_TYPES)[number];

export interface BatchItem {
  platform: string;
  postId: string;
  cacheKey: string;
  pvBucket?: number;
  timeBucket?: number;
}

export interface BatchFetchRequest {
  type: "SLAZE_FETCH_BATCH";
  items: BatchItem[];
}

export interface SingleFetchRequest {
  type: "SLAZE_FETCH_SINGLE";
  platform: string;
  postId: string;
  pvBucket: number;
  timeBucket: number;
  staleEtag: string | null;
}

export interface SubmitVoteRequest {
  type: "SLAZE_SUBMIT_VOTE";
  platform: string;
  postId: string;
  payload: string;
}

export interface BatchFetchResponse {
  ok: boolean;
  ratings?: Record<string, BinaryRatingEntry | null>;
}

export interface SingleFetchResponse {
  ok: boolean;
  status: number;
  etag: string | null;
  cacheControl: string | null;
  verdict: VerdictHeader | null;
}

export interface SubmitVoteResponse {
  ok: boolean;
  status: number;
  etag: string | null;
  verdict: VerdictHeader | null;
}

export interface GetPostsMessage {
  type: "SLAZE_GET_POSTS";
}

export interface RefreshBadgeMessage {
  type: "SLAZE_REFRESH_BADGE";
  cacheKey: string;
  platform: string;
  postId: string;
}

export interface TokenChangedMessage {
  type: "SLAZE_TOKEN_CHANGED";
}

// ── Vote Payload ────────────────────────────────────────────────────

export interface PayloadDecoded {
  categories: number[];
  pvBucket: number;
  upBucket: number;
  timeBucket: number;
  dwellMs: number | null;
}

// ── Platform Post (for messaging) ───────────────────────────────────

export interface PlatformPost {
  postId: string;
  platform: string;
  title?: string;
}

// ── Binary Protocol ─────────────────────────────────────────────────

export interface PlatformEncoding {
  pb: number; // platform byte (0x00-0x03)
  id: string; // stripped post ID
}
