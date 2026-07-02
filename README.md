# NaFunny HUB 1.3 Stable Final

Готовая чистая версия репозитория.

## Что внутри

- Stable Logo FX без старых конфликтных logo-fix файлов.
- Dual Telegram Feed: 2 поста из @NaFunny + 2 поста из @TonNewbie.
- GitHub Actions обновляет `feed/telegram-feed.json` каждые 30 минут и вручную через Run workflow.
- Чистая структура без старых временных CSS/JS и install-файлов.

## После загрузки на GitHub

1. Commit / Push.
2. Открой GitHub → Actions → Update Telegram Feed.
3. Нажми Run workflow.
4. После зелёной галочки обнови сайт через Ctrl+F5.

## Основные файлы

- `index.html`
- `style.css`
- `script.js`
- `telegram-feed.css`
- `telegram-feed.js`
- `.github/workflows/update-telegram-feed.yml`
- `scripts/update-telegram-feed.mjs`
- `feed/telegram-feed.json`
