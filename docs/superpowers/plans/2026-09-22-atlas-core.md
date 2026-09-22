# План 1: 3D-атлас (ядро) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Рабочее веб-приложение, которое загружает полную 3D-модель тела (BodyParts3D), показывает её слоями по системам, даёт кликнуть структуру, увидеть её название, скрыть/изолировать и найти по поиску.

**Architecture:** Next.js App Router с одной клиентской страницей `/atlas`. Чистые модули в `src/lib/atlas` (типы, разбор бинарных чанков, загрузка с gzip, поиск, геометрия границ) покрыты vitest. Состояние сцены в zustand-store. Рендер: react-three-fiber, по одному `THREE.BatchedMesh` на анатомическую систему (15 штук), видимость и подсветка через `setVisibleAt`/`setColorAt`, выбор структуры через `batchId` из raycast.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind 4, three 0.186, @react-three/fiber 9, @react-three/drei 10, zustand 5, vitest 5, @playwright/test 1.63, pnpm.

**Spec:** `docs/superpowers/specs/2026-09-22-anatomia-mvp-design.md` (разделы 3, 4, 6.1, 6.5, 7, 8, 9).

## Global Constraints

- Язык интерфейса — русский. Названия структур в этом плане — английские из `atlas.json` (латынь и русский добавит План 2), поэтому `PartCard` принимает объект `{ en, la?, ru? }`.
- Данные модели: BodyParts3D 4.0, CC BY 4.0. В репозиторий кладём только `atlas.json`, `body-*.bin.gz` и `ATTRIBUTION.md`. Атрибуция обязательна на странице `/about`.
- Никаких ручных правок в `public/models/*`.
- `src/lib/**` — без React и без DOM (кроме явно помеченных адаптеров). Каждый модуль с vitest-тестом.
- Идентификатор структуры — `part.id` (`FJ****`) из манифеста. Всё остальное ссылается на него.
- Коммиты: `feat:`, `test:`, `chore:`, `docs:`; в конце сообщения `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Пакетный менеджер только pnpm. Node ≥ 22.

## Карта файлов

```
package.json, next.config.ts, tsconfig.json, vitest.config.ts, playwright.config.ts
public/models/atlas.json, public/models/body-0..14.bin.gz, public/models/ATTRIBUTION.md
src/lib/atlas/types.ts          типы манифеста и геометрии
src/lib/atlas/systems.ts        таблица 15 систем: русское имя, цвет, видимость по умолчанию
src/lib/atlas/parse-chunk.ts    partGeometry(buffer, part)
src/lib/atlas/load-atlas.ts     loadManifest, loadChunk (gzip, повтор), loadAllChunks
src/lib/atlas/bounds.ts         центр/радиус/объединение границ, дистанция камеры
src/lib/atlas/search.ts         normalize, buildIndex, search
src/store/atlas-store.ts        zustand: видимость систем, скрытые, выбранная, изолированная, фокус
src/hooks/use-atlas-data.ts     загрузка манифеста и чанков с прогрессом и повтором
src/components/atlas/WebGLGate.tsx      проверка WebGL2
src/components/atlas/LoadingOverlay.tsx прогресс-бар и ошибка загрузки
src/components/atlas/BodyMeshes.tsx     BatchedMesh на систему, клик → select
src/components/atlas/CameraRig.tsx      OrbitControls + анимация фокуса
src/components/atlas/AtlasCanvas.tsx    Canvas, свет, сборка сцены
src/components/atlas/LayerPanel.tsx     чекбоксы систем
src/components/atlas/PartCard.tsx       карточка выбранной структуры
src/components/atlas/SearchBox.tsx      поиск
src/components/atlas/AtlasScreen.tsx    раскладка страницы
src/components/SiteHeader.tsx           навигация
src/app/layout.tsx, src/app/page.tsx, src/app/atlas/page.tsx, src/app/about/page.tsx
e2e/atlas.spec.ts
```

---

### Task 1: Каркас проекта и тестовая инфраструктура

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `src/app/*` (через create-next-app)
- Create: `vitest.config.ts`, `src/lib/smoke.test.ts`
- Modify: `.gitignore`

**Interfaces:**
- Produces: команды `pnpm dev`, `pnpm build`, `pnpm test` (vitest), `pnpm typecheck`.

- [ ] **Step 1: Создать приложение Next.js в текущей папке**

Run (папка содержит только `.git`, `.gitignore`, `docs/` — create-next-app это допускает):
```bash
cd /Users/AIpower/Desktop/coding/VIBE/anatomia
pnpm create next-app@latest . --yes --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm --no-turbopack
```
Expected: созданы `package.json`, `src/app/page.tsx`, `src/app/layout.tsx`, `src/app/globals.css`, `next.config.ts`, `tsconfig.json`. Если команда спросит про React Compiler — ответить No.

- [ ] **Step 2: Поставить зависимости проекта**

```bash
pnpm add three@^0.186.0 @react-three/fiber@^9.7.0 @react-three/drei@^10.7.8 zustand@^5.0.15
pnpm add -D @types/three@^0.186.0 vitest@^5.0.1 vite-tsconfig-paths@^5 @playwright/test@^1.63.0
```
Expected: без ошибок, в `package.json` появились пакеты. Если `@types/three@^0.186.0` не существует, взять ближайшую версию: `pnpm add -D @types/three@latest`.

- [ ] **Step 3: Настроить vitest**

Создать `vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "scripts/**/*.test.ts"],
    exclude: ["e2e/**", "node_modules/**"],
  },
});
```

Добавить в `package.json` в `scripts`:
```json
"test": "vitest run",
"test:watch": "vitest",
"typecheck": "tsc --noEmit",
"e2e": "playwright test"
```

- [ ] **Step 4: Написать дымовой тест**

`src/lib/smoke.test.ts`:
```ts
import { describe, expect, it } from "vitest";

