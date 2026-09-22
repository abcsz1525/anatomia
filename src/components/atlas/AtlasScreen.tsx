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

// План 2 подменит это на данные structures.json (латынь и русский).
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
  const reveal = useAtlasStore((s) => s.reveal);

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
              {/* search covers all systems, most of which are hidden by default — reveal
                  the hit's system (and unhide/un-isolate it) before flying the camera there */}
              <SearchBox
                manifest={state.data.manifest}
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
                  names={getPartNames(selected)}
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
