"use client";
import { Canvas } from "@react-three/fiber";
import { BodyMeshes } from "./BodyMeshes";
import { CameraRig } from "./CameraRig";
import type { AtlasData } from "@/hooks/use-atlas-data";
import { useAtlasStore } from "@/store/atlas-store";

export function AtlasCanvas({
  data,
  onReady,
  onPick,
}: {
  data: AtlasData;
  onReady?: () => void;
  /** Перехват клика по структуре (викторина); без него клик выделяет структуру. */
  onPick?: (id: string) => void;
}) {
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
      {/* Order matters: BodyMeshes must precede CameraRig so its visibility effect
          (mesh.visible / setVisibleAt) runs before CameraRig's focus raycast reads
          scene.children. BodyMeshes must also keep its BatchedMeshes as direct
          children of the scene (no wrapping <group>) — visibleDirection() filters
          scene.children for BatchedMesh instances, it does not walk the graph. */}
      <BodyMeshes data={data} onReady={onReady} onPick={onPick} />
      <CameraRig manifest={data.manifest} />
    </Canvas>
  );
}