describe("test infrastructure", () => {
  it("runs", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 5: Запустить тест и проверку типов**

Run: `pnpm test && pnpm typecheck`
Expected: `1 passed`, typecheck без ошибок.

- [ ] **Step 6: Проверить, что dev-сервер стартует**

Run: `pnpm build`
Expected: `✓ Compiled successfully`, страница `/` собрана.

- [ ] **Step 7: Дополнить .gitignore и закоммитить**

Убедиться, что в `.gitignore` есть `node_modules/`, `.next/`, `test-results/`, `playwright-report/`, `.env*`, `.vercel/` (create-next-app мог перезаписать файл — восстановить строки).

```bash
git add -A
git commit -m "chore: scaffold Next.js app with vitest and 3D deps

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: Данные модели, типы и таблица систем

**Files:**
- Create: `public/models/atlas.json`, `public/models/body-{0..14}.bin.gz`, `public/models/ATTRIBUTION.md`
- Create: `src/lib/atlas/types.ts`, `src/lib/atlas/systems.ts`
- Test: `src/lib/atlas/systems.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // types.ts
  export type SystemId = "skeletal" | "connective" | "muscular" | "arterial" | "venous" | "cardiac" | "nervous" | "sensory" | "digestive" | "respiratory" | "urinary" | "reproductive" | "endocrine" | "lymphatic" | "integumentary";
  export type Bounds = [[number, number, number], [number, number, number]];
  export interface AtlasPart { id: string; name: string; conceptId: string; system: SystemId; chunk: number; positions: number; normals: number; indices: number; vertexCount: number; indexCount: number; bounds: Bounds; }
  export interface AtlasChunk { url: string; bytes: number; gzip: string; gzipBytes: number; }
  export interface AtlasManifest { version: string; parts: AtlasPart[]; chunks: AtlasChunk[]; triangles: number; }
  export interface PartGeometry { positions: Float32Array; normals: Float32Array; indices: Uint32Array; }
  // systems.ts
  export interface SystemInfo { id: SystemId; ru: string; color: string; defaultVisible: boolean; order: number; }
  export const SYSTEMS: SystemInfo[]; export const SYSTEM_BY_ID: Record<SystemId, SystemInfo>;
  ```

- [ ] **Step 1: Скопировать данные модели**

Источник — клон human-atlas в scratchpad (`/private/tmp/claude-501/-Users-AIpower-Desktop-coding-VIBE-anatomia/7058aad3-df5f-4535-812c-d6353d8b0a81/scratchpad/human-atlas`). Если папки нет: `git clone --depth 1 https://github.com/ismailatilan-44/human-atlas.git` в scratchpad.

```bash
SRC=/private/tmp/claude-501/-Users-AIpower-Desktop-coding-VIBE-anatomia/7058aad3-df5f-4535-812c-d6353d8b0a81/scratchpad/human-atlas/public/models
mkdir -p public/models
cp "$SRC"/atlas.json public/models/
cp "$SRC"/body-*.bin.gz public/models/
cp "$SRC"/../ATTRIBUTION.md public/models/ATTRIBUTION.md
ls public/models | wc -l   # ожидается 17
du -sh public/models       # ~33 МБ
```

В `public/models/ATTRIBUTION.md` дописать в конец:
```
## Packaging

Binary chunk packaging and simplification taken from the open-source project
human-atlas (https://github.com/ismailatilan-44/human-atlas, MIT license, code not used here).
```

- [ ] **Step 2: Написать типы**

`src/lib/atlas/types.ts` — ровно как в блоке Interfaces выше.

- [ ] **Step 3: Написать падающий тест таблицы систем**

`src/lib/atlas/systems.test.ts`:
```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SYSTEMS, SYSTEM_BY_ID } from "./systems";
import type { AtlasManifest } from "./types";

const manifest = JSON.parse(
  readFileSync("public/models/atlas.json", "utf8"),
) as AtlasManifest;

describe("SYSTEMS", () => {
  it("covers every system present in the manifest", () => {
    const inManifest = new Set(manifest.parts.map((p) => p.system));
    for (const id of inManifest) expect(SYSTEM_BY_ID[id], `missing ${id}`).toBeDefined();
    expect(SYSTEMS.length).toBe(inManifest.size);
  });

  it("has unique ids, russian labels and hex colors", () => {
    const ids = new Set(SYSTEMS.map((s) => s.id));
    expect(ids.size).toBe(SYSTEMS.length);
    for (const s of SYSTEMS) {
      expect(s.ru.length).toBeGreaterThan(1);
      expect(s.color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it("shows bones, ligaments and muscles by default (1st year course)", () => {
    const visible = SYSTEMS.filter((s) => s.defaultVisible).map((s) => s.id).sort();
    expect(visible).toEqual(["connective", "muscular", "skeletal"]);
  });
});
```

- [ ] **Step 4: Запустить тест, убедиться, что падает**

Run: `pnpm vitest run src/lib/atlas/systems.test.ts`
Expected: FAIL — `Cannot find module './systems'`.

- [ ] **Step 5: Написать таблицу систем**

`src/lib/atlas/systems.ts`:
```ts
import type { SystemId } from "./types";

export interface SystemInfo {
  id: SystemId;
  ru: string;
  color: string;
  defaultVisible: boolean;
  order: number;
}

export const SYSTEMS: SystemInfo[] = [
  { id: "skeletal", ru: "Кости", color: "#e8e0cf", defaultVisible: true, order: 1 },
  { id: "connective", ru: "Связки и хрящи", color: "#cfd8dc", defaultVisible: true, order: 2 },
  { id: "muscular", ru: "Мышцы", color: "#b5453f", defaultVisible: true, order: 3 },
  { id: "arterial", ru: "Артерии", color: "#d33a2c", defaultVisible: false, order: 4 },
  { id: "venous", ru: "Вены", color: "#3352b5", defaultVisible: false, order: 5 },
  { id: "cardiac", ru: "Сердце", color: "#a8323c", defaultVisible: false, order: 6 },
  { id: "nervous", ru: "Нервная система", color: "#e4c33c", defaultVisible: false, order: 7 },
  { id: "sensory", ru: "Органы чувств", color: "#8fb7a8", defaultVisible: false, order: 8 },
  { id: "respiratory", ru: "Дыхательная система", color: "#e9a2b8", defaultVisible: false, order: 9 },
  { id: "digestive", ru: "Пищеварительная система", color: "#d9a066", defaultVisible: false, order: 10 },
  { id: "urinary", ru: "Мочевая система", color: "#c9b45c", defaultVisible: false, order: 11 },
  { id: "reproductive", ru: "Половая система", color: "#b98fc7", defaultVisible: false, order: 12 },
  { id: "endocrine", ru: "Эндокринные железы", color: "#e7b27a", defaultVisible: false, order: 13 },
  { id: "lymphatic", ru: "Лимфатическая система", color: "#8bc48a", defaultVisible: false, order: 14 },
  { id: "integumentary", ru: "Кожа", color: "#e6c3a5", defaultVisible: false, order: 15 },
];

export const SYSTEM_BY_ID = Object.fromEntries(
  SYSTEMS.map((s) => [s.id, s]),
) as Record<SystemId, SystemInfo>;
```

- [ ] **Step 6: Запустить тест, убедиться, что проходит**

Run: `pnpm vitest run src/lib/atlas/systems.test.ts`
Expected: 3 passed.

- [ ] **Step 7: Коммит**

```bash
git add public/models src/lib/atlas
git commit -m "feat(atlas): add BodyParts3D model data, manifest types and system table

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: Разбор бинарного чанка

**Files:**
- Create: `src/lib/atlas/parse-chunk.ts`
- Test: `src/lib/atlas/parse-chunk.test.ts`

**Interfaces:**
- Consumes: `AtlasPart`, `PartGeometry` из `types.ts`.
- Produces: `export function partGeometry(buffer: ArrayBuffer, part: AtlasPart): PartGeometry`. Позиции — view на буфер (без копии), нормали — новый Float32Array из int16 (деление на 32767, clamp к −1), индексы — view.

Формат чанка (из манифеста human-atlas): `part.positions` — байтовое смещение float32×(vertexCount×3); `part.normals` — байтовое смещение int16×(vertexCount×3), нормализованных; `part.indices` — байтовое смещение uint32×indexCount. Смещения выровнены (positions и indices кратны 4, normals кратно 2).

- [ ] **Step 1: Написать падающий тест на синтетическом буфере**

`src/lib/atlas/parse-chunk.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { partGeometry } from "./parse-chunk";
import type { AtlasPart } from "./types";

function makeBuffer() {
  // 3 vertices, 1 triangle
  const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]); // 36 bytes @0
  const normals = new Int16Array([0, 0, 32767, 0, 0, 32767, 0, 0, -32768]); // 18 bytes @36
  const indices = new Uint32Array([0, 1, 2]); // 12 bytes @56 (36+18=54 → pad to 56)
  const buffer = new ArrayBuffer(68);
  new Float32Array(buffer, 0, 9).set(positions);
  new Int16Array(buffer, 36, 9).set(normals);
  new Uint32Array(buffer, 56, 3).set(indices);
  return buffer;
}

const part: AtlasPart = {
  id: "FJ1", name: "Test", conceptId: "FMA1", system: "skeletal", chunk: 0,
  positions: 0, normals: 36, indices: 56, vertexCount: 3, indexCount: 3,
  bounds: [[0, 0, 0], [1, 1, 0]],
};

describe("partGeometry", () => {
  it("reads positions, dequantizes normals and reads indices", () => {
    const g = partGeometry(makeBuffer(), part);
    expect(Array.from(g.positions)).toEqual([0, 0, 0, 1, 0, 0, 0, 1, 0]);
    expect(g.normals[2]).toBeCloseTo(1, 5);
    expect(g.normals[8]).toBeCloseTo(-1, 5);
    expect(Array.from(g.indices)).toEqual([0, 1, 2]);
  });

  it("throws a clear error on misaligned offsets", () => {
    expect(() => partGeometry(makeBuffer(), { ...part, positions: 2 })).toThrow(/aligned/);
  });
});
```

- [ ] **Step 2: Запустить, убедиться, что падает**

Run: `pnpm vitest run src/lib/atlas/parse-chunk.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Реализовать**

`src/lib/atlas/parse-chunk.ts`:
```ts
import type { AtlasPart, PartGeometry } from "./types";

function assertAligned(offset: number, bytes: number, what: string, partId: string) {
  if (offset % bytes !== 0) {
    throw new Error(`Chunk offset for ${what} of ${partId} is not ${bytes}-byte aligned (${offset})`);
  }
}

export function partGeometry(buffer: ArrayBuffer, part: AtlasPart): PartGeometry {
  const n = part.vertexCount * 3;
  assertAligned(part.positions, 4, "positions", part.id);
  assertAligned(part.normals, 2, "normals", part.id);
  assertAligned(part.indices, 4, "indices", part.id);

  const positions = new Float32Array(buffer, part.positions, n);
  const quantized = new Int16Array(buffer, part.normals, n);
  const normals = new Float32Array(n);
  for (let i = 0; i < n; i++) normals[i] = Math.max(-1, quantized[i] / 32767);
  const indices = new Uint32Array(buffer, part.indices, part.indexCount);
  return { positions, normals, indices };
}
```

- [ ] **Step 4: Запустить, убедиться, что проходит**

Run: `pnpm vitest run src/lib/atlas/parse-chunk.test.ts`
Expected: 2 passed.

- [ ] **Step 5: Коммит**

```bash
git add src/lib/atlas/parse-chunk.ts src/lib/atlas/parse-chunk.test.ts
git commit -m "feat(atlas): parse binary geometry chunks

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: Загрузка манифеста и чанков (gzip, повторы, прогресс)

**Files:**
- Create: `src/lib/atlas/load-atlas.ts`
- Test: `src/lib/atlas/load-atlas.test.ts`

**Interfaces:**
- Consumes: `AtlasManifest`, `AtlasChunk` из `types.ts`.
- Produces:
  ```ts
  export interface LoadOptions { fetchImpl?: typeof fetch; retries?: number; signal?: AbortSignal; retryDelayMs?: number; }
  export async function loadManifest(baseUrl: string, opts?: LoadOptions): Promise<AtlasManifest>;
  export async function loadChunk(url: string, opts?: LoadOptions): Promise<ArrayBuffer>;   // если url оканчивается на .gz — распаковать DecompressionStream("gzip")
  export async function loadAllChunks(manifest: AtlasManifest, baseUrl: string, onProgress: (loaded: number, total: number) => void, opts?: LoadOptions): Promise<ArrayBuffer[]>;  // буфер под индексом = номер чанка; грузит chunk.gzip
  export class AtlasLoadError extends Error { url: string; }
  ```
  Пути в манифесте вида `/models/body-0.bin.gz`; `baseUrl` (например `""` в браузере или `http://localhost:3000` в тестах) приклеивается спереди.

- [ ] **Step 1: Написать падающие тесты**

`src/lib/atlas/load-atlas.test.ts`:
```ts
import { gzipSync } from "node:zlib";
import { describe, expect, it, vi } from "vitest";
import { AtlasLoadError, loadAllChunks, loadChunk, loadManifest } from "./load-atlas";
import type { AtlasManifest } from "./types";

function okResponse(body: BodyInit, type = "application/octet-stream") {
  return new Response(body, { status: 200, headers: { "content-type": type } });
}

const manifest: AtlasManifest = {
  version: "test",
  parts: [],
  triangles: 0,
  chunks: [
    { url: "/models/a.bin", bytes: 4, gzip: "/models/a.bin.gz", gzipBytes: 20 },
    { url: "/models/b.bin", bytes: 4, gzip: "/models/b.bin.gz", gzipBytes: 20 },
  ],
};

describe("loadManifest", () => {
  it("fetches and parses atlas.json from baseUrl", async () => {
    const fetchImpl = vi.fn(async () => okResponse(JSON.stringify(manifest), "application/json"));
    const m = await loadManifest("http://x", { fetchImpl });
    expect(fetchImpl).toHaveBeenCalledWith("http://x/models/atlas.json", expect.anything());
    expect(m.chunks.length).toBe(2);
  });
});

describe("loadChunk", () => {
  it("decompresses .gz payloads", async () => {
    const raw = new Uint8Array([1, 2, 3, 4]);
    const fetchImpl = vi.fn(async () => okResponse(gzipSync(raw)));
    const buf = await loadChunk("http://x/models/a.bin.gz", { fetchImpl });
    expect(Array.from(new Uint8Array(buf))).toEqual([1, 2, 3, 4]);
  });

  it("returns raw bytes for non-gz urls", async () => {
    const fetchImpl = vi.fn(async () => okResponse(new Uint8Array([9, 8])));
    const buf = await loadChunk("http://x/models/a.bin", { fetchImpl });
    expect(Array.from(new Uint8Array(buf))).toEqual([9, 8]);
  });

  it("retries after a failure and succeeds", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 500 }))
      .mockResolvedValueOnce(okResponse(new Uint8Array([7])));
    const buf = await loadChunk("http://x/models/a.bin", { fetchImpl, retryDelayMs: 0 });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(new Uint8Array(buf)[0]).toBe(7);
  });

  it("throws AtlasLoadError after exhausting retries", async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 503 }));
    await expect(
      loadChunk("http://x/models/a.bin", { fetchImpl, retries: 2, retryDelayMs: 0 }),
    ).rejects.toBeInstanceOf(AtlasLoadError);
    expect(fetchImpl).toHaveBeenCalledTimes(3); // 1 + 2 retries
  });
});

describe("loadAllChunks", () => {
  it("loads gzip urls in manifest order and reports progress", async () => {
    const fetchImpl = vi.fn(async (url: string) =>
      okResponse(gzipSync(new Uint8Array([url.includes("/a.") ? 1 : 2]))),
    );
    const progress: Array<[number, number]> = [];
    const buffers = await loadAllChunks(manifest, "http://x", (l, t) => progress.push([l, t]), { fetchImpl });
    expect(new Uint8Array(buffers[0])[0]).toBe(1);
    expect(new Uint8Array(buffers[1])[0]).toBe(2);
    expect(progress.at(-1)).toEqual([2, 2]);
  });
});
```

- [ ] **Step 2: Запустить, убедиться, что падает**

Run: `pnpm vitest run src/lib/atlas/load-atlas.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Реализовать**

`src/lib/atlas/load-atlas.ts`:
```ts
import type { AtlasManifest } from "./types";

export interface LoadOptions {
  fetchImpl?: typeof fetch;
  retries?: number;
  signal?: AbortSignal;
  retryDelayMs?: number;
}

export class AtlasLoadError extends Error {
  url: string;
  constructor(url: string, message: string) {
    super(message);
    this.name = "AtlasLoadError";
    this.url = url;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchWithRetry(url: string, opts: LoadOptions): Promise<Response> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const retries = opts.retries ?? 3;
  const delay = opts.retryDelayMs ?? 500;
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetchImpl(url, { signal: opts.signal });
      if (res.ok) return res;
      lastError = new Error(`HTTP ${res.status}`);
    } catch (e) {
      if (opts.signal?.aborted) throw e;
      lastError = e;
    }
    if (attempt < retries) await sleep(delay * (attempt + 1));
  }
  throw new AtlasLoadError(url, `Не удалось загрузить ${url}: ${String(lastError)}`);
}

