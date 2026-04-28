/**
 * Vite build config for the Slaze browser extension.
 *
 * Outputs (all ES module format, Chrome MV3 compatible):
 *   dist/background.js  Service worker (verdictCatalog inlined)
 *   dist/content.js     Content script bundle (all modules + React)
 *   dist/popup.html+js  Popup page (Vite HTML entry)
 *
 * The standalone verdictCatalog IIFE and Firefox MV2 background are
 * built separately by scripts/build-firefox.mjs using esbuild.
 */

import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const root = dirname(__filename);
const srcDir = resolve(root, "src");
const distDir = resolve(root, "dist");

/** Plugin that copies static assets into dist/ after the main build. */
function copyStaticPlugin(): Plugin {
  return {
    name: "slaze-copy-static",
    closeBundle() {
      mkdirSync(distDir, { recursive: true });

      // Copy static CSS
      const cssSrc = resolve(srcDir, "content.css");
      const cssDest = resolve(distDir, "content.css");
      if (existsSync(cssSrc)) {
        copyFileSync(cssSrc, cssDest);
        console.log(`  [copy-static] content.css → dist/content.css`);
      }

      // Flatten popup from dist/src/popup/index.html to dist/popup.html
      const popupSrc = resolve(distDir, "src/popup/index.html");
      const popupDest = resolve(distDir, "popup.html");
      if (existsSync(popupSrc)) {
        let html = readFileSync(popupSrc, "utf8");
        // Fix relative paths: from dist/src/popup/, ../../popup.js → ./popup.js
        html = html.replace(/["']\.\.\/\.\.\/popup\.(js|css)["']/g, '"./popup.$1"');
        writeFileSync(popupDest, html, "utf8");
        console.log(`  [copy-static] popup.html flattened to dist/popup.html`);

        // Clean up nested directory
        try {
          const { rmSync, readdirSync, statSync } = require("fs") as typeof import("fs");
          const rmDir = (p: string) => {
            if (!existsSync(p)) return;
            if (statSync(p).isDirectory()) {
              for (const e of readdirSync(p)) rmDir(resolve(p, e));
              rmSync(p, { recursive: true, force: true });
            } else {
              rmSync(p, { force: true });
            }
          };
          rmDir(resolve(distDir, "src"));
        } catch {
          // best effort cleanup
        }
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), copyStaticPlugin()],

  base: "./",

  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },

  build: {
    outDir: distDir,
    emptyOutDir: true,
    sourcemap: true,
    minify: true,
    target: "chrome110",
    cssCodeSplit: false,

    rollupOptions: {
      input: {
        background: resolve(srcDir, "background/index.ts"),
        content: resolve(srcDir, "content/index.ts"),
        popup: resolve(srcDir, "popup/index.html"),
      },
      output: {
        format: "es",
        entryFileNames: "[name].js",
        assetFileNames: "popup[extname]",
      },
    },
  },
});
