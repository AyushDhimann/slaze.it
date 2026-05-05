# Slaze Browser Extension Agent Guide

## Project overview

Slaze is a community-powered post-quality rating browser extension. It injects coloured verdict badges and an inline voting UI into Reddit (`shreddit-post`) and X/Twitter (`article[data-testid="tweet"]`) pages. Users choose up to 3 of 9 category labels per post; the TW-DCS-RGB verdict engine on the server analyses vote patterns and returns human-readable verdicts like "Community Gold" or "Bot Residue".

The extension ships for **Chrome MV3** (primary) and **Firefox MV2** (`plasmo build --target=firefox-mv2`).

## Tech stack

| Layer | Technology |
|-------|-----------|
| Language | TypeScript 6 (strict mode) |
| UI | React 19 + React DOM 19 |
| Build | Plasmo 0.90 (Parcel bundler) |
| Auth | Clerk (`@clerk/chrome-extension`) |
| Routing | React Router 7 (popup memory router) |
| Package manager | pnpm |
| Target | Chrome 110+, Firefox 109+ |
| Types | `@types/chrome` for extension APIs |

## Repository structure

```
browser extensions/          # Extension source + build
├── src/                     # All TypeScript source
│   ├── shared/              # Shared types + verdict lookup table
│   ├── background/          # Service worker (fetch proxy + Clerk client)
│   ├── content/             # Content script logic (badges + React UI)
│   ├── contents/            # Plasmo content script entry (imports from content/)
│   └── popup/               # React popup with Clerk auth pages
├── assets/                  # Extension icons (Plasmo convention)
├── build/                   # Build output → load as Chrome extension (gitignored)
├── .env                     # Production env (Clerk keys, API URLs)
├── .env.dev                 # Development env (localhost overrides)
├── .env.example             # Production template
├── .env.dev.example         # Development template
├── package.json             # Dependencies + scripts + inline manifest
└── tsconfig.json            # Extends plasmo/templates/tsconfig.base
```

## Architecture: three JS contexts

The extension runs in three separate JavaScript contexts that communicate via `chrome.runtime.sendMessage`:

### 1. Background (Service Worker)
- **Entry**: `src/background/index.ts`
- **Role**: Authenticated fetch proxy + Clerk client. Content scripts can't call the Slaze API directly (CORS); they relay through the service worker which has `host_permissions`.
- **Key modules**: `token.ts` (Clerk session token via `createClerkClient`), `platformEncode.ts` (binary wire format), `handlers/` (one file per message type)
- **Binary protocol**: POST `/v1/b` with compact `Uint8Array` body containing 1 byte platform, 1 byte ID length, and variable ID per post. Response is a dense binary array (11 bytes per rating v1, 15 bytes per rating v2 with verdict engine data).
- **Verdict resolution**: Uses the inlined `verdictCatalog.ts` lookup table (mirror of server-side Go catalog) to resolve `(state, c1, c2, c3)` tuples into human-readable verdict phrases without a second round-trip.
- **Auth flow**: On first API call, lazily initialises `createClerkClient` from `@clerk/chrome-extension/background`. Gets session token via `clerk.session.getToken()`. On 401, refreshes and retries. Returns `null` if user is not signed in (content script falls back to offline state).

### 2. Content Script
- **Entry**: `src/contents/slaze.ts` (Plasmo convention: files in `src/contents/` are content scripts)
- **Role**: DOM injection. Scans pages for unprocessed posts, batch-fetches ratings, injects badge pills and vote menu buttons.
- **Key modules**: Delegates to `src/content/index.ts` which imports all modules as side-effects. `config.ts` (constants + helper functions), `core/api.ts` (fetch single/batch rating, submit vote), `core/cache.ts` (TtlCache<T>), `core/injector.ts` (DOM scanner + MutationObserver), `core/messaging.ts` (popup message handlers), `platforms/` (Reddit + X/Twitter adapters), `ui/badge.ts` (badge DOM factory), `ui/vote-menu/` (React components)
- **CSS injection**: Uses Plasmo's `getStyle()` export from `src/contents/slaze.ts` (imports CSS via `data-text:~content.css`). The CSS is also injected into Shadow DOM via `adoptedStyleSheets` in `redditMount.tsx`.
- **Module loading**: Side-effect imports in `content/index.ts` register platform adapters and vote menu injectors before the injector starts scanning.
- **React UI**: The VoteMenu component renders inline. On Reddit it pierces Shadow DOM (`shreddit-post`). On X/Twitter it uses React Portal for the dropdown (to escape `overflow:hidden` on tweet cards).

