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
  parts: AtlasPart[]; // index = instanceId
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
      // eslint-disable-next-line react-hooks/immutability -- three.js meshes are external mutable state
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
