# План 2a: Терминология в атласе — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Каждая кость, связка и мышца в атласе получает латинское и русское название и тему курса; карточка структуры и поиск работают на трёх языках.

**Architecture:** Контент живёт в `content/` (CSV + JSON, правит человек), скрипт `scripts/build-content.ts` валидирует его против манифеста и собирает `public/content/*.json`. Рантайм грузит собранный контент вместе с манифестом и подставляет имена в `PartCard` и индекс поиска. Сторона (левая/правая) не хранится в именах, а определяется из английского имени и дописывается при показе.

**Tech Stack:** TypeScript, csv-parse (sync), tsx для запуска скриптов, vitest; в приложении — существующие React-компоненты атласа.

**Spec:** `docs/superpowers/specs/2026-09-22-anatomia-mvp-design.md` (§2, §4, §5, §6.1, §7, §9). Уточнения к §5 в этом плане: `ru`/`la` хранятся без стороны, добавлена колонка `side` со значениями `left|right|` (пусто), вычисляемая скриптом из `en`; поле `aliases` разделяется `;`.

## Global Constraints

- Идентификатор структуры — `part.id` из `public/models/v1/atlas.json` (2234 частей; 241 id имеют суффикс `M`, никогда не проверять по регулярке `FJ\d+`).
- Курсовые системы: `skeletal` (296), `connective` (40), `muscular` (402) = 738 частей. Каждая должна иметь `la`, `ru`, `topic` — сборка падает иначе.
- Латынь по Terminologia Anatomica (TA2), без стороны: `Femur`, `Musculus deltoideus, pars clavicularis`, `Vertebra cervicalis IV`. Русский по Сапину/Привесу, без стороны, с маленькой буквы кроме первой: `Бедренная кость`, `Дельтовидная мышца, ключичная часть`. Никаких «левый/правый» в `la`/`ru`.
- Темы: только id из `content/topics.json`. Курсовая тема (не `other`) должна содержать ≥ 4 структур.
- `public/content/*` никогда не редактируется руками, только `pnpm build:content`.
- `src/lib/**` без React/DOM, с vitest-тестами. Коммиты `feat:`/`test:`/`chore:`/`content:`, трейлер `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- pnpm, Node ≥ 22. Dev-серверы только на порту 3100, убивать только свой PID.

## Карта файлов

```
content/topics.json                  дерево тем (id, ru, la, parent)
content/structures.csv               id,en,la,ru,topic,aliases  (738 строк, sorted by id)
content/source/names-*.tsv           экспорт английских имён из манифеста (генерируется скриптом, коммитится)
scripts/export-names.ts              atlas.json → content/source/names-{skeletal,connective,muscular}.tsv
scripts/build-content.ts             валидирует content/, пишет public/content/structures.json, topics.json
scripts/content-rules.ts             чистые правила валидации (тестируются)
scripts/content-rules.test.ts
public/content/structures.json       { [id]: { la, ru, topic, side, aliases } }
public/content/topics.json           копия дерева тем
src/lib/content/types.ts             StructureEntry, Topic, ContentBundle
src/lib/content/side.ts              detectSide(en), stripSide(en)  (+ test)
src/lib/content/names.ts             displayName(entry, part) → { la, ru, en, sideRu }  (+ test)
src/lib/content/load-content.ts      loadContent(baseUrl, opts) (+ test)
src/hooks/use-atlas-data.ts          AtlasData += content
src/components/atlas/PartCard.tsx    показывает la, ru + сторона, тему
src/components/atlas/SearchBox.tsx   индекс по en, la, ru, aliases; результат показывает ru + la
src/components/atlas/AtlasScreen.tsx getPartNames через content
e2e/atlas.spec.ts                    поиск по-русски
```

---

### Task 1: Дерево тем, типы контента, определение стороны

**Files:**
- Create: `content/topics.json`, `src/lib/content/types.ts`, `src/lib/content/side.ts`
- Test: `src/lib/content/side.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // types.ts
  export type Side = "left" | "right" | "";
  export interface Topic { id: string; ru: string; la?: string; parent?: string; }
  export interface StructureEntry { la: string; ru: string; topic: string; side: Side; aliases: string[]; }
  export interface ContentBundle { structures: Record<string, StructureEntry>; topics: Topic[]; }
  // side.ts
  export function detectSide(en: string): Side;   // "Left femur"→left, "Distal phalanx of right thumb"→right, "Sternum"→""
  export function stripSide(en: string): string;   // "Distal phalanx of right thumb"→"Distal phalanx of thumb"; "Left femur"→"Femur" (capitalize first)
  ```

- [ ] **Step 1: topics.json**

```json
[
  { "id": "osteology", "ru": "Остеология", "la": "Osteologia" },
  { "id": "skull-cerebral", "ru": "Мозговой отдел черепа", "la": "Neurocranium", "parent": "osteology" },
  { "id": "skull-facial", "ru": "Лицевой отдел черепа и подъязычная кость", "la": "Viscerocranium", "parent": "osteology" },
  { "id": "teeth", "ru": "Зубы", "la": "Dentes", "parent": "osteology" },
  { "id": "larynx-cartilages", "ru": "Хрящи гортани и носа", "la": "Cartilagines laryngis et nasi", "parent": "osteology" },
  { "id": "spine", "ru": "Позвоночный столб", "la": "Columna vertebralis", "parent": "osteology" },
  { "id": "thorax", "ru": "Грудная клетка", "la": "Thorax", "parent": "osteology" },
  { "id": "upper-limb-bones", "ru": "Кости верхней конечности", "la": "Ossa membri superioris", "parent": "osteology" },
  { "id": "lower-limb-bones", "ru": "Кости нижней конечности", "la": "Ossa membri inferioris", "parent": "osteology" },
  { "id": "arthrology", "ru": "Артрология", "la": "Arthrologia" },
  { "id": "ligaments-head-neck", "ru": "Связки и мембраны головы и шеи", "la": "Ligamenta capitis et colli", "parent": "arthrology" },
  { "id": "ligaments-trunk", "ru": "Связки и соединения туловища", "la": "Ligamenta trunci", "parent": "arthrology" },
  { "id": "ligaments-limbs", "ru": "Связки, мембраны и сухожилия конечностей", "la": "Ligamenta membrorum", "parent": "arthrology" },
  { "id": "myology", "ru": "Миология", "la": "Myologia" },
  { "id": "muscles-head", "ru": "Мышцы головы", "la": "Musculi capitis", "parent": "myology" },
  { "id": "muscles-neck", "ru": "Мышцы шеи и гортани", "la": "Musculi colli et laryngis", "parent": "myology" },
  { "id": "muscles-back", "ru": "Мышцы спины", "la": "Musculi dorsi", "parent": "myology" },
  { "id": "muscles-thorax", "ru": "Мышцы груди и диафрагма", "la": "Musculi thoracis", "parent": "myology" },
  { "id": "muscles-abdomen", "ru": "Мышцы живота", "la": "Musculi abdominis", "parent": "myology" },
  { "id": "muscles-pelvis", "ru": "Мышцы таза и промежности", "la": "Musculi pelvis et perinei", "parent": "myology" },
  { "id": "muscles-upper-limb", "ru": "Мышцы верхней конечности", "la": "Musculi membri superioris", "parent": "myology" },
  { "id": "muscles-lower-limb", "ru": "Мышцы нижней конечности", "la": "Musculi membri inferioris", "parent": "myology" },
  { "id": "other", "ru": "Вне программы первого курса" }
]
```

- [ ] **Step 2: types.ts** — ровно как в Interfaces.

- [ ] **Step 3: падающий тест side.test.ts**

```ts
import { describe, expect, it } from "vitest";
import { detectSide, stripSide } from "./side";

