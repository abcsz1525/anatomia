# Атлас-студия (редизайн /atlas по образцу human-atlas) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/atlas` становится полноэкранной «студией»: стеклянные панели поверх сцены, панель систем с тумблерами и счётчиками, поиск по кнопке или `/`, ракурсы одной кнопкой, автоповорот, ползунок «Разнести модель» с раскладкой-инвентарём, карточка структуры в новом стиле с блоком «Входящие структуры», подсказки и ссылка на источник.

**Architecture:** Остальные страницы уходят в route-группу `(site)` со своей шапкой, `/atlas` рисует студию на `100dvh`. Состояние студии (разнесение, ракурс, автоповорот) живёт в существующем zustand-store. Разнесение — чистый укладчик `explodeLayout` плюс `setMatrixAt` на инстансах BatchedMesh; текущая анимированная величина разнесения живёт в модульном объекте `explodeAmount`, который пишет `BodyMeshes` и читает `CameraRig`. Камера получает четыре направления ракурсов и кадрирование сетки инвентаря. UI — три самодельных примитива (Switch, Slider, IconButton), набор inline-иконок и класс `glass` в `globals.css`.

**Tech Stack:** без новых зависимостей. Next.js 16 (App Router, route groups), React 19, three 0.186 (`BatchedMesh.setMatrixAt`), @react-three/fiber 9 (`useFrame`, `useThree`), drei `OrbitControls`, zustand 5, Tailwind 4 (`@theme inline`), vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-13-atlas-studio-design.md` (разделы 3–9). Исходный MVP: `docs/superpowers/specs/2026-09-22-anatomia-mvp-design.md`.

## Global Constraints

- Перед правкой файлов в `src/app/` прочитать `node_modules/next/dist/docs/01-app/01-getting-started/02-project-structure.md` (раздел «Route groups») — версия Next.js отличается от обучающих данных.
- Брейкпойнт один: Tailwind `md` (768 px) через `useIsMobile()`; одна раскладка в дереве за раз (Playwright не должен видеть задвоенные test id).
- Цели касания на мобайле ≥ 44 px. Нижний левый угол над доком остаётся пустым (там индикатор Next.js в dev-режиме).
- Существующие `data-testid` сохраняются: `part-card`, `part-sheet`, `part-la`, `part-la-ru`, `part-ru`, `part-en`, `part-topic`, `part-cards-link`, `layers-toggle`, `layers-sheet`, `data-atlas-ready`. Новые: `systems-panel`, `visible-count`, `search-toggle`, `search-panel`, `view-controls`, `explode-dock`, `explode-value`, `scene-caption`, `source-link`, `part-siblings`, `part-isolate`, `atlas-nav`.
- Поля ввода и aria-метки на русском: поле поиска `aria-label="Поиск структуры"`, тумблеры `aria-label` = русское имя системы («Артерии», «Мышцы»), ракурсы «Три четверти», «Спереди», «Сбоку», «Сзади».
- Палитра студии: фон `#f3f4f4`, текст `#20242b`, акцентный тёмный `#263b48`, приглушённый `#68727d`, граница `rgb(24 37 54 / 0.09)`, бирюзовый акцент `#458a85`. Цвета систем не меняются. Шрифт Geist.
- Тесты (`/quiz`) не меняются: при `restrictTo !== null` разнесение и автоповорот считаются выключенными на уровне `BodyMeshes`/`CameraRig`, store для теста не трогается.
- Dev-сервер пользователя на :3000 не трогать и не убивать. e2e и скриншоты через `pnpm dev --port 3100` (Playwright поднимает сам) или `PLAYWRIGHT_BASE_URL`.
- Коммиты по явным путям, трейлер `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Перед каждым коммитом: `pnpm typecheck && pnpm lint && pnpm test` зелёные.

## Карта файлов

```
src/app/layout.tsx                         корневой layout без шапки
src/app/(site)/layout.tsx                  NEW: шапка сайта для всех страниц кроме атласа
src/app/(site)/{page,quiz,cards,progress,about}  перенесены из src/app/ (git mv), URL прежние
src/app/atlas/page.tsx                     main h-dvh
src/app/globals.css                        токены студии, .glass, .studio-vignette, .studio-slider
src/components/ui/Switch.tsx               NEW: role=switch
src/components/ui/Slider.tsx               NEW: input[type=range] со стилем .studio-slider
src/components/ui/IconButton.tsx           NEW
src/components/ui/icons.tsx                NEW: inline SVG (Search, Info, Rotate, Pause, Reset, Close, Layers, ArrowUpRight, Focus, ChevronRight)
src/store/atlas-store.ts (+test)           explode, view, viewNonce, autoRotate, explodeLayoutSize; правила связей
src/lib/atlas/explode-layout.ts (+test)    NEW: explodeLayout(), explodeOffset()
src/lib/atlas/explode-amount.ts            NEW: модульный { value } текущей величины разнесения
src/lib/atlas/caption.ts (+test)           NEW: captionFor()
src/lib/atlas/bounds.ts (+test)            fitDistance()
src/components/atlas/BodyMeshes.tsx        матрицы инстансов по разнесению, оверлей гаснет
src/components/atlas/AtlasCanvas.tsx       фон #f3f4f4
src/components/atlas/CameraRig.tsx         ракурсы, автоповорот, кадр сетки, панорама
src/components/atlas/Identity.tsx          NEW: заголовок + ссылки разделов
src/components/atlas/ViewControls.tsx      NEW
src/components/atlas/ExplodeDock.tsx       NEW
src/components/atlas/SceneCaption.tsx      NEW
src/components/atlas/StudioFooter.tsx      NEW
src/components/atlas/SystemsPanel.tsx      NEW (заменяет LayerPanel.tsx)
src/components/atlas/SearchPanel.tsx       NEW (заменяет SearchBox.tsx)
src/components/atlas/PartCard.tsx          новый стиль + «Входящие структуры»
src/components/atlas/LoadingOverlay.tsx    новый стиль
src/components/atlas/AtlasScreen.tsx       компоновка студии (десктоп + мобайл)
src/components/atlas/LayerPanel.tsx        DELETE
src/components/atlas/SearchBox.tsx         DELETE
e2e/atlas.spec.ts, e2e/mobile.spec.ts      подстройка + новые сценарии
README.md                                  раздел «Студия атласа»
```

---

### Task 1: Route-группа `(site)`, полноэкранный `/atlas`, токены студии

**Files:**
- Create: `src/app/(site)/layout.tsx`
- Move (git mv): `src/app/page.tsx`, `src/app/quiz/`, `src/app/cards/`, `src/app/progress/`, `src/app/about/` → `src/app/(site)/…`
- Modify: `src/app/layout.tsx`, `src/app/atlas/page.tsx`, `src/app/globals.css`

**Interfaces:**
- Produces: Tailwind-классы `bg-studio-bg`, `text-studio-fg`, `bg-studio-primary`, `text-studio-primary`, `text-studio-muted`, `border-studio-border`, `bg-studio-border`, `bg-studio-accent`, `text-studio-accent`; CSS-классы `.glass`, `.studio-vignette`, `.studio-slider`.

- [ ] **Step 1: Прочитать документацию Next.js по route-группам**

Run: `sed -n 284,304p node_modules/next/dist/docs/01-app/01-getting-started/02-project-structure.md`
Expected: описание `(folderName)` — папка не попадает в URL, вложенный `layout.js` внутри группы.

- [ ] **Step 2: Перенести страницы в группу**

```bash
cd /Users/AIpower/Desktop/coding/VIBE/anatomia
mkdir -p "src/app/(site)"
git mv src/app/page.tsx "src/app/(site)/page.tsx"
git mv src/app/quiz "src/app/(site)/quiz"
git mv src/app/cards "src/app/(site)/cards"
git mv src/app/progress "src/app/(site)/progress"
git mv src/app/about "src/app/(site)/about"
```

- [ ] **Step 3: Layout группы со шапкой**

`src/app/(site)/layout.tsx`:

```tsx
import type { ReactNode } from "react";
import { SiteHeader } from "@/components/SiteHeader";

/**
 * Страницы со шапкой сайта. Атлас живёт снаружи группы (`src/app/atlas`)
 * и рисует студию на весь экран, поэтому шапка объявлена здесь, а не в
 * корневом layout.
 */
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      {children}
    </>
  );
}
```

- [ ] **Step 4: Убрать шапку из корневого layout**

В `src/app/layout.tsx` удалить `import { SiteHeader } from "@/components/SiteHeader";` и строку `<SiteHeader />`. Остальное без изменений.

- [ ] **Step 5: Атлас на весь экран**

`src/app/atlas/page.tsx`:

```tsx
import { Suspense } from "react";
import { AtlasScreen } from "@/components/atlas/AtlasScreen";

export const metadata = { title: "3D-атлас — Анатомия" };

export default function AtlasPage() {
  // студия занимает весь экран: шапки сайта на этой странице нет
  return (
    <main className="relative h-dvh min-h-[340px] w-full overflow-hidden bg-studio-bg">
      {/* AtlasScreen читает ?focus= через useSearchParams: без Suspense
          Next.js не может пререндерить страницу статически */}
      <Suspense fallback={null}>
        <AtlasScreen />
      </Suspense>
    </main>
  );
}
```

- [ ] **Step 6: Токены и классы студии**

Дописать в конец `src/app/globals.css`:

```css
/* Студия атласа: палитра по образцу human-atlas */
:root {
  --studio-bg: #f3f4f4;
  --studio-fg: #20242b;
  --studio-primary: #263b48;
  --studio-muted: #68727d;
  --studio-border: rgb(24 37 54 / 0.09);
  --studio-accent: #458a85;
}

@theme inline {
  --color-studio-bg: var(--studio-bg);
  --color-studio-fg: var(--studio-fg);
  --color-studio-primary: var(--studio-primary);
  --color-studio-muted: var(--studio-muted);
  --color-studio-border: var(--studio-border);
  --color-studio-accent: var(--studio-accent);
}

/* Стеклянная панель поверх сцены */
.glass {
  background: rgb(255 255 255 / 0.92);
  border: 1px solid var(--studio-border);
  border-radius: 16px;
  box-shadow:
    0 2px 5px rgb(36 51 68 / 0.03),
    0 16px 48px rgb(36 51 68 / 0.07);
  -webkit-backdrop-filter: blur(24px);
  backdrop-filter: blur(24px);
}

/* Мягкая виньетка поверх канваса; клики проходят сквозь неё */
.studio-vignette {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(ellipse at 51% 43%, transparent 35%, rgb(131 145 158 / 0.06) 100%);
}

/* Ползунок разнесения: тонкая дорожка, круглый бегунок с белой обводкой */
.studio-slider {
  -webkit-appearance: none;
  appearance: none;
  height: 2px;
  border-radius: 1px;
  background: rgb(24 37 54 / 0.12);
  outline: none;
  cursor: pointer;
}
.studio-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--studio-primary);
  border: 3px solid #fff;
  box-shadow:
    0 0 0 1px rgb(38 59 72 / 0.2),
    0 2px 5px rgb(24 37 54 / 0.1);
}
.studio-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--studio-primary);
  border: 3px solid #fff;
  box-shadow:
    0 0 0 1px rgb(38 59 72 / 0.2),
    0 2px 5px rgb(24 37 54 / 0.1);
}
.studio-slider:focus-visible {
  outline: 2px solid var(--studio-accent);
  outline-offset: 6px;
}
```

- [ ] **Step 7: Проверить**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: всё зелёное.

Run: `pnpm exec playwright test e2e/atlas.spec.ts -g "about page" --project=desktop`
Expected: PASS (страница `/about` рисуется со шапкой внутри группы).

- [ ] **Step 8: Commit**

```bash
git add src/app "src/app/(site)" src/app/globals.css
git commit -m "refactor(app): site pages under a (site) route group; atlas goes full screen

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: UI-примитивы и иконки

**Files:**
- Create: `src/components/ui/Switch.tsx`, `src/components/ui/Slider.tsx`, `src/components/ui/IconButton.tsx`, `src/components/ui/icons.tsx`

**Interfaces:**
- Produces:
  - `Switch({ checked: boolean; onChange(next: boolean): void; label: string; className?: string })`
  - `Slider({ id?: string; value: number; onChange(next: number): void; labelledBy: string; className?: string })` — значение 0..100
  - `IconButton({ label: string; active?: boolean; pressed?: boolean; className?: string; children; ...button props })`
  - Иконки `SearchIcon, InfoIcon, RotateIcon, PauseIcon, ResetIcon, CloseIcon, LayersIcon, ArrowUpRightIcon, FocusIcon, ChevronRightIcon`, каждая `({ size?: number; className?: string })`

