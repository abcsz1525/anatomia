# Анатомия

3D-атлас и тренажёр по нормальной анатомии для студентов медвузов.

## Разработка

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm test         # vitest
pnpm e2e          # playwright
pnpm typecheck
```

## Деплой

Railway: `railway up` из корня проекта (проект должен быть привязан через `railway link`).
Заголовки кэширования для моделей заданы в `next.config.ts`.

## Данные

`public/models/v1` — BodyParts3D 4.0 (CC BY 4.0), см. `public/models/v1/ATTRIBUTION.md`.
Спецификация: `docs/superpowers/specs/2026-09-22-anatomia-mvp-design.md`.