describe("detectSide", () => {
  it("finds side anywhere in the name", () => {
    expect(detectSide("Left femur")).toBe("left");
    expect(detectSide("Distal phalanx of right thumb")).toBe("right");
    expect(detectSide("Humeral head of left pronator teres")).toBe("left");
    expect(detectSide("Abductor digiti minimi of right foot")).toBe("right");
  });
  it("returns empty for midline structures", () => {
    expect(detectSide("Body of sternum")).toBe("");
    expect(detectSide("Diaphragm")).toBe("");
    expect(detectSide("Lateral lumbar intertransversarius")).toBe(""); // 'lateral' is not a side
  });
});

describe("stripSide", () => {
  it("removes the side word and normalises spacing/capitalisation", () => {
    expect(stripSide("Left femur")).toBe("Femur");
    expect(stripSide("Distal phalanx of right thumb")).toBe("Distal phalanx of thumb");
    expect(stripSide("Navicular bone of left foot")).toBe("Navicular bone of foot");
    expect(stripSide("Sternum")).toBe("Sternum");
  });
});
```

- [ ] **Step 4: запустить — FAIL (module not found)**

Run: `pnpm vitest run src/lib/content/side.test.ts`

- [ ] **Step 5: side.ts**

```ts
import type { Side } from "./types";

const SIDE_RE = /\b(left|right)\b/i;

export function detectSide(en: string): Side {
  const m = SIDE_RE.exec(en);
  if (!m) return "";
  return m[1].toLowerCase() as Side;
}

export function stripSide(en: string): string {
  const s = en.replace(SIDE_RE, "").replace(/\s{2,}/g, " ").trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}
