# NaFunny HUB 1.5 Stable

Stable NaFunny HUB build with automatic Telegram Feed for @NaFunny and @TonNewbie, branded feed avatars, and redesigned crypto support block.

Core files:
- `index.html`
- `style.css`
- `script.js`
- `telegram-feed.css`
- `telegram-feed.js`
- `feed/telegram-feed.json`
- `scripts/update-telegram-feed.mjs`
- `.github/workflows/update-telegram-feed.yml`

Telegram Feed updates through GitHub Actions every 15 minutes and can be manually triggered from Actions → Update Telegram Feed → Run workflow.

## 1.5 Stable changes

- GitHub Actions moved to Node.js 22 LTS.
- Added workflow concurrency protection.
- Telegram feed script no longer rewrites JSON when posts have not really changed.
- Added safety fallback: if Telegram fetch returns empty data, the site keeps previous working posts instead of publishing a broken/empty feed.
- Updated crypto support block: centered title, compact layout, and inline USDT / TRON / TON / BTC / ETH SVG icons.
- Unified visible site version to 1.5 Stable.
