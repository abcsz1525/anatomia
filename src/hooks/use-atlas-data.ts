"use client";
import { useCallback, useEffect, useState } from "react";
import { resetAtlasCache } from "@/lib/atlas/batch-cache";
import { AtlasLoadError, loadAllChunks, loadManifest } from "@/lib/atlas/load-atlas";
import type { AtlasManifest } from "@/lib/atlas/types";
import { loadContent } from "@/lib/content/load-content";
import type { ContentBundle } from "@/lib/content/types";

export type AtlasData = { manifest: AtlasManifest; buffers: ArrayBuffer[]; content: ContentBundle };
export type AtlasDataState =
  | { status: "loading"; loaded: number; total: number }
  | { status: "error"; message: string; retry: () => void }
  | { status: "ready"; data: AtlasData };

// модульный кэш: чанки геометрии весят десятки мегабайт, поэтому возврат на /atlas
// (клиентская навигация) не должен грузить их заново
let cache: AtlasData | null = null;

/**
 * Лежит ли бандл в модульном кэше. Только такой бандл переживает размонтирование
 * и на каждом маршруте приходит тем же объектом, поэтому только его батчи имеет
 * смысл кэшировать. Деградировавший бандл (имена не загрузились) не кэшируется —
 * каждое монтирование даёт новый объект манифеста, а значит и новый ключ.
 */
export function isCachedBundle(data: AtlasData): boolean {
  return data === cache;
}

/**
 * Сырые буферы чанков (десятки мегабайт) нужны только для первой сборки
 * BatchedMesh — дальше геометрия живёт на GPU и в кэше батчей. Освобождаем их
 * сразу после сборки: на телефоне это главный источник расхода памяти.
 * Чистим только бандл из модульного кэша — он единственный переживает
 * размонтирование, и его батчи лежат в `batchCache`, так что второй сборки из
 * буферов не будет. Чужой (деградировавший, не закэшированный) бандл не трогаем:
 * его буферы понадобятся следующей сборке при новом монтировании.
 */
export function releaseBuffers(data: AtlasData): void {
  if (!isCachedBundle(data)) return;
  data.buffers.length = 0;
}

export function useAtlasData(): AtlasDataState {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<AtlasDataState>(() =>
    cache ? { status: "ready", data: cache } : { status: "loading", loaded: 0, total: 0 },
  );
  const retry = useCallback(() => {
    // батчи собраны из старых данных и больше ничему не соответствуют;
    // без этого повторная загрузка оставила бы их висеть на GPU навсегда
    resetAtlasCache();
    cache = null;
    setAttempt((a) => a + 1);
  }, []);

  useEffect(() => {
    if (cache) {
      // уже готово из кэша (useState-инициализатор) — сеть не трогаем; setState здесь
      // нужен только на случай, если кэш заполнился уже после монтирования
      const cached = cache;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- no-op unless the cache appeared after mount
      setState((s) => (s.status === "ready" && s.data === cached ? s : { status: "ready", data: cached }));
      return;
    }
    const controller = new AbortController();
    // после ready/error прогресс чанков больше не должен перетирать состояние,
    // иначе отвалившийся контент оставляет загрузчик висеть в "loading"
    let settled = false;
    // сбрасываем прогресс при каждом новом запуске загрузки (повтор после ошибки)
    setState({ status: "loading", loaded: 0, total: 0 });
    (async () => {
      try {
        const manifest = await loadManifest("", { signal: controller.signal });
        // имена независимы от геометрии — грузим их параллельно с чанками;
        // без имён атлас работает, только подписи остаются английскими
        const [buffers, content] = await Promise.all([
          loadAllChunks(
            manifest,
            "",
            (loaded, total) => {
              if (settled) return;
              setState({ status: "loading", loaded, total });
            },
            { signal: controller.signal },
          ),
          loadContent("", { signal: controller.signal }).catch((e) => {
            if (controller.signal.aborted) throw e;
            console.warn("content unavailable, names will be English only", e);
            return { structures: {}, topics: [] } satisfies ContentBundle;
          }),
        ]);
        settled = true;
        const data: AtlasData = { manifest, buffers, content };
        // деградировавший контент (имена не загрузились — см. catch выше) в кэш
        // не кладём: иначе английские подписи залипли бы на все переходы до
        // перезагрузки страницы. Кэшируем только полный бандл.
        if (content.topics.length > 0) cache = data;
        setState({ status: "ready", data });
      } catch (e) {
        settled = true;
        if (controller.signal.aborted) return;
        const message =
          e instanceof AtlasLoadError
            ? "Не удалось загрузить модель. Проверьте соединение и попробуйте снова."
            : `Ошибка загрузки: ${String(e)}`;
        setState({ status: "error", message, retry });
      }
    })();
    return () => controller.abort();
  }, [attempt, retry]);

  return state;
}
