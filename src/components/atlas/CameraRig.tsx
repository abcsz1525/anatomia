"use client";
import { useCallback, useEffect, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { boundsCenter, boundsRadius, cameraDistance, fitDistance, unionBounds } from "@/lib/atlas/bounds";
import { explodeAmount } from "@/lib/atlas/explode-amount";
import type { AtlasManifest } from "@/lib/atlas/types";
import { candidateDirections } from "@/lib/atlas/view-dirs";
import { useAtlasStore, type AtlasView } from "@/store/atlas-store";

const RAY_ORIGIN = new THREE.Vector3();
const RAY_DIR = new THREE.Vector3();
const AXIS_U = new THREE.Vector3();
const AXIS_V = new THREE.Vector3();
const HELPER = new THREE.Vector3();
const DIR = new THREE.Vector3();
const Q_FULL = new THREE.Quaternion();
const Q = new THREE.Quaternion();

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
/**
 * Потолок на весь перебор: сцена и «худший случай» зависят от машины и набора
 * видимых слоёв, и полный перебор 46 направлений может подвесить кадр. По
 * истечении бюджета берём лучшее найденное направление (или текущее).
 */
const SEARCH_BUDGET_MS = 150;

/** Кадр викторины: строго спереди, как было до студии. */
const LEGACY_DIRECTION = new THREE.Vector3(0, 0, 1);

/** Направление «от цели к камере» для каждого ракурса. */
const VIEW_DIRECTIONS: Record<AtlasView, THREE.Vector3> = {
  "three-quarter": new THREE.Vector3(0.35, 0.06, 1).normalize(),
  front: new THREE.Vector3(0, 0.02, 1).normalize(),
  side: new THREE.Vector3(1, 0.02, 0).normalize(),
  back: new THREE.Vector3(0, 0.02, -1).normalize(),
};

/** Сколько лучей из SAMPLES упираются именно в цель, если смотреть из dir. */
function visibleScore(
  meshes: THREE.BatchedMesh[],
  raycaster: THREE.Raycaster,
  center: THREE.Vector3,
  half: THREE.Vector3,
  dist: number,
  dir: THREE.Vector3,
  accept: string[],
  deadline: number,
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
    // budget can run out mid-direction too — five raycasts against a heavy
    // scene are not free; bail with whatever partial score we have so the
    // outer loop's own deadline check (and the final return) stay honest
    if (performance.now() > deadline) break;
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
 * Перебор ограничен SEARCH_BUDGET_MS, чтобы не ронять кадр на тяжёлой сцене.
 */
function visibleDirection(
  scene: THREE.Scene,
  raycaster: THREE.Raycaster,
  center: THREE.Vector3,
  half: THREE.Vector3,
  dist: number,
  current: THREE.Vector3,
  accept: string[],
  radius: number,
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
  const deadline = performance.now() + SEARCH_BUDGET_MS;
  // лучи стартуют в dist от center (см. RAY_ORIGIN в visibleScore) и целятся в
  // цель радиуса radius — ограничиваем дальность, чтобы intersectObjects не
  // трассировал каждый луч через всю сцену за целью
  raycaster.far = dist + radius;
  for (const [x, y, z] of candidateDirections([current.x, current.y, current.z], DIRECTIONS)) {
    // кандидаты идут от ближайшего к текущему ракурсу, так что обрыв по времени
    // оставляет лучшее из уже проверенного — не худший результат, просто менее полный
    if (performance.now() > deadline) break;
    dir.set(x, y, z);
    const score = visibleScore(meshes, raycaster, center, half, dist, dir, accept, deadline);
    // строгое сравнение оставляет первого из равных — то есть ближайший к текущему ракурс
    if (score > bestScore) {
      bestScore = score;
      best = dir.clone();
      if (score >= GOOD_SCORE) break;
    }
  }
  // raycaster.current is a ref reused across every future focus event — leave
  // it unbounded again rather than letting this search's far leak into the next
  raycaster.far = Infinity;
  return best ?? current;
}

/**
 * `studio` — режим студии атласа (ракурсы, автоповорот, кадр сетки при разнесении).
 * Викторина монтирует тот же холст без него: она должна кадрировать тело строго
 * спереди, как до появления студии, и `view` из store на неё влиять не должен.
 */
export function CameraRig({ manifest, studio = false }: { manifest: AtlasManifest; studio?: boolean }) {
  const controls = useRef<OrbitControlsImpl>(null);
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const scene = useThree((s) => s.scene);
  const raycaster = useRef(new THREE.Raycaster());
  const target = useRef<{ position: THREE.Vector3; lookAt: THREE.Vector3; t: number } | null>(null);
  const focusPartId = useAtlasStore((s) => s.focusPartId);
  const focusNonce = useAtlasStore((s) => s.focusNonce);
  const resetNonce = useAtlasStore((s) => s.resetNonce);
  const view = useAtlasStore((s) => s.view);
  const viewNonce = useAtlasStore((s) => s.viewNonce);
  const autoRotate = useAtlasStore((s) => s.autoRotate);
  const isolated = useAtlasStore((s) => s.isolatedPartId !== null);
  const restricted = useAtlasStore((s) => s.restrictTo !== null);
  /** Величина разнесения на прошлом кадре: кадр сетки пересчитываем только пока она движется. */
  const lastAmount = useRef(0);
  /** Направление, с которого смотрел пользователь, когда началось разнесение: к «спереди» камера уходит от него плавно, без скачка. */
  const baseDir = useRef(VIEW_DIRECTIONS["three-quarter"].clone());
  const framingActive = useRef(false);
  /** Запрос перекадрировать сетку, даже если k стоит: смена ракурса, сброс, новая раскладка, ресайз. */
  const reframe = useRef(false);
  /** Фокус, отложенный до сборки модели (см. эффект фокуса). */
  const pendingFocus = useRef<string | null>(null);
  const explodeLayoutSize = useAtlasStore((s) => s.explodeLayoutSize);
  const aspect = useThree((s) => s.viewport.aspect);
  useEffect(() => {
    reframe.current = true;
  }, [explodeLayoutSize, aspect]);

  // Кадр всего тела (или ограничения теста). restrictTo читается через getState(),
  // а не подпиской: сам по себе вызов setRestrict() камеру не двигает — он идёт,
  // пока вопрос ещё на экране, и перекадрировка там увела бы камеру от структуры,
  // на которой студент. Кадр пересчитывают только nonce (сброс, ракурс) и
  // разнесение, пока оно движется.
  const bodyFrame = useCallback(() => {
    const restrictTo = useAtlasStore.getState().restrictTo;
    const framed = restrictTo ? manifest.parts.filter((p) => restrictTo[p.id]) : manifest.parts;
    // пустое ограничение и так всё скрывает; берём тело, чтобы unionBounds не бросил
    const all = unionBounds((framed.length > 0 ? framed : manifest.parts).map((p) => p.bounds));
    const lookAt = new THREE.Vector3(...boundsCenter(all));
    return { lookAt, dist: cameraDistance(boundsRadius(all), camera.fov, 1.1) };
  }, [manifest, camera]);

  // initial framing of what is actually on screen: the whole body, or — during a
  // quiz — only the restricted set, otherwise the topic stays a tiny silhouette
  // eslint-disable-next-line react-hooks/immutability -- the three.js camera is external mutable state
  useEffect(() => {
    // cancel any in-flight fly-to, otherwise it overrides this framing
    target.current = null;
    const { lookAt, dist } = bodyFrame();
    // викторина кадрирует строго спереди, как до студии, — ракурс из store ей не указ
    const dir = studio ? VIEW_DIRECTIONS[useAtlasStore.getState().view] : LEGACY_DIRECTION;
    camera.position.copy(lookAt).addScaledVector(dir, dist);
    // сброс при разнесённой сетке должен сойтись к сброшенному ракурсу
    baseDir.current.copy(dir);
    reframe.current = true;
    // eslint-disable-next-line react-hooks/immutability -- the three.js camera is external mutable state
    camera.near = 0.01;
    camera.far = dist * 10;
    camera.updateProjectionMatrix();
    controls.current?.target.copy(lookAt);
    controls.current?.update();
  }, [manifest, camera, resetNonce, bodyFrame, studio]);

  // перелёт к структуре с ракурса, где её не закрывают соседи
  const flyToPart = useCallback(
    (partId: string) => {
      const part = manifest.parts.find((p) => p.id === partId);
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
      const accept = useAtlasStore.getState().focusAccept ?? [partId];
      const dir = visibleDirection(scene, raycaster.current, lookAt, half, dist, current, accept, radius);
      target.current = { position: lookAt.clone().add(dir.multiplyScalar(dist)), lookAt, t: 0 };
    },
    [manifest, camera, scene],
  );

  useEffect(() => {
    if (!focusPartId || focusNonce === 0) return;
    // reveal/focus/flyTo собирают модель (explode = 0), но на экране она ещё
    // разнесена: поиск ракурса трассировал бы лучами разнесённую сцену, а кадр
    // сетки в useFrame (пока k > 0.3 и движется) всё равно обнулил бы цель.
    // Поэтому ждём, пока модель соберётся, и летим уже из useFrame.
    if (explodeAmount.value > 0.01) {
      pendingFocus.current = focusPartId;
      return;
    }
    pendingFocus.current = null;
    flyToPart(focusPartId);
  }, [focusPartId, focusNonce, flyToPart]);

  // выбор ракурса: перелёт к кадру тела с нужной стороны через ту же анимацию, что и фокус
  useEffect(() => {
    // викторина: ракурсов нет, кадр всегда спереди
    if (!studio || viewNonce === 0) return;
    // при разнесении кадром управляет сетка: ракурс запоминаем как исходное направление
    if (explodeAmount.value > 0.3) {
      baseDir.current.copy(VIEW_DIRECTIONS[view]);
      reframe.current = true;
      return;
    }
    const { lookAt, dist } = bodyFrame();
    target.current = { position: lookAt.clone().addScaledVector(VIEW_DIRECTIONS[view], dist), lookAt, t: 0 };
  }, [view, viewNonce, bodyFrame, studio]);

  useFrame((_, dt) => {
    const ctl = controls.current;
    if (!ctl) return;
    const k = explodeAmount.value;

    // разнесённую сетку панорамируют, собранное тело вращают; викторина не
    // разносит модель и не крутится — там всё как до студии
    const exploded = studio && k > 0.8;
    ctl.enableRotate = !exploded;
    ctl.mouseButtons.LEFT = exploded ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE;
    ctl.touches.ONE = exploded ? THREE.TOUCH.PAN : THREE.TOUCH.ROTATE;
    ctl.autoRotate = studio && autoRotate && k < 0.4 && !isolated && !restricted;
    ctl.autoRotateSpeed = 0.65;

    // пока разнесение движется и больше 0.3, камера едет к сетке инвентаря:
    // от 0.6 — строго спереди, ниже — плавно от текущего ракурса; расстояние
    // интерполируется между кадром тела и кадром сетки
    const size = useAtlasStore.getState().explodeLayoutSize;
    const active = studio && size !== null && k > 0.3;
    if (active && !framingActive.current) {
      // разнесение только началось: запоминаем, откуда смотрел пользователь
      baseDir.current.copy(camera.position).sub(ctl.target).normalize();
      if (baseDir.current.lengthSq() === 0) baseDir.current.copy(VIEW_DIRECTIONS.front);
    }
    framingActive.current = active;
    if (active && (Math.abs(k - lastAmount.current) > 1e-5 || reframe.current)) {
      reframe.current = false;
      const extent = (k - 0.3) / 0.7;
      const { lookAt, dist: bodyDist } = bodyFrame();
      // на широком экране слева панель систем, справа ракурсы — сетке нужен больший запас
      const pad = camera.aspect > 1 ? 1.7 : 1.35;
      const gridDist = Math.max(0.2, fitDistance(size.width, size.height, camera.fov, camera.aspect, pad));
      const dist = THREE.MathUtils.lerp(bodyDist, gridDist, extent);
      // направление уходит от исходного к «спереди» на участке k 0.3..0.6; кватернион,
      // а не lerp векторов: при взгляде сзади lerp проходил бы через нулевой вектор
      const t = Math.min(1, (k - 0.3) / 0.3);
      Q_FULL.setFromUnitVectors(baseDir.current, VIEW_DIRECTIONS.front);
      Q.identity().slerp(Q_FULL, t);
      DIR.copy(baseDir.current).applyQuaternion(Q);
      camera.position.copy(lookAt).addScaledVector(DIR, dist);
      ctl.target.copy(lookAt);
      ctl.update();
      target.current = null;
    }
    lastAmount.current = k;

    // отложенный фокус: модель собралась — теперь можно искать ракурс и лететь
    // (кадр сетки выше работает только при k > 0.3 и цель уже не обнулит)
    if (pendingFocus.current && k < 0.01) {
      const id = pendingFocus.current;
      pendingFocus.current = null;
      flyToPart(id);
    }

    const t = target.current;
    if (!t) return;
    t.t = Math.min(1, t.t + dt / 0.4);
    const ease = 1 - Math.pow(1 - t.t, 3);
    camera.position.lerp(t.position, ease);
    ctl.target.lerp(t.lookAt, ease);
    ctl.update();
    if (t.t >= 1) target.current = null;
  });

  return <OrbitControls ref={controls} makeDefault enableDamping dampingFactor={0.1} minDistance={0.05} maxDistance={20} />;
}
