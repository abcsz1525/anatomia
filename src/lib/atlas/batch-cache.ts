import type { AtlasManifest } from "./types";

/**
 * Модуль намеренно не импортирует three: кэш интересует только жизненный цикл
 * GPU-ресурсов, а без three тест остаётся чистым (node-окружение, без WebGL).
 */
export interface Disposable {
  dispose(): void;
}

/** Батч системы глазами кэша: достаточно уметь освобождать свои ресурсы. */
export type SystemBatchLike = Disposable;

/**
 * Возвращает уже собранное значение либо собирает его один раз на ключ.
 * Важно, что второй вызов отдаёт тот же массив: `BodyMeshes` держит его в
 * `useMemo`, и новая ссылка означала бы пересборку эффектов и лишний `onReady`.
 */
export function getCached<K extends object, B extends Disposable>(cache: Map<K, B[]>, key: K, build: () => B[]): B[] {
  const hit = cache.get(key);
  if (hit) return hit;
  const built = build();
  cache.set(key, built);
  return built;
}

/** Уничтожает всё содержимое кэша: владелец ресурсов — кэш, а не компонент. */
export function resetCache<K extends object, B extends Disposable>(cache: Map<K, B[]>): void {
  for (const entries of cache.values()) for (const entry of entries) entry.dispose();
  cache.clear();
}

/**
 * Ключ — объект манифеста из модульного кэша `use-atlas-data`: пока данные те же,
 * собранные BatchedMesh переживают переходы между /atlas и /quiz и не собираются заново.
 */
export const batchCache = new Map<AtlasManifest, SystemBatchLike[]>();

/**
 * Единственная точка очистки — вызывается из `retry()`, когда данные атласа
 * перезагружаются и старые меши уже никому не соответствуют.
 */
export function resetAtlasCache(): void {
  resetCache(batchCache);
}