export async function loadManifest(baseUrl: string, opts: LoadOptions = {}): Promise<AtlasManifest> {
  const res = await fetchWithRetry(`${baseUrl}/models/atlas.json`, opts);
  return (await res.json()) as AtlasManifest;
}

export async function loadChunk(url: string, opts: LoadOptions = {}): Promise<ArrayBuffer> {
  const res = await fetchWithRetry(url, opts);
  if (url.endsWith(".gz") && res.body) {
    const stream = res.body.pipeThrough(new DecompressionStream("gzip"));
    return new Response(stream).arrayBuffer();
  }
  return res.arrayBuffer();
}

export async function loadAllChunks(
  manifest: AtlasManifest,
  baseUrl: string,
  onProgress: (loaded: number, total: number) => void,
  opts: LoadOptions = {},
): Promise<ArrayBuffer[]> {
  const total = manifest.chunks.length;
  let loaded = 0;
  onProgress(0, total);
  return Promise.all(
    manifest.chunks.map(async (chunk) => {
      const buffer = await loadChunk(`${baseUrl}${chunk.gzip}`, opts);
      loaded += 1;
      onProgress(loaded, total);
      return buffer;
    }),
  );
}
```

- [ ] **Step 4: Запустить, убедиться, что проходит**

Run: `pnpm vitest run src/lib/atlas/load-atlas.test.ts`
Expected: 6 passed. (Node 22 имеет глобальные `Response`, `DecompressionStream`.)

- [ ] **Step 5: Коммит**

```bash
git add src/lib/atlas/load-atlas.ts src/lib/atlas/load-atlas.test.ts
git commit -m "feat(atlas): load manifest and gzip chunks with retries and progress

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: Геометрия границ и поиск

**Files:**
- Create: `src/lib/atlas/bounds.ts`, `src/lib/atlas/search.ts`
- Test: `src/lib/atlas/bounds.test.ts`, `src/lib/atlas/search.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // bounds.ts
  export function boundsCenter(b: Bounds): [number, number, number];
  export function boundsRadius(b: Bounds): number;          // половина диагонали
  export function unionBounds(list: Bounds[]): Bounds;      // бросает Error на пустом списке
  export function cameraDistance(radius: number, fovDeg: number, padding = 1.25): number; // radius / sin(fov/2) * padding
  // search.ts
  export function normalize(s: string): string;             // lower, ё→е, схлопнуть пробелы, trim
  export interface SearchIndex { entries: { id: string; labels: string[] }[] }
  export function buildIndex(items: { id: string; labels: string[] }[]): SearchIndex;
  export function search(index: SearchIndex, query: string, limit?: number): string[]; // ids, лучшие первыми
  ```

- [ ] **Step 1: Написать падающие тесты**

`src/lib/atlas/bounds.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { boundsCenter, boundsRadius, cameraDistance, unionBounds } from "./bounds";

describe("bounds", () => {
  it("center and radius", () => {
    expect(boundsCenter([[0, 0, 0], [2, 4, 6]])).toEqual([1, 2, 3]);
    expect(boundsRadius([[0, 0, 0], [3, 4, 0]])).toBeCloseTo(2.5);
  });
  it("union", () => {
    expect(unionBounds([[[0, 0, 0], [1, 1, 1]], [[-1, 2, 0], [0, 3, 5]]])).toEqual([[-1, 0, 0], [1, 3, 5]]);
    expect(() => unionBounds([])).toThrow();
  });
  it("camera distance grows with radius and shrinks with fov", () => {
    expect(cameraDistance(1, 90, 1)).toBeCloseTo(Math.SQRT2, 5);
    expect(cameraDistance(1, 45)).toBeGreaterThan(cameraDistance(1, 90));
  });
});
```