- [ ] **Step 1: Switch**

`src/components/ui/Switch.tsx`:

```tsx
"use client";

/**
 * Тумблер: кнопка с role="switch". `label` уходит в aria-label, по нему
 * тумблер находят тесты и скринридер («Артерии»). Псевдоэлемент расширяет
 * зону касания до ≥ 44 px по вертикали, не меняя размер самого тумблера.
 */
export function Switch({
  checked, onChange, label, className = "",
}: { checked: boolean; onChange(next: boolean): void; label: string; className?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors after:absolute after:-inset-x-2 after:-inset-y-3 after:content-[''] ${
        checked ? "bg-studio-primary" : "bg-neutral-300"
      } ${className}`}
    >
      <span
        className={`pointer-events-none absolute left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}
```

- [ ] **Step 2: Slider**

`src/components/ui/Slider.tsx`:

```tsx
"use client";

/** Ползунок 0..100 на нативном range: стиль задаёт `.studio-slider` в globals.css. */
export function Slider({
  id, value, onChange, labelledBy, className = "",
}: { id?: string; value: number; onChange(next: number): void; labelledBy: string; className?: string }) {
  return (
    <input
      id={id}
      type="range"
      min={0}
      max={100}
      step={1}
      value={value}
      aria-labelledby={labelledBy}
      onChange={(e) => onChange(Number(e.currentTarget.value))}
      className={`studio-slider w-full ${className}`}
    />
  );
}
```

- [ ] **Step 3: IconButton**

`src/components/ui/IconButton.tsx`:

```tsx
"use client";
import type { ButtonHTMLAttributes, ReactNode } from "react";

/**
 * Квадратная кнопка с иконкой или короткой подписью. `label` даёт aria-label
 * и title; `pressed` выставляет aria-pressed только когда передан (у кнопок
 * без состояния атрибута быть не должно).
 */
export function IconButton({
  label, active = false, pressed, className = "", children, ...rest
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label" | "title"> & {
  label: string; active?: boolean; pressed?: boolean; children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      className={`flex h-10 w-10 items-center justify-center rounded-lg text-[13px] font-medium transition-colors disabled:opacity-25 disabled:hover:bg-transparent ${
        active
          ? "bg-studio-primary text-white shadow-sm"
          : "text-studio-muted hover:bg-neutral-900/5 hover:text-studio-primary"
      } ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
```

- [ ] **Step 4: Иконки**

`src/components/ui/icons.tsx` (контуры в стиле lucide, 24×24, stroke 2):

```tsx
import type { ReactNode } from "react";

type IconProps = { size?: number; className?: string };

function Icon({ size = 18, className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  );
}

export const SearchIcon = (p: IconProps) => (
  <Icon {...p}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></Icon>
);
export const InfoIcon = (p: IconProps) => (
  <Icon {...p}><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></Icon>
);
export const RotateIcon = (p: IconProps) => (
  <Icon {...p}><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /></Icon>
);
export const PauseIcon = (p: IconProps) => (
  <Icon {...p}><rect x="14" y="4" width="4" height="16" rx="1" /><rect x="6" y="4" width="4" height="16" rx="1" /></Icon>
);
export const ResetIcon = (p: IconProps) => (
  <Icon {...p}><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></Icon>
);
export const CloseIcon = (p: IconProps) => (
  <Icon {...p}><path d="M18 6 6 18" /><path d="m6 6 12 12" /></Icon>
);
export const LayersIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
    <path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" />
    <path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" />
  </Icon>
);
export const ArrowUpRightIcon = (p: IconProps) => (
  <Icon {...p}><path d="M7 7h10v10" /><path d="M7 17 17 7" /></Icon>
);
export const FocusIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M3 7V5a2 2 0 0 1 2-2h2" /><path d="M17 3h2a2 2 0 0 1 2 2v2" />
    <path d="M21 17v2a2 2 0 0 1-2 2h-2" /><path d="M7 21H5a2 2 0 0 1-2-2v-2" />
  </Icon>
);
export const ChevronRightIcon = (p: IconProps) => (
  <Icon {...p}><path d="m9 18 6-6-6-6" /></Icon>
);
```

- [ ] **Step 5: Проверить и закоммитить**

Run: `pnpm typecheck && pnpm lint`
Expected: зелёное (компоненты пока никем не импортируются — это нормально).

```bash
git add src/components/ui/Switch.tsx src/components/ui/Slider.tsx src/components/ui/IconButton.tsx src/components/ui/icons.tsx
git commit -m "feat(ui): switch, slider, icon button and inline icons for the atlas studio

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: Store — разнесение, ракурс, автоповорот

**Files:**
- Modify: `src/store/atlas-store.ts`
- Test: `src/store/atlas-store.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type AtlasView = "three-quarter" | "front" | "side" | "back";
  export interface ExplodeLayoutSize { width: number; height: number }
  // поля: explode: number; view: AtlasView; viewNonce: number; autoRotate: boolean; explodeLayoutSize: ExplodeLayoutSize | null
  // действия: setExplode(v: number); setView(v: AtlasView); toggleAutoRotate(); hideAllSystems(); setExplodeLayoutSize(size: ExplodeLayoutSize)
  ```

- [ ] **Step 1: Тесты**

Дописать в конец `src/store/atlas-store.test.ts`:

```ts
describe("atlas store: студия", () => {
  it("setExplode ограничивает 0..1, выше 0.8 ставит ракурс спереди и гасит автоповорот", () => {
    const s = useAtlasStore.getState();
    s.toggleAutoRotate();
    s.setExplode(1.7);
    expect(useAtlasStore.getState().explode).toBe(1);
    expect(useAtlasStore.getState().view).toBe("front");
    expect(useAtlasStore.getState().autoRotate).toBe(false);
    s.setExplode(-2);
    expect(useAtlasStore.getState().explode).toBe(0);
  });

  it("ниже 0.8 разнесение ракурс не трогает", () => {
    const s = useAtlasStore.getState();
    s.setView("side");
    s.setExplode(0.5);
    expect(useAtlasStore.getState().view).toBe("side");
  });

  it("изоляция, reveal, focus и flyTo собирают модель", () => {
    const s = useAtlasStore.getState();
    s.setExplode(1);
    s.isolate("FJ1");
    expect(useAtlasStore.getState().explode).toBe(0);
    s.setExplode(1);
    s.isolate(null); // снятие изоляции модель не собирает
    expect(useAtlasStore.getState().explode).toBe(1);
    s.reveal("FJ1", "arterial");
    expect(useAtlasStore.getState().explode).toBe(0);
    s.setExplode(1);
    s.focus("FJ2");
    expect(useAtlasStore.getState().explode).toBe(0);
    s.setExplode(1);
    s.flyTo("FJ3");
    expect(useAtlasStore.getState().explode).toBe(0);
  });

  it("смена набора систем снимает выделение и изоляцию", () => {
    const s = useAtlasStore.getState();
    s.select("FJ1");
    s.isolate("FJ1");
    s.toggleSystem("venous");
    expect(useAtlasStore.getState().selectedPartId).toBeNull();
    expect(useAtlasStore.getState().isolatedPartId).toBeNull();
    s.select("FJ1");
    s.setSystemVisible("venous", false);
    expect(useAtlasStore.getState().selectedPartId).toBeNull();
    s.select("FJ1");
    s.showOnlySystems(["skeletal"]);
    expect(useAtlasStore.getState().selectedPartId).toBeNull();
  });

  it("hideAllSystems выключает все системы", () => {
    const s = useAtlasStore.getState();
    s.select("FJ1");
    s.hideAllSystems();
    const st = useAtlasStore.getState();
    expect(Object.values(st.visibleSystems).every((v) => v === false)).toBe(true);
    expect(st.selectedPartId).toBeNull();
  });

  it("setView увеличивает viewNonce и гасит автоповорот; toggleAutoRotate переключает", () => {
    const s = useAtlasStore.getState();
    s.toggleAutoRotate();
    expect(useAtlasStore.getState().autoRotate).toBe(true);
    const nonce = useAtlasStore.getState().viewNonce;
    s.setView("back");
    const st = useAtlasStore.getState();
    expect(st.view).toBe("back");
    expect(st.viewNonce).toBe(nonce + 1);
    expect(st.autoRotate).toBe(false);
    s.setView("back"); // тот же ракурс — всё равно новый nonce: камера возвращается в кадр
    expect(useAtlasStore.getState().viewNonce).toBe(nonce + 2);
  });

  it("reset возвращает студию к началу, но помнит размер раскладки", () => {
    const s = useAtlasStore.getState();
    s.setExplode(1);
    s.setView("back");
    s.toggleAutoRotate();
    s.setExplodeLayoutSize({ width: 1, height: 2 });
    s.reset();
    const st = useAtlasStore.getState();
    expect(st.explode).toBe(0);
    expect(st.view).toBe("three-quarter");
    expect(st.autoRotate).toBe(false);
    // размер — кэш сцены, а не настройка: после сброса набор видимых деталей
    // может не измениться, и BodyMeshes размер заново не запишет
    expect(st.explodeLayoutSize).toEqual({ width: 1, height: 2 });
  });
});
```

- [ ] **Step 2: Запустить, убедиться что падает**

Run: `pnpm vitest run src/store/atlas-store.test.ts`
Expected: FAIL — `s.toggleAutoRotate is not a function` и подобные.

- [ ] **Step 3: Реализация**

В `src/store/atlas-store.ts`:

Добавить после `HighlightKind`:

```ts
export type AtlasView = "three-quarter" | "front" | "side" | "back";
export interface ExplodeLayoutSize { width: number; height: number }
```

Добавить в интерфейс `AtlasState` (после `highlights`):

```ts
  /** Разнесение модели 0..1 — целевое значение; анимированное живёт в explode-amount.ts. */
  explode: number;
  view: AtlasView;
  /** Растёт при каждом выборе ракурса, даже того же: камера возвращается в кадр. */
  viewNonce: number;
  autoRotate: boolean;
  /** Размер сетки инвентаря; пишет BodyMeshes при пересчёте раскладки, читает CameraRig. */
  explodeLayoutSize: ExplodeLayoutSize | null;
  /** Ограничивает 0..1; выше 0.8 ракурс становится «спереди»; любое изменение гасит автоповорот. */
  setExplode(value: number): void;
  setView(view: AtlasView): void;
  toggleAutoRotate(): void;
  /** Все системы выключить; выделение и изоляция снимаются. */
  hideAllSystems(): void;
  setExplodeLayoutSize(size: ExplodeLayoutSize): void;
```

В `initial()` добавить:

```ts
  explode: 0,
  view: "three-quarter" as AtlasView,
  viewNonce: 0,
  autoRotate: false,
  explodeLayoutSize: null as ExplodeLayoutSize | null,
```

Заменить действия систем и изоляции (выделение и изоляция снимаются при смене набора: иначе карточка описывает то, чего не видно):

```ts
  setSystemVisible: (id, visible) =>
    set((s) => ({
      visibleSystems: { ...s.visibleSystems, [id]: visible },
      selectedPartId: null,
      isolatedPartId: null,
    })),
  toggleSystem: (id) =>
    set((s) => ({
      visibleSystems: { ...s.visibleSystems, [id]: !s.visibleSystems[id] },
      selectedPartId: null,
      isolatedPartId: null,
    })),
  showOnlySystems: (ids) => {
    const on = new Set<SystemId>(ids);
    set({
      visibleSystems: Object.fromEntries(SYSTEMS.map((s) => [s.id, on.has(s.id)])) as Record<
        SystemId,
        boolean
      >,
      selectedPartId: null,
      isolatedPartId: null,
    });
  },
  hideAllSystems: () =>
    set({
      visibleSystems: Object.fromEntries(SYSTEMS.map((s) => [s.id, false])) as Record<SystemId, boolean>,
      selectedPartId: null,
      isolatedPartId: null,
    }),
  // изоляция показывает одну структуру в её месте — разнесённой модели это не нужно
  isolate: (id) => set((s) => ({ isolatedPartId: id, explode: id ? 0 : s.explode })),
```

