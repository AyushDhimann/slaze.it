/**
 * Slaze Popup Script
 *
 * Lightweight info popup. Voting happens inline on supported pages
 * (Reddit action row, X/Twitter action bar) — no popup UI needed.
 */

// ── Main ────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  try {
    const result = (await chrome.storage.local.get("slaze_auth_token")) as {
      slaze_auth_token?: string;
    };
    const hasToken = !!result.slaze_auth_token;

    const statusEl = document.getElementById("status")!;
    if (hasToken) {
      statusEl.className = "status info";
      statusEl.textContent = "Extension is active. Browse Reddit or X to rate posts.";
    } else {
      statusEl.className = "status error";
      statusEl.textContent = "No auth token found. Reinstall the extension.";
    }
  } catch {
    // popup context may be unavailable
  }
}

main().catch(() => {});