`src/lib/atlas/search.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { buildIndex, normalize, search } from "./search";

const index = buildIndex([
  { id: "FJ1", labels: ["Left femur", "Femur sinistrum", "Левая бедренная кость"] },
  { id: "FJ2", labels: ["Right femur", "Femur dextrum", "Правая бедренная кость"] },
  { id: "FJ3", labels: ["Left tibia", "Tibia sinistra", "Левая большеберцовая кость"] },
  { id: "FJ4", labels: ["Sternum", "Грудина"] },
]);

describe("normalize", () => {
  it("lowercases, maps ё to е and collapses spaces", () => {
    expect(normalize("  Чёрный   Кот ")).toBe("черный кот");
  });
});

describe("search", () => {
  it("returns empty for blank query", () => {
    expect(search(index, "  ")).toEqual([]);
  });
  it("matches any language, prefix matches rank first", () => {
    expect(search(index, "femur")).toEqual(["FJ1", "FJ2"]);
    expect(search(index, "бедрен")[0]).toBe("FJ1");
    expect(search(index, "Tibia")).toEqual(["FJ3"]);
  });
  it("prefers label-start over mid-word matches", () => {
    const r = search(index, "st");
    expect(r[0]).toBe("FJ4"); // "Sternum" starts with st; "sinistrum" contains st
  });
  it("respects limit", () => {
    expect(search(index, "кость", 2).length).toBe(2);
  });
});
```

- [ ] **Step 2: Запустить, убедиться, что падают**

Run: `pnpm vitest run src/lib/atlas/bounds.test.ts src/lib/atlas/search.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Реализовать bounds.ts**

```ts
import type { Bounds } from "./types";

export function boundsCenter(b: Bounds): [number, number, number] {
  return [(b[0][0] + b[1][0]) / 2, (b[0][1] + b[1][1]) / 2, (b[0][2] + b[1][2]) / 2];
}

export function boundsRadius(b: Bounds): number {
  const dx = b[1][0] - b[0][0], dy = b[1][1] - b[0][1], dz = b[1][2] - b[0][2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz) / 2;
}

export function unionBounds(list: Bounds[]): Bounds {
  if (list.length === 0) throw new Error("unionBounds: empty list");
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (const b of list) {
    for (let i = 0; i < 3; i++) {
      if (b[0][i] < min[i]) min[i] = b[0][i];
      if (b[1][i] > max[i]) max[i] = b[1][i];
    }
  }
  return [min, max];
}

export function cameraDistance(radius: number, fovDeg: number, padding = 1.25): number {
  return (radius / Math.sin((fovDeg * Math.PI) / 360)) * padding;
}
```

- [ ] **Step 4: Реализовать search.ts**

```ts
export function normalize(s: string): string {
  return s.toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ").trim();
}

export interface SearchIndex {
  entries: { id: string; labels: string[] }[];
}

export function buildIndex(items: { id: string; labels: string[] }[]): SearchIndex {
  return { entries: items.map((i) => ({ id: i.id, labels: i.labels.map(normalize) })) };
}

function score(labels: string[], q: string): number {
  let best = 0;
  for (const label of labels) {
    if (label === q) return 100;
    if (label.startsWith(q)) best = Math.max(best, 80);
    else {
      const at = label.indexOf(q);
      if (at < 0) continue;
      const wordStart = at === 0 || label[at - 1] === " ";
      best = Math.max(best, wordStart ? 60 : 30);
    }
  }
  return best;
}

export function search(index: SearchIndex, query: string, limit = 20): string[] {
  const q = normalize(query);
  if (!q) return [];
  const scored: { id: string; s: number; i: number }[] = [];
  index.entries.forEach((e, i) => {
    const s = score(e.labels, q);
    if (s > 0) scored.push({ id: e.id, s, i });
  });
  scored.sort((a, b) => b.s - a.s || a.i - b.i);
  return scored.slice(0, limit).map((x) => x.id);
}
```

- [ ] **Step 5: Запустить, убедиться, что проходят**

Run: `pnpm vitest run src/lib/atlas/bounds.test.ts src/lib/atlas/search.test.ts`
Expected: 7 passed.

- [ ] **Step 6: Коммит**

```bash
git add src/lib/atlas/bounds.ts src/lib/atlas/bounds.test.ts src/lib/atlas/search.ts src/lib/atlas/search.test.ts
git commit -m "feat(atlas): bounds math and multilingual search index

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: Состояние сцены (zustand)

**Files:**
- Create: `src/store/atlas-store.ts`
- Test: `src/store/atlas-store.test.ts`

**Interfaces:**
- Consumes: `SYSTEMS` из `systems.ts`, `SystemId`.
- Produces:
  ```ts
  export interface AtlasState {
    visibleSystems: Record<SystemId, boolean>;
    hiddenParts: Record<string, true>;
    selectedPartId: string | null;
    isolatedPartId: string | null;
    focusPartId: string | null;
    focusNonce: number;                 // растёт при каждом focus(), чтобы повторный фокус на ту же структуру срабатывал
    resetNonce: number;                 // растёт при каждом reset(); CameraRig по нему возвращает камеру к полному телу
    setSystemVisible(id: SystemId, visible: boolean): void;
    toggleSystem(id: SystemId): void;
    select(id: string | null): void;
    hidePart(id: string): void;
    isolate(id: string | null): void;
    focus(id: string): void;            // также делает select(id)
    reset(): void;                      // всё к значениям по умолчанию, resetNonce += 1
  }
  export const useAtlasStore: UseBoundStore<StoreApi<AtlasState>>;
  export function defaultVisibleSystems(): Record<SystemId, boolean>;
  export function isPartVisible(state: Pick<AtlasState,"visibleSystems"|"hiddenParts"|"isolatedPartId">, partId: string, system: SystemId): boolean;
  ```

- [ ] **Step 1: Написать падающий тест**

`src/store/atlas-store.test.ts`:
```ts
import { beforeEach, describe, expect, it } from "vitest";
import { isPartVisible, useAtlasStore } from "./atlas-store";

beforeEach(() => useAtlasStore.getState().reset());

describe("atlas store", () => {
  it("starts with 1st-year systems visible", () => {
    const v = useAtlasStore.getState().visibleSystems;
    expect(v.skeletal).toBe(true);
    expect(v.muscular).toBe(true);
    expect(v.arterial).toBe(false);
  });

  it("toggles and sets system visibility", () => {
    const s = useAtlasStore.getState();
    s.toggleSystem("arterial");
    expect(useAtlasStore.getState().visibleSystems.arterial).toBe(true);
    s.setSystemVisible("arterial", false);
    expect(useAtlasStore.getState().visibleSystems.arterial).toBe(false);
  });

  it("select, hide, isolate, focus", () => {
    const s = useAtlasStore.getState();
    s.select("FJ1");
    expect(useAtlasStore.getState().selectedPartId).toBe("FJ1");
    s.hidePart("FJ1");
    expect(useAtlasStore.getState().hiddenParts.FJ1).toBe(true);
    expect(useAtlasStore.getState().selectedPartId).toBeNull(); // hiding deselects
    s.isolate("FJ2");
    expect(useAtlasStore.getState().isolatedPartId).toBe("FJ2");
    const before = useAtlasStore.getState().focusNonce;
    s.focus("FJ3");
    const after = useAtlasStore.getState();
    expect(after.focusPartId).toBe("FJ3");
    expect(after.selectedPartId).toBe("FJ3");
    expect(after.focusNonce).toBe(before + 1);
  });

  it("reset restores defaults", () => {
    const s = useAtlasStore.getState();
    s.toggleSystem("venous");
    s.hidePart("FJ9");
    s.isolate("FJ9");
    const nonce = useAtlasStore.getState().resetNonce;
    s.reset();
    const st = useAtlasStore.getState();
    expect(st.resetNonce).toBe(nonce + 1);
    expect(st.visibleSystems.venous).toBe(false);
    expect(st.hiddenParts).toEqual({});
    expect(st.isolatedPartId).toBeNull();
    expect(st.selectedPartId).toBeNull();
  });

  it("isPartVisible combines system, hidden and isolation", () => {
    const base = { visibleSystems: useAtlasStore.getState().visibleSystems, hiddenParts: {}, isolatedPartId: null };
    expect(isPartVisible(base, "FJ1", "skeletal")).toBe(true);
    expect(isPartVisible(base, "FJ1", "arterial")).toBe(false);
    expect(isPartVisible({ ...base, hiddenParts: { FJ1: true } }, "FJ1", "skeletal")).toBe(false);
    expect(isPartVisible({ ...base, isolatedPartId: "FJ2" }, "FJ1", "skeletal")).toBe(false);
    expect(isPartVisible({ ...base, isolatedPartId: "FJ2" }, "FJ2", "arterial")).toBe(true); // isolated part shows even if its system is off
  });
});
```

