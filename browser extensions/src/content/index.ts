/**
 * Slaze Content Script Entry Point
 *
 * Import order matters: modules self-register as side-effects of being
 * imported (platform adapters in the registry, vote menu injectors in
 * their registry). The cache and API client initialise on import too.
 */

// ── Foundation: config + API client (creates cache + auth token singletons) ──
import './core/api';

// ── Platform adapters (register themselves) ───────────────────────
import './platforms/reddit';
import './platforms/twitter';

// ── UI modules (badge + vote menu mounts register themselves) ─────
import './ui/vote-menu/index';

// ── Application layer (message listeners, injector entry) ─────────
import './core/messaging';

import { detectPlatform } from './platforms/index';
import { observe } from './core/injector';
import { setApiBase } from './config';

(async () => {
  // Override API base URL from chrome.storage.local
  try {
    const { slaze_api_base } = (await chrome.storage.local.get(
      "slaze_api_base"
    )) as { slaze_api_base?: string };
    if (slaze_api_base) {
      setApiBase(slaze_api_base);
    }
  } catch {
    /* storage unavailable */
  }

  const adapter = detectPlatform();
  if (adapter) {
    observe(adapter);
  }
})();
