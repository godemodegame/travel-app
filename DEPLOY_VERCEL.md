# Deploy Hokus Web to Vercel

## Что уже подготовлено
- Веб-приложение находится в `web/` (Vite + React + TypeScript).
- Добавлен конфиг Vercel: `web/vercel.json`.

## Вариант 1: Через GitHub (рекомендуется)
1. Открой Vercel: https://vercel.com/new
2. Выбери репозиторий `godemodegame/travel-app`.
3. В настройке проекта укажи:
   - **Root Directory**: `web`
   - Framework Preset: `Vite` (подхватится автоматически)
4. Нажми **Deploy**.

После первого деплоя все новые коммиты в `main` будут деплоиться автоматически.

## Вариант 2: Через Vercel CLI
1. Установи CLI:
```bash
npm i -g vercel
```

2. Войди в аккаунт:
```bash
vercel login
```

3. Запусти деплой из папки `web`:
```bash
cd /Users/godemodegame/repos/travel-app/web
vercel
```

4. Продакшн-деплой:
```bash
vercel --prod
```

## Локальная проверка перед деплоем
```bash
cd /Users/godemodegame/repos/travel-app/web
npm install
npm run build
```

## Важно
- Мобильная часть (React Native) на Vercel не деплоится.
- На Vercel деплоится только веб-версия из `web/`.
