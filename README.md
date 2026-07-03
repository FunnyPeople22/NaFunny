# NaFunny HUB

Version: **1.4.1 Maintenance**

## Что внутри

- GitHub Pages статичный сайт.
- GitHub Actions обновляет `feed/telegram-feed.json` каждые 30 минут.
- Telegram Feed показывает:
  - 2 последних поста из `@NaFunny`
  - 2 последних поста из `@TonNewbie`

## Важная структура

```text
.github/workflows/update-telegram-feed.yml
scripts/update-telegram-feed.mjs
feed/telegram-feed.json

index.html
style.css
script.js
telegram-feed.css
telegram-feed.js
```

## Maintenance 1.4.1

- Удалён лишний корневой `telegram-feed.json`.
- Парсер сортирует посты по Telegram message id, чтобы брать самые свежие посты.
- PNG-эмодзи Telegram (`telegram.org/img/emoji/...`) больше не используются как изображения постов.
- Если в посте есть реальная картинка — она подтягивается.
- Добавлена строка последнего обновления Feed.
- Workflow переведён на Node.js 24.

## Проверка

1. GitHub → Actions → Update Telegram Feed → Run workflow.
2. После зелёной галочки открыть `feed/telegram-feed.json`.
3. Проверить поля:
   - `updatedAt`
   - `posts`
   - `errors`
