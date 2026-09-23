# План 2b: 3D-тесты и прогресс — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Студент выбирает тему первого курса и проходит сессию из 10 вопросов в двух режимах — «найди структуру» (кликнуть на модели) и «назови структуру» (4 варианта); результаты копятся в прогрессе по темам с серией дней и экспортом.

**Architecture:** Чистая логика в `src/lib/quiz` (пул структур темы, генерация вопросов с seed, проверка ответов) и `src/lib/progress` (схема v1, запись сессии, статистика, адаптер localStorage). Хранилище сцены получает `restrictTo` (только эти структуры видимы), `highlights` (цвет подсветки по id) и `flyTo` (камера без выделения); `AtlasCanvas`/`BodyMeshes` принимают `onPick`. Экран `/quiz` — конечный автомат setup → running → result поверх того же 3D-холста; `/progress` — таблица по темам. Данные модели кэшируются в памяти модуля, чтобы переход между `/atlas` и `/quiz` не пересобирал 33 МБ.

**Tech Stack:** без новых зависимостей: Next.js 16, React 19, zustand 5, three/R3F, vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-22-anatomia-mvp-design.md` §6.2, §6.4, §7, §8, §9.

## Global Constraints

- Идентификатор структуры — `part.id` из манифеста. Понятие (concept) для дедупликации — `la` из `public/content/structures.json` (см. spec §5: дубликаты мешей с одинаковым `la` существуют; принимать клик по любому мешу с тем же `(la, side)`).
- Курсовые темы — листья `topics.json`, кроме `other`. Каждая имеет ≥ 4 различных `la` (гарантия сборки контента).
- Контекст видимости в «найди структуру»: структуры темы + (для тем под `myology` и `arthrology`) все части системы `skeletal`.
- Сессия — 10 вопросов; в «найди» 3 попытки, после третьей показать ответ; в «назови» один ответ.
- Прогресс в `localStorage['anatomia.progress.v1']`; повреждённое значение сохраняется под `anatomia.progress.v1.backup` и заменяется пустым; все обращения к storage в try/catch.
- `src/lib/**` без React/DOM (адаптер storage — единственное исключение, изолирован в `storage.ts`); каждый модуль с vitest-тестом; генерация вопросов детерминирована по seed.
- Существующие тест-иды и e2e (`e2e/atlas.spec.ts`, 6 тестов) продолжают проходить. Порт для проверок 3100 или `PLAYWRIGHT_BASE_URL`; никогда не убивать чужие процессы.
- Коммиты `feat:`/`test:`/`chore:`, трейлер `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.

## Карта файлов

```
src/store/atlas-store.ts                 + restrictTo, highlights, flyTo, setRestrict, setHighlights, clearQuiz
src/store/atlas-store.test.ts            + тесты
src/components/atlas/BodyMeshes.tsx      цвета подсветок; onPick
src/components/atlas/AtlasCanvas.tsx     onPick
src/hooks/use-atlas-data.ts              кэш AtlasData в памяти модуля
src/lib/quiz/types.ts                    QuizMode, QuizPart, FindQuestion, NameQuestion, Question, SessionResult
src/lib/quiz/pool.ts                     courseTopics, topicParts, contextIds, visibleIdsForTopic (+ test)
src/lib/quiz/random.ts                   mulberry32, shuffle (+ test)
src/lib/quiz/generate.ts                 generateSession (+ test)
src/lib/quiz/check.ts                    acceptIds, checkFind, checkName (+ test)
src/lib/progress/types.ts                ProgressV1, PartStat, SessionSummary
src/lib/progress/record.ts               emptyProgress, recordSession (+ test)
src/lib/progress/stats.ts                topicMastery, streakDays (+ test)
src/lib/progress/serialize.ts            parseProgress (валидация/миграция), stringifyProgress (+ test)
src/lib/progress/storage.ts              loadProgress, saveProgress (localStorage, try/catch, backup)
src/components/quiz/QuizSetup.tsx        выбор темы и режима
src/components/quiz/QuizRunner.tsx       вопрос, ответы, обратная связь
src/components/quiz/QuizResult.tsx       итог и ошибки
src/components/quiz/QuizScreen.tsx       автомат + холст
src/components/progress/ProgressScreen.tsx
src/app/quiz/page.tsx, src/app/progress/page.tsx
src/components/atlas/AtlasScreen.tsx     ?focus=<id> → reveal
src/components/SiteHeader.tsx            ссылки «Тесты», «Прогресс»
e2e/quiz.spec.ts
```

---

### Task 1: Расширение хранилища сцены

**Files:** Modify `src/store/atlas-store.ts`; Test `src/store/atlas-store.test.ts`.

**Interfaces:**
- Produces:
  ```ts
  export type HighlightKind = "target" | "correct" | "wrong";
  // новые поля AtlasState
  restrictTo: Record<string, true> | null;     // если не null — видимы только эти id (системы/скрытые игнорируются)
  highlights: Record<string, HighlightKind>;
  flyTo(id: string): void;                     // камера к структуре БЕЗ выделения (focusPartId + focusNonce)
  setRestrict(ids: string[] | null): void;
  setHighlights(map: Record<string, HighlightKind>): void;
  clearQuiz(): void;                           // restrictTo=null, highlights={}, selectedPartId=null
  // isPartVisible учитывает restrictTo первым: если задано — видимость = !!restrictTo[partId]
  ```
  `reset()` тоже сбрасывает `restrictTo`/`highlights` (через `initial()`).

- [ ] **Step 1: падающие тесты** — добавить в `atlas-store.test.ts`:
```ts
it("restrictTo overrides systems, hidden and isolation", () => {
  const s = useAtlasStore.getState();
  s.hidePart("FJ1"); s.isolate("FJ9"); s.setSystemVisible("skeletal", false);
  s.setRestrict(["FJ1", "FJ2"]);
  const st = useAtlasStore.getState();
  expect(isPartVisible(st, "FJ1", "skeletal")).toBe(true);
  expect(isPartVisible(st, "FJ9", "skeletal")).toBe(false);
  expect(isPartVisible(st, "FJ3", "muscular")).toBe(false);
  s.setRestrict(null);
  expect(isPartVisible(useAtlasStore.getState(), "FJ9", "skeletal")).toBe(true); // isolation again
});
it("flyTo moves camera without selecting; highlights and clearQuiz", () => {
  const s = useAtlasStore.getState();
  const n = useAtlasStore.getState().focusNonce;
  s.select("FJ5"); s.flyTo("FJ7");
  let st = useAtlasStore.getState();
  expect(st.focusPartId).toBe("FJ7"); expect(st.focusNonce).toBe(n + 1); expect(st.selectedPartId).toBe("FJ5");
  s.setHighlights({ FJ7: "target", FJ8: "wrong" });
  expect(useAtlasStore.getState().highlights.FJ8).toBe("wrong");
  s.setRestrict(["FJ7"]); s.clearQuiz();
  st = useAtlasStore.getState();
  expect(st.restrictTo).toBeNull(); expect(st.highlights).toEqual({}); expect(st.selectedPartId).toBeNull();
});
it("reset clears quiz state", () => {
  const s = useAtlasStore.getState();
  s.setRestrict(["FJ1"]); s.setHighlights({ FJ1: "correct" }); s.reset();
  expect(useAtlasStore.getState().restrictTo).toBeNull();
  expect(useAtlasStore.getState().highlights).toEqual({});
});
```
Существующий тест `isPartVisible combines …` дополнить полем `restrictTo: null` в `base`.
- [ ] **Step 2:** запустить — FAIL.
- [ ] **Step 3: реализация** — в `isPartVisible` первым делом `if (state.restrictTo) return !!state.restrictTo[partId];` (тип `Pick<AtlasState, "visibleSystems"|"hiddenParts"|"isolatedPartId"|"restrictTo">`); `initial()` += `restrictTo: null, highlights: {}`; действия:
```ts
flyTo: (id) => set((s) => ({ focusPartId: id, focusNonce: s.focusNonce + 1 })),
setRestrict: (ids) => set({ restrictTo: ids ? Object.fromEntries(ids.map((i) => [i, true as const])) : null }),
setHighlights: (map) => set({ highlights: { ...map } }),
clearQuiz: () => set({ restrictTo: null, highlights: {}, selectedPartId: null }),
```
- [ ] **Step 4:** тесты PASS, `pnpm typecheck` (BodyMeshes передаёт объект без `restrictTo` в `isPartVisible` — обновить в Task 2; до тех пор typecheck может падать → сделать Task 1 и Task 2 одним коммитом, если проще; иначе временно передавать `restrictTo` в BodyMeshes уже здесь).
- [ ] **Step 5:** commit `feat(store): restrictTo, highlights and flyTo for quizzes`.

---

### Task 2: Подсветки и onPick в сцене, кэш данных

**Files:** Modify `src/components/atlas/BodyMeshes.tsx`, `src/components/atlas/AtlasCanvas.tsx`, `src/hooks/use-atlas-data.ts`.

**Interfaces:**
- `BodyMeshes({ data, onReady, onPick? })`, `AtlasCanvas({ data, onReady, onPick? })` — при клике вызывается `onPick(id)`, если задан, иначе `select(id)`. `onPointerMissed` по-прежнему `select(null)`.
- Цвета: `HIGHLIGHT_COLORS = { target: "#ffb020", correct: "#2e9e5b", wrong: "#d33a2c" }`; приоритет: `highlights[id]` > selected (HIGHLIGHT) > baseColor. Эффект видимости/цвета зависит также от `restrictTo` и `highlights`.
- `use-atlas-data.ts`: модульный кэш `let cache: AtlasData | null`. Если есть — хук сразу возвращает `{status:"ready", data: cache}` (без сетевых запросов); при успешной загрузке `cache = data`. `retry` очищает кэш. Экспорт `export function _resetAtlasDataCache()` для тестов не нужен (хук не тестируется юнитами).

- [ ] **Step 1:** реализовать; в BodyMeshes:
```ts
const restrictTo = useAtlasStore((s) => s.restrictTo);
const highlights = useAtlasStore((s) => s.highlights);
// … в эффекте:
const state = { visibleSystems, hiddenParts, isolatedPartId, restrictTo };
const hl = highlights[part.id];
b.mesh.setColorAt(i, hl ? HIGHLIGHT_COLORS[hl] : part.id === selectedPartId ? HIGHLIGHT : b.baseColor);
```
(`HIGHLIGHT_COLORS` — объект `THREE.Color`, создаётся один раз на уровне модуля.)
- [ ] **Step 2:** `pnpm typecheck && pnpm lint && pnpm test`; headless-проверка `/atlas`: клик выделяет, поиск работает (регресс-проверка), 0 ошибок консоли; переход `/atlas → /about → /atlas` не грузит чанки повторно (network: нет запросов `body-*.bin.gz` при втором заходе — проверить через `page.on("request")`).
- [ ] **Step 3:** commit `feat(atlas): highlight kinds, onPick and in-memory atlas data cache`.

---

### Task 3: Пул структур темы

**Files:** Create `src/lib/quiz/types.ts`, `src/lib/quiz/pool.ts`; Test `src/lib/quiz/pool.test.ts`.

**Interfaces:**
```ts
// types.ts
import type { Side } from "@/lib/content/types"; import type { SystemId } from "@/lib/atlas/types";
export type QuizMode = "find" | "name";
export interface QuizPart { id: string; la: string; ru: string; side: Side; system: SystemId; topic: string }
export interface FindQuestion { kind: "find"; target: QuizPart; accept: string[]; attemptsLeft: number }
export interface NameQuestion { kind: "name"; target: QuizPart; options: { la: string; ru: string }[]; correctIndex: number }
export type Question = FindQuestion | NameQuestion;
export interface AnswerRecord { partId: string; la: string; ru: string; correct: boolean; attempts: number }
export interface SessionResult { topicId: string; mode: QuizMode; startedAt: string; finishedAt: string; answers: AnswerRecord[] }
// pool.ts
export function courseTopics(topics: Topic[]): Topic[];            // листья кроме other, в порядке topics.json
export function topicParts(content: ContentBundle, manifest: AtlasManifest, topicId: string): QuizPart[]; // по порядку manifest.parts
export function contextIds(manifest: AtlasManifest, topics: Topic[], topicId: string): string[]; // parent ∈ {myology, arthrology} → все skeletal ids; иначе []
export function visibleIdsForTopic(content, manifest, topics, topicId): string[]; // topicParts ids ∪ contextIds, без дублей
export function distinctConcepts(parts: QuizPart[]): string[];      // уникальные la, порядок первого появления
```

- [ ] **Step 1: тест** с синтетическими manifest (6 частей: 2 femur L/R skeletal topic `lower-limb-bones`, tibia L skeletal, deltoid parts L/R muscular topic `muscles-upper-limb`, aorta arterial без записи) и content/topics (osteology → lower-limb-bones; myology → muscles-upper-limb; other). Проверить: `courseTopics` = 2 листа; `topicParts(lower-limb-bones)` = 3 части с `la/ru/side/system`; `contextIds(muscles-upper-limb)` = все skeletal ids; `contextIds(lower-limb-bones)` = []; `visibleIdsForTopic(muscles-upper-limb)` = deltoid ids ∪ skeletal; `distinctConcepts` = ["Femur","Tibia"].
- [ ] **Step 2:** FAIL → реализация → PASS.
- [ ] **Step 3:** commit `feat(quiz): topic pool and visibility context`.

---

### Task 4: Генерация и проверка вопросов

**Files:** Create `src/lib/quiz/random.ts`, `src/lib/quiz/generate.ts`, `src/lib/quiz/check.ts`; Tests `random.test.ts`, `generate.test.ts`, `check.test.ts`.

**Interfaces:**
```ts
// random.ts
export function mulberry32(seed: number): () => number;              // [0,1)
export function shuffle<T>(arr: T[], rng: () => number): T[];        // новая копия, Фишер–Йетс
// check.ts
export function acceptIds(target: QuizPart, parts: QuizPart[]): string[]; // все id с тем же la и тем же side (side "" совпадает только с "")
export function checkFind(q: FindQuestion, clickedId: string): boolean;
export function checkName(q: NameQuestion, optionIndex: number): boolean;
// generate.ts
export const SESSION_LENGTH = 10;
export function generateSession(parts: QuizPart[], mode: QuizMode, seed: number, count = SESSION_LENGTH): Question[];
//  - цели: перемешать concepts (distinct la); брать по одной случайной части на concept; если concepts < count — идти по кругу, но не подряд одна и та же la
//  - find: accept = acceptIds(target), attemptsLeft = 3
//  - name: 3 дистрактора = случайные другие concepts темы (la ≠ target.la), options = [target, ...distractors] перемешаны (ru берётся у первой части с этим la), correctIndex
//  - бросает Error("topic has fewer than 4 concepts") для name, если distinctConcepts < 4
```

- [ ] **Step 1: тесты** — `mulberry32(1)` даёт одинаковую последовательность дважды; `shuffle` не мутирует и сохраняет мультимножество; `acceptIds` для Femur left → оба левых femur-меша (сделать дубликат FJ1/FJ1b), но не правый; `checkFind` true/false; `generateSession(parts,"name",42)` — длина 10, у каждого вопроса 4 опции с уникальными la, `options[correctIndex].la === target.la`, детерминированность (два вызова с seed 42 равны, seed 43 отличается); `generateSession(parts,"find",7)` — accept содержит target.id; тема с 3 concepts → throw для name, но не для find.
- [ ] **Step 2:** FAIL → реализация → PASS.
- [ ] **Step 3:** commit `feat(quiz): deterministic session generation and answer checking`.

---

### Task 5: Прогресс — схема, запись, статистика, сериализация, хранилище

**Files:** Create `src/lib/progress/types.ts`, `record.ts`, `stats.ts`, `serialize.ts`, `storage.ts`; Tests `record.test.ts`, `stats.test.ts`, `serialize.test.ts`.

**Interfaces:**
```ts
// types.ts
export interface PartStat { correct: number; wrong: number; lastAt: string }
export interface SessionSummary { topicId: string; mode: QuizMode; finishedAt: string; correct: number; total: number }
export interface ProgressV1 { version: 1; parts: Record<string, PartStat>; sessions: SessionSummary[]; activeDays: string[] }
// record.ts
export function emptyProgress(): ProgressV1;
export function recordSession(p: ProgressV1, r: SessionResult): ProgressV1;  // чистая: parts[partId].correct/wrong += 1, lastAt = finishedAt; sessions push summary; activeDays += YYYY-MM-DD(finishedAt) без дублей, отсортировано
// stats.ts
export function topicMastery(p: ProgressV1, parts: QuizPart[]): { known: number; total: number }; // total = distinct la; known = distinct la, у которых сумма correct по всем id этого la ≥ 2
export function streakDays(activeDays: string[], today: string): number;  // подряд дней, заканчивающихся today или вчера; иначе 0
export function dayKey(iso: string): string; // "2026-09-23"
// serialize.ts
export function parseProgress(raw: string | null): ProgressV1 | null;   // null при отсутствии/повреждении/чужой версии; проверяет форму
export function stringifyProgress(p: ProgressV1): string;
// storage.ts  (DOM-адаптер, без тестов)
export const PROGRESS_KEY = "anatomia.progress.v1";
export function loadProgress(): ProgressV1;   // try/catch; при повреждённом значении копирует в `${KEY}.backup` и возвращает emptyProgress()
export function saveProgress(p: ProgressV1): void; // try/catch, молча
```

- [ ] **Step 1: тесты** — `recordSession`: считает correct/wrong, добавляет день один раз, не мутирует вход; `topicMastery`: два меша одной la с correct 1+1 → known; `streakDays`: ["2026-09-21","2026-09-22","2026-09-23"], today "2026-09-23" → 3; today "2026-09-24" → 3 (вчера считается); today "2026-09-26" → 0; `parseProgress`: валидный JSON → объект; `"{"` → null; `{version:2}` → null; отсутствие полей → null.
- [ ] **Step 2:** FAIL → реализация → PASS.
- [ ] **Step 3:** commit `feat(progress): schema, session recording, mastery and streak, storage adapter`.

---

### Task 6: Экран тестов `/quiz`

**Files:** Create `src/components/quiz/QuizSetup.tsx`, `QuizRunner.tsx`, `QuizResult.tsx`, `QuizScreen.tsx`, `src/app/quiz/page.tsx`; Modify `src/components/SiteHeader.tsx` (+ «Тесты»).

**Interfaces / behavior:**
- `QuizScreen` использует `useAtlasData()`; до `ready` — `LoadingOverlay`. Состояния: `{phase:"setup"} | {phase:"running", topicId, mode, questions, index, answers, feedback} | {phase:"result", result}`.
- **Setup** (`data-testid="quiz-setup"`): список курсовых тем сгруппирован по родителю (`courseTopics`), у каждой — число понятий (`distinctConcepts`); переключатель режима (`radio` «Найди структуру» / «Назови структуру», `aria-label` «Режим»); кнопка «Начать» (`data-testid="quiz-start"`). При старте: `setRestrict(visibleIdsForTopic)`, `clearQuiz` перед этим, `generateSession(parts, mode, Date.now())`.
- **Running** (`data-testid="quiz-runner"`): заголовок «Вопрос N из 10» (`data-testid="quiz-counter"`).
  - find: текст «Найдите: `la` — `ru (слева/справа)`» (`data-testid="quiz-prompt"`); клики по холсту идут в `onPick`; верно → `setHighlights({clicked:"correct"})`, обратная связь «Верно» и кнопка «Дальше» (`data-testid="quiz-next"`); неверно → `setHighlights({...prev, clicked:"wrong"})`, «Не то, осталось попыток: k»; после 3-й ошибки → `setHighlights({target:"target"})`, `flyTo(target.id)`, «Правильный ответ показан», кнопка «Дальше».
  - name: при показе вопроса `setHighlights({target:"target"})` + `flyTo(target.id)`; 4 кнопки (`role="radio"`-подобные `button`, `data-testid="quiz-option"`) с `la` жирно и `ru` серым; выбор → верный зелёный/неверный красный + правильный подсвечен, кнопка «Дальше».
  - Между вопросами подсветки очищаются (`setHighlights({})`), `restrictTo` остаётся.
  - Кнопка «Прервать» возвращает в setup (без записи прогресса), вызывает `clearQuiz()`.
- **Result** (`data-testid="quiz-result"`): «Верно X из 10», список ошибок (`la — ru`) со ссылкой «Показать в атласе» (`/atlas?focus=<id>`), кнопки «Ещё раз» (та же тема/режим, новый seed) и «Другая тема». При входе в result: `recordSession` + `saveProgress`, `clearQuiz()`.
- При размонтировании `QuizScreen` → `clearQuiz()`.
- `src/app/quiz/page.tsx`: `metadata.title = "Тесты — Анатомия"`, `<main className="h-[calc(100dvh-3rem)]">`.
- Раскладка: слева панель 20rem (setup/runner/result), справа холст (как в атласе, без LayerPanel и SearchBox).

- [ ] **Step 1:** реализовать компоненты.
- [ ] **Step 2:** headless-проверка (порт 3100 или `PLAYWRIGHT_BASE_URL`): setup виден, выбрать «Кости нижней конечности» + «Назови структуру», старт → `quiz-counter` «Вопрос 1 из 10», 4 опции; клик по любой опции → появляется «Дальше»; пройти 10 → `quiz-result` с «Верно N из 10»; в режиме «найди»: клик по холсту меняет текст обратной связи; «Прервать» возвращает setup; 0 ошибок консоли.
- [ ] **Step 3:** `pnpm typecheck && pnpm lint && pnpm test`; commit `feat(quiz): quiz screen with find and name modes`.

---

### Task 7: Экран прогресса `/progress` и фокус из ссылки в атласе

**Files:** Create `src/components/progress/ProgressScreen.tsx`, `src/app/progress/page.tsx`; Modify `src/components/SiteHeader.tsx` (+ «Прогресс»), `src/components/atlas/AtlasScreen.tsx` (`?focus=`).

**Behavior:**
- `ProgressScreen` (`"use client"`, `data-testid="progress-screen"`): грузит контент (`loadContent("")`) и манифест (`loadManifest("")`) — без чанков; таблица по курсовым темам: «Тема · освоено X из Y понятий · N сессий»; строка «Серия: K дней» (`data-testid="streak"`); кнопки «Экспорт» (скачивает `anatomia-progress.json` через Blob) и «Импорт» (`<input type=file>` → `parseProgress` → при null показать «Файл не распознан» иначе сохранить и перерисовать); «Очистить прогресс» с подтверждением через собственный inline-диалог (не `window.confirm`).
- `AtlasScreen`: читать `useSearchParams().get("focus")`; когда данные готовы и id есть в манифесте — один раз вызвать `reveal(id, part.system)`. Обернуть использование `useSearchParams` в `<Suspense>` в `src/app/atlas/page.tsx` (требование Next для статического рендера).
- Header: порядок ссылок «Атлас · Тесты · Прогресс · Об источниках».

- [ ] **Step 1:** реализовать; `pnpm build` проходит (проверка Suspense).
- [ ] **Step 2:** headless: `/progress` без данных показывает 0 из Y и «Серия: 0 дней»; после сессии в `/quiz` — числа изменились; `/atlas?focus=FJ3259` открывает карточку «Femur».
- [ ] **Step 3:** commit `feat(progress): progress screen with export/import; atlas focus link`.

---

### Task 8: Браузерные тесты и документация

**Files:** Create `e2e/quiz.spec.ts`; Modify `README.md`, `docs/superpowers/specs/…` (если поведение отличается от §6.2/§6.4 — привести спецификацию в соответствие).

- [ ] **Step 1: e2e** (`test.describe.configure({ mode: "serial" })` не нужен; каждый тест сам проходит сессию):
  1. «name mode session completes and records progress»: goto `/quiz`, ждать `data-atlas-ready='true'`, выбрать тему «Кости нижней конечности» (`getByLabel`), режим «Назови структуру», старт; 10 раз: кликнуть первый `quiz-option`, затем `quiz-next`; ожидать `quiz-result` с текстом /Верно \d+ из 10/; перейти `/progress`, ожидать что строка «Кости нижней конечности» содержит «1 сесси».
  2. «find mode gives feedback and reveals after 3 misses»: старт в режиме «Найди структуру»; кликнуть 3 раза по углу холста (x: 40, y: height−40 — пусто → пропущено? нет: клик в пустоту не считается попыткой; поэтому кликать по центру холста трижды и проверять, что после ≤3 кликов появилась либо «Верно», либо «Правильный ответ показан», а затем `quiz-next`).
  3. «abort returns to setup»: старт → «Прервать» → `quiz-setup` виден.
  4. «progress export produces a file»: на `/progress` кликнуть «Экспорт», перехватить `page.waitForEvent("download")`, имя файла `anatomia-progress.json`.
- [ ] **Step 2:** `pnpm e2e` (или с `PLAYWRIGHT_BASE_URL`) — 10/10 (6 старых + 4 новых).
- [ ] **Step 3:** README: разделы «Тесты» и «Прогресс» (как устроены, где данные, экспорт).
- [ ] **Step 4:** commit `test: quiz and progress e2e; docs`.

---

## Self-review

- Spec coverage: §6.2 (темы, два режима, контекст видимости, 3 попытки, сессия 10, итог с ошибками и переходом в атлас, запись в прогресс) — Tasks 3–6, 8; §6.4 (освоение по темам ≥2 верных, серия, экспорт/импорт) — Tasks 5, 7; §7 п.3–4 (store для тестов, localStorage с версией) — Tasks 1, 5; §8 (повреждённый storage → backup) — Task 5; §9 (тесты генерации/дистракторов, SRS — отложен в 2c, store) — Tasks 1, 4, 5. Кнопка «Учить карточки темы» — План 2c.
- Placeholders: нет; UI-задачи описаны поведением и тест-идами, библиотечные — сигнатурами и тестами.
- Type consistency: `QuizPart`, `Question`, `SessionResult` (Task 3) используются в Tasks 4–8; `HighlightKind`/`flyTo`/`setRestrict` (Task 1) в Tasks 2, 6; `ProgressV1` в Tasks 5, 7.
