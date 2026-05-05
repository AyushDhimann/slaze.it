/**
 * Copies the appropriate root .env file into browser extensions/ for Plasmo.
 * Usage: node scripts/copy-env.mjs [dev|prod]
 *   dev  → copies ../.env.dev → .env
 *   prod → copies ../.env      → .env (default)
 */

import { copyFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..", "..");
const target = resolve(__dirname, "..", ".env");

const mode = process.argv[2] || "prod";
const sourceName = mode === "dev" ? ".env.dev" : ".env";
const source = resolve(root, sourceName);

if (!existsSync(source)) {
  console.error(
    `ERROR: ${sourceName} not found at project root (${root}).`,
  );
  console.error(`Create it from ${sourceName}.example.`);
  process.exit(1);
}

copyFileSync(source, target);
console.log(`[copy-env] ${sourceName} → browser extensions/.env`);
