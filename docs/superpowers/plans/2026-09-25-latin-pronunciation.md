# План 4: произношение латыни — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Рядом с каждым латинским названием показывать русскую транскрипцию с ударением — `Arteria carotis interna` → `[артэ́риа каро́тис интэ́рна]`, — чтобы студент сразу знал, как термин читается вслух.

**Architecture:** Чистый модуль `src/lib/latin`: `syllables` (слогоделение), `transcribeWord`/`transcribe` (правила чтения медицинской латыни), `stressOf` (ударение из словаря). Словарь `content/latin-stress.json` — 677 слов корпуса, значение = номер ударного слога **с конца** (1, 2 или 3). Черновик словаря генерирует `pnpm build:stress` по позиционным правилам и таблице суффиксов; окончательное значение выверяется вручную. `build:content` падает, если хоть одно слово из `la` отсутствует в словаре. Транскрипция считается в рантайме (дёшево, 677 слов), кладётся в `DisplayNames.laRu` и показывается в атласе, карточках, тесте и разборе ошибок.

**Tech Stack:** без новых зависимостей.

**Spec:** `docs/superpowers/specs/2026-09-22-anatomia-mvp-design.md` §5 (модель контента), §6.1 (карточка структуры), §6.3 (карточки).

## Global Constraints

- **Традиция чтения — медицинская латынь по Чернявскому** (учебник для медвузов), русская транскрипция кириллицей.
- **Ударение хранится, а не вычисляется в рантайме.** Значение в `latin-stress.json` — номер слога с конца: `1` (односложные), `2` (предпоследний), `3` (третий от конца). Других значений нет.
- **Не слова** (в транскрипции выводятся как есть, в словарь ударений не попадают): римские цифры
  (`I`, `II`, … `XII`) с необязательной буквой сегмента (`IVa`, `IVb`) и метки уровней позвонков,
  где буквы стоят вплотную к цифре (`C2`, `Th4`, `L5`, `S1`). Правило: буквенный ряд, примыкающий
  к цифре, словом не считается.
- Знак ударения — комбинирующий акут U+0301 после ударной гласной (`а́`). На односложных словах и на словах из одной гласной ударение не ставится. На «ё» акут не ставится: она ударная сама по себе.
- Пунктуация латинского названия (запятые, дефисы) сохраняется в транскрипции.
- Dev-сервер пользователя на :3000 не трогать; e2e через `PLAYWRIGHT_BASE_URL`. Коммиты по явным путям с трейлером `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`.

## Правила чтения (единственный источник истины для Task 1)

**Гласные и дифтонги**
- `a` → а, `e` → э, `i` → и, `o` → о, `u` → у, `y` → и.
- `ae`, `oe` → э. `au` → ау, `eu` → эу.
- `eu` **не дифтонг** в конце слова перед `s`/`m`: `deltoideus` → дэльтои́дэус (`de-us`), `perineum` → пэринэ́ум.
- `i` перед гласной в начале слова и между гласными → й (`iodum`); в корпусе таких нет, но правило нужно.
- `j` перед гласной в начале слова или после согласной даёт **йотированную букву**: `ja` → я,
  `je` → е, `jo` → ё, `ju` → ю, `ji` → и (`jejunum` → ею́нум — три слога, ударение на «ю»; `jugularis` → югуля́рис) — так
  латынь записывают русские учебники, «йэ» в русской графике не пишется. «ё» пишется только
  под ударением (`jodum` → ёдум), безударное `jo` даёт «йо» — по той же причине, что и `lo`.
  `major` → ма́йор.

**Согласные**
- `c` → ц перед `e`, `i`, `y`, `ae`, `oe`; иначе к: `cervicalis` → цэрвика́лис, `caput` → ка́пут.
- `g` → г всегда. `h` → х. `k` → к. `z` → з.
- `l` — **мягкое** (традиция медицинской латыни): `la` → ля, `lu` → лю, `le` → ле, `li` → ли,
  `ly` → ли; перед согласной и в конце слова → ль. `ll` → лл по тем же правилам
  (`maxilla` → макси́лля). Исключение по технике записи: `lo` → **ло**, а не «лё», потому что
  русская «ё» всегда ударная и в безударном слоге («ко́лон», «лобу́лус») читалась бы неверно.
- `qu` → кв: `obliquus` → обли́квус.
- `ngu` + гласная → нгв: `lingua` → ли́нгва. Перед согласной остаётся нгу (`longus` → ло́нгус).
- `s` → с; между двумя гласными → з: `nasalis` → наза́лис. `ss` → сс.
- `ti` + гласная → ци: `substantia` → субста́нциа; **но** после `s`, `t`, `x` → ти: `ostium` → о́стиум.
- `x` → кс: `plexus` → пле́ксус.
- Диграфы: `ch` → х, `ph` → ф, `th` → т, `rh` → р (`brachium` → бра́хиум, `ophthalmicus` → офта́льмикус).

