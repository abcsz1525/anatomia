"use client";
import { Fragment, useEffect, useMemo } from "react";
import * as THREE from "three";
import type { ThreeEvent } from "@react-three/fiber";
import { batchCache, getCached } from "@/lib/atlas/batch-cache";
import { partGeometry } from "@/lib/atlas/parse-chunk";
import { shadeIndices, shadePalette } from "@/lib/atlas/part-colors";
import { SYSTEMS, SYSTEM_BY_ID } from "@/lib/atlas/systems";
import type { AtlasManifest, AtlasPart, SystemId } from "@/lib/atlas/types";
import { isPartVisible, useAtlasStore, type HighlightKind } from "@/store/atlas-store";
import { isCachedBundle, releaseBuffers, type AtlasData } from "@/hooks/use-atlas-data";
import { useMediaQuery } from "@/hooks/use-media-query";

// Выбранная структура и подсветка викторины рисуются поверх всего (см.
// overlay). Голубой не встречается ни в одном слое, кроме вен, а у тех он
// заметно темнее; оранжевый, как раньше, терялся среди оттенков слоёв.
type OverlayKind = HighlightKind | "selected";
const OVERLAY_KINDS: OverlayKind[] = ["selected", "target", "correct", "wrong"];
const OVERLAY_COLORS: Record<OverlayKind, THREE.Color> = {
  selected: new THREE.Color("#22c8ff"),
  target: new THREE.Color("#22c8ff"),
  correct: new THREE.Color("#2e9e5b"),
  wrong: new THREE.Color("#e0301e"),
};
// Зубы лежат в пищеварительной системе, но в тестах привычнее видеть их
// белыми, как кости, а не бежевыми, как кишечник
const TOOTH_COLOR = new THREE.Color(SYSTEM_BY_ID.skeletal.color);

interface SystemBatch {
  system: SystemId;
  mesh: THREE.BatchedMesh;
  parts: AtlasPart[]; // index = instanceId
  /** Собственный оттенок каждой части (index = instanceId): соседи в слое не сливаются. */
  colors: THREE.Color[];
  /** Один цвет системы для всех частей — в тестах оттенки подсказывали бы ответ. */
  plainColors: THREE.Color[];
  /**
   * Выбранные и подсвеченные структуры, нарисованные поверх остальных:
   * глубокие структуры (миндалевидное тело, таламус, зуб за соседним зубом)
   * иначе закрыты другими. Делит атрибуты с `mesh` — копий нет; каждая
   * структура — группа индексов со своим материалом из OVERLAY_KINDS.
   */
  overlay: THREE.Mesh;
  /** Освобождение GPU-ресурсов; вызывает только владелец батчей — `batchCache`. */
  dispose(): void;
}

