# Slaze Browser Extension Agent Guide

## Project overview

Slaze is a community-powered post-quality rating browser extension. It injects coloured verdict badges and an inline voting UI into Reddit (`shreddit-post`) and X/Twitter (`article[data-testid="tweet"]`) pages. Users choose up to 3 of 9 category labels per post; the TW-DCS-RGB verdict engine on the server analyses vote patterns and returns human-readable verdicts like "Community Gold" or "Bot Residue".

The extension ships for **Chrome MV3** (primary) and **Firefox MV2** (auto-generated from Chrome build).

## Tech stack

| Layer | Technology |
|-------|-----------|
| Language | TypeScript 6 (strict mode) |
| UI | React 19 + React DOM 19 |
| Build | Vite 8 (Rolldown bundler) |
| Package manager | pnpm (primary), npm compatible |
| Target | Chrome 110+, Firefox 109+ |
| Types | `@types/chrome` for extension APIs |

## Repository structure

```
browser extensions/          # Extension source + build
├── src/                     # All TypeScript source
│   ├── shared/              # Shared types + verdict lookup table
│   ├── background/          # Service worker (fetch proxy)
│   ├── content/             # Content scripts (badges + React UI)
│   └── popup/               # Extension popup page
├── dist/                    # Build output → load as Chrome extension
├── scripts/                 # Build tooling
│   ├── generate-manifest.mjs
│   └── build-firefox.mjs
├── vite.config.ts           # Multi-entry Vite config
└── tsconfig.json            # TypeScript configuration
wiki/                        # Detailed documentation
```

## Architecture: three JS contexts

The extension runs in three separate JavaScript contexts that communicate via `chrome.runtime.sendMessage`:

### 1. Background (Service Worker)
- **Entry**: `src/background/index.ts`
- **Role**: Authenticated fetch proxy. Content scripts can't call the Slaze API directly (CORS); they relay through the service worker which has `host_permissions`.
- **Key modules**: `token.ts` (auth), `platformEncode.ts` (binary wire format), `handlers/` (one file per message type)
- **Binary protocol**: POST `/v1/b` with compact `Uint8Array` body containing 1 byte platform, 1 byte ID length, and variable ID per post. Response is a dense binary array (11 bytes per rating v1, 15 bytes per rating v2 with verdict engine data).
- **Verdict resolution**: Uses the inlined `verdictCatalog.ts` lookup table (mirror of server-side Go catalog) to resolve `(state, c1, c2, c3)` tuples into human-readable verdict phrases without a second round-trip.

### 2. Content Script
- **Entry**: `src/content/index.ts`
- **Role**: DOM injection. Scans pages for unprocessed posts, batch-fetches ratings, injects badge pills and vote menu buttons.
- **Key modules**: `config.ts` (constants + helper functions), `core/api.ts` (fetch single/batch rating, submit vote), `core/cache.ts` (TtlCache<T>), `core/injector.ts` (DOM scanner + MutationObserver), `core/messaging.ts` (popup message handlers), `platforms/` (Reddit + X/Twitter adapters), `ui/badge.ts` (badge DOM factory), `ui/vote-menu/` (React components)
- **Module loading**: Side-effect imports in `content/index.ts` register platform adapters and vote menu injectors before the injector starts scanning. Import order replaces the old manifest.json `js` array.
- **React UI**: The VoteMenu component renders inline. On Reddit it pierces Shadow DOM (`shreddit-post`). On X/Twitter it uses React Portal for the dropdown (to escape `overflow:hidden` on tweet cards).

### 3. Popup
- **Entry**: `src/popup/index.html` + `index.ts`
- **Role**: Status display. Shows whether the extension has a valid auth token and provides links to the Slaze website.

## Platform Adapter interface

Every supported platform must implement `PlatformAdapter` (defined in `src/shared/types.ts`):

```ts
interface PlatformAdapter {
  hostname: string;
  postSelector: string;
  getPostId(post: Element): string | null;
  getInsertionPoint(post: Element): Element | null;
  getShareAnchor?(post: Element): Element | null;
  getActionRow?(post: Element): Element | null;
  getNativeActionButton?(post: Element): Element | null;
  getPlatformVotes?(post: Element): number;
  getPostTimeBucket?(post: Element): number;
  getTitle?(post: Element): string | null;
  isComment?(post: Element): boolean;
}
```

Adapters self-register via `registerAdapter()` (side-effect in `platforms/reddit.ts`, `platforms/twitter.ts`).

## Build pipeline