### 3. Popup
- **Entry**: `src/popup/index.tsx`
- **Role**: Authentication + status display. Users sign in/up via Clerk's pre-built components. Shows extension status and links to settings.
- **Routing**: React Router 7 `createMemoryRouter` with routes: `/` (home with auth status), `/sign-in` (Clerk `<SignIn />`), `/sign-up` (Clerk `<SignUp />`), `/settings` (Clerk `<UserProfile />`).
- **Layout**: `src/popup/layouts/root-layout.tsx` wraps all routes in `<ClerkProvider>` with `routerPush`/`routerReplace` wired to `useNavigate()`.

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

Plasmo uses convention-over-configuration. File placement determines extension component:

| Plasmo Convention | File | Maps To |
|---|---|---|
| `src/popup/index.tsx` | Popup entry | `chrome.action.default_popup` |
| `src/background/index.ts` | Service worker | `background.service_worker` |
| `src/contents/slaze.ts` | Content script | `content_scripts` (with PlasmoCSConfig) |
| `assets/icon.png` | Extension icons | Auto-generated sizes (16/32/48/64/128) |

```
pnpm run build        → build/chrome-mv3-prod/
pnpm run build:firefox → build/firefox-mv2-prod/   (MV2 manifest)
pnpm run dev           → build/chrome-mv3-dev/     (hot-reload)
pnpm run dev:firefox   → build/firefox-mv2-dev/    (hot-reload, MV2)
pnpm run typecheck     → tsc --noEmit
```

Manifest customisation via `"manifest"` field in `package.json`. Plasmo merges it into the generated `manifest.json`.

## Coding standards

### Must follow
1. **TypeScript strict mode**: no `any` unless absolutely necessary (cast through `unknown` first).
2. **Every source file has a JSDoc header** explaining its purpose. Exported functions have `/** */` docstrings.
3. **Section separators**: Use `// ── Section Name ──` (extended ASCII box-drawing horizontal rule) between major sections within a file.
4. **No `window.Slaze` namespace**: modules import directly from each other. This was refactored out.
5. **Side-effect imports** for registration: platform adapters and vote menu injectors register themselves via `registerAdapter()` / `registerVoteMenu()` as side-effects of being imported.
6. **Plasmo path alias**: `~*` maps to `./src/*`. Use `~shared/types` not `../../shared/types`.
7. **Relative imports use the shortest path**: `'../config'` not `'../../content/config'` from `content/core/`.
8. **Plasmo CSS import**: Use `data-text:~content.css` for raw CSS text. (Replaces the old Vite `?raw` suffix.)
9. **Environment variables**: `PLASMO_PUBLIC_*` prefix for Clerk keys. Accessed via `process.env.PLASMO_PUBLIC_*` at build time. Never hardcode keys.

### Must avoid
1. Circular imports are forbidden. The module dependency graph is a DAG. Content scripts → UI → API → Cache (no reverse edges).
2. `window.Slaze` or any global namespace pattern.
3. Hardcoded API keys/tokens in source.
4. Committing `build/`, `dist/`, `firefox/`, `.env.development`, `.env.chrome` to git.
5. Vite-specific imports (`?raw`, `?url`, `?component`). Use Plasmo equivalents (`data-text:`, `data-base64:`).

### When adding a new platform
1. Create `src/content/platforms/<name>.ts`
2. Implement `PlatformAdapter`
3. Call `registerAdapter(adapter)` at module scope
4. Add hostname to `matches` in `src/contents/slaze.ts` (PlasmoCSConfig)
5. Create `src/content/ui/vote-menu/<name>Mount.tsx` if vote menu is needed
6. Register via `registerVoteMenu(hostname, injector)`

## Key design decisions

### Why Plasmo?
Plasmo provides convention-based builds, hot-reload during development, automatic manifest generation, Firefox MV2 target, and first-class Clerk integration. It replaces the manual Vite config + esbuild Firefox pipeline with zero-config builds.

### Why Clerk?
Users need persistent identity for usage quotas and vote history. Clerk's `@clerk/chrome-extension` package provides pre-built SignIn/SignUp components for the popup, session management across the extension's JS contexts, and a dedicated background client via `createClerkClient`. The sync host feature allows cross-device session sharing with the companion web app.

### Why a binary batch protocol?
The POST `/v1/b` endpoint accepts a compact binary body (1 byte per post overhead + ID) and returns a dense binary array. This minimises bandwidth for pages with 30+ posts per viewport. A single 500-byte binary request replaces 30 individual JSON API calls. Keeps the extension fast even on slow connections.

