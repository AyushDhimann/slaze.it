/**
 * build-firefox.mjs: Generates a Firefox MV2 extension from the
 * Chromium MV3 build output in dist/.
 *
 * Steps:
 *   1. Build Chrome extension (vite build)
 *   2. Build verdictCatalog IIFE via esbuild
 *   3. Build Firefox background (IIFE) via esbuild
 *   4. Copy dist/ files to firefox/
 *   5. Generate Firefox MV2 manifest
 *
 * Usage:
 *   pnpm run build:firefox          builds dist/, then generates firefox/
 *   pnpm run sync:firefox           skips build, just syncs dist/ → firefox/
 */

import { spawnSync } from "node:child_process";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const srcDir = path.join(root, "src");
const distDir = path.join(root, "dist");
const firefoxDir = path.join(root, "firefox");

const args = process.argv.slice(2);
const skipBuild = args.includes("--skip-build");

// ── Helpers ──────────────────────────────────────────────────────

function run(command, cmdArgs) {
  const result = spawnSync(command, cmdArgs, {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function npx(command, cmdArgs) {
  const npxCmd = process.platform === "win32" ? "npx.cmd" : "npx";
  return run(npxCmd, [command, ...cmdArgs]);
}

async function readJson(filePath, fallback = null) {
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function uniq(items) {
  return Array.from(new Set(items.filter(Boolean)));
}

// ── Manifest transform ───────────────────────────────────────────

function toFirefoxManifest(chromiumManifest) {
  const permissions = uniq([
    ...(chromiumManifest.permissions ?? []),
    ...(chromiumManifest.host_permissions ?? []),
  ]);

  return {
    manifest_version: 2,
    name: chromiumManifest.name,
    version: chromiumManifest.version,
    description: chromiumManifest.description,
    permissions,
    browser_action: {
      default_popup: chromiumManifest.action?.default_popup ?? "popup.html",
      default_title: chromiumManifest.action?.default_title ?? chromiumManifest.name,
    },
    background: {
      scripts: ["background.js"],
    },
    content_scripts: chromiumManifest.content_scripts ?? [],
    browser_specific_settings: {
      gecko: {
        id: "slaze@slaze.it.com",
        strict_min_version: "109.0",
      },
    },
  };
}

// ── esbuild helpers ──────────────────────────────────────────────

/**
 * Build a single TypeScript entry using Vite's bundled esbuild.
 * Uses the JavaScript API instead of CLI to avoid version mismatches.
 */
async function esbuildBuild(entry, outfile, opts = {}) {
  // esbuild is a dependency of Vite, always available in node_modules
  const esbuild = await import("esbuild");
  await esbuild.build({
    entryPoints: [entry],
    bundle: true,
    outfile,
    format: opts.format ?? "esm",
    globalName: opts.globalName,
    external: opts.external,
    minify: opts.minify,
    target: opts.target,
    banner: opts.banner ? { js: opts.banner } : undefined,
    define: opts.define,
    logLevel: "warning",
  });
}

// ── Sync ─────────────────────────────────────────────────────────

async function syncFiles() {
  await rm(firefoxDir, { recursive: true, force: true });
  await mkdir(firefoxDir, { recursive: true });

  // Copy built Chrome assets
  const filesToCopy = ["content.js", "content.css", "popup.html"];
  for (const fileName of filesToCopy) {
    const src = path.join(distDir, fileName);
    if (!existsSync(src)) {
      console.warn(`[build:firefox] WARNING: ${fileName} not found, skipping`);
      continue;
    }
    await cp(src, path.join(firefoxDir, fileName), { force: true });
  }

  // Copy popup.css and popup.js from dist/
  for (const f of ["popup.css", "popup.js"]) {
    const src = path.join(distDir, f);
    if (existsSync(src)) {
      await cp(src, path.join(firefoxDir, f), { force: true });
    }
  }

  // Build and copy verdictCatalog IIFE for Firefox
  await mkdir(path.join(firefoxDir, "src", "core"), { recursive: true });
  await esbuildBuild(
    path.join(srcDir, "shared/verdictCatalog.ts"),
    path.join(firefoxDir, "src", "core", "verdictCatalog.js"),
    {
      format: "iife",
      globalName: "_slazeVerdictCatalog",
      target: "firefox109",
    }
  );

  // Build Firefox background.js (IIFE, classic script for MV2 compat)
  // The verdictCatalog is imported via importScripts before the IIFE body.
  await esbuildBuild(
    path.join(srcDir, "background/index.ts"),
    path.join(firefoxDir, "background-temp.js"),
    {
      format: "iife",
      target: "firefox109",
      minify: true,
      external: ["./src/core/verdictCatalog.js"],
    }
  );

  // Prepend importScripts for verdictCatalog
  const bgContent = await readFile(
    path.join(firefoxDir, "background-temp.js"),
    "utf8"
  );
  const finalBg =
    `importScripts("src/core/verdictCatalog.js");\n` +
    `var lookupVerdict = globalThis._slazeVerdictCatalog.lookupVerdict;\n` +
    `var STATE_SPARSE = globalThis._slazeVerdictCatalog.STATE_SPARSE;\n` +
    bgContent;
  await writeFile(
    path.join(firefoxDir, "background.js"),
    finalBg,
    "utf8"
  );

  // Clean up temp file
  try {
    await rm(path.join(firefoxDir, "background-temp.js"), { force: true });
  } catch {
    /* ok */
  }

  console.log("[build:firefox] Files synced to firefox/");
}

// ── Main ─────────────────────────────────────────────────────────

async function main() {
  if (!skipBuild) {
    console.log("[build:firefox] Building Chromium extension first...");
    run("pnpm", ["run", "build"]);
  }

  await syncFiles();

  // Generate Firefox manifest from dist/manifest.json
  const chromiumManifest = await readJson(
    path.join(distDir, "manifest.json")
  );
  if (!chromiumManifest) {
    throw new Error("Could not read dist/manifest.json");
  }

  const firefoxManifest = toFirefoxManifest(chromiumManifest);

  await writeFile(
    path.join(firefoxDir, "manifest.json"),
    JSON.stringify(firefoxManifest, null, 2) + "\n",
    "utf8"
  );

  console.log(
    "[build:firefox] Firefox extension folder is ready:"
  );
  console.log(`  firefox/manifest.json`);
  console.log(
    "[build:firefox] Load in Firefox via about:debugging → This Firefox → Load Temporary Add-on"
  );
}

main().catch((err) => {
  console.error("[build:firefox] Failed:", err.message);
  process.exit(1);
});