```
src/**/*.ts  ──Vite/Rolldown──▶  dist/
                                   ├── background.js  (ES module, verdictCatalog inlined)
                                   ├── content.js     (ES module, React + all modules bundled)
                                   ├── popup.html/js/css
                                   └── content.css    (copied statically)

                    ──esbuild──▶  firefox/
                                   ├── background.js  (IIFE, verdictCatalog via importScripts)
                                   ├── src/core/verdictCatalog.js (standalone IIFE)
                                   └── ... (content/popup copied from dist/)
```

- `pnpm run build` compiles TypeScript into dist/
- `pnpm run watch` rebuilds on file change
- `pnpm run build:firefox` builds dist/ then generates firefox/
- `pnpm run typecheck` runs `tsc --noEmit`

## Coding standards

### Must follow
1. **TypeScript strict mode**: no `any` unless absolutely necessary (cast through `unknown` first).
2. **Every source file has a JSDoc header** explaining its purpose. Exported functions have `/** */` docstrings.
3. **Section separators**: Use `// ── Section Name ──` (extended ASCII box-drawing horizontal rule) between major sections within a file.
4. **No `window.Slaze` namespace**: modules import directly from each other. This was refactored out.
5. **Side-effect imports** for registration: platform adapters and vote menu injectors register themselves via `registerAdapter()` / `registerVoteMenu()` as side-effects of being imported.
6. **Imports are extensionless**: Vite/Rolldown resolves them. The tsconfig uses `moduleResolution: "bundler"`.
7. **Relative imports use the shortest path**: `'../config'` not `'../../content/config'` from `content/core/`.

### Must avoid
1. Circular imports are forbidden. The module dependency graph is a DAG. Content scripts → UI → API → Cache (no reverse edges).
2. `window.Slaze` or any global namespace pattern.
3. Hardcoded API keys/tokens in source.
4. Committing `dist/`, `firefox/`, or `*.js.map` to git.

### When adding a new platform
1. Create `src/content/platforms/<name>.ts`
2. Implement `PlatformAdapter`
3. Call `registerAdapter(adapter)` at module scope
4. Add hostname to `matches` in `scripts/generate-manifest.mjs`
5. Create `src/content/ui/vote-menu/<name>Mount.tsx` if vote menu is needed
6. Register via `registerVoteMenu(hostname, injector)`

## Key design decisions

### Why a binary batch protocol?
The POST `/v1/b` endpoint accepts a compact binary body (1 byte per post overhead + ID) and returns a dense binary array. This minimises bandwidth for pages with 30+ posts per viewport. A single 500-byte binary request replaces 30 individual JSON API calls. Keeps the extension fast even on slow connections.

### Why verdictCatalog is client-side?
The ~120-entry verdict phrase lookup table is duplicated in the extension rather than fetched from the server. This means the verdict label is available immediately when ratings load, with no second round-trip. The catalog must stay in sync with the server's `verdict_catalog.go`. Both are generated from the same source of truth.

### Why adaptive TTL?
Cache TTL ranges from 5 seconds (hot posts with high activity) to 24 hours (old posts). This balances freshness against API load. The formula mirrors the server-side Go `AdaptiveTTLWithContext` function.

### Why React in a content script?
The vote menu UI (9 category buttons with fill bars, verdict labels, portal positioning) is complex enough to justify React. At ~72 KB gzipped (React 19 + all components), the bundle cost is acceptable. The rest of the content script (~160 KB source before minification) is vanilla TypeScript; React is only used where its component model adds value.

## Common issues

- **"Extension context invalidated"**: Happens when the extension is reloaded while a page is open. The error suppression handlers in `index.tsx` catch these. Any new `chrome.*` API call in content scripts should handle this error.
- **Shadow DOM on Reddit**: `shreddit-post` elements have open shadow roots. Selectors must pierce through `post.shadowRoot` for action-row insertion. CSS is injected into shadow roots via `adoptedStyleSheets` (with `<style>` fallback).
- **X/Twitter overflow hidden**: Tweet cards use `overflow: hidden` which clips absolutely-positioned dropdowns. The vote menu uses React Portal to render the dropdown at `document.body` level with `position: fixed`, repositioning on scroll/resize.

## Testing

Manual testing is the primary method (Chrome extension testing tools are limited):
1. `pnpm run build` then load `dist/` as unpacked extension at `chrome://extensions`
2. Navigate to Reddit (`old.reddit.com` or `reddit.com` with new UI)
3. Verify badge pills appear on post cards
4. Click "Slaze.it" button → dropdown opens with category rows
5. Select 2-3 categories → vote submits, badge updates
6. `pnpm run build:firefox` → load `firefox/` in Firefox via `about:debugging`

For pre-submit validation:
- `pnpm run typecheck` must pass with zero errors
- `pnpm run build` must produce all expected dist/ files
- `grep -r "window.Slaze" src/` must return zero matches
