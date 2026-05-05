# Slaze

**Community-powered post quality ratings, right in your feed.**

Slaze injects quality badges and an inline voting UI into Reddit and X/Twitter. See what the community thinks about a post before you waste your time on it. Sign in once, rate forever.

<p align="center">
  <img src="https://img.shields.io/badge/manifest-v3-blue" alt="Manifest V3">
  <img src="https://img.shields.io/badge/chrome-110%2B-brightgreen" alt="Chrome 110+">
  <img src="https://img.shields.io/badge/firefox-109%2B-orange" alt="Firefox 109+">
  <img src="https://img.shields.io/badge/TypeScript-6.0-blue" alt="TypeScript 6">
  <img src="https://img.shields.io/badge/React-19-61dafb" alt="React 19">
  <img src="https://img.shields.io/badge/Plasmo-0.90-7c3aed" alt="Plasmo">
  <img src="https://img.shields.io/badge/Clerk-auth-purple" alt="Clerk Auth">
  <img src="https://img.shields.io/badge/license-AGPL--3.0-green" alt="License AGPL-3.0">
</p>

## How it works

1. Browse Reddit or X/Twitter as usual
2. A coloured badge appears on each post showing the community's verdict: "Real Deal," "Pure Bait," "Community Gold," and more.
3. Click the **Slaze.it** button next to Share to cast your own vote
4. Pick up to 3 categories that describe the post (genuine, helpful, bait, misleading, etc.)
5. Your vote sharpens the verdict for everyone else

## Quick start

### Prerequisites
- Node.js 18+, pnpm 10+
- A [Clerk](https://clerk.com) account with a Chrome Extension application configured
- Chrome 110+ or Firefox 109+

### Setup

```bash
git clone https://github.com/AyushDhimann/slaze.it
cd slaze.it/browser\ extensions
pnpm install
```

### Configure environment

Create `browser extensions/.env` with your Clerk keys:

```
PLASMO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxx
CLERK_FRONTEND_API=https://<app>.clerk.accounts.dev
PLASMO_PUBLIC_CLERK_SYNC_HOST=http://localhost:8090
CRX_PUBLIC_KEY=
```

Get publishable key from [Clerk Dashboard](https://dashboard.clerk.com) → API Keys. Same key used by the companion website. Sync host is the website URL that shares auth state with the extension.

### Build & load

```bash
# Development with hot-reload
pnpm run dev
# Load build/chrome-mv3-dev as unpacked extension at chrome://extensions

# Production build
pnpm run build
# Load build/chrome-mv3-prod as unpacked extension

# Firefox
pnpm run build:firefox
# Load build/firefox-mv2-prod via about:debugging
```

## Project structure

```
browser extensions/
├── src/
│   ├── shared/          # Shared types, config, verdict catalog
│   ├── background/      # Service worker (API proxy + Clerk client)
│   ├── content/         # Content script logic (badges, React vote UI)
│   ├── contents/        # Plasmo content script entry point
│   └── popup/           # React popup (Clerk sign-in/up, status)
├── assets/              # Extension icons
├── build/               # Build output (gitignored)
├── .env                 # Clerk keys + API config (loaded by Plasmo)
└── package.json         # Scripts, deps, inline manifest
```

## Commands

| Command | What it does |
|---------|-------------|
| `pnpm install` | Install dependencies |
| `pnpm run dev` | Dev build with hot-reload (`build/chrome-mv3-dev`) |
| `pnpm run build` | Production Chrome build (`build/chrome-mv3-prod`) |
| `pnpm run build:firefox` | Production Firefox build (`build/firefox-mv2-prod`) |
| `pnpm run dev:firefox` | Dev Firefox build with hot-reload |
| `pnpm run typecheck` | TypeScript strict type checking |
| `pnpm run package` | Package extension as .zip for store submission |

## Tech stack

| Layer | Tech |
|-------|------|
| Framework | [Plasmo](https://plasmo.com) 0.90 (Browser Extension Framework) |
| Language | TypeScript 6 (strict mode) |
| UI | React 19 + React DOM 19 |
| Routing | React Router 7 (popup) |
| Auth | [Clerk](https://clerk.com) (`@clerk/chrome-extension`) |
| Package manager | pnpm |
| Targets | Chrome 110+ (MV3), Firefox 109+ (MV2) |

## Why a custom binary protocol?

Most extensions make 30 REST calls for 30 posts. Slaze packs everything into a single ~500-byte binary request, achieving a 95% bandwidth reduction. See the [API protocol doc](https://github.com/AyushDhimann/slaze.it/wiki/API-Protocol) for the full breakdown.

## Documentation

- **[Project overview](https://github.com/AyushDhimann/slaze.it/wiki/Project-Overview)** — what Slaze is and why it exists
- **[Installation & setup](https://github.com/AyushDhimann/slaze.it/wiki/Installation)** — dev environment and loading the extension
- **[Architecture](https://github.com/AyushDhimann/slaze.it/wiki/Architecture)** — three JS contexts, module graph, message protocol
- **[API protocol](https://github.com/AyushDhimann/slaze.it/wiki/API-Protocol)** — binary batch protocol design and bandwidth savings
- **[Building & testing](https://github.com/AyushDhimann/slaze.it/wiki/Building)** — build commands and smoke test checklist
- **[Contributing](https://github.com/AyushDhimann/slaze.it/wiki/Contributing)** — code standards, adding platforms, PR guidelines

## License

GNU Affero General Public License v3.0. See [LICENSE](LICENSE) for details.