В `focus`, `reveal`, `flyTo` добавить `explode: 0` в возвращаемый объект (подбор ракурса работает по габаритам собранной модели).

Добавить действия студии:

```ts
  setExplode: (value) =>
    set((s) => {
      const explode = Math.min(1, Math.max(0, value));
      return { explode, view: explode > 0.8 ? "front" : s.view, autoRotate: false };
    }),
  setView: (view) => set((s) => ({ view, viewNonce: s.viewNonce + 1, autoRotate: false })),
  toggleAutoRotate: () => set((s) => ({ autoRotate: !s.autoRotate })),
  setExplodeLayoutSize: (size) => set({ explodeLayoutSize: size }),
```

Заменить `reset`:

```ts
  // explodeLayoutSize — кэш сцены: после сброса набор видимых деталей может не
  // измениться, и BodyMeshes размер заново не запишет
  reset: () =>
    set((s) => ({ ...initial(), explodeLayoutSize: s.explodeLayoutSize, resetNonce: s.resetNonce + 1 })),
```

- [ ] **Step 4: Запустить тесты**

Run: `pnpm vitest run src/store/atlas-store.test.ts`
Expected: PASS, включая старые тесты.

- [ ] **Step 5: Commit**

```bash
git add src/store/atlas-store.ts src/store/atlas-store.test.ts
git commit -m "feat(store): explode, view presets, auto-rotate and hide-all for the atlas studio

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: Укладчик разнесения, подпись сцены, fitDistance

**Files:**
- Create: `src/lib/atlas/explode-layout.ts`, `src/lib/atlas/explode-layout.test.ts`, `src/lib/atlas/explode-amount.ts`, `src/lib/atlas/caption.ts`, `src/lib/atlas/caption.test.ts`
- Modify: `src/lib/atlas/bounds.ts`, `src/lib/atlas/bounds.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface ExplodeCell { x: number; y: number; width: number; height: number }
  export interface ExplodeLayout { cells: Map<string, ExplodeCell>; width: number; height: number }
  export function explodeLayout(parts: { id: string; bounds: Bounds }[], aspect?: number): ExplodeLayout;
  export function explodeOffset(cell: ExplodeCell, bounds: Bounds, bodyCenterY: number): [number, number, number];
  export const explodeAmount: { value: number }; // explode-amount.ts
  export function captionFor(explode: number, isolatedName: string | null): string; // caption.ts
  export function fitDistance(width: number, height: number, fovDeg: number, aspect: number, padding?: number): number; // bounds.ts
  ```

- [ ] **Step 1: Тесты укладчика**

`src/lib/atlas/explode-layout.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { explodeLayout, explodeOffset, type ExplodeCell } from "./explode-layout";
import type { Bounds } from "./types";

function box(
  id: string, w: number, h: number, d = 0.05, at: [number, number, number] = [0, 0, 0],
): { id: string; bounds: Bounds } {
  return {
    id,
    bounds: [
      [at[0] - w / 2, at[1] - h / 2, at[2] - d / 2],
      [at[0] + w / 2, at[1] + h / 2, at[2] + d / 2],
    ],
  };
}

function overlaps(a: ExplodeCell, b: ExplodeCell): boolean {
  const eps = 1e-9;
  return (
    Math.abs(a.x - b.x) < (a.width + b.width) / 2 - eps &&
    Math.abs(a.y - b.y) < (a.height + b.height) / 2 - eps
  );
}

const parts = Array.from({ length: 40 }, (_, i) => box(`P${i}`, 0.05 + (i % 7) * 0.03, 0.04 + (i % 5) * 0.05));

describe("explodeLayout", () => {
  it("каждая деталь получает ячейку; пустой список даёт пустую сетку", () => {
    const layout = explodeLayout(parts, 1.5);
    expect(layout.cells.size).toBe(parts.length);
    for (const p of parts) expect(layout.cells.has(p.id)).toBe(true);
    const empty = explodeLayout([], 1);
    expect(empty.cells.size).toBe(0);
    expect(empty.width).toBe(0);
    expect(empty.height).toBe(0);
  });

  it("ячейки не пересекаются", () => {
    const cells = [...explodeLayout(parts, 1).cells.values()];
    for (let i = 0; i < cells.length; i++)
      for (let j = i + 1; j < cells.length; j++) expect(overlaps(cells[i], cells[j])).toBe(false);
  });

  it("сетка центрирована, размер совпадает с крайними ячейками", () => {
    const layout = explodeLayout(parts, 1);
    const cells = [...layout.cells.values()];
    const left = Math.min(...cells.map((c) => c.x - c.width / 2));
    const right = Math.max(...cells.map((c) => c.x + c.width / 2));
    const top = Math.max(...cells.map((c) => c.y + c.height / 2));
    const bottom = Math.min(...cells.map((c) => c.y - c.height / 2));
    expect(left).toBeCloseTo(-layout.width / 2, 6);
    expect(right).toBeCloseTo(layout.width / 2, 6);
    expect(top).toBeCloseTo(layout.height / 2, 6);
    expect(bottom).toBeCloseTo(-layout.height / 2, 6);
  });

  it("детерминирована и не зависит от порядка входа", () => {
    const a = explodeLayout(parts, 1);
    const b = explodeLayout([...parts].reverse(), 1);
    expect([...a.cells.entries()]).toEqual([...b.cells.entries()]);
  });

  it("широкий экран даёт более широкую сетку", () => {
    expect(explodeLayout(parts, 1.5).width).toBeGreaterThan(explodeLayout(parts, 0.6).width);
  });

  it("крошечная деталь получает минимальную ячейку с полями", () => {
    const cell = explodeLayout([box("tiny", 0.001, 0.001)], 1).cells.get("tiny")!;
    expect(cell.width).toBeCloseTo(0.075);
    expect(cell.height).toBeCloseTo(0.075);
  });
});

describe("explodeOffset", () => {
  it("переносит центр детали в центр ячейки на высоте тела и в плоскость z = 0", () => {
    const part = box("P", 0.1, 0.2, 0.3, [1, 2, 3]);
    const cell = { x: -0.5, y: 0.25, width: 0.14, height: 0.24 };
    expect(explodeOffset(cell, part.bounds, 0.85)).toEqual([-0.5 - 1, 0.25 + 0.85 - 2, -3]);
  });
});
```

- [ ] **Step 2: Запустить — должно упасть**

Run: `pnpm vitest run src/lib/atlas/explode-layout.test.ts`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: Реализация укладчика**

`src/lib/atlas/explode-layout.ts`:

```ts
import type { Bounds } from "./types";

