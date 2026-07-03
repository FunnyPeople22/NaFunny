# NaFunny HUB 1.4.2 Telegram Engine Rewrite

Stable NaFunny HUB build with automatic Telegram Feed for @NaFunny and @TonNewbie.

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

## NaFunny HUB 1.4.3 — Feed Avatars

Small visual update for Telegram Feed:

- added real channel avatars for @NaFunny and @TonNewbie;
- replaced emoji icons in feed headers with branded images;
- added hover glow and theme-aware avatar borders;
- kept fallback emoji icons if avatar files fail to load.

