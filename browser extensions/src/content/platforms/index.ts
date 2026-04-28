/**
 * Slaze Platform Registry
 *
 * Central registry of platform adapters and vote menu injectors.
 * Each platform module self-registers via side-effect import.
 */

import type { PlatformAdapter, VoteMenuInjector } from '../../shared/types';

const adapters = new Map<string, PlatformAdapter>();
const voteMenus = new Map<string, VoteMenuInjector>();

/** Register a platform adapter (called as a side-effect of importing a platform module). */
export function registerAdapter(adapter: PlatformAdapter): void {
  adapters.set(adapter.hostname, adapter);
}

/** Register a vote menu injector for a platform (called by mount modules). */
export function registerVoteMenu(
  hostname: string,
  injector: VoteMenuInjector
): void {
  voteMenus.set(hostname, injector);
}

/** Find the platform adapter matching the current page's hostname. */
export function detectPlatform(): PlatformAdapter | undefined {
  for (const adapter of adapters.values()) {
    const h = adapter.hostname;
    if (
      location.hostname === h ||
      location.hostname.endsWith("." + h)
    ) {
      return adapter;
    }
  }
  return undefined;
}

/** Get a previously-registered adapter by hostname. */
export function getAdapter(hostname: string): PlatformAdapter | undefined {
  return adapters.get(hostname);
}

/** Get a vote menu injector for a hostname. */
export function getVoteMenuInjector(
  hostname: string
): VoteMenuInjector | undefined {
  return voteMenus.get(hostname);
}

/** Iterate over all registered adapters (used by messaging for post collection). */
export function allAdapters(): IterableIterator<PlatformAdapter> {
  return adapters.values();
}