- [ ] **Step 2: Запустить, убедиться, что падает**

Run: `pnpm vitest run src/store/atlas-store.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Реализовать**

`src/store/atlas-store.ts`:
```ts
import { create } from "zustand";
import { SYSTEMS } from "@/lib/atlas/systems";
import type { SystemId } from "@/lib/atlas/types";

export interface AtlasState {
  visibleSystems: Record<SystemId, boolean>;
  hiddenParts: Record<string, true>;
  selectedPartId: string | null;
  isolatedPartId: string | null;
  focusPartId: string | null;
  focusNonce: number;
  resetNonce: number;
  setSystemVisible(id: SystemId, visible: boolean): void;
  toggleSystem(id: SystemId): void;
  select(id: string | null): void;
  hidePart(id: string): void;
  isolate(id: string | null): void;
  focus(id: string): void;
  reset(): void;
}

export function defaultVisibleSystems(): Record<SystemId, boolean> {
  return Object.fromEntries(SYSTEMS.map((s) => [s.id, s.defaultVisible])) as Record<SystemId, boolean>;
}

export function isPartVisible(
  state: Pick<AtlasState, "visibleSystems" | "hiddenParts" | "isolatedPartId">,
  partId: string,
  system: SystemId,
): boolean {
  if (state.isolatedPartId) return state.isolatedPartId === partId;
  if (state.hiddenParts[partId]) return false;
  return state.visibleSystems[system];
}

const initial = () => ({
  visibleSystems: defaultVisibleSystems(),
  hiddenParts: {} as Record<string, true>,
  selectedPartId: null,
  isolatedPartId: null,
  focusPartId: null,
  focusNonce: 0,
});


export const useAtlasStore = create<AtlasState>((set) => ({
  ...initial(),
  resetNonce: 0,
  setSystemVisible: (id, visible) =>
    set((s) => ({ visibleSystems: { ...s.visibleSystems, [id]: visible } })),
  toggleSystem: (id) =>
    set((s) => ({ visibleSystems: { ...s.visibleSystems, [id]: !s.visibleSystems[id] } })),
  select: (id) => set({ selectedPartId: id }),
  hidePart: (id) =>
    set((s) => ({
      hiddenParts: { ...s.hiddenParts, [id]: true },
      selectedPartId: s.selectedPartId === id ? null : s.selectedPartId,
    })),
  isolate: (id) => set({ isolatedPartId: id }),
  focus: (id) => set((s) => ({ focusPartId: id, selectedPartId: id, focusNonce: s.focusNonce + 1 })),
  reset: () => set((s) => ({ ...initial(), resetNonce: s.resetNonce + 1 })),
}));
```

- [ ] **Step 4: Запустить, убедиться, что проходит**

Run: `pnpm vitest run src/store/atlas-store.test.ts`
Expected: 5 passed.

- [ ] **Step 5: Коммит**

```bash
git add src/store
git commit -m "feat(atlas): scene state store

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7: Сцена — загрузка данных и полная модель на экране

**Files:**
- Create: `src/hooks/use-atlas-data.ts`, `src/components/atlas/WebGLGate.tsx`, `src/components/atlas/LoadingOverlay.tsx`, `src/components/atlas/BodyMeshes.tsx`, `src/components/atlas/CameraRig.tsx`, `src/components/atlas/AtlasCanvas.tsx`, `src/components/atlas/AtlasScreen.tsx`, `src/app/atlas/page.tsx`
- Modify: `src/app/globals.css` (высота 100%), `src/app/layout.tsx` (lang="ru", шрифт по умолчанию)

**Interfaces:**
- Consumes: `loadManifest`, `loadAllChunks`, `AtlasLoadError` (Task 4); `partGeometry` (Task 3); `SYSTEMS`, `SYSTEM_BY_ID` (Task 2); `useAtlasStore`, `isPartVisible` (Task 6); `unionBounds`, `boundsCenter`, `boundsRadius`, `cameraDistance` (Task 5).
- Produces:
  ```ts
  // use-atlas-data.ts
  export type AtlasData = { manifest: AtlasManifest; buffers: ArrayBuffer[] };
  export type AtlasDataState =
    | { status: "loading"; loaded: number; total: number }
    | { status: "error"; message: string; retry: () => void }
    | { status: "ready"; data: AtlasData };
  export function useAtlasData(): AtlasDataState;
  // BodyMeshes.tsx
  export function BodyMeshes(props: { data: AtlasData; onReady?: () => void }): JSX.Element;
  // AtlasCanvas.tsx
  export function AtlasCanvas(props: { data: AtlasData; onReady?: () => void }): JSX.Element;
  ```
  Контейнер `AtlasScreen` ставит атрибут `data-atlas-ready="true"` на корневой `<div>` после `onReady` — на него опираются e2e-тесты.

- [ ] **Step 1: Хук загрузки данных**

`src/hooks/use-atlas-data.ts`:
```ts
"use client";
import { useCallback, useEffect, useState } from "react";
import { AtlasLoadError, loadAllChunks, loadManifest } from "@/lib/atlas/load-atlas";
import type { AtlasManifest } from "@/lib/atlas/types";

export type AtlasData = { manifest: AtlasManifest; buffers: ArrayBuffer[] };
export type AtlasDataState =
  | { status: "loading"; loaded: number; total: number }
  | { status: "error"; message: string; retry: () => void }
  | { status: "ready"; data: AtlasData };

export function useAtlasData(): AtlasDataState {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<AtlasDataState>({ status: "loading", loaded: 0, total: 0 });
  const retry = useCallback(() => setAttempt((a) => a + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading", loaded: 0, total: 0 });
    (async () => {
      try {
        const manifest = await loadManifest("", { signal: controller.signal });
        const buffers = await loadAllChunks(
          manifest,
          "",
          (loaded, total) => setState({ status: "loading", loaded, total }),
          { signal: controller.signal },
        );
        setState({ status: "ready", data: { manifest, buffers } });
      } catch (e) {
        if (controller.signal.aborted) return;
        const message =
          e instanceof AtlasLoadError
            ? "Не удалось загрузить модель. Проверьте соединение и попробуйте снова."
            : `Ошибка загрузки: ${String(e)}`;
        setState({ status: "error", message, retry });
      }
    })();
    return () => controller.abort();
  }, [attempt, retry]);

  return state;
}
```

- [ ] **Step 2: WebGLGate и LoadingOverlay**

`src/components/atlas/WebGLGate.tsx`:
```tsx
"use client";
import { useEffect, useState, type ReactNode } from "react";

function hasWebGL2(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!canvas.getContext("webgl2");
  } catch {
    return false;
  }
}

export function WebGLGate({ children }: { children: ReactNode }) {
  const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => setOk(hasWebGL2()), []);
  if (ok === null) return null;
  if (!ok) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-2">
          <h2 className="text-lg font-semibold">Браузер не поддерживает WebGL 2</h2>
          <p className="text-sm text-neutral-600">
            3D-атлас требует WebGL 2. Откройте сайт в свежем Chrome, Firefox, Safari или Edge.
            Карточки и прогресс работают без 3D.
          </p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
```

`src/components/atlas/LoadingOverlay.tsx`:
```tsx
export function LoadingOverlay({
  loaded,
  total,
  error,
  onRetry,
}: {
  loaded: number;
  total: number;
  error?: string;
  onRetry?: () => void;
}) {
  const pct = total > 0 ? Math.round((loaded / total) * 100) : 0;
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 backdrop-blur-sm">
      <div className="w-72 space-y-3 text-center">
        {error ? (
          <>
            <p className="text-sm text-red-700">{error}</p>
            <button onClick={onRetry} className="rounded bg-neutral-900 px-4 py-2 text-sm text-white">
              Повторить
            </button>
          </>
        ) : (
          <>
            <p className="text-sm text-neutral-700">Загружаем модель… {pct}%</p>
            <div className="h-2 w-full overflow-hidden rounded bg-neutral-200">
              <div className="h-full bg-neutral-900 transition-[width]" style={{ width: `${pct}%` }} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: BodyMeshes — BatchedMesh на систему**

`src/components/atlas/BodyMeshes.tsx`:
```tsx
"use client";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { ThreeEvent } from "@react-three/fiber";
import { partGeometry } from "@/lib/atlas/parse-chunk";
import { SYSTEMS, SYSTEM_BY_ID } from "@/lib/atlas/systems";
import type { AtlasPart, SystemId } from "@/lib/atlas/types";
import { isPartVisible, useAtlasStore } from "@/store/atlas-store";
import type { AtlasData } from "@/hooks/use-atlas-data";