```

- [ ] **Step 6: запустить — PASS (3 tests)**, `pnpm typecheck`

- [ ] **Step 7: Коммит** `feat(content): topic tree, content types and side detection`

---

### Task 2: Экспорт имён и скрипт сборки контента с валидацией

**Files:**
- Create: `scripts/export-names.ts`, `scripts/content-rules.ts`, `scripts/build-content.ts`, `content/structures.csv` (только заголовок)
- Test: `scripts/content-rules.test.ts`
- Modify: `package.json` (scripts, devDeps `tsx`, `csv-parse`), `vitest.config.ts` уже включает `scripts/**/*.test.ts`

**Interfaces:**
- Consumes: `Topic`, `StructureEntry`, `Side` (Task 1), `detectSide` (Task 1), `AtlasManifest` (`src/lib/atlas/types.ts`).
- Produces:
  ```ts
  // scripts/content-rules.ts
  export const COURSE_SYSTEMS = ["skeletal", "connective", "muscular"] as const;
  export interface CsvRow { id: string; en: string; la: string; ru: string; topic: string; aliases: string; }
  export interface RuleError { row?: number; id?: string; message: string }
  export function validateContent(rows: CsvRow[], manifest: AtlasManifest, topics: Topic[]): RuleError[];
  //  правила: (1) id уникален; (2) id существует в манифесте; (3) en совпадает с part.name; (4) la и ru непустые;
  //  (5) la/ru не содержат left/right/левый/левая/левое/правый/правая/правое; (6) topic существует;
  //  (7) каждая часть курсовой системы присутствует (сообщение "missing: <id> <name>"); (8) каждая курсовая тема (не other) имеет ≥ 4 структур;
  //  (9) строки отсортированы по id (предупреждение как ошибка, чтобы диффы были стабильны).
  export function buildBundle(rows: CsvRow[], manifest: AtlasManifest, topics: Topic[]): ContentBundle; // side = detectSide(en), aliases split by ';' trimmed, пустые убраны
  ```
  Команды: `pnpm export:names` (пишет `content/source/names-<system>.tsv`: `id<TAB>name`, отсортировано по id), `pnpm build:content` (валидирует, при ошибках печатает их все и выходит с кодом 1; иначе пишет `public/content/structures.json` и `public/content/topics.json` компактным JSON).
  `pnpm build:content --report` печатает только сводку: сколько частей покрыто по каждой системе и список недостающих id, код выхода 0 (для промежуточных проверок контентных задач).

- [ ] **Step 1: зависимости и команды**

```bash
pnpm add -D tsx@^4 csv-parse@^5
```
В `package.json` scripts: `"export:names": "tsx scripts/export-names.ts"`, `"build:content": "tsx scripts/build-content.ts"`, и в `"prebuild"`: `"pnpm build:content"` (Next build падает, если контент невалиден).

- [ ] **Step 2: падающие тесты content-rules.test.ts**

```ts
import { describe, expect, it } from "vitest";
import { buildBundle, validateContent, type CsvRow } from "./content-rules";
import type { AtlasManifest } from "@/lib/atlas/types";
import type { Topic } from "@/lib/content/types";

const part = (id: string, name: string, system: "skeletal" | "muscular" | "arterial") => ({
  id, name, conceptId: "FMA0", system, chunk: 0, positions: 0, normals: 0, indices: 0, vertexCount: 0, indexCount: 0,
  bounds: [[0, 0, 0], [1, 1, 1]] as [[number, number, number], [number, number, number]],
});
const manifest: AtlasManifest = {
  version: "t", triangles: 0, chunks: [],
  parts: [
    part("FJ1", "Left femur", "skeletal"), part("FJ2", "Right femur", "skeletal"),
    part("FJ3", "Left tibia", "skeletal"), part("FJ4", "Right tibia", "skeletal"),
    part("FJ5", "Sternum", "skeletal"), part("FJ9", "Aorta", "arterial"),
  ],
};
const topics: Topic[] = [
  { id: "osteology", ru: "Остеология" }, { id: "lower-limb-bones", ru: "Кости ноги", parent: "osteology" },
  { id: "thorax", ru: "Грудная клетка", parent: "osteology" }, { id: "other", ru: "Прочее" },
];
const ok: CsvRow[] = [
  { id: "FJ1", en: "Left femur", la: "Femur", ru: "Бедренная кость", topic: "lower-limb-bones", aliases: "os femoris; бедро" },
  { id: "FJ2", en: "Right femur", la: "Femur", ru: "Бедренная кость", topic: "lower-limb-bones", aliases: "" },
  { id: "FJ3", en: "Left tibia", la: "Tibia", ru: "Большеберцовая кость", topic: "lower-limb-bones", aliases: "" },
  { id: "FJ4", en: "Right tibia", la: "Tibia", ru: "Большеберцовая кость", topic: "lower-limb-bones", aliases: "" },
  { id: "FJ5", en: "Sternum", la: "Sternum", ru: "Грудина", topic: "other", aliases: "" },
];

describe("validateContent", () => {
  it("accepts a complete, sorted, valid table", () => {
    expect(validateContent(ok, manifest, topics)).toEqual([]);
  });
  it("reports missing course parts", () => {
    const errs = validateContent(ok.slice(0, 4), manifest, topics);
    expect(errs.map((e) => e.message)).toContain("missing: FJ5 Sternum");
  });
  it("rejects duplicate ids, unknown ids, name mismatch, empty la/ru, side words, unknown topic", () => {
    const bad: CsvRow[] = [
      ...ok,
      { id: "FJ1", en: "Left femur", la: "Femur", ru: "Бедренная кость", topic: "lower-limb-bones", aliases: "" },
      { id: "FJ404", en: "Nope", la: "X", ru: "Y", topic: "other", aliases: "" },
    ];
    bad[2] = { ...bad[2], en: "Tibia left", ru: "Левая большеберцовая кость", la: "", topic: "nope" };
    const msgs = validateContent(bad, manifest, topics).map((e) => e.message).join("\n");
    expect(msgs).toMatch(/duplicate id FJ1/);
    expect(msgs).toMatch(/unknown id FJ404/);
    expect(msgs).toMatch(/FJ3.*en mismatch/);
    expect(msgs).toMatch(/FJ3.*la is empty/);
    expect(msgs).toMatch(/FJ3.*side word/);
    expect(msgs).toMatch(/FJ3.*unknown topic nope/);
  });
  it("requires ≥4 structures per course topic and sorted ids", () => {
    const rows = ok.map((r) => (r.id === "FJ5" ? { ...r, topic: "thorax" } : r));
    expect(validateContent(rows, manifest, topics).map((e) => e.message)).toContain("topic thorax has 1 structures (<4)");
    const unsorted = [ok[1], ok[0], ...ok.slice(2)];
    expect(validateContent(unsorted, manifest, topics).map((e) => e.message)).toContain("rows are not sorted by id (first at row 2)");
  });
});