export interface ExplodeCell {
  /** Центр ячейки в плоскости XY сетки (единицы модели, метры). */
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ExplodeLayout {
  cells: Map<string, ExplodeCell>;
  width: number;
  height: number;
}

/** Меньше этого проекция детали не бывает: иначе кость запястья в сетке не найти. */
const MIN_SIZE = 0.035;
/** Поле вокруг каждой детали, чтобы соседи не касались. */
const PADDING = 0.04;

/**
 * Раскладка «инвентаря»: каждая видимая деталь получает ячейку по размеру
 * своей проекции на XY, ячейки укладываются рядами в сетку, пропорции
 * которой подстроены под экран (`aspect` = ширина / высота). Сетка
 * центрирована по обеим осям. Порт укладчика human-atlas.
 *
 * Детерминирована: сортировка по высоте, затем по id — одинаковый набор
 * деталей всегда даёт одинаковую сетку.
 */
export function explodeLayout(parts: { id: string; bounds: Bounds }[], aspect = 1): ExplodeLayout {
  if (parts.length === 0) return { cells: new Map(), width: 0, height: 0 };
  const cards = parts.map((p) => ({
    id: p.id,
    width: Math.max(MIN_SIZE, p.bounds[1][0] - p.bounds[0][0]) + PADDING,
    height: Math.max(MIN_SIZE, p.bounds[1][1] - p.bounds[0][1]) + PADDING,
  }));
  const area = cards.reduce((n, c) => n + c.width * c.height, 0);
  let maxWidth = 0.3;
  for (const c of cards) if (c.width > maxWidth) maxWidth = c.width;
  const targetWidth = Math.max(maxWidth, Math.sqrt(area * Math.max(0.5, Math.min(1.5, aspect))) * 1.18);
  cards.sort((a, b) => b.height - a.height || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  const cells = new Map<string, ExplodeCell>();
  let x = 0;
  let y = 0;
  let row = 0;
  let usedWidth = 0;
  for (const c of cards) {
    if (x > 0 && x + c.width > targetWidth) {
      x = 0;
      y += row;
      row = 0;
    }
    cells.set(c.id, { x: x + c.width / 2, y: -y - c.height / 2, width: c.width, height: c.height });
    x += c.width;
    usedWidth = Math.max(usedWidth, x);
    row = Math.max(row, c.height);
  }
  const height = y + row;
  for (const c of cells.values()) {
    c.x -= usedWidth / 2;
    c.y += height / 2;
  }
  return { cells, width: usedWidth, height };
}

/**
 * Смещение детали при полном разнесении: её центр ложится в центр ячейки,
 * сетка висит на высоте центра тела, все детали — в плоскости z = 0.
 */
export function explodeOffset(cell: ExplodeCell, bounds: Bounds, bodyCenterY: number): [number, number, number] {
  const cx = (bounds[0][0] + bounds[1][0]) / 2;
  const cy = (bounds[0][1] + bounds[1][1]) / 2;
  const cz = (bounds[0][2] + bounds[1][2]) / 2;
  return [cell.x - cx, cell.y + bodyCenterY - cy, -cz];
}
```

- [ ] **Step 4: Запустить тесты укладчика**

Run: `pnpm vitest run src/lib/atlas/explode-layout.test.ts`
Expected: PASS.

- [ ] **Step 5: Модуль текущей величины разнесения**

`src/lib/atlas/explode-amount.ts`:

```ts
/**
 * Текущая (анимированная) величина разнесения 0..1. Целевое значение лежит
 * в store, а это — то, что сейчас на экране: пишет BodyMeshes в useFrame,
 * читает CameraRig в том же кадре. Через store это не ходит: запись на
 * каждом кадре перерисовывала бы всех подписчиков.
 */
export const explodeAmount = { value: 0 };
```

- [ ] **Step 6: Подпись сцены — тест и реализация**

`src/lib/atlas/caption.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { captionFor } from "./caption";

describe("captionFor", () => {
  it("описывает состояние сцены по величине разнесения", () => {
    expect(captionFor(0, null)).toBe("Взрослый мужчина");
    expect(captionFor(0.05, null)).toBe("Взрослый мужчина");
    expect(captionFor(0.3, null)).toBe("Разнесённые структуры");
    expect(captionFor(0.95, null)).toBe("Разнесённые структуры");
    expect(captionFor(1, null)).toBe("Инвентарь");
  });

  it("при изоляции показывает имя структуры", () => {
    expect(captionFor(0, "Femur")).toBe("Femur");
    expect(captionFor(1, "Femur")).toBe("Femur");
  });
});
```

`src/lib/atlas/caption.ts`:

```ts
/** Подпись над доком: что сейчас на сцене. Пороги — как в human-atlas. */
export function captionFor(explode: number, isolatedName: string | null): string {
  if (isolatedName) return isolatedName;
  if (explode > 0.95) return "Инвентарь";
  if (explode > 0.05) return "Разнесённые структуры";
  return "Взрослый мужчина";
}
```

- [ ] **Step 7: fitDistance — тест и реализация**

Дописать в `src/lib/atlas/bounds.test.ts` (импортировать `fitDistance` из `./bounds`):

```ts
describe("fitDistance", () => {
  it("вписывает прямоугольник в кадр по большей из сторон с учётом пропорций экрана", () => {
    // fov 90° → tan(45°) = 1: расстояние равно половине вписываемой стороны × запас
    expect(fitDistance(2, 1, 90, 1, 1.35)).toBeCloseTo(1.35);
    // широкий экран: ширина 2 при aspect 2 занимает столько же, сколько высота 1
    expect(fitDistance(2, 1, 90, 2, 1)).toBeCloseTo(0.5);
    // высота важнее ширины
    expect(fitDistance(1, 3, 90, 1, 1)).toBeCloseTo(1.5);
  });
});
```

Добавить в `src/lib/atlas/bounds.ts`:

```ts
/**
 * Расстояние до камеры, с которого прямоугольник width×height, лежащий в
 * плоскости, перпендикулярной взгляду, целиком входит в кадр. `aspect` —
 * ширина/высота экрана, `padding` — запас по краям.
 */
export function fitDistance(width: number, height: number, fovDeg: number, aspect: number, padding = 1.35): number {
  const tan = Math.tan((fovDeg * Math.PI) / 360);
  return (Math.max(height, width / aspect) / 2 / tan) * padding;
}
```

- [ ] **Step 8: Все тесты и коммит**

Run: `pnpm test && pnpm typecheck && pnpm lint`
Expected: PASS.

```bash
git add src/lib/atlas/explode-layout.ts src/lib/atlas/explode-layout.test.ts src/lib/atlas/explode-amount.ts src/lib/atlas/caption.ts src/lib/atlas/caption.test.ts src/lib/atlas/bounds.ts src/lib/atlas/bounds.test.ts
git commit -m "feat(atlas): explode layout packer, scene caption and fitDistance

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: BodyMeshes — разнесение через матрицы инстансов

**Files:**
- Modify: `src/components/atlas/BodyMeshes.tsx`, `src/components/atlas/AtlasCanvas.tsx`

**Interfaces:**
- Consumes: `explodeLayout`, `explodeOffset` (Task 4), `explodeAmount` (Task 4), store поля `explode`, `setExplodeLayoutSize` (Task 3).
- Produces: `explodeAmount.value` обновляется каждый кадр, пока разнесение движется; `explodeLayoutSize` в store при каждом пересчёте раскладки.

- [ ] **Step 1: Импорты**

В начале `BodyMeshes.tsx` заменить строку импорта React и fiber:

```tsx
import { Fragment, useCallback, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
```

Добавить импорты:

```tsx
import { boundsCenter, unionBounds } from "@/lib/atlas/bounds";
import { explodeAmount } from "@/lib/atlas/explode-amount";
import { explodeLayout, explodeOffset } from "@/lib/atlas/explode-layout";
```

- [ ] **Step 2: Отключить отсечение всего батча по сфере**

В `buildBatch`, сразу после `mesh.perObjectFrustumCulled = true;`:

```tsx
  // Сфера всего батча считается по собранной модели; разнесённые детали
  // выходят за неё, и рендерер отсекал бы батч целиком. Отсечение по каждому
  // инстансу (perObjectFrustumCulled) остаётся — оно и экономит draw calls.
  mesh.frustumCulled = false;
```

- [ ] **Step 3: Раскладка и смещения**

В компоненте `BodyMeshes`, после `const select = useAtlasStore((s) => s.select);`:

```tsx
  const explode = useAtlasStore((s) => s.explode);
  const setExplodeLayoutSize = useAtlasStore((s) => s.setExplodeLayoutSize);
  // пропорции канваса: раскладка подстраивается под экран, но пересчитывается
  // с шагом 0.1, а не на каждый пиксель ресайза
  const aspect = useThree((s) => s.viewport.aspect);
  const aspectBucket = Math.round(aspect * 10) / 10;

  // сетка инвентаря висит на высоте центра собранного тела
  const bodyCenterY = useMemo(
    () => boundsCenter(unionBounds(data.manifest.parts.map((p) => p.bounds)))[1],
    [data.manifest],
  );

  // Смещение каждой видимой детали при полном разнесении. Пересчёт только при
  // смене набора видимых деталей или пропорций; скрытые детали смещения не получают.
  const offsets = useMemo(() => {
    const state = { visibleSystems, hiddenParts, isolatedPartId, restrictTo };
    const visible: AtlasPart[] = [];
    for (const b of batches) for (const p of b.parts) if (isPartVisible(state, p.id, b.system)) visible.push(p);
    const layout = explodeLayout(visible, aspectBucket);
    const map = new Map<string, [number, number, number]>();
    for (const p of visible) {
      const cell = layout.cells.get(p.id);
      if (cell) map.set(p.id, explodeOffset(cell, p.bounds, bodyCenterY));
    }
    return { map, size: { width: layout.width, height: layout.height } };
  }, [batches, visibleSystems, hiddenParts, isolatedPartId, restrictTo, aspectBucket, bodyCenterY]);

  useEffect(() => {
    setExplodeLayoutSize(offsets.size);
  }, [offsets, setExplodeLayoutSize]);

  // текущая величина разнесения живёт вне React: догоняет целевую в useFrame
  const matrix = useMemo(() => new THREE.Matrix4(), []);
  const applyExplode = useCallback(() => {
    const k = explodeAmount.value;
    for (const b of batches) {
      b.parts.forEach((part, i) => {
        const o = offsets.map.get(part.id);
        if (o) matrix.makeTranslation(o[0] * k, o[1] * k, o[2] * k);
        else matrix.identity();
        b.mesh.setMatrixAt(i, matrix);
      });
      // оверлей делит буферы с батчем и о матрицах инстансов не знает: при
      // разнесении он гаснет, выделение остаётся цветом (перекрытий там нет)
      b.overlay.visible = k < 0.01 && b.overlay.geometry.groups.length > 0;
    }
  }, [batches, offsets, matrix]);

  // При монтировании матрицы ставятся заново: батчи кэшируются между /atlas и
  // /quiz и могли остаться разнесёнными. При смене раскладки (включили слой)
  // уже разнесённые детали переезжают в новые ячейки сразу.
  useEffect(() => {
    applyExplode();
  }, [applyExplode]);

  useFrame((_, dt) => {
    // в тестах модель всегда собрана
    const target = restrictTo ? 0 : explode;
    if (explodeAmount.value === target) return;
    const next = THREE.MathUtils.damp(explodeAmount.value, target, 8, dt);
    explodeAmount.value = Math.abs(next - target) < 1e-4 ? target : next;
    applyExplode();
  });
```

Важно: `explodeAmount.value` при монтировании нового `BodyMeshes` надо обнулить, иначе после перехода `/atlas → /quiz` камера теста прочитает старое значение. Добавить перед `useFrame`:

```tsx
  useEffect(() => {
    explodeAmount.value = 0;
    applyExplode();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- только при монтировании
  }, []);
```

- [ ] **Step 4: Оверлей в эффекте видимости**

В существующем эффекте видимости заменить строку

```tsx
      b.overlay.visible = overlayGeometry.groups.length > 0;
```

на

```tsx
      b.overlay.visible = overlayGeometry.groups.length > 0 && explodeAmount.value < 0.01;
```

- [ ] **Step 5: Фон канваса**

В `AtlasCanvas.tsx` заменить `background: "#f4f4f2"` на `background: "#f3f4f4"`.

- [ ] **Step 6: Проверить**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: зелёное. (Визуально разнесение пока не вызвать — ползунок появится в Task 7/11; поведение можно проверить из консоли браузера позже.)

- [ ] **Step 7: Commit**

```bash
git add src/components/atlas/BodyMeshes.tsx src/components/atlas/AtlasCanvas.tsx
git commit -m "feat(atlas): explode the model through BatchedMesh instance matrices

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: CameraRig — ракурсы, автоповорот, кадр инвентаря

**Files:**
- Modify: `src/components/atlas/CameraRig.tsx`

**Interfaces:**
- Consumes: store `view`, `viewNonce`, `autoRotate`, `isolatedPartId`, `restrictTo`, `explodeLayoutSize`; `explodeAmount` (Task 4); `fitDistance` (Task 4).

- [ ] **Step 1: Импорты и направления ракурсов**

Заменить импорт bounds:

```tsx
import { boundsCenter, boundsRadius, cameraDistance, fitDistance, unionBounds } from "@/lib/atlas/bounds";
import { explodeAmount } from "@/lib/atlas/explode-amount";
import { useAtlasStore, type AtlasView } from "@/store/atlas-store";
```

(строку `import { useAtlasStore } from "@/store/atlas-store";` убрать — она заменена.)

После константы `SEARCH_BUDGET_MS` добавить:

```tsx
/** Направление «от цели к камере» для каждого ракурса. */
const VIEW_DIRECTIONS: Record<AtlasView, THREE.Vector3> = {
  "three-quarter": new THREE.Vector3(0.35, 0.06, 1).normalize(),
  front: new THREE.Vector3(0, 0.02, 1).normalize(),
  side: new THREE.Vector3(1, 0.02, 0).normalize(),
  back: new THREE.Vector3(0, 0.02, -1).normalize(),
};
```

- [ ] **Step 2: Подписки и кадр тела**

В `CameraRig`, после `const resetNonce = useAtlasStore((s) => s.resetNonce);`:

```tsx
  const view = useAtlasStore((s) => s.view);
  const viewNonce = useAtlasStore((s) => s.viewNonce);
  const autoRotate = useAtlasStore((s) => s.autoRotate);
  const isolated = useAtlasStore((s) => s.isolatedPartId !== null);
  const restricted = useAtlasStore((s) => s.restrictTo !== null);
  /** Величина разнесения на прошлом кадре: кадр сетки пересчитываем только пока она движется. */
  const lastAmount = useRef(0);

  // Кадр всего тела (или ограничения теста). restrictTo читается через getState(),
  // а не подпиской: кадр меняется только по nonce, не от самого ограничения —
  // setRestrict() вызывается, пока вопрос ещё на экране, и перекадрировка
  // там увела бы камеру от структуры, на которой студент.
  const bodyFrame = useCallback(() => {
    const restrictTo = useAtlasStore.getState().restrictTo;
    const framed = restrictTo ? manifest.parts.filter((p) => restrictTo[p.id]) : manifest.parts;
    // пустое ограничение и так всё скрывает; берём тело, чтобы unionBounds не бросил
    const all = unionBounds((framed.length > 0 ? framed : manifest.parts).map((p) => p.bounds));
    const lookAt = new THREE.Vector3(...boundsCenter(all));
    return { lookAt, dist: cameraDistance(boundsRadius(all), camera.fov, 1.1) };
  }, [manifest, camera]);
```

Добавить `useCallback` в импорт React: `import { useCallback, useEffect, useRef } from "react";`

- [ ] **Step 3: Начальный кадр с учётом ракурса**

Заменить тело эффекта начального кадрирования (тот, что с deps `[manifest, camera, resetNonce]`) на:

```tsx
  useEffect(() => {
    // cancel any in-flight fly-to, otherwise it overrides this framing
    target.current = null;
    const { lookAt, dist } = bodyFrame();
    const dir = VIEW_DIRECTIONS[useAtlasStore.getState().view];
    camera.position.copy(lookAt).addScaledVector(dir, dist);
    // eslint-disable-next-line react-hooks/immutability -- the three.js camera is external mutable state
    camera.near = 0.01;
    camera.far = dist * 10;
    camera.updateProjectionMatrix();
    controls.current?.target.copy(lookAt);
    controls.current?.update();
  }, [manifest, camera, resetNonce, bodyFrame]);
```

- [ ] **Step 4: Перелёт к ракурсу**

После эффекта фокуса добавить:

```tsx
  // выбор ракурса: перелёт к кадру тела с нужной стороны через ту же анимацию, что и фокус
  useEffect(() => {
    if (viewNonce === 0) return;
    const { lookAt, dist } = bodyFrame();
    target.current = { position: lookAt.clone().addScaledVector(VIEW_DIRECTIONS[view], dist), lookAt, t: 0 };
  }, [view, viewNonce, bodyFrame]);
```

- [ ] **Step 5: Кадр инвентаря, панорама и автоповорот в useFrame**

Заменить существующий `useFrame` на:

```tsx
  useFrame((_, dt) => {
    const ctl = controls.current;
    if (!ctl) return;
    const k = explodeAmount.value;

    // разнесённую сетку панорамируют, собранное тело вращают
    const exploded = k > 0.8;
    ctl.enableRotate = !exploded;
    ctl.mouseButtons.LEFT = exploded ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE;
    ctl.touches.ONE = exploded ? THREE.TOUCH.PAN : THREE.TOUCH.ROTATE;
    ctl.autoRotate = autoRotate && k < 0.4 && !isolated && !restricted;
    ctl.autoRotateSpeed = 0.65;

    // пока разнесение движется и больше 0.3, камера едет к сетке инвентаря:
    // выше 0.5 — строго спереди, ниже — с текущего ракурса; расстояние
    // интерполируется между кадром тела и кадром сетки
    const size = useAtlasStore.getState().explodeLayoutSize;
    if (size && k > 0.3 && Math.abs(k - lastAmount.current) > 1e-5) {
      const extent = (k - 0.3) / 0.7;
      const { lookAt, dist: bodyDist } = bodyFrame();
      const gridDist = Math.max(0.2, fitDistance(size.width, size.height, camera.fov, camera.aspect));
      const dist = THREE.MathUtils.lerp(bodyDist, gridDist, extent);
      const dir = k > 0.5 ? VIEW_DIRECTIONS.front : VIEW_DIRECTIONS[useAtlasStore.getState().view];
      camera.position.copy(lookAt).addScaledVector(dir, dist);
      ctl.target.copy(lookAt);
      ctl.update();
      target.current = null;
    }
    lastAmount.current = k;

    const t = target.current;
    if (!t) return;
    t.t = Math.min(1, t.t + dt / 0.4);
    const ease = 1 - Math.pow(1 - t.t, 3);
    camera.position.lerp(t.position, ease);
    ctl.target.lerp(t.lookAt, ease);
    ctl.update();
    if (t.t >= 1) target.current = null;
  });
```

- [ ] **Step 6: Проверить**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: зелёное.

Run: `pnpm exec playwright test e2e/atlas.spec.ts e2e/quiz.spec.ts --project=desktop`
Expected: PASS — поведение по умолчанию (ракурс «три четверти», разнесение 0) не ломает существующие сценарии. Если тест «clicking empty space deselects» упал из-за изменившегося кадра, проверить, что точка (40, h−40) всё ещё фон; при необходимости сдвинуть её на (20, h−20).

- [ ] **Step 7: Commit**

```bash
git add src/components/atlas/CameraRig.tsx
git commit -m "feat(atlas): camera presets, auto-rotate and inventory framing

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7: Презентационные компоненты студии

**Files:**
- Create: `src/components/atlas/Identity.tsx`, `src/components/atlas/ViewControls.tsx`, `src/components/atlas/ExplodeDock.tsx`, `src/components/atlas/SceneCaption.tsx`, `src/components/atlas/StudioFooter.tsx`
- Modify: `src/components/atlas/LoadingOverlay.tsx`

**Interfaces:**
- Consumes: Task 2 примитивы и иконки; Task 3 store; `plural` из `src/lib/progress/format.ts`.
- Produces:
  - `Identity({ partCount?: number })`
  - `ViewControls({ direction?: "column" | "row" })`
  - `ExplodeDock({ trailing?: ReactNode; className?: string })`
  - `SceneCaption({ text: string })`
  - `StudioFooter({ panning: boolean })`
  - `LoadingOverlay` — прежние пропсы.

- [ ] **Step 1: Identity**

```tsx
"use client";
import Link from "next/link";
import { plural } from "@/lib/progress/format";

/**
 * Заголовок студии слева сверху. Сам блок клики пропускает (под ним сцена),
 * кликабельны только ссылки разделов: шапки сайта на /atlas нет.
 */
export function Identity({ partCount }: { partCount?: number }) {
  return (
    <header className="pointer-events-none absolute left-4 top-4 z-10 md:left-8 md:top-7">
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-studio-muted">
        <span className="h-[5px] w-[5px] rounded-full bg-studio-accent shadow-[0_0_12px_rgba(69,138,133,0.4)]" />
        Интерактивная анатомия
      </div>
      <h1 className="mt-2 flex items-center gap-3 text-[28px] font-semibold leading-none tracking-[-1.3px] text-studio-fg md:text-[32px]">
        Анатомия
        <span className="rounded-md border border-studio-border px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-studio-muted">
          3D
        </span>
      </h1>
      <p className="mt-2 text-[11px] text-studio-muted" data-testid="atlas-meta">
        {partCount !== undefined && (
          <>
            {partCount.toLocaleString("ru-RU")} {plural(partCount, "структура", "структуры", "структур")}
            <span className="px-1.5 text-neutral-400">·</span>
          </>
        )}
        BodyParts3D
      </p>
      <nav
        className="pointer-events-auto mt-3 flex gap-3 text-[12px] text-studio-muted"
        aria-label="Разделы"
        data-testid="atlas-nav"
      >
        <Link href="/quiz" className="hover:text-studio-primary">Тесты</Link>
        <Link href="/cards" className="hover:text-studio-primary">Карточки</Link>
        <Link href="/progress" className="hover:text-studio-primary">Прогресс</Link>
        <Link href="/about" className="hover:text-studio-primary">Об источниках</Link>
      </nav>
    </header>
  );
}
```

- [ ] **Step 2: ViewControls**

```tsx
"use client";
import { IconButton } from "@/components/ui/IconButton";
import { PauseIcon, ResetIcon, RotateIcon } from "@/components/ui/icons";
import { useAtlasStore, type AtlasView } from "@/store/atlas-store";

const VIEWS: { id: AtlasView; short: string; label: string }[] = [
  { id: "three-quarter", short: "¾", label: "Три четверти" },
  { id: "front", short: "П", label: "Спереди" },
  { id: "side", short: "Б", label: "Сбоку" },
  { id: "back", short: "З", label: "Сзади" },
];

/** Ракурсы, автоповорот и сброс: колонка на десктопе, полоска на мобайле. */
export function ViewControls({ direction = "column" }: { direction?: "column" | "row" }) {
  const view = useAtlasStore((s) => s.view);
  const explode = useAtlasStore((s) => s.explode);
  const autoRotate = useAtlasStore((s) => s.autoRotate);
  const isolated = useAtlasStore((s) => s.isolatedPartId !== null);
  const setView = useAtlasStore((s) => s.setView);
  const toggleAutoRotate = useAtlasStore((s) => s.toggleAutoRotate);
  const reset = useAtlasStore((s) => s.reset);
  const column = direction === "column";
  return (
    <nav
      aria-label="Ракурсы"
      data-testid="view-controls"
      className={`glass flex gap-0.5 p-1 ${column ? "flex-col" : "flex-row"}`}
    >
      {VIEWS.map((v) => (
        <IconButton
          key={v.id}
          label={v.label}
          active={view === v.id}
          pressed={view === v.id}
          // в инвентаре смотреть можно только спереди
          disabled={explode > 0.8 && v.id !== "front"}
          onClick={() => setView(v.id)}
          className="h-11 w-11"
        >
          {v.short}
        </IconButton>
      ))}
      <i aria-hidden className={`bg-studio-border ${column ? "mx-1 my-1 h-px" : "mx-1 my-1 w-px self-stretch"}`} />
      <IconButton
        label={autoRotate ? "Остановить вращение" : "Вращать модель"}
        active={autoRotate}
        disabled={explode >= 0.4 || isolated}
        onClick={toggleAutoRotate}
        className="h-11 w-11"
      >
        {autoRotate ? <PauseIcon size={17} /> : <RotateIcon />}
      </IconButton>
      <IconButton label="Сброс вида и слоёв" onClick={reset} className="h-11 w-11">
        <ResetIcon size={17} />
      </IconButton>
    </nav>
  );
}
```

- [ ] **Step 3: ExplodeDock**

```tsx
"use client";
import type { ReactNode } from "react";
import { Slider } from "@/components/ui/Slider";
import { ResetIcon } from "@/components/ui/icons";
import { useAtlasStore } from "@/store/atlas-store";

/**
 * Док разнесения внизу. `trailing` — место для кнопки «Слои» на мобайле:
 * она стоит справа, подальше от левого нижнего угла с индикатором Next.js.
 */
export function ExplodeDock({ trailing, className = "" }: { trailing?: ReactNode; className?: string }) {
  const explode = useAtlasStore((s) => s.explode);
  const setExplode = useAtlasStore((s) => s.setExplode);
  const reset = useAtlasStore((s) => s.reset);
  const pct = Math.round(explode * 100);
  return (
    <div className={`glass flex items-center gap-4 px-4 py-3 md:gap-5 md:px-5 md:py-4 ${className}`} data-testid="explode-dock">
      <div className="min-w-0 flex-1">
        <div className="mb-2 flex items-center justify-between text-[12px] font-medium text-studio-fg">
          <label id="explode-label" htmlFor="explode-slider">Разнести модель</label>
          <output
            htmlFor="explode-slider"
            data-testid="explode-value"
            className="min-w-12 rounded-md border border-studio-border bg-neutral-100 px-2 py-0.5 text-center text-[12px] tabular-nums text-studio-primary"
          >
            {pct}<span className="ml-0.5 text-[10px] text-studio-muted">%</span>
          </output>
        </div>
        <Slider id="explode-slider" value={pct} onChange={(v) => setExplode(v / 100)} labelledBy="explode-label" />
        <div className="mt-1 flex justify-between text-[10px] text-studio-muted">
          <span>Собрано</span>
          <span>Каждая деталь</span>
        </div>
      </div>
      <button
        type="button"
        onClick={reset}
        aria-label="Собрать модель и сбросить вид"
        className="flex min-h-11 flex-col items-center justify-center gap-1 border-l border-studio-border pl-4 text-[10px] text-studio-muted hover:text-studio-primary md:pl-5"
      >
        <ResetIcon />
        <span>Сброс</span>
      </button>
      {trailing}
    </div>
  );
}
```

- [ ] **Step 4: SceneCaption и StudioFooter**

`SceneCaption.tsx`:

```tsx
/** Подпись состояния сцены над доком: текст считает captionFor(). */
export function SceneCaption({ text }: { text: string }) {
  return (
    <div
      className="pointer-events-none flex max-w-full items-center gap-3 text-center text-[9px] uppercase tracking-[0.11em] text-studio-muted md:text-[10px]"
      data-testid="scene-caption"
    >
      <span className="h-px w-6 shrink-0 bg-studio-border" />
      <span className="min-w-0 [overflow-wrap:anywhere]">{text}</span>
      <span className="h-px w-6 shrink-0 bg-studio-border" />
    </div>
  );
}
```

`StudioFooter.tsx`:

```tsx
import Link from "next/link";
import { ArrowUpRightIcon } from "@/components/ui/icons";

/** Подсказки по управлению и ссылка на источник (атрибуция CC BY 4.0 в интерфейсе). */
export function StudioFooter({ panning }: { panning: boolean }) {
  return (
    <footer className="pointer-events-none absolute inset-x-4 bottom-2 z-10 flex items-center justify-center text-[10px] text-studio-muted md:inset-x-8 md:bottom-5 md:justify-between md:text-[11px]">
      <span className="hidden md:inline">
        {panning ? "Тянуть, чтобы сдвинуть" : "Тянуть, чтобы вращать"}
        <b className="mx-2 font-normal text-neutral-400">·</b>
        Колёсико или щипок, чтобы приблизить
        <b className="mx-2 font-normal text-neutral-400">·</b>
        Нажать, чтобы узнать
      </span>
      <Link
        href="/about"
        data-testid="source-link"
        className="pointer-events-auto flex min-h-6 items-center gap-1 hover:text-studio-primary"
      >
        Источник и лицензия <ArrowUpRightIcon size={12} />
      </Link>
    </footer>
  );
}
```

- [ ] **Step 5: LoadingOverlay в стиле студии**

Заменить содержимое `LoadingOverlay.tsx`:

```tsx
"use client";

export function LoadingOverlay({
  loaded, total, error, onRetry,
}: { loaded: number; total: number; error?: string; onRetry?: () => void }) {
  const pct = total > 0 ? Math.round((loaded / total) * 100) : 0;
  return (
    <div
      className="absolute inset-0 z-20 flex items-center justify-center bg-studio-bg/70"
      role={error ? "alert" : "status"}
    >
      <div className="glass flex min-w-[290px] max-w-[90vw] items-start gap-4 px-6 py-5">
        {error ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-studio-fg">{error}</p>
            <button
              onClick={onRetry}
              className="self-start rounded-lg border border-studio-border px-4 py-2 text-sm text-studio-primary hover:bg-neutral-900/5"
            >
              Повторить
            </button>
          </div>
        ) : (
          <>
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-studio-accent" />
            <div className="flex-1">
              <strong className="block text-[15px] font-medium text-studio-fg">Готовим модель</strong>
              <span className="mt-1.5 block text-[12px] text-studio-muted">{pct} % · загружаем геометрию</span>
              <div className="mt-3 h-0.5 min-w-[200px] bg-studio-border">
                <i className="block h-full bg-studio-accent transition-[width] duration-300" style={{ width: `${pct}%` }} />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Проверить и закоммитить**

Run: `pnpm typecheck && pnpm lint`
Expected: зелёное.

```bash
git add src/components/atlas/Identity.tsx src/components/atlas/ViewControls.tsx src/components/atlas/ExplodeDock.tsx src/components/atlas/SceneCaption.tsx src/components/atlas/StudioFooter.tsx src/components/atlas/LoadingOverlay.tsx
git commit -m "feat(atlas): identity, view controls, explode dock, caption and footer for the studio

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 8: SystemsPanel

**Files:**
- Create: `src/components/atlas/SystemsPanel.tsx`

**Interfaces:**
- Consumes: `Switch` (Task 2), store (Task 3), `plural`.
- Produces: `SystemsPanel({ manifest: AtlasManifest; variant?: "aside" | "sheet" })`.

- [ ] **Step 1: Компонент**

```tsx
"use client";
import { useMemo } from "react";
import { Switch } from "@/components/ui/Switch";
import { SYSTEMS } from "@/lib/atlas/systems";
import type { AtlasManifest, SystemId } from "@/lib/atlas/types";
import { plural } from "@/lib/progress/format";
import { isPartVisible, useAtlasStore } from "@/store/atlas-store";

/** Чип «Органы»: внутренние органы без сосудов, нервов и опорно-двигательного аппарата. */
const ORGAN_SYSTEMS: SystemId[] = ["cardiac", "respiratory", "digestive", "urinary", "endocrine", "reproductive"];

export type SystemsPanelVariant = "aside" | "sheet";

/**
 * Панель систем: чипы-наборы, строка на систему (точка цвета, название,
 * число структур, тумблер), подвал со счётчиком видимых структур.
 * `aside` — стеклянная панель десктопа; `sheet` — содержимое шторки на
 * мобайле (цели касания ≥ 44 px, отступ справа под крестик шторки).
 */
export function SystemsPanel({ manifest, variant = "aside" }: { manifest: AtlasManifest; variant?: SystemsPanelVariant }) {
  const visible = useAtlasStore((s) => s.visibleSystems);
  const hiddenParts = useAtlasStore((s) => s.hiddenParts);
  const isolatedPartId = useAtlasStore((s) => s.isolatedPartId);
  const restrictTo = useAtlasStore((s) => s.restrictTo);
  const setSystemVisible = useAtlasStore((s) => s.setSystemVisible);
  const showOnlySystems = useAtlasStore((s) => s.showOnlySystems);
  const hideAllSystems = useAtlasStore((s) => s.hideAllSystems);

  // число структур в каждой системе — из манифеста, один раз
  const counts = useMemo(() => {
    const c = Object.fromEntries(SYSTEMS.map((s) => [s.id, 0])) as Record<SystemId, number>;
    for (const p of manifest.parts) c[p.system]++;
    return c;
  }, [manifest]);
  const systems = useMemo(() => SYSTEMS.filter((s) => counts[s.id] > 0), [counts]);

  const visibleCount = useMemo(() => {
    const state = { visibleSystems: visible, hiddenParts, isolatedPartId, restrictTo };
    let n = 0;
    for (const p of manifest.parts) if (isPartVisible(state, p.id, p.system)) n++;
    return n;
  }, [manifest, visible, hiddenParts, isolatedPartId, restrictTo]);

  const onCount = systems.filter((s) => visible[s.id]).length;
  // чип подсвечен, когда включён ровно его набор систем
  const isExactly = (ids: SystemId[]) => onCount === ids.length && ids.every((id) => visible[id]);
  const presets: { label: string; ids: SystemId[] }[] = [
    { label: "Все", ids: systems.map((s) => s.id) },
    { label: "Скелет", ids: ["skeletal"] },
    { label: "Органы", ids: ORGAN_SYSTEMS },
  ];

  const sheet = variant === "sheet";
  const Shell = sheet ? "div" : "aside";
  return (
    <Shell
      className={sheet ? "flex flex-col pr-8 text-sm" : "glass flex h-full w-[254px] flex-col px-3.5 pt-4"}
      {...(sheet ? {} : { "aria-label": "Системы" })}
      data-testid="systems-panel"
    >
      <div className="flex items-center justify-between px-1 text-[13px] font-semibold text-studio-fg">
        <span>Системы</span>
        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium tabular-nums text-studio-muted">
          {systems.length}
        </span>
      </div>
      <div className="my-3 flex gap-0.5 rounded-lg bg-neutral-100 p-0.5" role="group" aria-label="Наборы систем">
        {presets.map((p) => {
          const on = isExactly(p.ids);
          return (
            <button
              key={p.label}
              type="button"
              aria-pressed={on}
              onClick={() => showOnlySystems(p.ids)}
              className={`flex-1 rounded-md text-[11px] font-medium transition-colors ${sheet ? "min-h-11 text-[12px]" : "min-h-8"} ${
                on ? "bg-white text-studio-fg shadow-sm" : "text-studio-muted hover:text-studio-fg"
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>
      <ul className="flex min-h-0 flex-1 flex-col overflow-y-auto pr-1">
        {systems.map((s) => {
          const on = visible[s.id];
          return (
            <li key={s.id} className={`flex items-center gap-2 ${sheet ? "min-h-11" : "min-h-[35px]"}`}>
              <button
                type="button"
                title={`Показать только: ${s.ru.toLowerCase()}`}
                onClick={() => showOnlySystems([s.id])}
                className={`flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 py-1 text-left text-[12px] hover:bg-neutral-900/5 ${
                  on ? "text-studio-fg" : "text-neutral-400"
                } ${sheet ? "text-[13px]" : ""}`}
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: s.color }} />
                <span className="truncate">{s.ru}</span>
                <span className="ml-auto text-[10px] tabular-nums text-studio-muted">{counts[s.id]}</span>
              </button>
              <Switch checked={on} onChange={(next) => setSystemVisible(s.id, next)} label={s.ru} />
            </li>
          );
        })}
      </ul>
      <div className="mt-2 flex min-h-11 items-center justify-between border-t border-studio-border px-1 text-[10px] text-studio-muted">
        <span data-testid="visible-count">
          Видно {visibleCount.toLocaleString("ru-RU")} {plural(visibleCount, "структура", "структуры", "структур")}
        </span>
        <button type="button" onClick={hideAllSystems} className="min-h-11 px-1 hover:text-studio-primary">
          Скрыть все
        </button>
      </div>
    </Shell>
  );
}
```

- [ ] **Step 2: Проверить и закоммитить**

Run: `pnpm typecheck && pnpm lint`
Expected: зелёное.

```bash
git add src/components/atlas/SystemsPanel.tsx
git commit -m "feat(atlas): systems panel with switches, counts and presets

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 9: SearchPanel

