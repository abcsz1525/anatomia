import { AtlasLoadError, type FetchLike } from "@/lib/atlas/load-atlas";
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

/** Грузит structures.json и topics.json параллельно из `${baseUrl}/content/`. */
export async function loadContent(baseUrl: string, opts: LoadContentOptions = {}): Promise<ContentBundle> {
  const [structures, topics] = await Promise.all([
    loadJson<Record<string, StructureEntry>>(`${baseUrl}/content/structures.json`, opts),
    loadJson<Topic[]>(`${baseUrl}/content/topics.json`, opts),
  ]);
  return { structures, topics };
}
