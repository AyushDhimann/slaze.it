import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const distDir = resolve(root, "dist");

const pkgPath = resolve(root, "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));

const manifest = {
  manifest_version: 3,
  name: "Slaze",
  version: pkg.version,
  description:
    "Community-powered post quality ratings. See if a post is worth reading before you waste your time.",
  permissions: ["storage", "activeTab"],
  host_permissions: [
    "http://localhost:8082/*",
    "https://api.slaze.it.com/*",
  ],
  background: {
    service_worker: "background.js",
    type: "module",
  },
  action: {
    default_popup: "popup.html",
    default_title: "Slaze Rate post quality",
  },
  content_scripts: [
    {
      matches: [
        "*://*.reddit.com/*",
        "*://*.x.com/*",
        "*://*.twitter.com/*",
      ],
      js: ["content.js"],
      css: ["content.css"],
      run_at: "document_idle",
    },
  ],
  content_security_policy: {
    extension_pages: "script-src 'self'; object-src 'self'",
  },
};

mkdirSync(distDir, { recursive: true });
writeFileSync(
  resolve(distDir, "manifest.json"),
  JSON.stringify(manifest, null, 2) + "\n",
  "utf8"
);

console.log("[generate-manifest] dist/manifest.json written");