const HIGHLIGHT = new THREE.Color("#ffb020");

interface SystemBatch {
  system: SystemId;
  mesh: THREE.BatchedMesh;
  parts: AtlasPart[];        // index = instanceId
  baseColor: THREE.Color;
}

function buildBatch(system: SystemId, parts: AtlasPart[], buffers: ArrayBuffer[]): SystemBatch {
  const vertexCount = parts.reduce((n, p) => n + p.vertexCount, 0);
  const indexCount = parts.reduce((n, p) => n + p.indexCount, 0);
  const baseColor = new THREE.Color(SYSTEM_BY_ID[system].color);
  const material = new THREE.MeshStandardMaterial({ roughness: 0.75, metalness: 0.0 });
  const mesh = new THREE.BatchedMesh(parts.length, vertexCount, indexCount, material);
  mesh.name = system;
  mesh.perObjectFrustumCulled = true;
  parts.forEach((part, index) => {
    const g = partGeometry(buffers[part.chunk], part);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(g.positions, 3));
    geometry.setAttribute("normal", new THREE.BufferAttribute(g.normals, 3));
    geometry.setIndex(new THREE.BufferAttribute(g.indices, 1));
    const geometryId = mesh.addGeometry(geometry);
    const instanceId = mesh.addInstance(geometryId);
    if (instanceId !== index) throw new Error("BatchedMesh instance order mismatch");
    mesh.setColorAt(instanceId, baseColor);
    geometry.dispose();
  });
  mesh.computeBoundingSphere();
  return { system, mesh, parts, baseColor };
}

export function BodyMeshes({ data, onReady }: { data: AtlasData; onReady?: () => void }) {
  const batches = useMemo(() => {
    const bySystem = new Map<SystemId, AtlasPart[]>();
    for (const p of data.manifest.parts) {
      const list = bySystem.get(p.system) ?? [];
      list.push(p);
      bySystem.set(p.system, list);
    }
    return SYSTEMS.filter((s) => bySystem.has(s.id)).map((s) => buildBatch(s.id, bySystem.get(s.id)!, data.buffers));
  }, [data]);

  useEffect(() => {
    onReady?.();
    return () => {
      for (const b of batches) {
        b.mesh.dispose();
        (b.mesh.material as THREE.Material).dispose();
      }
    };
  }, [batches, onReady]);

  const visibleSystems = useAtlasStore((s) => s.visibleSystems);
  const hiddenParts = useAtlasStore((s) => s.hiddenParts);
  const isolatedPartId = useAtlasStore((s) => s.isolatedPartId);
  const selectedPartId = useAtlasStore((s) => s.selectedPartId);
  const select = useAtlasStore((s) => s.select);

  useEffect(() => {
    const state = { visibleSystems, hiddenParts, isolatedPartId };
    for (const b of batches) {
      let anyVisible = false;
      b.parts.forEach((part, i) => {
        const visible = isPartVisible(state, part.id, b.system);
        anyVisible ||= visible;
        b.mesh.setVisibleAt(i, visible);
        b.mesh.setColorAt(i, part.id === selectedPartId ? HIGHLIGHT : b.baseColor);
      });
      b.mesh.visible = anyVisible;
    }
  }, [batches, visibleSystems, hiddenParts, isolatedPartId, selectedPartId]);

  const onClick = (b: SystemBatch) => (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const batchId = (e as unknown as { batchId?: number }).batchId ?? e.intersections[0]?.batchId;
    if (batchId === undefined || batchId === null) return;
    select(b.parts[batchId].id);
  };

  return (
    <>
      {batches.map((b) => (
        <primitive key={b.system} object={b.mesh} onClick={onClick(b)} />
      ))}
    </>
  );
}
```

- [ ] **Step 4: CameraRig — орбита и фокус на структуре**

`src/components/atlas/CameraRig.tsx`:
```tsx
"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { boundsCenter, boundsRadius, cameraDistance, unionBounds } from "@/lib/atlas/bounds";
import type { AtlasManifest } from "@/lib/atlas/types";
import { useAtlasStore } from "@/store/atlas-store";

export function CameraRig({ manifest }: { manifest: AtlasManifest }) {
  const controls = useRef<OrbitControlsImpl>(null);
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const target = useRef<{ position: THREE.Vector3; lookAt: THREE.Vector3; t: number } | null>(null);
  const focusPartId = useAtlasStore((s) => s.focusPartId);
  const focusNonce = useAtlasStore((s) => s.focusNonce);
  const resetNonce = useAtlasStore((s) => s.resetNonce);

  const flyTo = (center: [number, number, number], radius: number) => {
    const lookAt = new THREE.Vector3(...center);
    const dist = cameraDistance(radius, camera.fov);
    const dir = camera.position.clone().sub(controls.current?.target ?? lookAt).normalize();
    if (dir.lengthSq() === 0) dir.set(0, 0, 1);
    target.current = { position: lookAt.clone().add(dir.multiplyScalar(dist)), lookAt, t: 0 };
  };

  // initial framing of the whole body
  useEffect(() => {
    const all = unionBounds(manifest.parts.map((p) => p.bounds));
    const c = boundsCenter(all);
    const dist = cameraDistance(boundsRadius(all), camera.fov, 1.1);
    camera.position.set(c[0], c[1], c[2] + dist);
    camera.near = 0.01;
    camera.far = dist * 10;
    camera.updateProjectionMatrix();
    controls.current?.target.set(...c);
    controls.current?.update();
  }, [manifest, camera, resetNonce]);

  useEffect(() => {
    if (!focusPartId || focusNonce === 0) return;
    const part = manifest.parts.find((p) => p.id === focusPartId);
    if (!part) return;
    flyTo(boundsCenter(part.bounds), Math.max(boundsRadius(part.bounds), 0.03));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusPartId, focusNonce, manifest]);

  useFrame((_, dt) => {
    const t = target.current;
    if (!t || !controls.current) return;
    t.t = Math.min(1, t.t + dt / 0.4);
    const k = 1 - Math.pow(1 - t.t, 3);
    camera.position.lerp(t.position, k);
    controls.current.target.lerp(t.lookAt, k);
    controls.current.update();
    if (t.t >= 1) target.current = null;
  });

  return <OrbitControls ref={controls} makeDefault enableDamping dampingFactor={0.1} minDistance={0.05} maxDistance={20} />;
}
```

- [ ] **Step 5: AtlasCanvas и AtlasScreen, страница**

`src/components/atlas/AtlasCanvas.tsx`:
```tsx
"use client";
import { Canvas } from "@react-three/fiber";
import { BodyMeshes } from "./BodyMeshes";
import { CameraRig } from "./CameraRig";
import type { AtlasData } from "@/hooks/use-atlas-data";
import { useAtlasStore } from "@/store/atlas-store";

export function AtlasCanvas({ data, onReady }: { data: AtlasData; onReady?: () => void }) {
  const select = useAtlasStore((s) => s.select);
  return (
    <Canvas
      camera={{ fov: 40, position: [0, 1, 4] }}
      dpr={[1, 2]}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      onPointerMissed={() => select(null)}
      style={{ background: "#f4f4f2" }}
    >
      <ambientLight intensity={0.9} />
      <directionalLight position={[3, 5, 4]} intensity={1.6} />
      <directionalLight position={[-4, 2, -3]} intensity={0.6} />
      <BodyMeshes data={data} onReady={onReady} />
      <CameraRig manifest={data.manifest} />
    </Canvas>
  );
}
```

`src/components/atlas/AtlasScreen.tsx` (первая версия, панели добавит Task 8):
```tsx
"use client";
import { useCallback, useState } from "react";
import { useAtlasData } from "@/hooks/use-atlas-data";
import { AtlasCanvas } from "./AtlasCanvas";
import { LoadingOverlay } from "./LoadingOverlay";
import { WebGLGate } from "./WebGLGate";

export function AtlasScreen() {
  const state = useAtlasData();
  const [ready, setReady] = useState(false);
  const onReady = useCallback(() => setReady(true), []);
  return (
    <div className="relative h-full w-full" data-atlas-ready={ready ? "true" : "false"}>
      <WebGLGate>
        {state.status === "loading" && <LoadingOverlay loaded={state.loaded} total={state.total} />}
        {state.status === "error" && <LoadingOverlay loaded={0} total={0} error={state.message} onRetry={state.retry} />}
        {state.status === "ready" && <AtlasCanvas data={state.data} onReady={onReady} />}
      </WebGLGate>
    </div>
  );
}
```

`src/app/atlas/page.tsx`:
```tsx
import { AtlasScreen } from "@/components/atlas/AtlasScreen";

export const metadata = { title: "3D-атлас — Анатомия" };

