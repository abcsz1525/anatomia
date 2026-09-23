# План 2b.1: качество вопросов — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Камера в тестах и атласе сама находит ракурс, с которого структуру видно; дубликаты мешей одной структуры ведут себя как одна; в списке ошибок видна сторона; дни активности считаются по местному времени; пользователь узнаёт о повреждённом прогрессе.

**Architecture:** Выбор ракурса — чистая функция кандидатов направлений (`src/lib/atlas/view-dirs.ts`) + raycast в `CameraRig` по видимым `BatchedMesh` (первое попадание должно быть в принимаемый id). Группы `(la, side)` строятся один раз на сессию в `QuizScreen`. Даты — в `src/lib/progress/stats.ts`. Всё покрыто vitest; e2e не меняются по смыслу.

**Tech Stack:** без новых зависимостей.

**Spec:** `docs/superpowers/specs/2026-09-22-anatomia-mvp-design.md` §6.2, §6.4, §8; список `docs/superpowers/notes/2026-09-23-followups.md`.

## Global Constraints

- Контракты Плана 2b сохраняются (test ids, `Question`, `SessionResult` расширяется только добавлением поля `side`).
- Raycast только по видимым мешам; стоимость выбора ракурса ≤ ~200 мс на вопрос на ноутбуке.
- Тесты дат не должны зависеть от часового пояса машины (строить даты через локальные компоненты `new Date(y, m, d, h)`).
- Dev-сервер пользователя на :3000 — не трогать; e2e через `PLAYWRIGHT_BASE_URL`.
- Коммиты с трейлером `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`, по явным путям.

---

### Task 1: Ракурс с видимостью цели

**Files:** Create `src/lib/atlas/view-dirs.ts` (+ test); Modify `src/store/atlas-store.ts` (+ test), `src/components/atlas/BodyMeshes.tsx`, `src/components/atlas/CameraRig.tsx`, `src/components/quiz/QuizScreen.tsx`, `src/components/atlas/AtlasScreen.tsx`.

**Interfaces:**
```ts
// view-dirs.ts
export type Vec3 = [number, number, number];
export function candidateDirections(current: Vec3, count = 26): Vec3[];
//  единичные направления «от цели к камере»: current первым, затем точки сферы Фибоначчи (count),
//  отсортированные по углу к current (ближайшие раньше); без дублей current
// store
flyTo(id: string, accept?: string[]): void;   // focusAccept = accept ?? [id]
reveal(id, system) — как раньше, focusAccept = [id]
focusAccept: string[] | null;
```
`BodyMeshes`: каждому `BatchedMesh` выставить `mesh.userData.partIds = parts.map(p => p.id)`.
`CameraRig` при фокусе: `center`, `radius`, `dist = cameraDistance(radius, fov)`; для каждого `dir` из `candidateDirections(currentDir)`: `raycaster.set(center + dir*dist, -dir)`; `hits = raycaster.intersectObjects(scene.children.filter(o => o.visible && (o as any).isBatchedMesh))`; взять первое попадание, `id = obj.userData.partIds[hit.batchId]`; если `accept.includes(id)` → выбрать этот `dir` и прервать. Если ни один не подошёл — текущий `dir`. Затем `flyTo` как раньше с выбранным направлением. Ограничение: если `candidateDirections` нашёл видимый ракурс дальше 90° от текущего — всё равно брать (лучше видеть, чем не видеть).
`QuizScreen`: `flyTo(q.target.id, q.accept)` для «назови» и при показе ответа; `AtlasScreen` `?focus` без изменений (`reveal`).

- [ ] тест `view-dirs.test.ts`: длина `count+1` или `count` (если current совпал), все единичные (|v|≈1), первое = current, углы неубывающие, нет NaN.
- [ ] тест store: `flyTo("FJ1", ["FJ1","FJ1b"])` → `focusAccept`; `flyTo("FJ2")` → `["FJ2"]`; `reveal` → `[id]`; `clearQuiz` → `focusAccept: null`.
- [ ] реализация; headless: в «назови» для темы «Мышцы нижней конечности» 10 вопросов подряд — доля кадров, где подсвеченная цель занимает ≥ 300 оранжевых пикселей, ≥ 9/10 (раньше часть целей была за другими мышцами); e2e 10/10.
- [ ] commit `feat(camera): visibility-aware fly-to`.

### Task 2: Группы дублей и сторона в ошибках

**Files:** Modify `src/lib/quiz/types.ts` (`AnswerRecord.side: Side`), `src/lib/quiz/session.ts` (+test: `answerFor` копирует `side`), `src/lib/quiz/pool.ts` (+test: `groupKey(part) = `${la}|${side}``, `groupsOf(parts): Map<string, string[]>`), `src/components/quiz/QuizScreen.tsx`, `src/components/quiz/QuizResult.tsx`.

- Подсветка: цель/верно/неверно красят все id группы кликнутого/целевого меша; «повтор той же ошибки» проверяется по группе; `accept` уже учитывает группу (`acceptIds`).
- `QuizResult`: у ошибки выводить `ru` + ` (слева|справа)` через `sideLabel`; дедупликация списка по `groupKey`.
- Тесты на `groupsOf` и на `session` (side в записи). e2e 10/10.
- commit `feat(quiz): mesh groups by (la, side); side in mistakes`.

### Task 3: Местные даты и уведомление о резервной копии

**Files:** Modify `src/lib/progress/stats.ts` (+tests), `src/lib/progress/storage.ts` (`hasBackup(): boolean`), `src/components/progress/ProgressScreen.tsx`, README «Прогресс».

- `dayKey(iso)`: местный календарный день (`getFullYear/getMonth/getDate`), формат `YYYY-MM-DD`.
- `streakDays`: арифметика дней через `new Date(y, m-1, d - n)` (местное время, DST-безопасно), ключи через тот же форматтер.
- Тесты: `dayKey(new Date(2026, 8, 23, 1, 0).toISOString()) === "2026-09-23"` в любом поясе; серия через границу месяца (31 авг → 1 сен) и года.
- `/progress`: если `hasBackup()` — строка `data-testid="progress-backup-notice"`: «Предыдущий прогресс не удалось прочитать; копия сохранена в браузере под ключом anatomia.progress.v1.backup».
- commit `fix(progress): local calendar days; backup notice`.

### Task 4: Мелочи и финальная проверка

**Files:** `src/components/quiz/QuizScreen.tsx` (`reframe()` в `handleAbort`), `docs/superpowers/notes/2026-09-23-followups.md` (вычеркнуть сделанное), README.

- `pnpm typecheck && pnpm lint && pnpm test && pnpm build`, e2e 10/10.
- commit `chore: reframe on abort; notes`.

## Self-review
- Покрытие followups: ракурс — T1; группы дублей — T2; сторона в ошибках — T2; местные даты — T3; уведомление о backup — T3; abort reframe — T4. Не входят (осознанно): кэш геометрии для мобильных (План 3), проход по side-less парам в контенте (контентный проход).
- Типы: `AnswerRecord.side` добавляется, `SessionResult` без изменений; `focusAccept` только в store/CameraRig.
