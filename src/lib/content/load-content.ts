import { AtlasLoadError, type FetchLike } from "@/lib/atlas/load-atlas";
import type { StressMap } from "@/lib/latin";
import type { ContentBundle, StructureEntry, Topic } from "./types";

export interface LoadContentOptions {
  fetchImpl?: FetchLike;
  signal?: AbortSignal;
}

async function loadJson<T>(url: string, opts: LoadContentOptions): Promise<T> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  let res: Response;
  try {
    res = await fetchImpl(url, { signal: opts.signal });
  } catch (e) {
    if (opts.signal?.aborted) throw e;
    throw new AtlasLoadError(url, "Не удалось загрузить контент");
  }
  if (!res.ok) {
    await res.body?.cancel().catch(() => {});
    throw new AtlasLoadError(url, "Не удалось загрузить контент");
  }
  try {
    return (await res.json()) as T;
  } catch {
    throw new AtlasLoadError(url, "Не удалось загрузить контент");
  }
}

/**
 * Грузит structures.json, topics.json и latin-stress.json параллельно из
 * `${baseUrl}/content/`.
 *
 * Имена обязательны — без них контента нет; словарь ударений необязателен:
 * его отсутствие убирает только строку транскрипции, поэтому ошибка на нём
 * не валит загрузку. Отмену (`signal`) пропускаем дальше: она не «нет
 * словаря», а «страница ушла».
 */
export async function loadContent(baseUrl: string, opts: LoadContentOptions = {}): Promise<ContentBundle> {
  const [structures, topics, stress] = await Promise.all([
    loadJson<Record<string, StructureEntry>>(`${baseUrl}/content/structures.json`, opts),
    loadJson<Topic[]>(`${baseUrl}/content/topics.json`, opts),
    // форму проверяем здесь: `null` или строка вместо объекта уронили бы рендер
    // подписи, а показать структуру важнее, чем её чтение
    loadJson<unknown>(`${baseUrl}/content/latin-stress.json`, opts)
      .then((m) => (m !== null && typeof m === "object" && !Array.isArray(m) ? (m as StressMap) : ({} as StressMap)))
      .catch((e: unknown) => {
        if (opts.signal?.aborted) throw e;
        console.warn("latin-stress.json unavailable, transcription is hidden", e);
        return {} as StressMap;
      }),
  ]);
  return { structures, topics, stress };
}
