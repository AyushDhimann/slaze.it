/**
 * Vote Menu Registry
 *
 * Each platform's mount module registers its injector function here
 * via a side-effect import. The injector module looks up the matching
 * injector by hostname when scanning posts.
 */

import type { VoteMenuInjector } from '../../../shared/types';

const voteMenus = new Map<string, VoteMenuInjector>();

/** Register a vote menu injector for a platform hostname. */
export function registerVoteMenu(
  hostname: string,
  injector: VoteMenuInjector
): void {
  voteMenus.set(hostname, injector);
}

/** Look up a vote menu injector by hostname. */
export function getVoteMenuInjector(
  hostname: string
): VoteMenuInjector | undefined {
  return voteMenus.get(hostname);
}