function buildBatch(system: SystemId, parts: AtlasPart[], buffers: ArrayBuffer[]): SystemBatch {
  const vertexCount = parts.reduce((n, p) => n + p.vertexCount, 0);
  const indexCount = parts.reduce((n, p) => n + p.indexCount, 0);
  const palette = shadePalette(SYSTEM_BY_ID[system].color);
  const colors = shadeIndices(parts, palette.length).map((i) => palette[i]);
  const plain = new THREE.Color(SYSTEM_BY_ID[system].color);
  const plainColors = parts.map((p) => (/\btooth\b/i.test(p.name) ? TOOTH_COLOR : plain));
  const material = new THREE.MeshStandardMaterial({ roughness: 0.75, metalness: 0.0 });
  const mesh = new THREE.BatchedMesh(parts.length, vertexCount, indexCount, material);
  mesh.name = system;
  mesh.perObjectFrustumCulled = true;
  // batchId попадания -> id структуры: CameraRig трассирует сцену, подбирая
  // ракурс, с которого цель действительно видна
  mesh.userData.partIds = parts.map((p) => p.id);
  parts.forEach((part, index) => {
    const g = partGeometry(buffers[part.chunk], part);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(g.positions, 3));
    geometry.setAttribute("normal", new THREE.BufferAttribute(g.normals, 3));
    geometry.setIndex(new THREE.BufferAttribute(g.indices, 1));
    const geometryId = mesh.addGeometry(geometry);
    const instanceId = mesh.addInstance(geometryId);
    if (instanceId !== index) throw new Error("BatchedMesh instance order mismatch");
    mesh.setColorAt(instanceId, colors[index]);
    geometry.dispose();
  });
  mesh.computeBoundingSphere();
  // Индексы BatchedMesh абсолютные, поэтому вырезать одну структуру — это
  // drawRange по её диапазону индексов на тех же буферах. Не вызываем
  // overlayGeometry.dispose() отдельно: он выгрузил бы с GPU общие буферы.
  const overlayGeometry = new THREE.BufferGeometry();
  overlayGeometry.setAttribute("position", mesh.geometry.getAttribute("position"));
  overlayGeometry.setAttribute("normal", mesh.geometry.getAttribute("normal"));
  overlayGeometry.setIndex(mesh.geometry.getIndex());
  overlayGeometry.boundingSphere = mesh.boundingSphere;
  const overlayMaterials = OVERLAY_KINDS.map(
    (kind) =>
      new THREE.MeshStandardMaterial({
        color: OVERLAY_COLORS[kind],
        emissive: OVERLAY_COLORS[kind],
        emissiveIntensity: 0.35,
        roughness: 0.6,
        transparent: true,
        opacity: 0.9,
      }),
  );
  const overlay = new THREE.Mesh(overlayGeometry, overlayMaterials);
  overlay.visible = false;
  overlay.renderOrder = 10;
  overlay.frustumCulled = false;
  // Сброс глубины перед отрисовкой: структура видна сквозь всё, что её
  // закрывает, но сама себя по-прежнему перекрывает правильно
  overlay.onBeforeRender = (renderer) => renderer.clearDepth();
  // клики проходят к настоящим структурам под ней
  overlay.raycast = () => {};
  return {
    system,
    mesh,
    parts,
    colors,
    plainColors,
    overlay,
    dispose() {
      mesh.dispose();
      material.dispose();
      for (const m of overlayMaterials) m.dispose();
    },
  };
}

function buildBatches(data: AtlasData): SystemBatch[] {
  // Инвариант: собирать можно только из живых буферов. `new Float32Array(undefined, …)`
  // не бросает исключение — он берёт перегрузку с длиной и отдаёт пустой массив,
  // поэтому сборка из освобождённых буферов дала бы молча пустую модель.
  if (data.buffers.length === 0) throw new Error("atlas buffers already released");
  const bySystem = new Map<SystemId, AtlasPart[]>();
  for (const p of data.manifest.parts) {
    const list = bySystem.get(p.system) ?? [];
    list.push(p);
    bySystem.set(p.system, list);
  }
  return SYSTEMS.filter((s) => bySystem.has(s.id)).map((s) => buildBatch(s.id, bySystem.get(s.id)!, data.buffers));
}

