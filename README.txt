NaFunny HUB 1.2.2 SAFE Logo Fix

Что это исправляет:
- убирает прямоугольную плашку за NaFunny;
- убирает скачки цвета при смене Blue / Purple / Storm;
- отключает старые псевдо-слои ::before / ::after;
- фиксит обрезание хвостика y;
- делает лого стабильным на ПК, iPhone Safari, Telegram Browser.

Как ставить:
1. Открой основной CSS-файл сайта.
2. Вставь содержимое nafunny-safe-logo-fix.css В САМЫЙ НИЗ файла.
3. Убедись, что у текста NaFunny есть один из классов:
   nafunny-logo-fixed / nafunny-logo / hero-logo / hero-title-logo
4. Если у тебя подключён старый nafunny-logo-fix.css из 1.2.1 — лучше удалить его или заменить на этот.
5. На GitHub: Commit changes -> подожди 1-3 минуты -> обнови сайт с очисткой кэша.

Это SAFE-версия: без background-clip и без gradient animation.
Главная цель — чтобы лого больше не ломалось.