describe("buildBundle", () => {
  it("derives side and splits aliases", () => {
    const b = buildBundle(ok, manifest, topics);
    expect(b.structures.FJ1).toEqual({ la: "Femur", ru: "Бедренная кость", topic: "lower-limb-bones", side: "left", aliases: ["os femoris", "бедро"] });
    expect(b.structures.FJ5.side).toBe("");
    expect(b.topics).toEqual(topics);
  });
});
```

- [ ] **Step 3: запустить — FAIL**

- [ ] **Step 4: content-rules.ts**

```ts
import type { AtlasManifest } from "@/lib/atlas/types";
import { detectSide } from "@/lib/content/side";
import type { ContentBundle, StructureEntry, Topic } from "@/lib/content/types";

export const COURSE_SYSTEMS = ["skeletal", "connective", "muscular"] as const;
export interface CsvRow { id: string; en: string; la: string; ru: string; topic: string; aliases: string }
export interface RuleError { row?: number; id?: string; message: string }

const SIDE_WORDS = /\b(left|right|лев(ый|ая|ое|ые)|прав(ый|ая|ое|ые))\b/i;

export function validateContent(rows: CsvRow[], manifest: AtlasManifest, topics: Topic[]): RuleError[] {
  const errors: RuleError[] = [];
  const parts = new Map(manifest.parts.map((p) => [p.id, p]));
  const topicIds = new Set(topics.map((t) => t.id));
  const seen = new Set<string>();
  const perTopic = new Map<string, number>();

  rows.forEach((r, i) => {
    const row = i + 2; // 1-based + header
    const tag = `row ${row} ${r.id}`;
    if (seen.has(r.id)) errors.push({ row, id: r.id, message: `${tag}: duplicate id ${r.id}` });
    seen.add(r.id);
    const part = parts.get(r.id);
    if (!part) { errors.push({ row, id: r.id, message: `${tag}: unknown id ${r.id}` }); return; }
    if (part.name !== r.en) errors.push({ row, id: r.id, message: `${tag}: en mismatch (manifest: "${part.name}")` });
    if (!r.la.trim()) errors.push({ row, id: r.id, message: `${tag}: la is empty` });
    if (!r.ru.trim()) errors.push({ row, id: r.id, message: `${tag}: ru is empty` });
    if (SIDE_WORDS.test(r.la) || SIDE_WORDS.test(r.ru)) errors.push({ row, id: r.id, message: `${tag}: side word in la/ru` });
    if (!topicIds.has(r.topic)) errors.push({ row, id: r.id, message: `${tag}: unknown topic ${r.topic}` });
    else perTopic.set(r.topic, (perTopic.get(r.topic) ?? 0) + 1);
    if (i > 0 && rows[i - 1].id > r.id && !errors.some((e) => e.message.startsWith("rows are not sorted")))
      errors.push({ row, message: `rows are not sorted by id (first at row ${row})` });
  });

  for (const p of manifest.parts) {
    if ((COURSE_SYSTEMS as readonly string[]).includes(p.system) && !seen.has(p.id))
      errors.push({ id: p.id, message: `missing: ${p.id} ${p.name}` });
  }
  for (const t of topics) {
    const isLeaf = !topics.some((x) => x.parent === t.id);
    if (!isLeaf || t.id === "other") continue;
    const n = perTopic.get(t.id) ?? 0;
    if (n > 0 && n < 4) errors.push({ message: `topic ${t.id} has ${n} structures (<4)` });
  }
  return errors;
}

export function buildBundle(rows: CsvRow[], manifest: AtlasManifest, topics: Topic[]): ContentBundle {
  void manifest;
  const structures: Record<string, StructureEntry> = {};
  for (const r of rows) {
    structures[r.id] = {
      la: r.la.trim(),
      ru: r.ru.trim(),
      topic: r.topic,
      side: detectSide(r.en),
      aliases: r.aliases.split(";").map((a) => a.trim()).filter(Boolean),
    };
  }
  return { structures, topics };
}
```
Примечание: правило 8 считает только темы, в которых уже есть строки (0 строк — тема ещё не заполнена, это ловит правило 7).

- [ ] **Step 5: export-names.ts и build-content.ts**

```ts
// scripts/export-names.ts
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import type { AtlasManifest } from "@/lib/atlas/types";
import { COURSE_SYSTEMS } from "./content-rules";

const manifest = JSON.parse(readFileSync("public/models/v1/atlas.json", "utf8")) as AtlasManifest;
mkdirSync("content/source", { recursive: true });
for (const system of COURSE_SYSTEMS) {
  const rows = manifest.parts.filter((p) => p.system === system).sort((a, b) => (a.id < b.id ? -1 : 1));
  writeFileSync(`content/source/names-${system}.tsv`, rows.map((p) => `${p.id}\t${p.name}`).join("\n") + "\n");
  console.log(`${system}: ${rows.length}`);
}
```

```ts
// scripts/build-content.ts
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { parse } from "csv-parse/sync";
import type { AtlasManifest } from "@/lib/atlas/types";
import type { Topic } from "@/lib/content/types";
import { COURSE_SYSTEMS, buildBundle, validateContent, type CsvRow } from "./content-rules";