**Ударение (для генератора черновика)**
1. Один слог → на нём. Два слога → на первом.
2. Три и больше: предпоследний слог долгий → ударение на нём (значение `2`), иначе на третьем от конца (значение `3`).
3. Предпоследний долгий, если: это дифтонг; или гласная стоит перед двумя и более согласными, перед `x`, `z` (но **не** перед сочетанием «немая + плавная»: `b c d g p t` + `l r` — там кратко); или слово оканчивается на суффикс из таблицы долгих.
4. Предпоследний краткий, если гласная стоит перед гласной, или слово оканчивается на суффикс из таблицы кратких.
5. **Таблица долгих суффиксов:** `-alis`, `-ale`, `-ales`, `-alium`, `-aris`, `-are`, `-ares`, `-arium`,
   `-atus`, `-ata`, `-atum`, `-ati`, `-atae`, `-inus`, `-ina`, `-inum`, `-ini`, `-osus`, `-osa`, `-osum`,
   `-osi`, `-osae`, `-ivus`, `-iva`, `-ivum`, `-ura`, `-urus`. Суффикс `-ilis` в таблицу не входит:
   в анатомии он чаще краткий (`gracilis` → гра́цилис).
6. **Таблица кратких суффиксов:** `-icus`, `-ica`, `-icum`, `-ulus`, `-ula`, `-ulum`, `-olus`, `-ola`, `-olum`, `-eus`, `-ea`, `-eum`, `-ius`, `-ia`, `-ium`, `-bilis`.
7. Генератор — только черновик: значение в словаре правит человек.

## Карта файлов

```
src/lib/latin/types.ts          StressMap = Record<string, 1|2|3>
src/lib/latin/syllables.ts      syllables(word): {nucleus, start}[] (+test)
src/lib/latin/transcribe.ts     transcribeWord(word, stress?) / transcribe(phrase, map) (+test)
src/lib/latin/stress.ts         guessStress(word) — правила выше; stressOf(word, map) (+test)
src/lib/latin/index.ts          реэкспорт
content/latin-stress.json       677 слов → 1|2|3, отсортировано по алфавиту
scripts/build-stress.ts         дописывает недостающие слова черновиком, печатает их списком
scripts/content-rules.ts        правило 8: каждое слово из la есть в latin-stress.json
src/lib/content/names.ts        DisplayNames.laRu; displayNames(en, entry, topics, stress)
src/lib/content/load-content.ts грузит /content/latin-stress.json вместе с остальным
public/content/latin-stress.json  копия словаря рядом с structures.json (build:content)
src/components/atlas/PartCard.tsx   строка транскрипции под латынью
src/components/cards/CardReview.tsx транскрипция под латинской стороной
src/components/quiz/QuizRunner.tsx  транскрипция в подсказке вопроса
src/components/quiz/QuizResult.tsx  транскрипция в разборе ошибок
e2e/atlas.spec.ts, e2e/cards.spec.ts  проверки транскрипции
README.md                       раздел «Произношение»
```

---

### Task 1: Чтение и ударение (чистая логика)

**Files:** Create `src/lib/latin/{types,syllables,transcribe,stress,index}.ts` + тесты рядом.

Interfaces:
```ts
export type StressPos = 1 | 2 | 3;
export type StressMap = Record<string, StressPos>;
export interface Syllable { nucleus: string; start: number }      // start — индекс ядра в слове
export function syllables(word: string): Syllable[];
export function guessStress(word: string): StressPos;             // черновик по правилам
export function stressOf(word: string, map: StressMap): StressPos | null;  // null — слова нет в словаре
export function transcribeWord(word: string, stress: StressPos | null): string;
export function transcribe(phrase: string, map: StressMap): string;   // сохраняет пунктуацию, римские цифры как есть
export function latinWords(phrase: string): string[];             // слова без римских цифр, в нижнем регистре
```
Tests (каждый пример из раздела «Правила чтения» плюс):
- `syllables("deltoideus")` → 5 ядер (`e o i e u`), `syllables("lingua")` → 2 (`i`, `ua`? нет: `i`, `u`+`a` — ядра `i`, `a`, потому что `ngu` даёт согласный `в`); зафиксировать поведение тестом.
- `transcribeWord("musculus", 3)` → `му́скулюс`; `transcribeWord("arteria", 3)` → `артэ́риа`; `transcribeWord("segmentalis", 2)` → `сэгмэнта́лис`; `transcribeWord("maxilla", 2)` → `макси́лля`; `transcribeWord("vena", 2)` → `вэ́на`; `transcribeWord("caput", 2)` → `ка́пут`; `transcribeWord("os", 1)` → `ос` (односложное — без акута); `transcribeWord("obliquus", 2)` → `обли́квус`; `transcribeWord("lingua", 2)` → `ли́нгва`; `transcribeWord("substantia", 2)` → `субста́нциа`; `transcribeWord("ostium", 3)` → `о́стиум`; `transcribeWord("jejunum", 2)` → `ею́нум`; `transcribeWord("major", 2)` → `ма́йор`; `transcribeWord("nasalis", 2)` → `наза́лис`; `transcribeWord("plexus", 2)` → `плэ́ксус`; `transcribeWord("brachium", 3)` → `бра́хиум`; `transcribeWord("cervicalis", 2)` → `цэрвика́лис`; `transcribeWord("platysma", 2)` → `плати́зма`.
- `transcribe("Arteria carotis interna", map)` → `артэ́риа каро́тис интэ́рна`; `transcribe("Ramus ventricularis anterior I", map)` сохраняет `I`; `transcribe("Valva aortae, valvula semilunaris dextra", map)` сохраняет запятую.
- `guessStress`: `vena`→2, `arteria`→3, `musculus`→3, `segmentalis`→2 (суффикс), `maxilla`→2 (две согласные), `vertebra`→3 (немая+плавная), `deltoideus`→3, `humerus`→3.
Commit `feat(latin): syllables, medical-Latin transcription and stress rules`.