export function BodyMeshes({
  data,
  onReady,
  onPick,
  plainColors = false,
}: {
  data: AtlasData;
  onReady?: () => void;
  /** Все структуры одного слоя одним цветом (тесты): разные оттенки выдают ответ. */
  plainColors?: boolean;
  /** Клик по структуре: викторина перехватывает выбор, иначе обычное выделение. */
  onPick?: (id: string) => void;
}) {
  // Кэшируем батчи только для бандла из модульного кэша: он приходит тем же объектом
  // на каждом маршруте. У деградировавшего бандла каждое монтирование даёт новый
  // объект манифеста, то есть новый ключ, и записи копились бы в кэше навсегда.
  const cacheable = isCachedBundle(data);

  // Сборка батчей стоит сотни миллисекунд, поэтому она живёт в модульном кэше и
  // переживает переходы между /atlas и /quiz. Приведение типа нужно потому, что
  // batch-cache не знает про three: батчи под этим ключом собирает только этот модуль.
  const batches = useMemo(
    () =>
      cacheable
        ? getCached(batchCache as Map<AtlasManifest, SystemBatch[]>, data.manifest, () => {
            const built = buildBatches(data);
            // геометрия уехала на GPU — сырые чанки больше не нужны
            releaseBuffers(data);
            return built;
          })
        : buildBatches(data),
    [data, cacheable],
  );

  useEffect(() => {
    onReady?.();
  }, [batches, onReady]);

  // Кэшированные батчи переживают размонтирование: владелец их GPU-ресурсов — кэш
  // (`resetAtlasCache`), иначе возврат на /atlas получил бы уничтоженные меши.
  // Некэшируемые батчи не переживут никого — их уничтожаем сами.
  useEffect(() => {
    if (cacheable) return;
    return () => {
      for (const b of batches) b.dispose();
    };
  }, [batches, cacheable]);

  // порог «это тап, а не вращение»: палец дрожит сильнее мыши
  const coarsePointer = useMediaQuery("(pointer: coarse)");
  const tapSlop = coarsePointer ? 10 : 2;

  const visibleSystems = useAtlasStore((s) => s.visibleSystems);
  const hiddenParts = useAtlasStore((s) => s.hiddenParts);
  const isolatedPartId = useAtlasStore((s) => s.isolatedPartId);
  const selectedPartId = useAtlasStore((s) => s.selectedPartId);
  const restrictTo = useAtlasStore((s) => s.restrictTo);
  const highlights = useAtlasStore((s) => s.highlights);
  const select = useAtlasStore((s) => s.select);

  useEffect(() => {
    const state = { visibleSystems, hiddenParts, isolatedPartId, restrictTo };
    for (const b of batches) {
      let anyVisible = false;
      const overlayGeometry = b.overlay.geometry;
      overlayGeometry.clearGroups();
      b.parts.forEach((part, i) => {
        const visible = isPartVisible(state, part.id, b.system);
        anyVisible ||= visible;
        b.mesh.setVisibleAt(i, visible);
        // приоритет: подсветка викторины > выделение > собственный оттенок
        const kind: OverlayKind | undefined =
          highlights[part.id] ?? (part.id === selectedPartId ? "selected" : undefined);
        if (kind && visible) {
          const range = b.mesh.getGeometryRangeAt(i);
          if (range) overlayGeometry.addGroup(range.indexStart, range.indexCount, OVERLAY_KINDS.indexOf(kind));
        }
        b.mesh.setColorAt(i, kind ? OVERLAY_COLORS[kind] : plainColors ? b.plainColors[i] : b.colors[i]);
      });
      // eslint-disable-next-line react-hooks/immutability -- three.js meshes are external mutable state
      b.mesh.visible = anyVisible;
      b.overlay.visible = overlayGeometry.groups.length > 0;
    }
  }, [batches, visibleSystems, hiddenParts, isolatedPartId, selectedPartId, restrictTo, highlights, plainColors]);

  const onClick = (b: SystemBatch) => (e: ThreeEvent<MouseEvent>) => {
    // R3F applies its drag threshold only to onPointerMissed; hit handlers must
    // check `delta` themselves, or orbiting the camera selects on release.
    // Порог мыши (2 px) для пальца мал: обычный тап смещается на 3–8 px, и
    // структура просто не выделялась бы. Для грубого указателя берём 10 px —
    // вращение камеры пальцем всегда длиннее.
    if (e.delta > tapSlop) return;
    e.stopPropagation();
    const batchId = e.batchId ?? e.intersections.find((i) => i.object === b.mesh)?.batchId;
    if (batchId === undefined || batchId === null) return;
    const id = b.parts[batchId].id;
    if (onPick) onPick(id);
    else select(id);
  };

  return (
    <>
      {batches.map((b) => (
        // Fragment, а не group: CameraRig ищет BatchedMesh среди прямых детей сцены
        <Fragment key={b.system}>
          <primitive object={b.mesh} onClick={onClick(b)} />
          <primitive object={b.overlay} />
        </Fragment>
      ))}
    </>
  );
}
