NaFunny HUB 1.2.5 Logo Lightning FX

Что делает:
- оставляет стабильный текст NaFunny из 1.2.4;
- возвращает электрический блик и молнию отдельным overlay-слоем;
- НЕ использует background-clip для текста;
- НЕ возвращает плашку;
- НЕ трогает цвет букв напрямую.

Как подключить:
1. Залей файлы:
   nafunny-logo-lightning.css
   nafunny-logo-lightning.js

2. В index.html перед </head> добавь:
   <link rel="stylesheet" href="nafunny-logo-lightning.css">

3. Перед </body> добавь:
   <script src="nafunny-logo-lightning.js"></script>

Важно:
- CSS должен идти ПОСЛЕ основного style.css.
- JS должен идти ПОСЛЕ основного script.js.
- Старый 1.2.4 оставь как базу, этот патч ставится сверху.

Проверка:
- Blue/Purple/Storm должны оставаться читаемыми.
- Плашка не должна появляться.
- NaFunny должен иметь мягкое свечение + периодический электрический пробег.