**Files:**
- Create: `src/components/atlas/SearchPanel.tsx`

**Interfaces:**
- Produces: `SearchPanel({ manifest, content, onPick(id: string): void, onClose(): void })`.

- [ ] **Step 1: Компонент**

```tsx
"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { CloseIcon } from "@/components/ui/icons";
import { buildIndex, search } from "@/lib/atlas/search";
import type { AtlasManifest } from "@/lib/atlas/types";
import { searchLabels, sideLabel } from "@/lib/content/names";
import type { ContentBundle } from "@/lib/content/types";

/**
 * Выезжающая панель поиска. Ищет сразу по английскому, латыни, русскому и
 * синонимам; результат отдаёт id структуры. Escape и крестик закрывают.
 */
export function SearchPanel({
  manifest, content, onPick, onClose,
}: { manifest: AtlasManifest; content: ContentBundle; onPick(id: string): void; onClose(): void }) {
  const [q, setQ] = useState("");
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    input.current?.focus();
  }, []);
  const index = useMemo(
    () => buildIndex(manifest.parts.map((p) => ({ id: p.id, labels: searchLabels(p.name, content.structures[p.id]) }))),
    [manifest, content],
  );
  const byId = useMemo(() => new Map(manifest.parts.map((p) => [p.id, p])), [manifest]);
  const results = useMemo(() => (q.trim().length < 2 ? [] : search(index, q, 12)), [index, q]);
  const short = q.trim().length < 2;
  return (
    <section
      className="glass flex flex-col gap-2 p-3 md:p-4"
      aria-label="Найти структуру"
      data-testid="search-panel"
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div className="flex items-center justify-between text-[13px] font-semibold text-studio-fg">
        <span>Найти структуру</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрыть поиск"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-studio-muted hover:bg-neutral-900/5"
        >
          <CloseIcon />
        </button>
      </div>
      <input
        ref={input}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Сердце, femur, бедренная кость…"
        aria-label="Поиск структуры"
        // 16 px на мобайле: иначе iOS приближает страницу при фокусе
        className="h-11 w-full rounded-lg border border-studio-border bg-neutral-50 px-3 text-[16px] text-studio-fg outline-none focus:border-studio-accent md:text-[14px]"
      />
      {results.length > 0 ? (
        <ul className="max-h-72 overflow-y-auto" role="listbox" aria-label="Результаты поиска">
          {results.map((id) => {
            const part = byId.get(id);
            const entry = content.structures[id];
            const primary = entry?.ru ?? part?.name ?? id;
            const side = entry ? sideLabel(entry.side) : "";
            return (
              <li key={id}>
                <button
                  type="button"
                  className="flex min-h-11 w-full items-center gap-2 rounded-md px-2 text-left text-[14px] text-studio-fg hover:bg-neutral-900/5"
                  onClick={() => {
                    onPick(id);
                    setQ("");
                  }}
                >
                  <span className="font-medium">{primary}{side && ` (${side})`}</span>
                  {entry?.la && <span className="italic text-studio-muted">{entry.la}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-[12px] leading-relaxed text-studio-muted">
          {short
            ? "Начните с органа или кости. Ищется по русскому, латыни и английскому."
            : "Ничего не нашлось. Попробуйте другое слово."}
        </p>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Проверить и закоммитить**

Run: `pnpm typecheck && pnpm lint`

```bash
git add src/components/atlas/SearchPanel.tsx
git commit -m "feat(atlas): search panel for the studio

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 10: PartCard — новый стиль и «Входящие структуры»

