import type { AtlasManifest } from "./types";

export type FetchLike = (url: string, init?: { signal?: AbortSignal }) => Promise<Response>;

export interface LoadOptions {
  fetchImpl?: FetchLike;
  retries?: number;
  signal?: AbortSignal;
  retryDelayMs?: number;
}

export class AtlasLoadError extends Error {
  url: string;
  constructor(url: string, message: string) {
    super(message);
    this.name = "AtlasLoadError";
    this.url = url;
  }
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const abortReason = () => signal?.reason ?? new DOMException("The operation was aborted.", "AbortError");
    if (signal?.aborted) {
      reject(abortReason());
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      reject(abortReason());
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

async function fetchWithRetry(url: string, opts: LoadOptions): Promise<Response> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const retries = opts.retries ?? 3;
  const delay = opts.retryDelayMs ?? 500;
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetchImpl(url, { signal: opts.signal });
      if (res.ok) return res;
      await res.body?.cancel().catch(() => {});
      lastError = new Error(`HTTP ${res.status}`);
    } catch (e) {
      if (opts.signal?.aborted) throw e;
      lastError = e;
    }
    if (attempt < retries) await sleep(delay * (attempt + 1), opts.signal);
  }
  throw new AtlasLoadError(url, `Не удалось загрузить ${url}: ${String(lastError)}`);
}

export async function loadManifest(baseUrl: string, opts: LoadOptions = {}): Promise<AtlasManifest> {
  const url = `${baseUrl}/models/v1/atlas.json`;
  const res = await fetchWithRetry(url, opts);
  try {
    return (await res.json()) as AtlasManifest;
  } catch (e) {
    throw new AtlasLoadError(url, `Не удалось прочитать ${url}: ${String(e)}`);
  }
}

export async function loadChunk(url: string, opts: LoadOptions = {}): Promise<ArrayBuffer> {
  const res = await fetchWithRetry(url, opts);
  try {
    if (url.endsWith(".gz")) {
      if (!res.body) {
        throw new Error("тело ответа отсутствует");
      }
      const stream = res.body.pipeThrough(new DecompressionStream("gzip"));
      return await new Response(stream).arrayBuffer();
    }
    return await res.arrayBuffer();
  } catch (e) {
    throw new AtlasLoadError(url, `Не удалось прочитать ${url}: ${String(e)}`);
  }
}

export async function loadAllChunks(
  manifest: AtlasManifest,
  baseUrl: string,
  onProgress: (loaded: number, total: number) => void,
  opts: LoadOptions = {},
): Promise<ArrayBuffer[]> {
  const total = manifest.chunks.length;
  let loaded = 0;
  onProgress(0, total);
  return Promise.all(
    manifest.chunks.map(async (chunk) => {
      const buffer = await loadChunk(`${baseUrl}${chunk.gzip}`, opts);
      loaded += 1;
      onProgress(loaded, total);
      return buffer;
    }),
  );
}
