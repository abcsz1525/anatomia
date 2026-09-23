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

## Контент

Русские и латинские названия структур редактируются в `content/structures.csv`
(один ряд — одна структура из `public/models/v1/atlas.json`), затем собираются
в `public/content/*.json`, которые читает атлас в браузере.

Колонки:

| колонка   | значение |
|-----------|----------|
| `id`      | id детали BodyParts3D (`FJxxxx`), должен существовать в манифесте |
| `en`      | английское имя — копия `manifest.parts[].name`, не редактируется вручную |
| `la`      | латинское название (например, `Femur`) |
| `ru`      | русское название (например, `Бедренная кость`) |
| `topic`   | id **листовой** темы из `content/topics.json` (у темы нет дочерних) либо `other` |
| `aliases` | синонимы для поиска, через `;` (например, `os femoris;бедро`) |

Правила:

- `la` и `ru` не должны содержать слов стороны (`left`/`right`,
  `лев(ый/ая/ое/ые)`/`прав(ый/ая/ое/ые)`) — сторона определяется
  автоматически по `en` (см. `src/lib/content/side.ts`) и рендерится
  атласом отдельно как « (слева)»/« (справа)».
- Несколько синонимов в `aliases` разделяются `;`; если синоним содержит
  запятую, всю ячейку `aliases` нужно взять в кавычки по правилам CSV
  (`"синоним, с запятой;другой"`).
- Строки должны быть отсортированы по `id`, `id` не должен дублироваться.
- `topic` — только листовая тема (`skull-facial`, `muscles-thorax`, …) или `other`.
  Темы-контейнеры (`osteology`, `arthrology`, `myology`) строк не принимают:
  такая строка отклоняется как `non-leaf topic myology`.
  Сейчас в `content/topics.json` 21 тема: 3 контейнера, 17 листьев и `other`.
- Каждая непустая листовая тема (кроме `other`) должна содержать ≥4 **разных
  терминов** — считаются уникальные значения `la`, а не строки. Парный орган
  (левый + правый) — это один термин, поэтому двумя парами тему не наполнить.

Команды:

```bash
pnpm build:content --report   # покрытие по системам (skeletal/connective/muscular) без записи файлов
pnpm build:content            # валидирует content/structures.csv и пересобирает public/content/*.json
```

`pnpm build` вызывает `pnpm build:content` автоматически через `prebuild`, так
что prod-сборка падает, если контент не проходит валидацию.

### SIDE_OVERRIDES — если манифест перепутал сторону

BodyParts3D иногда ошибается в стороне в самом `en`-имени (пример: `FJ1469`
называется "Left flexor pollicis brevis", хотя меш находится справа, а
`FJ1469M` — его зеркало слева). Для таких id не надо подделывать `en` —
вместо этого пропишите id в `SIDE_OVERRIDES` в `src/lib/content/side.ts`,
с комментарием, почему сторона переопределена:

```ts
export const SIDE_OVERRIDES: Record<string, Side> = {
  FJ1469: "right",
  FJ1469M: "left",
};
```

`sideFor(id, en)` живёт в `src/lib/content/side.ts` (рядом с `SIDE_OVERRIDES`)
и вызывается из `scripts/content-rules.ts` при сборке бандла: сначала смотрит в
`SIDE_OVERRIDES` и только потом определяет сторону из `en`.