**Files:**
- Modify: `src/components/atlas/PartCard.tsx`

**Interfaces:**
- Produces:
  ```ts
  PartCard({
    partId: string; names: DisplayNames; systemRu: string; systemColor: string; isolated: boolean; topicId?: string;
    siblings: { id: string; label: string }[]; variant?: "card" | "sheet";
    onHide(): void; onIsolate(): void; onClearIsolation(): void; onClose(): void; onPickSibling(id: string): void;
  })
  ```

- [ ] **Step 1: Переписать компонент**

```tsx
"use client";
import Link from "next/link";
import { ChevronRightIcon, CloseIcon, FocusIcon } from "@/components/ui/icons";
import type { DisplayNames } from "@/lib/content/names";

export type { DisplayNames };

export type PartCardVariant = "card" | "sheet";

/**
 * Карточка структуры. `card` — стеклянная, плавает справа на десктопе с
 * отступом от колонки ракурсов; `sheet` — содержимое нижней шторки на мобайле.
 * `siblings` — другие меши того же понятия (conceptId): у 243 понятий их
 * несколько, и клик переводит выделение на них.
 */
export function PartCard({
  partId, names, systemRu, systemColor, isolated, topicId, siblings, variant = "card",
  onHide, onIsolate, onClearIsolation, onClose, onPickSibling,
}: {
  partId: string; names: DisplayNames; systemRu: string; systemColor: string; isolated: boolean; topicId?: string;
  siblings: { id: string; label: string }[]; variant?: PartCardVariant;
  onHide(): void; onIsolate(): void; onClearIsolation(): void; onClose(): void; onPickSibling(id: string): void;
}) {
  const shell = variant === "sheet"
    ? "flex flex-col pr-8"
    : "glass absolute right-[88px] top-24 z-10 flex max-h-[calc(100dvh-290px)] w-[310px] flex-col p-6";
  return (
    <section className={shell} data-testid="part-card" data-part-id={partId}>
      {variant === "card" && (
        <button
          onClick={onClose}
          aria-label="Закрыть"
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-lg text-studio-muted hover:bg-neutral-900/5"
        >
          <CloseIcon />
        </button>
      )}
      <div className="flex shrink-0 flex-col gap-2.5 pr-6">
        <span className="h-1 w-7 rounded-full" style={{ background: systemColor }} />
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-studio-muted">{systemRu}</p>
        <h2
          className="text-[25px] font-semibold leading-tight tracking-[-0.75px] text-studio-fg [overflow-wrap:anywhere]"
          data-testid="part-la"
        >
          {names.la || names.en}
        </h2>
      </div>
      <div className="mt-3 flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto">
        {/* чтение латыни: квадратные скобки — привычная в словарях рамка транскрипции */}
        {names.laRu && (
          <p className="break-words text-sm text-studio-muted" data-testid="part-la-ru">[{names.laRu}]</p>
        )}
        <p className="text-[15px] leading-relaxed text-studio-fg" data-testid="part-ru">
          {names.translated ? `${names.ru}${names.sideRu ? ` (${names.sideRu})` : ""}` : "Перевод в работе"}
        </p>
        <p className="text-[12px] text-studio-muted" data-testid="part-en">{names.en}</p>
        {names.topicRu && <p className="text-[11px] text-studio-muted" data-testid="part-topic">{names.topicRu}</p>}
        {/* у непереведённой структуры нет ни латыни, ни русского — карточек по ней не собрать */}
        {names.translated && topicId && (
          <Link
            href={`/cards?topic=${topicId}`}
            data-testid="part-cards-link"
            className="inline-block text-[13px] text-studio-accent hover:underline"
          >
            Учить карточки темы
          </Link>
        )}
        {siblings.length > 0 && (
          <div className="border-t border-studio-border pt-3" data-testid="part-siblings">
            <h3 className="text-[11px] text-studio-muted">Входящие структуры</h3>
            <ul>
              {siblings.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => onPickSibling(s.id)}
                    className="flex min-h-10 w-full items-center justify-between gap-2 border-b border-studio-border py-2 text-left text-[12px] text-studio-fg hover:text-studio-primary"
                  >
                    <span>{s.label}</span>
                    <ChevronRightIcon size={14} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div className="mt-3 flex shrink-0 flex-col gap-1 border-t border-studio-border pt-3">
        <button
          type="button"
          onClick={isolated ? onClearIsolation : onIsolate}
          data-testid="part-isolate"
          className="flex min-h-11 items-center gap-2 rounded-lg bg-studio-primary px-3 text-[12px] font-medium text-white hover:bg-[#3b5261]"
        >
          <FocusIcon />
          {isolated ? "Показать окружение" : "Изолировать структуру"}
          <ChevronRightIcon size={14} className="ml-auto" />
        </button>
        <div className="flex gap-1 text-[12px] text-studio-muted">
          <button onClick={onHide} className="min-h-9 flex-1 rounded-lg px-2 hover:bg-neutral-900/5">Скрыть</button>
          <button onClick={onClose} className="min-h-9 flex-1 rounded-lg px-2 hover:bg-neutral-900/5">Снять выделение</button>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Проверить типы**

Run: `pnpm typecheck`
Expected: ошибки только в `AtlasScreen.tsx` (старые пропсы) — их чинит Task 11. Если ошибок нет вовсе, тоже нормально.

- [ ] **Step 3: Commit**

```bash
git add src/components/atlas/PartCard.tsx
git commit -m "feat(atlas): glass part card with sibling structures and isolate action

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 11: AtlasScreen — компоновка студии, удаление старых панелей, e2e

