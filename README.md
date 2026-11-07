# eNet AI · первый дизайн (v0.1.0)

Исходный интерфейс из `chatly.zip`, сохранён с его первоначальным оформлением и надписями **Chatly**. Техническое имя приложения и установщика: **eNet AI**.

В этой версии реализованы создание/поиск/переименование/удаление чатов, markdown, код-блоки, локальная история, переключение темы. **Настоящий AI API, вход, платёжная система и синхронизация не подключены.** Ответы временно генерируются заглушкой в `src/app.js`.

## Сборки

GitHub → **Actions** → **Build eNet AI** → последний успешный запуск → **Artifacts**: установщик Windows (NSIS `.exe`) и Linux Debian (`.deb`).

### Локальная сборка

Требуются Node.js 20+, Rust stable, системные зависимости Tauri 2.

- Windows: `npm install && npm run build:windows` (понадобятся MSVC Build Tools и WebView2).
- Ubuntu: `sudo apt install libwebkit2gtk-4.1-dev build-essential libssl-dev libxdo-dev libayatana-appindicator3-dev librsvg2-dev` затем `npm install && npm run build:linux`.

Результат: `src-tauri/target/release/bundle/nsis/*.exe` либо `src-tauri/target/release/bundle/deb/*.deb`.

### Предпросмотр интерфейса

Откройте `src/index.html` в браузере (для надёжной работы `localhost` используйте любой статический web-сервер). В веб-предпросмотре сохранён исходный дизайн и шрифты из архива.

> Интерфейс — прототип. Не выдавать его за готовый AI-сервис.