### Why verdictCatalog is client-side?
The ~120-entry verdict phrase lookup table is duplicated in the extension rather than fetched from the server. This means the verdict label is available immediately when ratings load, with no second round-trip. The catalog must stay in sync with the server's `verdict_catalog.go`. Both are generated from the same source of truth.

### Why adaptive TTL?
Cache TTL ranges from 5 seconds (hot posts with high activity) to 24 hours (old posts). This balances freshness against API load. The formula mirrors the server-side Go `AdaptiveTTLWithContext` function.

### Why React in a content script?
The vote menu UI (9 category buttons with fill bars, verdict labels, portal positioning) is complex enough to justify React. At ~72 KB gzipped (React 19 + all components), the bundle cost is acceptable. The rest of the content script is vanilla TypeScript; React is only used where its component model adds value.

## Clerk auth flow

### Token flow
```
1. User opens popup → ClerkProvider initialises Clerk client
2. User signs in via SignIn component → Clerk stores session in chrome.storage
3. Background service worker on first API request:
   → createClerkClient({ publishableKey, syncHost })
   → clerk.session.getToken() → return session token
4. Token placed in Authorization: Bearer header for API calls
5. Clerk internally handles token refresh via sync mechanism
6. On sign out → session cleared → getToken() returns null → API returns { ok: false }
```

### Environment variables

Env files live at project root. `scripts/copy-env.mjs` copies the right one into `browser extensions/.env` before every build/dev run.

| File | Purpose |
|---|---|
| `.env` | Production config (deployed extension) |
| `.env.dev` | Development config (localhost APIs) |
| `.env.example` | Template for `.env` |
| `.env.dev.example` | Template for `.env.dev` |

| Variable | Example | Required |
|---|---|---|
| `PLASMO_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_test_xxxxxxxx` | Yes |
| `PLASMO_PUBLIC_CLERK_SYNC_HOST` | `http://localhost:8090` | Yes |
| `CLERK_FRONTEND_API` | `https://<app>.clerk.accounts.dev` | Yes (for host_permissions) |
| `CRX_PUBLIC_KEY` | `<extension-public-key>` | Only for production (stable extension ID) |
| `SLAZE_API_BASE` | `https://api.slaze.it.com/v1` | Yes |

## Common issues

- **"Extension context invalidated"**: Happens when the extension is reloaded while a page is open. The error suppression handlers in `index.tsx` catch these. Any new `chrome.*` API call in content scripts should handle this error.
- **Shadow DOM on Reddit**: `shreddit-post` elements have open shadow roots. Selectors must pierce through `post.shadowRoot` for action-row insertion. CSS is injected into shadow roots via `adoptedStyleSheets` (with `<style>` fallback).
- **X/Twitter overflow hidden**: Tweet cards use `overflow: hidden` which clips absolutely-positioned dropdowns. The vote menu uses React Portal to render the dropdown at `document.body` level with `position: fixed`, repositioning on scroll/resize.
- **Clerk publishable key missing**: If `PLASMO_PUBLIC_CLERK_PUBLISHABLE_KEY` or `PLASMO_PUBLIC_CLERK_SYNC_HOST` are not set in `.env` or `.env.dev`, the build will fail at runtime when `ClerkProvider` or `createClerkClient` is called. Run `pnpm copy-env` (or just build/dev which does it automatically) to copy the root env file into `browser extensions/.env`.
- **Plasmo content script discovery**: Content scripts must be in `src/contents/` (plural). `src/content/` is NOT auto-discovered by Plasmo — it's only used as an internal module directory imported by `src/contents/slaze.ts`.

## Testing

Manual testing is the primary method (Chrome extension testing tools are limited):
1. `pnpm run dev` for hot-reload development. Load `build/chrome-mv3-dev` as unpacked extension at `chrome://extensions`
2. Or `pnpm run build` → load `build/chrome-mv3-prod` for production build
3. Navigate to Reddit (`old.reddit.com` or `reddit.com` with new UI)
4. Open the popup → sign in via Clerk
5. Verify badge pills appear on post cards
6. Click "Slaze.it" button → dropdown opens with category rows
7. Select 2-3 categories → vote submits, badge updates
8. Sign out → badges show offline state
9. `pnpm run build:firefox` → load `build/firefox-mv2-prod` in Firefox via `about:debugging`

For pre-submit validation:
- `pnpm run typecheck` must pass with zero errors
- `pnpm run build` must produce all expected build/ files
- `pnpm run build:firefox` must produce MV2-compatible output
- `grep -r "window.Slaze" src/` must return zero matches
