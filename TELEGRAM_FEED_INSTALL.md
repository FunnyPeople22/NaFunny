# NaFunny HUB 1.3 Telegram Feed Edition

## 1. Скопируй файлы в репозиторий

Скопируй папки из архива в корень репозитория NaFunny:

- `.github/workflows/update-telegram-feed.yml`
- `scripts/update-telegram-feed.mjs`
- `feed/telegram-feed.json`
- `assets/js/telegram-feed.js`
- `assets/css/telegram-feed.css`

## 2. Подключи CSS в index.html

Внутри `<head>` добавь:

```html
<link rel="stylesheet" href="assets/css/telegram-feed.css">
```

## 3. Вставь секцию Telegram Feed

Лучшее место: после блока `SOCIALS` или перед footer.

```html
<section id="telegram-feed" class="telegram-feed-section" data-telegram-feed data-feed-url="feed/telegram-feed.json" data-max-posts="6"></section>
```

## 4. Подключи JS перед закрывающим `</body>`

```html
<script src="assets/js/telegram-feed.js"></script>
```

## 5. GitHub Actions

После загрузки файлов на GitHub:

1. Открой репозиторий на GitHub.
2. Перейди во вкладку Actions.
3. Выбери `Update Telegram Feed`.
4. Нажми `Run workflow`.

После этого файл `feed/telegram-feed.json` обновится автоматически.

## 6. Как поменять канал

Открой `.github/workflows/update-telegram-feed.yml` и поменяй:

```yml
TELEGRAM_CHANNEL: NaFunny
```

Например:

```yml
TELEGRAM_CHANNEL: TonNewbie
```

## Важно

Канал должен быть публичным. Скрипт читает публичную web-версию Telegram: `https://t.me/s/<channel>`.
