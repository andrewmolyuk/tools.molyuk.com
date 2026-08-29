# tools.molyuk.com

Набор повседневных инструментов разработчика: генерация ID, хэши, base64 и другое.
Всё считается локально в браузере, бэкенда нет.

Стек: Vue 3 + Vite + TypeScript + Tailwind CSS. Деплой — Cloudflare Workers (static assets).

## Разработка

```sh
npm install
npm run dev
```

## Добавление нового инструмента

Каждый инструмент — папка в `src/tools/<slug>/` с файлом `index.ts`:

```ts
import { defineAsyncComponent } from 'vue'
import type { ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'my-tool',
  name: 'Название',
  description: 'Краткое описание',
  icon: '🔧',
}

export const component = defineAsyncComponent(() => import('./MyTool.vue'))
```

Инструмент автоматически появится в навигации и на главной странице (`src/tools/registry.ts`
сканирует папку через `import.meta.glob`) — роутер и меню трогать не нужно.

Компонент инструмента оформляется в `<slug>/<Name>.vue`, обёрнутый в `<ToolPage>`
(`src/components/ToolPage.vue`) для единого заголовка/отступов; для копирования в
буфер используется `<CopyButton>` (`src/components/CopyButton.vue`).

## Сборка и деплой

```sh
npm run build          # проверка типов + продакшн-сборка в dist/
npm run worker:dev      # локальный запуск как Cloudflare Worker (wrangler dev)
npm run deploy          # сборка + wrangler deploy
```

Деплой требует авторизации в Cloudflare: `npx wrangler login`.