const report = process.argv.includes("--report");
const manifest = JSON.parse(readFileSync("public/models/v1/atlas.json", "utf8")) as AtlasManifest;
const topics = JSON.parse(readFileSync("content/topics.json", "utf8")) as Topic[];
const rows = parse(readFileSync("content/structures.csv", "utf8"), { columns: true, skip_empty_lines: true, trim: true }) as CsvRow[];

const errors = validateContent(rows, manifest, topics);
if (report) {
  const have = new Set(rows.map((r) => r.id));
  for (const s of COURSE_SYSTEMS) {
    const parts = manifest.parts.filter((p) => p.system === s);
    const done = parts.filter((p) => have.has(p.id)).length;
    console.log(`${s}: ${done}/${parts.length}`);
  }
  const other = errors.filter((e) => !e.message.startsWith("missing:"));
  console.log(`other errors: ${other.length}`);
  for (const e of other.slice(0, 50)) console.log("  " + e.message);
  process.exit(0);
}
if (errors.length) {
  for (const e of errors) console.error(e.message);
  console.error(`\n${errors.length} content error(s)`);
  process.exit(1);
}
const bundle = buildBundle(rows, manifest, topics);
mkdirSync("public/content", { recursive: true });
writeFileSync("public/content/structures.json", JSON.stringify(bundle.structures));
writeFileSync("public/content/topics.json", JSON.stringify(bundle.topics));
console.log(`content ok: ${rows.length} structures, ${topics.length} topics`);
```
`tsx` понимает алиас `@/` через `tsconfig.json` paths — проверить; если нет, заменить импорты в `scripts/` на относительные (`../src/lib/...`).

`content/structures.csv` создать с одной строкой заголовка: `id,en,la,ru,topic,aliases`.

- [ ] **Step 6: запустить тесты и скрипты**

Run: `pnpm vitest run scripts/content-rules.test.ts` → PASS; `pnpm export:names` → `skeletal: 296 / connective: 40 / muscular: 402`; `pnpm build:content --report` → `skeletal: 0/296 …`; `pnpm build:content` → exit 1 с 738 строками `missing:` (ожидаемо до Task 3–8). Временно НЕ добавлять `prebuild`, пока контент не заполнен — добавить его в Task 8.

- [ ] **Step 7: Коммит** `feat(content): name export and content build with validation rules` (включая `content/source/*.tsv`, пустой `structures.csv`).

---

### Task 3: Контент — кости черепа, зубы, хрящи гортани (skeletal, часть 1)

**Files:** Modify `content/structures.csv` (добавить строки).

**Input:** `content/source/names-skeletal.tsv`. Взять строки, относящиеся к черепу (frontal, parietal, occipital, temporal, sphenoid, ethmoid, maxilla, mandible, zygomatic, nasal, lacrimal, palatine, vomer, inferior nasal concha, hyoid, gingiva), зубы (`* tooth`), хрящи гортани и носа (cricoid, thyroid, arytenoid, corniculate, cuneiform, epiglottic, major alar, septal и т.п.).

**Rules:** темы `skull-cerebral`, `skull-facial`, `teeth`, `larynx-cartilages`; `gingiva` → `other`. Латынь TA2 без стороны (`Os frontale`, `Maxilla`, `Dens caninus superior`, `Cartilago cricoidea`); русский по Сапину (`Лобная кость`, `Верхняя челюсть`, `Верхний клык`, `Перстневидный хрящ`). Для зубов: `Dens incisivus centralis superior` / `Верхний центральный резец`, `Dens molaris primus inferior` / `Нижний первый моляр`, premolar → `Dens premolaris primus/secundus` / `Первый/второй премоляр`. Aliases по желанию (`;`), например `os hyoideum` уже латынь, alias можно `подъязычная`.

- [ ] **Step 1:** Дописать строки в `content/structures.csv` (CSV, запятые внутри значений брать в кавычки).
- [ ] **Step 2:** `pnpm build:content --report` — `other errors: 0`; число skeletal выросло на количество добавленных строк.
- [ ] **Step 3:** Отсортировать файл по id (заголовок остаётся первой строкой): `pnpm tsx -e` или `(head -1 content/structures.csv; tail -n +2 content/structures.csv | sort -t, -k1,1) > /tmp/s.csv && mv /tmp/s.csv content/structures.csv`; повторить `--report`.
- [ ] **Step 4: Коммит** `content: skull, teeth and laryngeal cartilages (ru/la)`.

---

### Task 4: Контент — позвоночник, грудная клетка (skeletal, часть 2)

**Input:** позвонки (`atlas`, `axis`, `* cervical/thoracic/lumbar vertebra`), крестец, копчик, межпозвоночные диски, грудина (manubrium, body, xiphoid), рёбра, рёберные хрящи.

**Rules:** темы `spine`, `thorax`. Латынь: `Atlas`, `Axis`, `Vertebra cervicalis III`, `Vertebra thoracica XI`, `Vertebra lumbalis V`, `Os sacrum`, `Os coccygis`, `Discus intervertebralis C3/C4` (для дисков: диск "of fifth cervical vertebra" — под ним, обозначать `Discus intervertebralis C5/C6`; проверить по порядку), `Manubrium sterni`, `Corpus sterni`, `Processus xiphoideus`, `Costa I…XII`, `Cartilago costalis I…`. Русский: `Атлант`, `Осевой позвонок`, `III шейный позвонок`, `XI грудной позвонок`, `Крестец`, `Копчик`, `Межпозвоночный диск C5/C6`, `Рукоятка грудины`, `Тело грудины`, `Мечевидный отросток`, `I ребро`, `Рёберный хрящ I`.

Шаги как в Task 3. Коммит `content: spine and thorax (ru/la)`.

---

### Task 5: Контент — кости конечностей (skeletal, часть 3, всё остальное skeletal)

**Input:** всё, что осталось в `names-skeletal.tsv` после Task 3–4: ключица, лопатка, плечевая, лучевая, локтевая, кости запястья, пясти, фаланги кисти; тазовая кость, бедренная, надколенник, большеберцовая, малоберцовая, кости предплюсны, плюсны, фаланги стопы; а также попавшие в «skeletal» мышцы и тракт (`fibularis *`, `tibialis *`, `subscapularis`, `levator scapulae`, `iliotibial tract` и подобные) — им дать темы мышц/связок (`muscles-lower-limb`, `muscles-upper-limb`, `ligaments-limbs`), не `other`.

**Rules:** темы `upper-limb-bones`, `lower-limb-bones`. Латынь: `Clavicula`, `Scapula`, `Humerus`, `Radius`, `Ulna`, `Os scaphoideum`, `Os lunatum`, `Os triquetrum`, `Os pisiforme`, `Os trapezium`, `Os trapezoideum`, `Os capitatum`, `Os hamatum`, `Os metacarpale I…V`, `Phalanx proximalis/media/distalis digiti I…V manus` (большой палец = digitus I, указательный II, средний III, безымянный IV, мизинец V), `Os coxae`, `Femur`, `Patella`, `Tibia`, `Fibula`, `Talus`, `Calcaneus`, `Os naviculare`, `Os cuboideum`, `Os cuneiforme mediale/intermedium/laterale`, `Os metatarsale I…V`, `Phalanx … digiti I…V pedis`. Русский: `Ключица`, `Лопатка`, `Плечевая кость`, `Лучевая кость`, `Локтевая кость`, `Ладьевидная кость`, `Полулунная кость`, `Трёхгранная кость`, `Гороховидная кость`, `Кость-трапеция`, `Трапециевидная кость`, `Головчатая кость`, `Крючковидная кость`, `I пястная кость`, `Проксимальная фаланга большого пальца кисти`, `Средняя фаланга указательного пальца`, `Дистальная фаланга мизинца кисти`, `Тазовая кость`, `Бедренная кость`, `Надколенник`, `Большеберцовая кость`, `Малоберцовая кость`, `Таранная кость`, `Пяточная кость`, `Ладьевидная кость стопы`, `Кубовидная кость`, `Медиальная/промежуточная/латеральная клиновидная кость`, `I плюсневая кость`, `Проксимальная фаланга большого пальца стопы`, `Дистальная фаланга IV пальца стопы`.

Шаги как в Task 3; после этой задачи `--report` должен показать `skeletal: 296/296`. Коммит `content: limb bones (ru/la)`.

---

### Task 6: Контент — связки, мембраны, сухожилия (connective, 40 частей)

**Input:** `content/source/names-connective.tsv`.

**Rules:** темы `ligaments-head-neck` (thyrohyoid, cricothyroid, vocal ligament, conus elasticus, stylohyoid, pterygomandibular raphe, pharyngeal raphe, hyo-epiglottic, thyro-epiglottic, check ligaments и trochlea глазных мышц, tendon of levator palpebrae), `ligaments-trunk` (linea alba, tendinous arch of levator ani — дубликат с маленькой буквы тоже покрыть), `ligaments-limbs` (interosseous membranes, calcaneal tendon, long plantar ligament, intermediate tendon → если digastric, то `ligaments-head-neck`; tensor fasciae latae → `muscles-lower-limb`). Латынь: `Membrana interossea antebrachii/cruris`, `Tendo calcaneus`, `Ligamentum plantare longum`, `Linea alba`, `Membrana thyrohyoidea`, `Ligamentum thyrohyoideum medianum/laterale`, `Ligamentum vocale`, `Conus elasticus`, `Ligamentum stylohyoideum`, `Raphe pterygomandibularis`, `Raphe pharyngis`, `Arcus tendineus musculi levatoris ani`, `Trochlea musculi obliqui superioris`. Русский по Сапину.

Шаги как в Task 3; `--report`: `connective: 40/40`. Коммит `content: ligaments, membranes and tendons (ru/la)`.

---

### Task 7: Контент — мышцы головы, шеи, туловища, таза (muscular, часть 1)

**Input:** из `names-muscular.tsv`: мимические и жевательные, мышцы глаза (recti, obliqui, levator palpebrae), языка (genioglossus, hyoglossus…), нёба, гортани (crico-arytenoid, thyro-arytenoid, vocalis, aryepiglotticus, cricothyroid parts), шеи (sternocleidomastoid, platysma, scaleni, longus colli parts, longus capitis, recti capitis, obliqui capitis, supra-/infrahyoid, digastric), спины (trapezius parts, latissimus, rhomboids, levator scapulae, serrati posteriores, splenius, erector spinae parts, semispinalis, multifidus, rotatores, interspinales, intertransversarii), груди (pectoralis major parts, pectoralis minor, subclavius, serratus anterior, intercostales, transversus thoracis, diaphragm), живота (obliques, transversus, rectus, pyramidalis, quadratus lumborum, psoas), таза и промежности (levator ani parts, coccygeus, obturator internus, piriformis, sphincters), сердечные сосочковые мышцы → `other`.

**Rules:** темы `muscles-head`, `muscles-neck`, `muscles-back`, `muscles-thorax`, `muscles-abdomen`, `muscles-pelvis`, `other`. Латынь: `Musculus …` полностью, части через запятую: `Musculus trapezius, pars descendens`; `Musculus pectoralis major, pars clavicularis`; `Musculus longus colli, pars obliqua inferior`. Русский: `Трапециевидная мышца, нисходящая часть`; `Большая грудная мышца, ключичная часть`. Обязательно в кавычках в CSV, потому что есть запятая.

Шаги как в Task 3. Коммит `content: muscles of head, neck, trunk and pelvis (ru/la)`.

---

### Task 8: Контент — мышцы конечностей (muscular, часть 2) и включение сборки в build

**Input:** всё оставшееся в `names-muscular.tsv`: плечевой пояс и плечо (deltoid parts, supraspinatus, infraspinatus, teres, subscapularis, biceps heads, coracobrachialis, brachialis, triceps heads, anconeus), предплечье (pronator teres heads, flexors, palmaris, extensors, supinator, brachioradialis, abductor pollicis longus), кисть (thenar, hypothenar, lumbricals, interossei), таз/бедро (glutei, tensor fasciae latae, gemelli, quadratus femoris, obturator externus, iliacus, sartorius, quadriceps parts, adductors, gracilis, pectineus, hamstrings incl. biceps femoris heads), голень (tibialis, extensors, fibularis, gastrocnemius heads, soleus, plantaris, popliteus, flexors), стопа (abductor/adductor hallucis heads, flexor brevis heads, lumbricals, interossei, flexor accessorius/quadratus plantae, extensor brevis).

**Rules:** темы `muscles-upper-limb`, `muscles-lower-limb`. Латынь: `Musculus biceps brachii, caput longum`; `Musculus flexor carpi ulnaris, caput humerale`; `Musculus abductor digiti minimi manus/pedis`; `Musculus lumbricalis I manus`; `Musculus interosseus plantaris I`; `Musculus gastrocnemius, caput mediale`. Русский: `Двуглавая мышца плеча, длинная головка`; `Мышца, отводящая мизинец кисти`; `I червеобразная мышца стопы`; `I подошвенная межкостная мышца`; `Икроножная мышца, медиальная головка`.

- [ ] Steps 1–3 как в Task 3. После этого `pnpm build:content --report` показывает `skeletal: 296/296`, `connective: 40/40`, `muscular: 402/402`, `other errors: 0`, а `pnpm build:content` завершается `content ok: 738 structures, 23 topics` и создаёт `public/content/structures.json` и `topics.json`.
- [ ] Добавить в `package.json` `"prebuild": "pnpm build:content"` и `.gitignore` НЕ трогать: `public/content/*.json` коммитятся (Railway собирает из репозитория, но prebuild пересоберёт их в любом случае).
- [ ] `pnpm build` проходит.
- [ ] Коммит `content: limb muscles (ru/la); build content before next build`.

---

### Task 9: Загрузка контента и имена в атласе

**Files:**
- Create: `src/lib/content/load-content.ts` (+ test), `src/lib/content/names.ts` (+ test)
- Modify: `src/hooks/use-atlas-data.ts`, `src/components/atlas/AtlasScreen.tsx`, `src/components/atlas/PartCard.tsx`, `src/components/atlas/SearchBox.tsx`

**Interfaces:**
- Consumes: `ContentBundle`, `StructureEntry`, `Topic` (Task 1); `loadManifest` паттерн из `src/lib/atlas/load-atlas.ts` (`FetchLike`, `AtlasLoadError`, `fetchWithRetry` не экспортирован — реализовать простой fetch с одной попыткой и `AtlasLoadError` при `!ok`).
- Produces:
  ```ts
  // load-content.ts
  export async function loadContent(baseUrl: string, opts?: { fetchImpl?: FetchLike; signal?: AbortSignal }): Promise<ContentBundle>; // грузит /content/structures.json и /content/topics.json параллельно
  // names.ts
  export interface DisplayNames { la: string; ru: string; en: string; sideRu: "" | "левая" | "правая"; topicRu: string; translated: boolean }
  export function displayNames(en: string, entry: StructureEntry | undefined, topics: Topic[]): DisplayNames;
  //  entry undefined → { la: "", ru: "", en, sideRu: "", topicRu: "", translated: false }
  //  side left→"левая", right→"правая"; topicRu = ru темы (лист) + " · " + ru родителя, например "Кости нижней конечности · Остеология"
  export function searchLabels(en: string, entry: StructureEntry | undefined): string[]; // [en, la, ru, ...aliases] без пустых
  // use-atlas-data.ts
  export type AtlasData = { manifest: AtlasManifest; buffers: ArrayBuffer[]; content: ContentBundle };
  ```
  UI: `PartCard` получает `names: DisplayNames`; заголовок `la` (или `en`, если не переведено), строка `ru` + ` (левая)`/` (правая)` при наличии стороны, строка `en` мелко, строка темы `topicRu`; для непереведённых вместо `ru` — «Перевод в работе». `SearchBox` строит индекс из `searchLabels`, каждый результат показывает `ru` (или `en`) жирно и `la` серым, с суффиксом стороны.
  Тест-иды сохраняются: `part-card`, `part-la`, `part-ru`, `part-en`, `aria-label="Поиск структуры"`, `role="listbox"`.

- [ ] **Step 1: тесты names.test.ts и load-content.test.ts** (падающие)

```ts
// names.test.ts
import { describe, expect, it } from "vitest";
import { displayNames, searchLabels } from "./names";
import type { Topic } from "./types";
const topics: Topic[] = [{ id: "osteology", ru: "Остеология" }, { id: "lower-limb-bones", ru: "Кости нижней конечности", parent: "osteology" }];
const femur = { la: "Femur", ru: "Бедренная кость", topic: "lower-limb-bones", side: "left" as const, aliases: ["os femoris"] };
describe("displayNames", () => {
  it("renders translated entry with side and topic path", () => {
    expect(displayNames("Left femur", femur, topics)).toEqual({
      la: "Femur", ru: "Бедренная кость", en: "Left femur", sideRu: "левая",
      topicRu: "Кости нижней конечности · Остеология", translated: true,
    });
  });
  it("falls back for untranslated parts", () => {
    expect(displayNames("Aorta", undefined, topics)).toEqual({ la: "", ru: "", en: "Aorta", sideRu: "", topicRu: "", translated: false });
  });
});
describe("searchLabels", () => {
  it("collects all languages and aliases", () => {
    expect(searchLabels("Left femur", femur)).toEqual(["Left femur", "Femur", "Бедренная кость", "os femoris"]);
    expect(searchLabels("Aorta", undefined)).toEqual(["Aorta"]);
  });
});
```
```ts
// load-content.test.ts
import { describe, expect, it, vi } from "vitest";
import { loadContent } from "./load-content";
import { AtlasLoadError } from "@/lib/atlas/load-atlas";
describe("loadContent", () => {
  it("loads both files from baseUrl", async () => {
    const fetchImpl = vi.fn(async (url: string) =>
      new Response(JSON.stringify(url.endsWith("topics.json") ? [{ id: "t", ru: "Т" }] : { FJ1: { la: "A", ru: "Б", topic: "t", side: "", aliases: [] } }), { status: 200 }));
    const c = await loadContent("http://x", { fetchImpl });
    expect(c.structures.FJ1.la).toBe("A");
    expect(c.topics[0].id).toBe("t");
    expect(fetchImpl).toHaveBeenCalledWith("http://x/content/structures.json", expect.anything());
  });
  it("throws AtlasLoadError on http failure", async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 500 }));
    await expect(loadContent("http://x", { fetchImpl })).rejects.toBeInstanceOf(AtlasLoadError);
  });
});
```

- [ ] **Step 2: реализация names.ts, load-content.ts** по интерфейсам; `loadContent` использует `fetchImpl ?? fetch`, при `!res.ok` бросает `new AtlasLoadError(url, "Не удалось загрузить контент")`, при ошибке JSON — тоже `AtlasLoadError`.

- [ ] **Step 3: use-atlas-data.ts** — грузить `loadContent("")` параллельно с чанками (`Promise.all([loadAllChunks(...), loadContent("")])`), положить в `data.content`.

- [ ] **Step 4: AtlasScreen / PartCard / SearchBox** по описанию выше. `getPartNames(part)` → `displayNames(part.name, content.structures[part.id], content.topics)`. В `SearchBox` пропс `content: ContentBundle`, индекс строится из `searchLabels`.

- [ ] **Step 5: проверка** `pnpm typecheck && pnpm lint && pnpm test`; `pnpm dev --port 3100`, headless-скрипт: клик по центру → карточка с `part-la` не «—» и `part-ru` содержит кириллицу; поиск «бедренная» → результаты содержат «Бедренная кость», выбор → карточка `part-la` = «Femur»; поиск «aorta» по-прежнему работает (непереведённая).

- [ ] **Step 6: Коммит** `feat(atlas): latin and russian names in part card and search`.

---

### Task 10: Браузерные тесты и README

**Files:** Modify `e2e/atlas.spec.ts`, `README.md`.

- [ ] Добавить тест «search in russian shows latin name»: `fill("бедренная")` → первый результат → `part-la` имеет текст `Femur`, `part-ru` содержит «Бедренная кость».
- [ ] Обновить существующий тест «click selects»: дополнительно `expect(part-ru).not.toHaveText("")`.
- [ ] README: раздел «Контент»: как править `content/structures.csv` (колонки, правила без стороны, `;` в aliases), команды `pnpm build:content --report` и `pnpm build:content`.
- [ ] `pnpm e2e` → 6/6. Коммит `test: russian search e2e; docs: content editing guide`.

---

## Self-review

- Spec coverage: §5 модель данных — Tasks 1–2 (с уточнением про сторону), контент костей/связок/мышц — Tasks 3–8, §6.1 карточка `la`/`ru`/`en`/тема и поиск на трёх языках — Task 9, §7 сборка контента и падение при ошибках — Task 2/8, §9 валидация (id существует, la/ru заполнены, ≥4 структур в теме) — Task 2. Кнопка «Учить карточки темы» — План 2c.
- Placeholders: нет. Контентные задачи задают конвенции и примеры; сам список имён лежит в `content/source/*.tsv`.
- Type consistency: `StructureEntry.side: Side`, `DisplayNames`, `ContentBundle`, `loadContent` сигнатура, `AtlasData.content` согласованы между Tasks 1, 2, 9.
