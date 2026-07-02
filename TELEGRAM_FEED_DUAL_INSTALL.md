# NaFunny HUB 1.3 Dual Telegram Feed

Что делает патч:
- Берёт 2 последних поста из @NaFunny.
- Берёт 2 последних поста из @TonNewbie.
- Складывает всё в feed/telegram-feed.json.
- GitHub Actions обновляет файл каждые 30 минут и вручную через Run workflow.

## Установка

1. Скопируй папки и файлы из архива в корень репозитория NaFunny:
   - .github
   - scripts
   - feed
   - telegram-feed.css
   - telegram-feed.js
   - TELEGRAM_FEED_DUAL_INSTALL.md

2. В index.html перед </head> добавь:

<link rel="stylesheet" href="telegram-feed.css">

3. В нужное место страницы, лучше после Socials, добавь:

<section id="telegram-feed" class="telegram-feed-section">
  <h2 class="telegram-feed-title">Telegram Feed</h2>
  <div id="telegram-feed-list" class="telegram-feed-grid"></div>
</section>

4. Перед </body> добавь:

<script src="telegram-feed.js"></script>

5. Commit:
   Telegram Feed Dual Channels

6. Push origin.

7. На GitHub:
   Actions → Update Telegram Feed → Run workflow.

После запуска проверь:
feed/telegram-feed.json
