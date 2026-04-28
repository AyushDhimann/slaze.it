# Slaze

**Community-powered post quality ratings, right in your feed.**

Slaze injects quality badges and an inline voting UI into Reddit and X/Twitter. See what the community thinks about a post before you waste your time on it. No accounts. No signup. Just ratings.

<p align="center">
  <img src="https://img.shields.io/badge/manifest-v3-blue" alt="Manifest V3">
  <img src="https://img.shields.io/badge/chrome-110%2B-brightgreen" alt="Chrome 110+">
  <img src="https://img.shields.io/badge/firefox-109%2B-orange" alt="Firefox 109+">
  <img src="https://img.shields.io/badge/TypeScript-6.0-blue" alt="TypeScript 6">
  <img src="https://img.shields.io/badge/React-19-61dafb" alt="React 19">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="License MIT">
</p>

## How it works

1. Browse Reddit or X/Twitter as usual
2. A coloured badge appears on each post showing the community's verdict: "Real Deal," "Pure Bait," "Community Gold," and more.
3. Click the **Slaze.it** button next to Share to cast your own vote
4. Pick up to 3 categories that describe the post (genuine, helpful, bait, misleading, etc.)
5. Your vote sharpens the verdict for everyone else

## Quick start

```bash
git clone https://github.com/AyushDhimann/slaze.it
cd slaze.it/browser\ extensions
pnpm install
pnpm run build
```

Then load the `dist/` folder as an unpacked extension in Chrome at `chrome://extensions`.

## Project structure

```
browser extensions/
├── src/           # TypeScript source
│   ├── shared/    # Shared types + verdict catalog
│   ├── background/# Service worker (API proxy)
│   ├── content/   # Content scripts (badges, React vote UI)
│   └── popup/     # Extension popup
├── dist/          # Build output (load this in Chrome)
├── scripts/       # Build tooling
└── wiki/          # Detailed documentation
```

## Commands

| Command | What it does |
|---------|-------------|
| `pnpm install` | Install dependencies |
| `pnpm run build` | Build Chrome extension to `dist/` |
| `pnpm run watch` | Auto-rebuild on file change |
| `pnpm run typecheck` | TypeScript type checking |
| `pnpm run build:firefox` | Build Chrome + generate Firefox extension |

## Tech stack

TypeScript 6, React 19, Vite 8, pnpm. Targets Chrome 110+ (MV3) and Firefox 109+ (MV2).

## Documentation

- **[Project overview](https://github.com/AyushDhimann/slaze.it/wiki/Project-Overview)** describes what Slaze is and why it exists
- **[Installation & setup](https://github.com/AyushDhimann/slaze.it/wiki/Installation)** covers your dev environment and loading the extension
- **[Architecture](https://github.com/AyushDhimann/slaze.it/wiki/Architecture)** explains the three JS contexts, module graph, and message protocol
- **[API protocol](https://github.com/AyushDhimann/slaze.it/wiki/API-Protocol)** details the binary batch protocol design and bandwidth savings
- **[Building & testing](https://github.com/AyushDhimann/slaze.it/wiki/Building)** lists build commands and the smoke test checklist
- **[Contributing](https://github.com/AyushDhimann/slaze.it/wiki/Contributing)** outlines code standards, adding platforms, and PR guidelines

## Why a custom binary protocol?

Most extensions make 30 REST calls for 30 posts. Slaze packs everything into a single ~500-byte binary request, achieving a 95% bandwidth reduction. See the [API protocol doc](https://github.com/AyushDhimann/slaze.it/wiki/API-Protocol) for the full breakdown.

## License

GNU Affero General Public License v3.0. See [LICENSE](LICENSE) for details.
