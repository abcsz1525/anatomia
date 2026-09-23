"use client";
import { useCallback, useEffect, useState } from "react";
import { AtlasLoadError, loadAllChunks, loadManifest } from "@/lib/atlas/load-atlas";
import type { AtlasManifest } from "@/lib/atlas/types";
import { loadContent } from "@/lib/content/load-content";
import type { ContentBundle } from "@/lib/content/types";

export type AtlasData = { manifest: AtlasManifest; buffers: ArrayBuffer[]; content: ContentBundle };
export type AtlasDataState =
  | { status: "loading"; loaded: number; total: number }
  | { status: "error"; message: string; retry: () => void }
  | { status: "ready"; data: AtlasData };

export function useAtlasData(): AtlasDataState {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<AtlasDataState>({ status: "loading", loaded: 0, total: 0 });
  const retry = useCallback(() => setAttempt((a) => a + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    // после ready/error прогресс чанков больше не должен перетирать состояние,
    // иначе отвалившийся контент оставляет загрузчик висеть в "loading"
    let settled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset progress whenever a new load starts
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
        setState({ status: "ready", data: { manifest, buffers, content } });
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