**Files:**
- Modify: `src/components/atlas/AtlasScreen.tsx`, `e2e/atlas.spec.ts`, `e2e/mobile.spec.ts`
- Delete: `src/components/atlas/LayerPanel.tsx`, `src/components/atlas/SearchBox.tsx`

- [ ] **Step 1: Переписать AtlasScreen**

```tsx
"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Sheet } from "@/components/ui/Sheet";
import { InfoIcon, LayersIcon, SearchIcon } from "@/components/ui/icons";
import { useAtlasData } from "@/hooks/use-atlas-data";
import { useIsMobile } from "@/hooks/use-media-query";
import { captionFor } from "@/lib/atlas/caption";
import { SYSTEM_BY_ID } from "@/lib/atlas/systems";
import type { AtlasManifest, AtlasPart } from "@/lib/atlas/types";
import { displayNames, sideLabel } from "@/lib/content/names";
import type { ContentBundle } from "@/lib/content/types";
import { useAtlasStore } from "@/store/atlas-store";
import { AtlasCanvas } from "./AtlasCanvas";
import { ExplodeDock } from "./ExplodeDock";
import { Identity } from "./Identity";
import { LoadingOverlay } from "./LoadingOverlay";
import { PartCard } from "./PartCard";
import { SceneCaption } from "./SceneCaption";
import { SearchPanel } from "./SearchPanel";
import { StudioFooter } from "./StudioFooter";
import { SystemsPanel } from "./SystemsPanel";
import { ViewControls } from "./ViewControls";
import { WebGLGate } from "./WebGLGate";

type Panel = "search" | "layers" | null;

// латынь/русский из structures.json; без записи остаётся только английское имя
function getPartNames(part: AtlasPart, content: ContentBundle) {
  return displayNames(part.name, content.structures[part.id], content.topics, content.stress);
}

// короткая подпись соседа по понятию: «Бедренная кость (справа)» или английское имя
function shortLabel(part: AtlasPart, content: ContentBundle): string {
  const entry = content.structures[part.id];
  if (!entry) return part.name;
  const side = sideLabel(entry.side);
  return side ? `${entry.ru} (${side})` : entry.ru;
}

/** Части, сгруппированные по понятию (conceptId): для блока «Входящие структуры». */
function groupByConcept(manifest: AtlasManifest): Map<string, AtlasPart[]> {
  const map = new Map<string, AtlasPart[]>();
  for (const p of manifest.parts) {
    const list = map.get(p.conceptId) ?? [];
    list.push(p);
    map.set(p.conceptId, list);
  }
  return map;
}

export function AtlasScreen() {
  const state = useAtlasData();
  const isMobile = useIsMobile();
  const [panel, setPanel] = useState<Panel>(null);
  const closePanel = useCallback(() => setPanel(null), []);
  const togglePanel = useCallback((next: Exclude<Panel, null>) => setPanel((p) => (p === next ? null : next)), []);
  const [ready, setReady] = useState(false);
  const onReady = useCallback(() => setReady(true), []);
  const selectedPartId = useAtlasStore((s) => s.selectedPartId);
  const isolatedPartId = useAtlasStore((s) => s.isolatedPartId);
  const explode = useAtlasStore((s) => s.explode);
  const select = useAtlasStore((s) => s.select);
  const closePart = useCallback(() => select(null), [select]);
  const hidePart = useAtlasStore((s) => s.hidePart);
  const isolate = useAtlasStore((s) => s.isolate);
  const reveal = useAtlasStore((s) => s.reveal);
  const showOnlySystems = useAtlasStore((s) => s.showOnlySystems);

  const manifest = state.status === "ready" ? state.data.manifest : null;
  const partById = useMemo(
    () => new Map<string, AtlasPart>(manifest ? manifest.parts.map((p) => [p.id, p]) : []),
    [manifest],
  );
  const byConcept = useMemo(() => (manifest ? groupByConcept(manifest) : new Map<string, AtlasPart[]>()), [manifest]);
  const selected = selectedPartId ? partById.get(selectedPartId) : undefined;
  const isolated = isolatedPartId ? partById.get(isolatedPartId) : undefined;

  // «/» открывает поиск (кроме набора текста в поле), Escape закрывает панель
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target;
      const typing = t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement;
      if (e.key === "/" && !typing) {
        e.preventDefault();
        setPanel("search");
      } else if (e.key === "Escape") {
        setPanel(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ?focus=<partId> — глубокая ссылка из разбора ошибок теста: включает систему
  // структуры и наводит камеру, но ровно один раз на id, иначе клик по другой
  // части тут же отменялся бы обратным фокусом. Сначала набор систем, потом
  // reveal: смена набора снимает выделение, а reveal его ставит.
  const focus = useSearchParams().get("focus");
  const focused = useRef<string | null>(null);
  useEffect(() => {
    if (focus === null || focused.current === focus) return;
    const part = partById.get(focus);
    if (!part) return;
    focused.current = focus;
    // мышцы по умолчанию включены и закрывают кость: оставляем скелет (ориентир)
    // и систему структуры — остальные слои возвращаются тумблерами
    showOnlySystems(["skeletal", part.system]);
    reveal(focus, part.system);
  }, [focus, partById, reveal, showOnlySystems]);

  const caption = captionFor(
    explode,
    isolated && state.status === "ready" ? getPartNames(isolated, state.data.content).la || isolated.name : null,
  );

  // общие пропсы карточки для обоих вариантов раскладки
  const partCardProps = (part: AtlasPart, content: ContentBundle) => ({
    partId: part.id,
    names: getPartNames(part, content),
    systemRu: SYSTEM_BY_ID[part.system].ru,
    systemColor: SYSTEM_BY_ID[part.system].color,
    isolated: isolatedPartId === part.id,
    topicId: content.structures[part.id]?.topic,
    siblings: (byConcept.get(part.conceptId) ?? [])
      .filter((p) => p.id !== part.id)
      .map((p) => ({ id: p.id, label: shortLabel(p, content) })),
    onHide: () => hidePart(part.id),
    onIsolate: () => isolate(part.id),
    onClearIsolation: () => isolate(null),
    onClose: closePart,
    onPickSibling: (id: string) => {
      const sibling = partById.get(id);
      if (sibling) reveal(id, sibling.system);
    },
  });

  const layersButton = (
    <button
      type="button"
      onClick={() => togglePanel("layers")}
      data-testid="layers-toggle"
      aria-label="Открыть слои"
      className="flex min-h-11 min-w-11 flex-col items-center justify-center gap-1 border-l border-studio-border pl-3 text-[10px] text-studio-muted"
    >
      <LayersIcon size={20} />
      <span>Слои</span>
    </button>
  );

  return (
    <div className="relative h-full w-full" data-atlas-ready={ready ? "true" : "false"}>
      <WebGLGate>
        <Identity partCount={manifest?.parts.length} />
        {state.status === "loading" && <LoadingOverlay loaded={state.loaded} total={state.total} />}
        {state.status === "error" && (
          <LoadingOverlay loaded={0} total={0} error={state.message} onRetry={state.retry} />
        )}
        {state.status === "ready" && (
          <>
            {/* the canvas must mount so the synchronous BatchedMesh build runs; the
                overlay stays on top of it until BodyMeshes reports it is ready */}
            <AtlasCanvas data={state.data} onReady={onReady} />
            <div className="studio-vignette" />

            {/* справа сверху: поиск и «об источниках» */}
            <div className="absolute right-3 top-4 z-10 flex items-center gap-2 md:right-8 md:top-7">
              <button
                type="button"
                onClick={() => togglePanel("search")}
                data-testid="search-toggle"
                aria-label="Найти структуру"
                className="glass flex h-11 items-center gap-2 px-3 text-[12px] text-studio-muted hover:text-studio-primary md:px-4"
              >
                <SearchIcon />
                <span className="hidden md:inline">Найти структуру</span>
                <kbd className="hidden rounded border border-studio-border px-1.5 text-[11px] opacity-60 md:inline">/</kbd>
              </button>
              <Link
                href="/about"
                aria-label="Об источниках"
                className="glass flex h-11 w-11 items-center justify-center text-studio-muted hover:text-studio-primary"
              >
                <InfoIcon />
              </Link>
            </div>
            {panel === "search" && (
              <div className="absolute inset-x-3 top-[200px] z-20 md:inset-x-auto md:right-8 md:top-[88px] md:w-[350px]">
                {/* search covers all systems, most of which are hidden by default — reveal
                    the hit's system (and unhide/un-isolate it) before flying the camera there */}
                <SearchPanel
                  manifest={state.data.manifest}
                  content={state.data.content}
                  onClose={closePanel}
                  onPick={(id) => {
                    const part = partById.get(id);
                    if (part) reveal(id, part.system);
                    setPanel(null);
                  }}
                />
              </div>
            )}

            {/* системы: панель на десктопе, шторка на мобайле */}
            {!isMobile && (
              <div className="absolute bottom-[175px] left-8 top-[190px] z-10">
                <SystemsPanel manifest={state.data.manifest} variant="aside" />
              </div>
            )}
            {isMobile && (
              <Sheet open={panel === "layers"} onClose={closePanel} label="Слои" testId="layers-sheet">
                <SystemsPanel manifest={state.data.manifest} variant="sheet" />
              </Sheet>
            )}

            {/* ракурсы: колонка справа на десктопе, полоска под заголовком на мобайле */}
            <div
              className={
                isMobile
                  ? "absolute inset-x-0 top-[140px] z-10 flex justify-center"
                  : "absolute right-8 top-1/2 z-10 -translate-y-1/2"
              }
            >
              <ViewControls direction={isMobile ? "row" : "column"} />
            </div>

            {/* подпись и док разнесения */}
            <div className="absolute inset-x-3 bottom-16 z-10 flex flex-col items-center gap-3 md:inset-x-auto md:bottom-[54px] md:left-1/2 md:w-[460px] md:-translate-x-1/2">
              <SceneCaption text={caption} />
              <ExplodeDock className="w-full" trailing={isMobile ? layersButton : undefined} />
            </div>
            <StudioFooter panning={explode > 0.8} />

            {/* ровно один экземпляр карточки: на десктопе — плавающая, на мобайле —
                в шторке; иначе тестовые id задвоились бы */}
            {selected && !isMobile && <PartCard {...partCardProps(selected, state.data.content)} variant="card" />}
            {selected && isMobile && (
              <Sheet open onClose={closePart} label="Структура" testId="part-sheet">
                <PartCard {...partCardProps(selected, state.data.content)} variant="sheet" />
              </Sheet>
            )}
            {!ready && <LoadingOverlay loaded={1} total={1} />}
          </>
        )}
      </WebGLGate>
    </div>
  );
}
```

