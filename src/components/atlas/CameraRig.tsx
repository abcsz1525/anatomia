"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { boundsCenter, boundsRadius, cameraDistance, unionBounds } from "@/lib/atlas/bounds";
import type { AtlasManifest } from "@/lib/atlas/types";
import { candidateDirections } from "@/lib/atlas/view-dirs";
import { useAtlasStore } from "@/store/atlas-store";

const RAY_ORIGIN = new THREE.Vector3();
const RAY_DIR = new THREE.Vector3();
const AXIS_U = new THREE.Vector3();
const AXIS_V = new THREE.Vector3();
const HELPER = new THREE.Vector3();

/**
 * Точки пробы в плоскости экрана (в долях полуразмера цели): центр и четыре
 * смещения. Одного луча в центр габаритов мало — у изогнутой мышцы центр AABB
 * лежит вне самой мышцы, и луч всегда упирался бы в соседа.
 */
const SAMPLES: [number, number][] = [
  [0, 0],
  [0.45, 0],
  [-0.45, 0],
  [0, 0.45],
  [0, -0.45],
];
/** Столько попаданий из SAMPLES достаточно, чтобы не искать ракурс дальше. */
const GOOD_SCORE = 3;
/**
 * Кандидатов на сферу: 26 (по умолчанию в candidateDirections) хватает не всегда —
 * у глубокой мышцы окно видимости узкое. 46 держит поиск в пределах ~0.35 с даже
 * в худшем случае, когда цель не видна ниоткуда и перебор идёт до конца.
 */
const DIRECTIONS = 46;

/** Сколько лучей из SAMPLES упираются именно в цель, если смотреть из dir. */
function visibleScore(
  meshes: THREE.BatchedMesh[],
  raycaster: THREE.Raycaster,
  center: THREE.Vector3,
  half: THREE.Vector3,
  dist: number,
  dir: THREE.Vector3,
  accept: string[],
): number {
  // базис экрана для этого направления
  HELPER.set(Math.abs(dir.y) < 0.9 ? 0 : 1, Math.abs(dir.y) < 0.9 ? 1 : 0, 0);
  AXIS_U.crossVectors(HELPER, dir).normalize();
  AXIS_V.crossVectors(dir, AXIS_U).normalize();
  // проекция габаритов цели на оси экрана: у вытянутой мышцы пробы должны
  // расходиться вдоль неё, а не выходить в фон
  const eu = half.x * Math.abs(AXIS_U.x) + half.y * Math.abs(AXIS_U.y) + half.z * Math.abs(AXIS_U.z);
  const ev = half.x * Math.abs(AXIS_V.x) + half.y * Math.abs(AXIS_V.y) + half.z * Math.abs(AXIS_V.z);
  // луч идёт из точки, где окажется камера, — ровно как пиксель при отрисовке:
  // параллельные лучи от плоскости цели пропускали бы то, что закрывает её вблизи камеры
  RAY_ORIGIN.copy(center).addScaledVector(dir, dist);
  let score = 0;
  for (const [a, b] of SAMPLES) {
    RAY_DIR.copy(center)
      .addScaledVector(AXIS_U, a * eu)
      .addScaledVector(AXIS_V, b * ev)
      .sub(RAY_ORIGIN)
      .normalize();
    raycaster.set(RAY_ORIGIN, RAY_DIR);
    const hit = raycaster.intersectObjects(meshes, false)[0];
    if (!hit || hit.batchId === undefined) continue;
    const id = (hit.object.userData.partIds as string[] | undefined)?.[hit.batchId];
    if (id !== undefined && accept.includes(id)) score++;
  }
  return score;
}

/**
 * Направление «от цели к камере», с которого цель не закрыта другими структурами.
 * Мышца почти всегда лежит под соседними, и перелёт с сохранением текущего ракурса
 * приводил камеру к затылку соседа; поэтому трассируем сцену из каждого кандидата
 * (ближайшие к текущему — первыми) и берём лучший по числу попаданий в цель.
 * Если цель не видна ниоткуда — остаёмся на текущем ракурсе.
 */
