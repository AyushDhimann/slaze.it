/**
 * Plasmo Content Script Entry for Slaze.
 *
 * Plasmo convention: files in src/contents/ are auto-discovered as
 * content scripts. This file provides the PlasmoCSConfig (matches,
 * run_at) and getStyle export, then imports the actual content
 * script logic from ../content/index.ts.
 */

import type { PlasmoCSConfig } from "plasmo";
import cssText from "data-text:~content.css";

export const config: PlasmoCSConfig = {
  matches: [
    "*://*.reddit.com/*",
    "*://*.x.com/*",
    "*://*.twitter.com/*",
  ],
  run_at: "document_idle",
  css: ["../content.css"],
};

export const getStyle = () => {
  const style = document.createElement("style");
  style.textContent = cssText;
  return style;
};

// Import the actual content script logic. All modules self-register
// (platform adapters, vote menu injectors) as side-effects.
import "../content/index";
