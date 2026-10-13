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

  // при уходе со страницы модель собирается: /quiz до старта теста не ограничен
  // restrictTo и иначе унаследовал бы разнесение из store
  useEffect(() => () => useAtlasStore.getState().setExplode(0), []);

  // «/» открывает поиск (кроме набора текста в поле), Escape закрывает панель
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target;
      // ползунок разнесения и тумблеры — тоже input, но текст в них не набирают
      const typing =
        (t instanceof HTMLInputElement && !["range", "checkbox", "radio", "button"].includes(t.type)) ||
        t instanceof HTMLTextAreaElement;
      const slash = e.key === "/" || e.code === "Slash"; // на ЙЦУКЕН эта клавиша даёт «.»
      if (slash && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) {
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
            <AtlasCanvas data={state.data} onReady={onReady} studio />
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

            {/* системы: панель на десктопе, шторка на мобайле; min-h — на низком окне
                панель не схлопывается, а уходит ниже: док по центру её не задевает */}
            {!isMobile && (
              <div className="absolute bottom-[175px] left-8 top-[190px] z-10 min-h-[300px]">
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
            {/* открытый поиск ложится поверх карточки — пока он открыт, карточку прячем */}
            {selected && !isMobile && panel !== "search" && <PartCard {...partCardProps(selected, state.data.content)} variant="card" />}
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