export default function AtlasPage() {
  return (
    <main className="h-[calc(100dvh-3rem)]">
      <AtlasScreen />
    </main>
  );
}
```

В `src/app/layout.tsx`: `<html lang="ru">`, body с `className="min-h-dvh bg-white text-neutral-900 antialiased"`, а выше `{children}` вставить `<SiteHeader />` — компонент создаётся в Task 9; до него временно оставить `<header className="h-12 border-b px-4 flex items-center font-semibold">Анатомия</header>`.
В `src/app/globals.css` добавить: `html, body { height: 100%; }`.

- [ ] **Step 6: Запустить dev-сервер и проверить вручную**

Run: `pnpm dev` (в фоне), открыть `http://localhost:3000/atlas`.
Expected: прогресс-бар до 100%, затем полное тело: кости, связки и мышцы, вращается мышью, приближается колесом. В консоли нет ошибок. Загрузка на ноутбуке ≤ 10 с при локальном сервере. Если BatchedMesh кидает ошибку про `maxIndexCount` — проверить, что `indexCount` суммируется по `part.indexCount`, а не `vertexCount`.

- [ ] **Step 7: typecheck и коммит**

Run: `pnpm typecheck && pnpm test`
Expected: без ошибок, все тесты проходят. Если `three-stdlib` не резолвится в типах — `pnpm add -D three-stdlib`.

```bash
git add -A
git commit -m "feat(atlas): render full body with BatchedMesh per system and camera rig

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 8: Панель слоёв, карточка структуры, поиск

**Files:**
- Create: `src/components/atlas/LayerPanel.tsx`, `src/components/atlas/PartCard.tsx`, `src/components/atlas/SearchBox.tsx`
- Modify: `src/components/atlas/AtlasScreen.tsx`

**Interfaces:**
- Consumes: `useAtlasStore` (Task 6); `buildIndex`, `search` (Task 5); `SYSTEMS`, `SYSTEM_BY_ID`.
- Produces:
  ```ts
  export function LayerPanel(): JSX.Element;
  export interface PartNames { en: string; la?: string; ru?: string }
  export function PartCard(props: { partId: string; names: PartNames; systemRu: string; onHide(): void; onIsolate(): void; onClearIsolation(): void; isolated: boolean; onClose(): void }): JSX.Element;
  export function SearchBox(props: { manifest: AtlasManifest; onPick(id: string): void }): JSX.Element;
  ```
  Селектор имён для карточки: `getPartNames(part: AtlasPart): PartNames` внутри `AtlasScreen` — сейчас возвращает `{ en: part.name }`; План 2 подменит на данные `structures.json`.

- [ ] **Step 1: LayerPanel**

```tsx
"use client";
import { SYSTEMS } from "@/lib/atlas/systems";
import { useAtlasStore } from "@/store/atlas-store";

export function LayerPanel() {
  const visible = useAtlasStore((s) => s.visibleSystems);
  const toggle = useAtlasStore((s) => s.toggleSystem);
  const reset = useAtlasStore((s) => s.reset);
  return (
    <aside className="flex w-56 flex-col gap-1 overflow-y-auto border-r bg-white p-3 text-sm" aria-label="Слои">
      <div className="mb-1 flex items-center justify-between">
        <span className="font-semibold">Системы</span>
        <button onClick={reset} className="text-xs text-neutral-500 hover:text-neutral-900">Сброс</button>
      </div>
      {SYSTEMS.map((s) => (
        <label key={s.id} className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 hover:bg-neutral-100">
          <input type="checkbox" checked={visible[s.id]} onChange={() => toggle(s.id)} />
          <span className="inline-block h-3 w-3 rounded-sm" style={{ background: s.color }} />
          <span>{s.ru}</span>
        </label>
      ))}
    </aside>
  );
}
```

- [ ] **Step 2: PartCard**

```tsx
"use client";
export interface PartNames { en: string; la?: string; ru?: string }

export function PartCard({
  partId, names, systemRu, isolated, onHide, onIsolate, onClearIsolation, onClose,
}: {
  partId: string; names: PartNames; systemRu: string; isolated: boolean;
  onHide(): void; onIsolate(): void; onClearIsolation(): void; onClose(): void;
}) {
  return (
    <section className="absolute right-3 top-3 z-10 w-72 rounded-lg border bg-white p-4 shadow-lg" data-testid="part-card" data-part-id={partId}>
      <button onClick={onClose} aria-label="Закрыть" className="absolute right-2 top-2 text-neutral-400 hover:text-neutral-900">×</button>
      <p className="text-xs uppercase tracking-wide text-neutral-500">{systemRu}</p>
      <h2 className="mt-1 text-lg font-semibold italic" data-testid="part-la">{names.la ?? "—"}</h2>
      <p className="text-base" data-testid="part-ru">{names.ru ?? "Перевод в работе"}</p>
      <p className="text-sm text-neutral-500" data-testid="part-en">{names.en}</p>
      <div className="mt-3 flex flex-wrap gap-2 text-sm">
        <button onClick={onHide} className="rounded border px-2 py-1 hover:bg-neutral-100">Скрыть</button>
        {isolated ? (
          <button onClick={onClearIsolation} className="rounded border px-2 py-1 hover:bg-neutral-100">Показать всё</button>
        ) : (
          <button onClick={onIsolate} className="rounded border px-2 py-1 hover:bg-neutral-100">Изолировать</button>
        )}
      </div>
    </section>
  );
}
```

- [ ] **Step 3: SearchBox**

```tsx
"use client";
import { useMemo, useState } from "react";
import { buildIndex, search } from "@/lib/atlas/search";
import type { AtlasManifest } from "@/lib/atlas/types";