- [ ] **Step 2: Удалить старые панели**

```bash
git rm src/components/atlas/LayerPanel.tsx src/components/atlas/SearchBox.tsx
```

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: зелёное. Если `grep -rn "LayerPanel\|SearchBox" src` что-то находит — починить импорт.

- [ ] **Step 3: Подстроить e2e атласа**

В `e2e/atlas.spec.ts`:

1. В трёх тестах поиска (`search focuses…`, `search in russian…`, `search reveals…`) перед `page.getByLabel("Поиск структуры").fill(...)` добавить:
   ```ts
   await page.getByTestId("search-toggle").click();
   ```
2. В тесте «clicking empty space deselects» заменить комментарий и клик на:
   ```ts
   // Правый нижний угол под доком — фон при кадре по умолчанию: слева внизу
   // панель систем, справа по центру ракурсы, внизу по центру док.
   await canvas.click({ position: { x: box.width - 30, y: box.height - 30 } });
   ```
3. Дописать новые тесты в конец файла:

```ts
test("тумблер системы включает слой и меняет число видимых структур", async ({ page }) => {
  await page.goto("/atlas");
  await expect(page.locator("[data-atlas-ready='true']")).toBeVisible({ timeout: 90_000 });

  const count = page.getByTestId("visible-count");
  const read = async () => Number((await count.textContent())?.replace(/\D/g, ""));
  const before = await read();

  const arteries = page.getByLabel("Артерии");
  await expect(arteries).not.toBeChecked();
  await arteries.click();
  await expect(arteries).toBeChecked();
  await expect.poll(read).toBeGreaterThan(before);
});

test("чип «Скелет» оставляет один включённый тумблер", async ({ page }) => {
  await page.goto("/atlas");
  await expect(page.locator("[data-atlas-ready='true']")).toBeVisible({ timeout: 90_000 });

  await page.getByRole("button", { name: "Скелет", exact: true }).click();
  await expect(page.getByRole("button", { name: "Скелет", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("switch", { checked: true })).toHaveCount(1);
  await expect(page.getByLabel("Кости")).toBeChecked();
});

test("ползунок разносит модель: подпись «Инвентарь», ракурс только спереди", async ({ page }) => {
  await page.goto("/atlas");
  await expect(page.locator("[data-atlas-ready='true']")).toBeVisible({ timeout: 90_000 });

  await page.locator("#explode-slider").fill("100");
  await expect(page.getByTestId("explode-value")).toHaveText("100%");
  await expect(page.getByTestId("scene-caption")).toHaveText(/инвентарь/i);
  await expect(page.getByRole("button", { name: "Спереди" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Сбоку" })).toBeDisabled();

  // сброс собирает модель
  await page.getByRole("button", { name: "Собрать модель и сбросить вид" }).click();
  await expect(page.getByTestId("explode-value")).toHaveText("0%");
  await expect(page.getByRole("button", { name: "Сбоку" })).toBeEnabled();
});

test("кнопка ракурса подсвечивается", async ({ page }) => {
  await page.goto("/atlas");
  await expect(page.locator("[data-atlas-ready='true']")).toBeVisible({ timeout: 90_000 });

  await page.getByRole("button", { name: "Сбоку" }).click();
  await expect(page.getByRole("button", { name: "Сбоку" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Три четверти" })).toHaveAttribute("aria-pressed", "false");
});

test("клавиша «/» открывает поиск, ссылка на источник ведёт на /about", async ({ page }) => {
  await page.goto("/atlas");
  await expect(page.locator("[data-atlas-ready='true']")).toBeVisible({ timeout: 90_000 });

  await page.keyboard.press("/");
  await expect(page.getByLabel("Поиск структуры")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("search-panel")).toBeHidden();

  await expect(page.getByTestId("source-link")).toHaveAttribute("href", "/about");
});

test("карточка понятия из нескольких мешей показывает входящие структуры", async ({ page }) => {
  // FJ3259 — левая бедренная кость; у понятия «femur» есть и правая
  await page.goto("/atlas?focus=FJ3259");
  await expect(page.locator("[data-atlas-ready='true']")).toBeVisible({ timeout: 90_000 });

  const siblings = page.getByTestId("part-siblings");
  await expect(siblings).toBeVisible();
  await siblings.getByRole("button").first().click();
  await expect(page.getByTestId("part-card")).not.toHaveAttribute("data-part-id", "FJ3259");
  await expect(page.getByTestId("part-la")).toHaveText("Femur");
});
```

Примечание к последнему тесту: если у `FJ3259` соседей по `conceptId` нет (проверить: `python3 -I -c "import json;m=json.load(open('public/models/v1/atlas.json'));c=[p for p in m['parts'] if p['id']=='FJ3259'][0]['conceptId'];print([p['id'] for p in m['parts'] if p['conceptId']==c])"`), взять любой id из понятия с двумя и более мешами, который переведён (есть в `public/content/structures.json`), и подставить его и ожидаемую латынь.

- [ ] **Step 4: Подстроить e2e мобайла**

В `e2e/mobile.spec.ts`, тест «атлас: слои и карточка структуры открываются шторками»:
- заменить `page.locator('aside[aria-label="Слои"]')` на `page.locator('aside[aria-label="Системы"]')`;
- комментарий «боковой панели телефону не достаётся: вместо неё кнопка «Слои» внизу справа» оставить (кнопка теперь в доке справа).
Остальное без изменений: `getByLabel("Мышцы")` находит тумблер, `uncheck()` работает с `role="switch"`.

- [ ] **Step 5: Прогнать e2e**

Run: `pnpm exec playwright test --project=desktop`
Expected: PASS все (атлас, карточки, тесты).

Run: `pnpm exec playwright test --project=mobile`
Expected: PASS.

При падении кликов по канвасу в «atlas loads the model…»: центр канваса должен быть свободен от панелей — проверить, что ни док (bottom 54 px + ~110 px), ни ракурсы (right 32 px) не доходят до центра при 1280×800.

- [ ] **Step 6: Commit**

```bash
git add src/components/atlas/AtlasScreen.tsx e2e/atlas.spec.ts e2e/mobile.spec.ts
git commit -m "feat(atlas): studio layout — glass panels, explode dock, view controls, search panel

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 12: Визуальная проверка, README, заметка в памяти

**Files:**
- Create: scратчпад-скрипт для скриншотов (вне репозитория)
- Modify: `README.md`

- [ ] **Step 1: Скриншоты**

Скрипт `/private/tmp/claude-501/-Users-AIpower-Desktop-coding-VIBE-anatomia/6cdfe038-d4e1-4bf2-b12d-11e97121b59b/scratchpad/shots.mjs` (запускать из корня репозитория, dev-сервер на :3100 должен быть поднят: `pnpm dev --port 3100` в фоне):

```js
import { chromium } from "@playwright/test";
const base = process.env.BASE ?? "http://localhost:3100";
const out = process.env.OUT ?? "/private/tmp/claude-501/-Users-AIpower-Desktop-coding-VIBE-anatomia/6cdfe038-d4e1-4bf2-b12d-11e97121b59b/scratchpad/shots";
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
for (const [name, viewport, mobile] of [["desktop", { width: 1440, height: 900 }, false], ["mobile", { width: 390, height: 844 }, true]]) {
  const ctx = await browser.newContext({ viewport, hasTouch: mobile, isMobile: mobile, deviceScaleFactor: mobile ? 2 : 1 });
  const page = await ctx.newPage();
  await page.goto(`${base}/atlas`);
  await page.locator("[data-atlas-ready='true']").waitFor({ timeout: 120_000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}/${name}-assembled.png` });
  await page.locator("#explode-slider").fill("40");
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}/${name}-partial.png` });
  await page.locator("#explode-slider").fill("100");
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${out}/${name}-inventory.png` });
  await page.getByRole("button", { name: "Собрать модель и сбросить вид" }).click();
  await page.goto(`${base}/atlas?focus=FJ3259`);
  await page.locator("[data-atlas-ready='true']").waitFor({ timeout: 120_000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}/${name}-card.png` });
  await page.getByTestId("search-toggle").click();
  await page.getByLabel("Поиск структуры").fill("сердце");
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}/${name}-search.png` });
  await ctx.close();
}
await browser.close();
```

Run: `mkdir -p <OUT> && node <путь>/shots.mjs`
Затем открыть каждый PNG инструментом Read и сверить с эталоном human-atlas (скриншот пользователя): стеклянные панели, тумблеры, чипы, счётчики, колонка ракурсов, док с ползунком, подпись, подсказки, карточка с цветной полоской. На мобайле: ничего не перекрывает карточку в шторке, кнопка «Слои» справа в доке, ракурсы под заголовком.

- [ ] **Step 2: Исправить найденное**

Типичные правки: отступы панелей (`top-[190px]`, `bottom-[175px]`), ширина дока на мобайле, перекрытие поиска и ракурсов на телефоне (`top-[200px]` у поиска), цвет текста на стекле. Каждую правку прогнать через `pnpm exec playwright test --project=desktop --project=mobile`.

- [ ] **Step 3: README**

Добавить в `README.md` раздел:

```markdown
## Студия атласа

`/atlas` — полноэкранная студия без шапки сайта (остальные страницы лежат в route-группе
`src/app/(site)/` со своей шапкой). Поверх сцены: панель систем с тумблерами и счётчиками
(`SystemsPanel`), поиск по кнопке или клавише `/` (`SearchPanel`), ракурсы ¾/спереди/сбоку/сзади,
автоповорот и сброс (`ViewControls`), док «Разнести модель» (`ExplodeDock`).

Разнесение: `src/lib/atlas/explode-layout.ts` раскладывает видимые детали сеткой по их
габаритам; `BodyMeshes` ставит смещения через `BatchedMesh.setMatrixAt`, а анимированная
величина живёт в `src/lib/atlas/explode-amount.ts` и читается `CameraRig` для кадрирования
сетки. При разнесении выше 0.8 мышь и палец панорамируют, а не вращают. В тестах (`/quiz`)
разнесение и автоповорот всегда выключены.

Визуальный язык взят из открытого проекта human-atlas (MIT): палитра и класс `.glass`
в `src/app/globals.css`, примитивы Switch/Slider/IconButton в `src/components/ui/`.
```

- [ ] **Step 4: Финальная проверка и коммит**

Run: `pnpm typecheck && pnpm lint && pnpm test && pnpm exec playwright test`
Expected: всё зелёное.

```bash
git add README.md
git commit -m "docs: describe the atlas studio

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

- [ ] **Step 5: Память**

Дописать в `/Users/AIpower/.claude/projects/-Users-AIpower-Desktop-coding-VIBE-anatomia/memory/anatomia-stack-decisions.md` абзац «Studio (2026-10-13)»: route-группа `(site)`, `explodeAmount` как модульный ref между BodyMeshes и CameraRig, `mesh.frustumCulled = false` у BatchedMesh из-за разнесения, оверлей выделения гаснет при разнесении, смена набора систем снимает выделение (порядок `showOnlySystems` → `reveal` в `?focus=`).
