"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAtlasData } from "@/hooks/use-atlas-data";
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

// латынь/русский из structures.json; без записи остаётся только английское имя
function getPartNames(part: AtlasPart, content: ContentBundle) {
  return displayNames(part.name, content.structures[part.id], content.topics);
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

  return (
    <div className="flex h-full w-full" data-atlas-ready={ready ? "true" : "false"}>
      <LayerPanel />
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
              {selected && (
                <PartCard
                  partId={selected.id}
                  names={getPartNames(selected, state.data.content)}
                  systemRu={SYSTEM_BY_ID[selected.system].ru}
                  isolated={isolatedPartId === selected.id}
                  onHide={() => hidePart(selected.id)}
                  onIsolate={() => isolate(selected.id)}
                  onClearIsolation={() => isolate(null)}
                  onClose={() => select(null)}
                />
              )}
              {!ready && <LoadingOverlay loaded={1} total={1} />}
            </>
          )}
        </WebGLGate>
      </div>
    </div>
  );
}
