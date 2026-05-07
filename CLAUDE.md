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
| Auth | Clerk (`@clerk/chrome-extension` v3) |
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
- **Key modules**: `token.ts` (Clerk client + anonymous token management), `signing.ts` (HMAC-SHA256 request signing), `platformEncode.ts` (binary wire format), `handlers/` (one file per message type)
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

### Why zero-JSON wire protocol?
The API uses no JSON anywhere in the request/response cycle for main endpoints:
- **Votes** → POST body is zero bytes. Vote data packed into URL path (`v026p1u3t4d5000`). Response is 204 No Content with verdict in `ETag` + `X-Slaze-*` headers.
- **Single ratings** → GET with empty body. Response is 204 with `ETag` header carrying packed verdict. No body bytes.
- **Batch ratings** → POST with `application/octet-stream` binary body. Response is binary array (15 bytes per post).
- **Quota/errors** → All quota info and error messages sent via response headers (`X-Slaze-Error`, `X-Quota-Tier`, `X-Quota-Plan`, `X-Quota-Limit`, `X-Quota-Used`, `X-Quota-Remaining`, `Retry-After`). Zero JSON error bodies.
- **Auth endpoints** (`/v1/auth/token`, `/v1/auth/link`) are the only JSON endpoints — required for bootstrapping device identity and Clerk linking. The shared `updatePlanFromHeaders()` in `token.ts` parses quota headers from every API response and persists usage counts to `chrome.storage.local` so the popup shows live quota data.

### Why verdictCatalog is client-side?
The ~120-entry verdict phrase lookup table is duplicated in the extension rather than fetched from the server. This means the verdict label is available immediately when ratings load, with no second round-trip. The catalog must stay in sync with the server's `verdict_catalog.go`. Both are generated from the same source of truth.

### Why adaptive TTL?
Cache TTL ranges from 5 seconds (hot posts with high activity) to 24 hours (old posts). This balances freshness against API load. The formula mirrors the server-side Go `AdaptiveTTLWithContext` function.

### Why React in a content script?
The vote menu UI (9 category buttons with fill bars, verdict labels, portal positioning) is complex enough to justify React. At ~72 KB gzipped (React 19 + all components), the bundle cost is acceptable. The rest of the content script is vanilla TypeScript; React is only used where its component model adds value.

### Why Apple/Adobe design tokens in the popup?
The popup uses a design token system (`src/popup/styles/tokens.ts`) with indigo-brand colors, 4px spacing grid, SF-style type scale, and glass blur effects. Inline styles reference these tokens rather than hardcoded pixel values. Global CSS (`src/popup/styles/global.css`) provides the reset, font smoothing, and staggered fade-in animations. The popup reads quota/plan info from `chrome.storage.local` (written by background handlers from API response headers) and displays usage as scannable progress bars with color-coded fill (green → indigo → red at 85%+).

## Auth flow: two-layer identity (Anonymous + Clerk)

The extension uses a hybrid two-layer auth model:

### Layer 1: Anonymous device token
- Created on first install via `POST /v1/auth/token`. Stored in `chrome.storage.local` as `slaze_auth_token`.
- Provides baseline read access (50 checks/day, 0 votes/month).
- Sent as `Authorization: Bearer <token>` header on every API request.
- Managed by `getToken()` / `refreshToken()` / `invalidateToken()` in `src/background/token.ts`.

### Layer 2: Clerk user identity
- Users sign in via the Slaze website (redirect-to-website flow, not in-popup).
- `sign-in.tsx` / `sign-up.tsx` open `https://slaze.it.com/sign-in` (or `sign-up`) in a new browser tab via `chrome.tabs.create()`. After auth on the website, Clerk syncs the session to the extension via `chrome.storage`.
- Clerk user ID sent as `X-Slaze-User` header. Clerk session JWT sent as `X-Clerk-Token` header on vote requests.
- **Voting requires linked Clerk identity** — anonymous tokens return 402 "sign in to vote." On first vote with valid Clerk JWT, the backend auto-links the token inline and upgrades tier to `email` (5,000 votes/month).
- Background service worker lazily initialises `createClerkClient` from `@clerk/chrome-extension/background` (v3, deprecated path — still functional). The recommended v3 import is `@clerk/chrome-extension/client` with `{ background: true }`.
- On sign-in, `chrome.storage.onChanged` listener in `src/background/index.ts` detects Clerk session keys and auto-calls `linkTokenToClerk()` (best-effort).

### Why redirect-to-website instead of in-popup auth?
In-popup `<SignIn>`/`<SignUp>` components fail in extension context because:
1. `window.open()` is blocked by Chrome for popup contexts — OAuth (Google) hangs indefinitely
2. Clerk dev instance (`pk_test_*`) browser handshake fails from `chrome-extension://` origins
3. `X-Frame-Options: DENY` on the website prevents iframe-based auth
Redirecting to the syncHost website for auth guarantees it works and is the recommended Clerk pattern for Chrome extensions.