export function SearchBox({ manifest, onPick }: { manifest: AtlasManifest; onPick(id: string): void }) {
  const [q, setQ] = useState("");
  const index = useMemo(() => buildIndex(manifest.parts.map((p) => ({ id: p.id, labels: [p.name] }))), [manifest]);
  const byId = useMemo(() => new Map(manifest.parts.map((p) => [p.id, p])), [manifest]);
  const results = useMemo(() => (q.trim().length < 2 ? [] : search(index, q, 12)), [index, q]);
  return (
    <div className="absolute left-3 top-3 z-10 w-80">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Поиск структуры…"
        aria-label="Поиск структуры"
        className="w-full rounded-lg border bg-white px-3 py-2 text-sm shadow"
      />
      {results.length > 0 && (
        <ul className="mt-1 max-h-72 overflow-y-auto rounded-lg border bg-white shadow" role="listbox">
          {results.map((id) => (
            <li key={id}>
              <button
                className="w-full px-3 py-1.5 text-left text-sm hover:bg-neutral-100"
                onClick={() => { onPick(id); setQ(""); }}
              >
                {byId.get(id)?.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Собрать AtlasScreen**

Заменить `src/components/atlas/AtlasScreen.tsx`:
```tsx
"use client";
import { useCallback, useMemo, useState } from "react";
import { useAtlasData } from "@/hooks/use-atlas-data";
import { SYSTEM_BY_ID } from "@/lib/atlas/systems";
import type { AtlasPart } from "@/lib/atlas/types";
import { useAtlasStore } from "@/store/atlas-store";
import { AtlasCanvas } from "./AtlasCanvas";
import { LayerPanel } from "./LayerPanel";
import { LoadingOverlay } from "./LoadingOverlay";
import { PartCard, type PartNames } from "./PartCard";
import { SearchBox } from "./SearchBox";
import { WebGLGate } from "./WebGLGate";

function getPartNames(part: AtlasPart): PartNames {
  return { en: part.name };
}

export function AtlasScreen() {
  const state = useAtlasData();
  const [ready, setReady] = useState(false);
  const onReady = useCallback(() => setReady(true), []);
  const selectedPartId = useAtlasStore((s) => s.selectedPartId);
  const isolatedPartId = useAtlasStore((s) => s.isolatedPartId);
  const select = useAtlasStore((s) => s.select);
  const hidePart = useAtlasStore((s) => s.hidePart);
  const isolate = useAtlasStore((s) => s.isolate);
  const focus = useAtlasStore((s) => s.focus);

  const partById = useMemo(() => {
    if (state.status !== "ready") return new Map<string, AtlasPart>();
    return new Map(state.data.manifest.parts.map((p) => [p.id, p]));
  }, [state]);
  const selected = selectedPartId ? partById.get(selectedPartId) : undefined;

  return (
    <div className="flex h-full w-full" data-atlas-ready={ready ? "true" : "false"}>
      <LayerPanel />
      <div className="relative flex-1">
        <WebGLGate>
          {state.status === "loading" && <LoadingOverlay loaded={state.loaded} total={state.total} />}
          {state.status === "error" && <LoadingOverlay loaded={0} total={0} error={state.message} onRetry={state.retry} />}
          {state.status === "ready" && (
            <>
              <SearchBox manifest={state.data.manifest} onPick={(id) => focus(id)} />
              <AtlasCanvas data={state.data} onReady={onReady} />
              {selected && (
                <PartCard
                  partId={selected.id}
                  names={getPartNames(selected)}
                  systemRu={SYSTEM_BY_ID[selected.system].ru}
                  isolated={isolatedPartId === selected.id}
                  onHide={() => hidePart(selected.id)}
                  onIsolate={() => isolate(selected.id)}
                  onClearIsolation={() => isolate(null)}
                  onClose={() => select(null)}
                />
              )}
            </>
          )}
        </WebGLGate>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Ручная проверка**

Run: `pnpm dev`, открыть `/atlas`.
Expected: слева панель систем, снятие галочки «Мышцы» прячет мышцы; клик по кости подсвечивает её оранжевым и показывает карточку с английским названием; «Скрыть» убирает структуру; «Изолировать» оставляет только её, «Показать всё» возвращает; клик в пустоту закрывает карточку; поиск «femur» → выбор → камера подлетает к бедренной кости; «Сброс» возвращает исходное состояние.

- [ ] **Step 6: typecheck, тесты, коммит**

Run: `pnpm typecheck && pnpm test`
Expected: чисто.

```bash
git add -A
git commit -m "feat(atlas): layer panel, part card and search

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 9: Навигация, главная и страница об источниках

**Files:**
- Create: `src/components/SiteHeader.tsx`, `src/app/about/page.tsx`
- Modify: `src/app/page.tsx`, `src/app/layout.tsx`

**Interfaces:**
- Produces: маршруты `/` (редирект на `/atlas`), `/about`; шапка с ссылками «Атлас», «Об источниках» (ссылки «Тесты», «Карточки», «Прогресс» добавит План 2).

- [ ] **Step 1: SiteHeader**

```tsx
import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="flex h-12 items-center gap-6 border-b bg-white px-4 text-sm">
      <Link href="/atlas" className="font-semibold">Анатомия</Link>
      <nav className="flex gap-4 text-neutral-600">
        <Link href="/atlas" className="hover:text-neutral-900">Атлас</Link>
        <Link href="/about" className="hover:text-neutral-900">Об источниках</Link>
      </nav>
    </header>
  );
}
```
В `src/app/layout.tsx` заменить временный `<header>` на `<SiteHeader />`.

- [ ] **Step 2: Главная — редирект**

`src/app/page.tsx`:
```tsx
import { redirect } from "next/navigation";
export default function Home() {
  redirect("/atlas");
}
```

- [ ] **Step 3: Страница об источниках**

`src/app/about/page.tsx`:
```tsx
export const metadata = { title: "Об источниках — Анатомия" };

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6 text-sm leading-relaxed">
      <h1 className="text-2xl font-semibold">Об источниках</h1>
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">3D-модель</h2>
        <p>
          Трёхмерная модель тела основана на наборе данных{" "}
          <a className="underline" href="https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html">BodyParts3D</a>,
          © The Database Center for Life Science, лицензия{" "}
          <a className="underline" href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>.
          Модель описывает взрослого мужчину и не отражает всех анатомических вариантов.
        </p>
        <p>
          Упаковка и упрощение геометрии взяты из открытого проекта{" "}
          <a className="underline" href="https://github.com/ismailatilan-44/human-atlas">human-atlas</a> (MIT).
        </p>
        <p>Публикация: Mitsuhashi et al. (2009), BodyParts3D: 3D structure database for anatomical concepts. Nucleic Acids Research.</p>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Ограничения</h2>
        <p>Приложение предназначено для учёбы и не является медицинским или диагностическим инструментом.</p>
      </section>
    </main>
  );
}
```

- [ ] **Step 4: Проверка и коммит**

Run: `pnpm build`
Expected: маршруты `/`, `/atlas`, `/about` собраны без ошибок.

```bash
git add -A
git commit -m "feat: site header, home redirect and attribution page

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 10: Браузерные тесты (Playwright)

**Files:**
- Create: `playwright.config.ts`, `e2e/atlas.spec.ts`

**Interfaces:**
- Consumes: атрибут `data-atlas-ready`, `data-testid="part-card"`, `data-testid="part-en"`, `aria-label="Поиск структуры"` из Tasks 7–8.

- [ ] **Step 1: Установить браузер**

Run: `pnpm exec playwright install chromium`
Expected: chromium установлен.

- [ ] **Step 2: Конфигурация**

`playwright.config.ts`:
```ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  timeout: 90_000,
  expect: { timeout: 20_000 },
  use: {
    baseURL: "http://localhost:3000",
    viewport: { width: 1280, height: 800 },
    launchOptions: {
      args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
    },
  },
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000/about",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
```

- [ ] **Step 3: Тесты**

`e2e/atlas.spec.ts`:
```ts
import { expect, test } from "@playwright/test";

test("atlas loads the model and a click selects a structure", async ({ page }) => {
  await page.goto("/atlas");
  await expect(page.locator("[data-atlas-ready='true']")).toBeVisible({ timeout: 90_000 });

  const canvas = page.locator("canvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("canvas not found");
  // центр модели: грудная клетка/грудина при фронтальной камере
  await canvas.click({ position: { x: box.width / 2, y: box.height / 2 } });

  const card = page.getByTestId("part-card");
  await expect(card).toBeVisible();
  await expect(page.getByTestId("part-en")).not.toHaveText("");
});

test("search focuses a structure and shows its card", async ({ page }) => {
  await page.goto("/atlas");
  await expect(page.locator("[data-atlas-ready='true']")).toBeVisible({ timeout: 90_000 });
  await page.getByLabel("Поиск структуры").fill("femur");
  await page.getByRole("listbox").getByRole("button").first().click();
  await expect(page.getByTestId("part-en")).toContainText(/femur/i);
});

test("about page lists BodyParts3D attribution", async ({ page }) => {
  await page.goto("/about");
  await expect(page.getByText("BodyParts3D")).toBeVisible();
  await expect(page.getByText("CC BY 4.0")).toBeVisible();
});
```

- [ ] **Step 4: Запустить**

Run: `pnpm e2e`
Expected: 3 passed. Если первый тест не видит карточку, потому что клик пришёлся в пустоту: сменить точку клика на `y: box.height * 0.45` (грудина) и повторить; если модель не рендерится в headless — добавить `headless: true` и `channel: "chromium"` в `use`.

- [ ] **Step 5: Коммит**

```bash
git add playwright.config.ts e2e
git commit -m "test: playwright smoke tests for atlas and about page

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 11: Деплой на Vercel

**Files:**
- Create: `vercel.json`
- Modify: `README.md`

- [ ] **Step 1: Заголовки кэширования для моделей**

`vercel.json`:
```json
{
  "headers": [
    {
      "source": "/models/(.*)",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }]
    }
  ]
}
```

- [ ] **Step 2: README**

Заменить `README.md`:
```markdown
# Анатомия

3D-атлас и тренажёр по нормальной анатомии для студентов медвузов.

## Разработка

pnpm install
pnpm dev          # http://localhost:3000
pnpm test         # vitest
pnpm e2e          # playwright
pnpm typecheck

## Данные

`public/models` — BodyParts3D 4.0 (CC BY 4.0), см. `public/models/ATTRIBUTION.md`.
Спецификация: `docs/superpowers/specs/2026-09-22-anatomia-mvp-design.md`.
```

- [ ] **Step 3: Коммит и пуш**

```bash
git add -A
git commit -m "chore: vercel cache headers and readme

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

- [ ] **Step 4: Подключить репозиторий к Vercel**

Через Vercel MCP: `mcp__claude_ai_Vercel__create_git_project` для `abcsz1525/anatomia` (framework Next.js, root `.`), затем дождаться деплоя `mcp__claude_ai_Vercel__list_deployments` и открыть URL. Если MCP недоступен — пользователь выполняет `! npx vercel login` и затем `pnpm dlx vercel@latest --prod --yes`.

Expected: продакшн-URL открывает `/atlas`, модель грузится с CDN за ≤ 15 с.

- [ ] **Step 5: Проверить на телефоне**

Открыть продакшн-URL на телефоне жены: модель загружается, вращается пальцем, клик работает. Записать замечания в `docs/superpowers/notes/2026-09-22-phone-check.md` — они уйдут в План 3 (мобильная раскладка).

---

## Self-review

- Spec coverage: §3 (данные, лицензия) — Task 2, 9; §4 архитектура — Tasks 1–8; §6.1 атлас (слои, клик, карточка, поиск, скрыть/изолировать, сброс) — Tasks 6–8; кнопка «Учить карточки темы» в карточке отложена в План 2 вместе с темами; мобильная раскладка — План 3 (спец. §10 шаг 6); §6.5 — Task 9; §7 поток данных — Tasks 4, 7; §8 ошибки загрузки и WebGL — Tasks 4, 7; §9 тесты — Tasks 2–6, 10.
- Placeholders: нет.
- Type consistency: `AtlasData`, `PartNames`, `isPartVisible`, `focus/focusNonce`, `data-atlas-ready`, `data-testid` совпадают между задачами.
