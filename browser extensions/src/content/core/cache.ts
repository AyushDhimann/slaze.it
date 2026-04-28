/**
 * Content Generic TTL+LRU Cache
 *
 * In-memory key/value store with per-entry expiry and an LRU
 * eviction cap. Stores ETags alongside values to support
 * conditional re-fetches (If-None-Match). Used by the API
 * client to avoid redundant network requests as the user scrolls.
 */

interface CacheEntry<T> {
  value: T;
  etag: string | null;
  expiresAt: number;
}

const DEFAULT_MAX_SIZE = 500;
const PRUNE_INTERVAL_MS = 60_000;

export class TtlCache<T = unknown> {
  private readonly store = new Map<string, CacheEntry<T>>();
  private readonly maxSize: number;
  private _pruneTimer: ReturnType<typeof setInterval> | null = null;

  constructor(maxSize = DEFAULT_MAX_SIZE) {
    this.maxSize = maxSize;
    this._startPruning();
  }

  /**
   * Store a value under `key` for `ttlMs` milliseconds.
   * Re-inserting an existing key refreshes its LRU position.
   */
  set(key: string, value: T, ttlMs: number, etag?: string | null): void {
    const safeTtl = Math.max(0, ttlMs);
    this.store.delete(key);
    if (this.store.size >= this.maxSize) {
      const first = this.store.keys().next();
      if (!first.done) this.store.delete(first.value);
    }
    this.store.set(key, {
      value,
      etag: etag ?? null,
      expiresAt: Date.now() + safeTtl,
    });
  }

  /**
   * Retrieve a value. Returns `undefined` on cache miss or expiry
   * (distinguishable from a cached `null`, which means "known unrated").
   */
  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() >= entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  /** Explicitly remove a cache entry (e.g. after a vote to force re-fetch). */
  invalidate(key: string): void {
    this.store.delete(key);
  }

  /**
   * Return a stale entry's value and etag even if expired.
   * Used to send If-None-Match on conditional re-fetches.
   * Returns null if the key was never cached.
   */
  getStale(key: string): { value: T; etag: string | null } | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    return { value: entry.value, etag: entry.etag };
  }

  /** Stop the background prune timer (for tests / cleanup). */
  destroy(): void {
    if (this._pruneTimer !== null) {
      clearInterval(this._pruneTimer);
      this._pruneTimer = null;
    }
  }

  private _startPruning(): void {
    // Lazy expiry: get() already checks expiration on every read.
    // The periodic prune is a safety net for entries that are never read again.
    // Interval is configurable via PRUNE_INTERVAL_MS constant.
    this._pruneTimer = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.store) {
        if (now >= entry.expiresAt) this.store.delete(key);
      }
    }, PRUNE_INTERVAL_MS);
  }
}