### HMAC Request Signing

All API requests from the background service worker are signed with HMAC-SHA256 to prove they came from a genuine extension install. The signing key is inlined at build time.

**Signing payload** (in `src/background/signing.ts`):
```
method + ":" + path + ":" + unixTimestamp + ":" + sha256hex(body)
```

**Headers added**:
- `X-Slaze-Ts`: Unix timestamp (seconds)
- `X-Slaze-Sig`: Hex-encoded HMAC-SHA256 signature

**Backend verification** (`server/signing.go`):
- Timestamp must be within ±5 minutes of server time (replay protection)
- Signature recomputed and compared in constant time via `hmac.Equal`
- Body is read, hashed for verification, then restored via `io.NopCloser` for downstream handlers
- Health, status, token creation, and token linking endpoints are exempted
- If `SLAZE_API_SECRET` is not set on the server, enforcement is silently skipped (dev mode)

**Threat model**:
- Bearer token alone is insufficient — HMAC signature required
- Replay attacks blocked by 5-minute timestamp window
- Secret can be extracted from extension bundle (same as Clerk publishable key) — rotate periodically, monitor for abuse
- Clerk JWT provides second factor for voting (server-verified, short-lived)

## Environment variables

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
| `PLASMO_PUBLIC_CLERK_SYNC_HOST` | `https://slaze.it.com` | Yes |
| `CLERK_FRONTEND_API` | `https://<app>.clerk.accounts.dev` | Yes (for host_permissions) |
| `CRX_PUBLIC_KEY` | `<extension-public-key>` | Only for production (stable extension ID) |
| `PLASMO_PUBLIC_SLAZE_API_SECRET` | `sze_hmac_...` | Yes (HMAC request signing) |
| `SLAZE_API_BASE` | `https://api.slaze.it.com/v1` | Yes |

## Common issues

- **"Extension context invalidated"**: Happens when the extension is reloaded while a page is open. The error suppression handlers in `index.tsx` catch these. Any new `chrome.*` API call in content scripts should handle this error.
- **Shadow DOM on Reddit**: `shreddit-post` elements have open shadow roots. Selectors must pierce through `post.shadowRoot` for action-row insertion. CSS is injected into shadow roots via `adoptedStyleSheets` (with `<style>` fallback).
- **X/Twitter overflow hidden**: Tweet cards use `overflow: hidden` which clips absolutely-positioned dropdowns. The vote menu uses React Portal to render the dropdown at `document.body` level with `position: fixed`, repositioning on scroll/resize.
- **Clerk publishable key missing**: If `PLASMO_PUBLIC_CLERK_PUBLISHABLE_KEY` or `PLASMO_PUBLIC_CLERK_SYNC_HOST` are not set in `.env` or `.env.dev`, the build will fail at runtime when `ClerkProvider` or `createClerkClient` is called. Run `pnpm copy-env` (or just build/dev which does it automatically) to copy the root env file into `browser extensions/.env`.
- **HMAC signing mismatch**: If `PLASMO_PUBLIC_SLAZE_API_SECRET` in the extension does not match `SLAZE_API_SECRET` on the backend, all API requests will be rejected with 401 "invalid request signature." The dev secret differs from production to prevent cross-environment requests.
- **Sign-in opens browser tab**: This is intentional. The extension redirects to the website for authentication. After signing in on the website, the session syncs back to the extension via Clerk's chrome.storage mechanism. The popup auto-detects the session via `useAuth()`.
- **Vote returns 402 "sign in to vote"**: Anonymous tokens have 0 votes/month. Users must sign in via Clerk first. The backend auto-links the token on first vote with a valid Clerk JWT — the second vote attempt will succeed.
- **Vote returns 429 with X-Slaze-Error header**: Quota exceeded. The error message is in the `X-Slaze-Error` response header (e.g. `daily vote quota exceeded`). The background handler passes it to the content script as `errorLabel`. The VoteMenu displays it directly. Usage counters are updated from `X-Quota-Used` header.
- **Vote stuck on "Saving..."**: The vote submit flow is now non-blocking for the batch refresh. The UI updates immediately from the 204 vote response (ETag + X-Slaze-* headers). The follow-up binary batch refresh (for dropdown percent bars) fires asynchronously and won't block the UI.
- **Plan/usage not showing in popup**: The background handlers call `updatePlanFromHeaders()` on every API response, reading `X-Quota-*` headers and persisting to `chrome.storage.local`. The popup reads from storage on mount and falls back to `SLAZE_GET_PLAN` runtime message to the background.
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