function visibleDirection(
  scene: THREE.Scene,
  raycaster: THREE.Raycaster,
  center: THREE.Vector3,
  half: THREE.Vector3,
  dist: number,
  current: THREE.Vector3,
  accept: string[],
): THREE.Vector3 {
  // сцена рисует по одному BatchedMesh на систему; невидимые инстансы
  // BatchedMesh.raycast пропускает сам, так что скрытые слои луч не ловят
  const meshes = scene.children.filter(
    (o): o is THREE.BatchedMesh => o.visible && (o as THREE.BatchedMesh).isBatchedMesh === true,
  );
  if (meshes.length === 0) return current;
  const dir = new THREE.Vector3();
  let best: THREE.Vector3 | null = null;
  let bestScore = 0;
  for (const [x, y, z] of candidateDirections([current.x, current.y, current.z], DIRECTIONS)) {
    dir.set(x, y, z);
    const score = visibleScore(meshes, raycaster, center, half, dist, dir, accept);
    // строгое сравнение оставляет первого из равных — то есть ближайший к текущему ракурс
    if (score > bestScore) {
      bestScore = score;
      best = dir.clone();
      if (score >= GOOD_SCORE) break;
    }
  }
  return best ?? current;
}

export function CameraRig({ manifest }: { manifest: AtlasManifest }) {
  const controls = useRef<OrbitControlsImpl>(null);
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const scene = useThree((s) => s.scene);
  const raycaster = useRef(new THREE.Raycaster());
  const target = useRef<{ position: THREE.Vector3; lookAt: THREE.Vector3; t: number } | null>(null);
  const focusPartId = useAtlasStore((s) => s.focusPartId);
  const focusNonce = useAtlasStore((s) => s.focusNonce);
  const resetNonce = useAtlasStore((s) => s.resetNonce);

  // initial framing of what is actually on screen: the whole body, or — during a
  // quiz — only the restricted set, otherwise the topic stays a tiny silhouette
  // eslint-disable-next-line react-hooks/immutability -- the three.js camera is external mutable state
  useEffect(() => {
    // cancel any in-flight fly-to, otherwise it overrides this framing
    target.current = null;
    // restrictTo is read via getState() instead of a subscription on purpose:
    // the frame must change only on resetNonce (reframe()/reset()), never just
    // because the restriction changed mid-session — setRestrict() runs while a
    // question is still on screen (quiz start, abort, unmount) and re-framing
    // there would yank the camera away from the structure the student is on.
    // Hence the deps stay [manifest, camera, resetNonce].
    const restrictTo = useAtlasStore.getState().restrictTo;
    const framed = restrictTo ? manifest.parts.filter((p) => restrictTo[p.id]) : manifest.parts;
    // an empty restriction would hide everything anyway; fall back to the body
    // so unionBounds never throws
    const all = unionBounds((framed.length > 0 ? framed : manifest.parts).map((p) => p.bounds));
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
    const lookAt = new THREE.Vector3(...boundsCenter(part.bounds));
    const half = new THREE.Vector3(
      (part.bounds[1][0] - part.bounds[0][0]) / 2,
      (part.bounds[1][1] - part.bounds[0][1]) / 2,
      (part.bounds[1][2] - part.bounds[0][2]) / 2,
    );
    const radius = Math.max(boundsRadius(part.bounds), 0.03);
    const dist = cameraDistance(radius, camera.fov);
    const current = camera.position.clone().sub(controls.current?.target ?? lookAt).normalize();
    if (current.lengthSq() === 0) current.set(0, 0, 1);
    // у структуры бывает несколько мешей (парные/разрезанные части) — любой из них
    // засчитывается как «цель видна»
    const accept = useAtlasStore.getState().focusAccept ?? [focusPartId];
    const dir = visibleDirection(scene, raycaster.current, lookAt, half, dist, current, accept);
    target.current = { position: lookAt.clone().add(dir.multiplyScalar(dist)), lookAt, t: 0 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusPartId, focusNonce, manifest, scene]);

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
