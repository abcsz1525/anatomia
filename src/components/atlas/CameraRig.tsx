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
  // eslint-disable-next-line react-hooks/immutability -- the three.js camera is external mutable state
  useEffect(() => {
    // cancel any in-flight fly-to, otherwise it overrides this framing
    target.current = null;
    const all = unionBounds(manifest.parts.map((p) => p.bounds));
    const c = boundsCenter(all);
    const dist = cameraDistance(boundsRadius(all), camera.fov, 1.1);
    camera.position.set(c[0], c[1], c[2] + dist);
    // eslint-disable-next-line react-hooks/immutability -- the three.js camera is external mutable state
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