### Task 2: Словарь ударений на весь корпус

**Files:** Create `content/latin-stress.json`, `scripts/build-stress.ts`; Modify `scripts/content-rules.ts`, `scripts/build-content.ts`, `package.json`.

- `scripts/build-stress.ts`: собирает слова из `content/structures.csv` (колонка `la`), пропускает римские цифры, дописывает в `content/latin-stress.json` отсутствующие со значением `guessStress`, сортирует по алфавиту, печатает список дописанных (чтобы человек их вычитал). Скрипт `"build:stress": "tsx scripts/build-stress.ts"`.
- `scripts/content-rules.ts`: новое правило — для каждой строки все слова `la` (без римских цифр) должны быть ключами словаря; иначе ошибка `latin word "<w>" missing from latin-stress.json (run pnpm build:stress)`.
- `scripts/build-content.ts`: копирует словарь в `public/content/latin-stress.json`.
- Прогнать `pnpm build:stress`, получить 677 записей, затем **вычитать весь словарь** (отдельная задача ревью, см. Task 3).
Commit `feat(content): latin-stress dictionary with generator and validation`.

### Task 3: Вычитка словаря (ревью данных)

Не код: эксперт по медицинской латыни проверяет все 677 записей `content/latin-stress.json` по таблице «слово · слоги · ударение · транскрипция» и правит ошибки. Опора: правила выше, TA2, словарь медицинских терминов. Отдельно проверяются: все `-alis/-aris` (должны быть `2`), все `-icus/-ulus/-eus/-ius` (должны быть `3`), греческие слова (`bronchus`, `thorax`, `pharynx`, `oesophagus`, `platysma`, `gaster`), составные (`sternocleidomastoideus`, `musculocutaneus`).
Commit `fix(content): expert-checked stress marks`.

### Task 4: Транскрипция в интерфейсе

**Files:** Modify `src/lib/content/{names,load-content,types}.ts`, `src/hooks/use-atlas-data.ts`, `src/components/atlas/PartCard.tsx`, `src/components/cards/CardReview.tsx`, `src/components/quiz/{QuizRunner,QuizResult}.tsx`, `e2e/atlas.spec.ts`, `e2e/cards.spec.ts`, `README.md`.

- `ContentBundle` получает `stress: StressMap`; `loadContent` грузит третий файл (`/content/latin-stress.json`) тем же `fetch`-путём, при неудаче — пустой словарь (транскрипция просто не показывается).
- `DisplayNames` получает `laRu: string` (пусто, если словаря нет).
- `PartCard`: под `part-la` строка `data-testid="part-la-ru"`, серым, в квадратных скобках.
- `CardReview`: под латинской стороной (лицевой при `la→ru`, оборотной при `ru→la`) та же строка, `data-testid="card-la-ru"`.
- `QuizRunner`: в режиме «найди» под подсказкой; в вариантах «назови» **не показывать** (четыре варианта и так плотные).
- `QuizResult`: под латынью каждой ошибки.
- e2e: в атласе `?focus=FJ3259` → `part-la-ru` содержит `фэ́мур`; в карточках первая карточка показывает транскрипцию.
- README: раздел «Произношение» — традиция, откуда словарь, как править ударение (`content/latin-stress.json` + `pnpm build:stress`).
Commit `feat(ui): show Russian transcription next to every Latin name`.

## Self-review
- Правила чтения заданы одним списком и покрыты тестами Task 1; словарь и его валидация — Task 2; качество данных — Task 3; показ — Task 4.
- Контракты: `StressMap`, `transcribe`, `stressOf` (T1) ↔ генератор и валидатор (T2) ↔ `DisplayNames.laRu` (T4).
- Плейсхолдеров нет: каждый пример транскрипции задан явно.
