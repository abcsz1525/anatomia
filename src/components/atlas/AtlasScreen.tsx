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
        {/* the canvas must mount so the synchronous BatchedMesh build runs; the
            overlay stays on top of it until BodyMeshes reports it is ready */}
        {state.status === "ready" && <AtlasCanvas data={state.data} onReady={onReady} />}
        {state.status === "ready" && !ready && <LoadingOverlay loaded={1} total={1} />}
      </WebGLGate>
    </div>
  );
}
