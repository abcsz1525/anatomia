"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAtlasData } from "@/hooks/use-atlas-data";
import { useIsMobile } from "@/hooks/use-media-query";
import { SYSTEM_BY_ID } from "@/lib/atlas/systems";
import type { AtlasPart } from "@/lib/atlas/types";
import { displayNames } from "@/lib/content/names";
import type { ContentBundle } from "@/lib/content/types";
import { useAtlasStore } from "@/store/atlas-store";
import { AtlasCanvas } from "./AtlasCanvas";
import { LayerPanel } from "./LayerPanel";
import { LoadingOverlay } from "./LoadingOverlay";
import { PartCard } from "./PartCard";
import { SearchBox } from "./SearchBox";
import { WebGLGate } from "./WebGLGate";
import { Sheet } from "@/components/ui/Sheet";

// латынь/русский из structures.json; без записи остаётся только английское имя
function getPartNames(part: AtlasPart, content: ContentBundle) {
  return displayNames(part.name, content.structures[part.id], content.topics);
}

export function AtlasScreen() {
  const state = useAtlasData();
  const isMobile = useIsMobile();
  const [layersOpen, setLayersOpen] = useState(false);
  const closeLayers = useCallback(() => setLayersOpen(false), []);
  const [ready, setReady] = useState(false);
  const onReady = useCallback(() => setReady(true), []);
  const selectedPartId = useAtlasStore((s) => s.selectedPartId);
  const isolatedPartId = useAtlasStore((s) => s.isolatedPartId);
  const select = useAtlasStore((s) => s.select);
  const hidePart = useAtlasStore((s) => s.hidePart);
  const isolate = useAtlasStore((s) => s.isolate);
  const reveal = useAtlasStore((s) => s.reveal);
  const showOnlySystems = useAtlasStore((s) => s.showOnlySystems);

  const partById = useMemo(() => {
    if (state.status !== "ready") return new Map<string, AtlasPart>();
    return new Map(state.data.manifest.parts.map((p) => [p.id, p]));
  }, [state]);
  const selected = selectedPartId ? partById.get(selectedPartId) : undefined;

  // ?focus=<partId> — глубокая ссылка из разбора ошибок теста: как и поиск,
  // включает систему структуры и наводит камеру, но ровно один раз на id,
  // иначе клик по другой части тут же отменялся бы обратным фокусом
  const focus = useSearchParams().get("focus");
  const focused = useRef<string | null>(null);
  useEffect(() => {
    if (focus === null || focused.current === focus) return;
    const part = partById.get(focus);
    if (!part) return;
    focused.current = focus;
    reveal(focus, part.system);
    // мышцы по умолчанию включены и закрывают кость: ссылка «Показать в атласе»
    // должна приводить к видимой структуре, поэтому оставляем только скелет
    // (ориентир) и её собственную систему — остальные слои возвращаются
    // галочками в панели
    showOnlySystems(["skeletal", part.system]);
  }, [focus, partById, reveal, showOnlySystems]);

  // общие пропсы карточки для обоих вариантов раскладки
  const partCardProps = (part: AtlasPart, content: ContentBundle) => ({
    partId: part.id,
    names: getPartNames(part, content),
    systemRu: SYSTEM_BY_ID[part.system].ru,
    isolated: isolatedPartId === part.id,
    topicId: content.structures[part.id]?.topic,
    onHide: () => hidePart(part.id),
    onIsolate: () => isolate(part.id),
    onClearIsolation: () => isolate(null),
    onClose: () => select(null),
  });

  return (
    <div className="flex h-full w-full" data-atlas-ready={ready ? "true" : "false"}>
      {!isMobile && <LayerPanel variant="aside" />}
      {isMobile && (
        <>
          <button
            type="button"
            onClick={() => setLayersOpen(true)}
            data-testid="layers-toggle"
            // справа: слева внизу в dev-режиме сидит индикатор Next.js, да и
            // большому пальцу правой руки правый угол ближе
            className="fixed bottom-4 right-4 z-10 min-h-11 rounded-full border bg-white px-4 py-3 text-sm shadow"
          >
            Слои
          </button>
          <Sheet open={layersOpen} onClose={closeLayers} label="Слои" testId="layers-sheet">
            <LayerPanel variant="sheet" />
          </Sheet>
        </>
      )}
      <div className="relative flex-1">
        <WebGLGate>
          {state.status === "loading" && <LoadingOverlay loaded={state.loaded} total={state.total} />}
          {state.status === "error" && <LoadingOverlay loaded={0} total={0} error={state.message} onRetry={state.retry} />}
          {state.status === "ready" && (
            <>
              {/* search covers all systems, most of which are hidden by default — reveal
                  the hit's system (and unhide/un-isolate it) before flying the camera there */}
              <SearchBox
                manifest={state.data.manifest}
                content={state.data.content}
                onPick={(id) => {
                  const part = partById.get(id);
                  if (part) reveal(id, part.system);
                }}
              />
              {/* the canvas must mount so the synchronous BatchedMesh build runs; the
                  overlay stays on top of it until BodyMeshes reports it is ready */}
              <AtlasCanvas data={state.data} onReady={onReady} />
              {/* ровно один экземпляр карточки: на десктопе — плавающая, на мобайле —
                  в шторке; иначе тестовые id задвоились бы */}
              {selected && !isMobile && <PartCard {...partCardProps(selected, state.data.content)} variant="card" />}
              {selected && isMobile && (
                <Sheet open onClose={() => select(null)} label="Структура" testId="part-sheet">
                  <PartCard {...partCardProps(selected, state.data.content)} variant="sheet" />
                </Sheet>
              )}
              {!ready && <LoadingOverlay loaded={1} total={1} />}
            </>
          )}
        </WebGLGate>
      </div>
    </div>
  );
}
