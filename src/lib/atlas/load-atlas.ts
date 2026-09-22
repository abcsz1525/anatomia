import type { AtlasManifest } from "./types";

export interface LoadOptions {
  fetchImpl?: typeof fetch;
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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchWithRetry(url: string, opts: LoadOptions): Promise<Response> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const retries = opts.retries ?? 3;
  const delay = opts.retryDelayMs ?? 500;
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetchImpl(url, { signal: opts.signal });
      if (res.ok) return res;
      lastError = new Error(`HTTP ${res.status}`);
    } catch (e) {
      if (opts.signal?.aborted) throw e;
      lastError = e;
    }
    if (attempt < retries) await sleep(delay * (attempt + 1));
  }
  throw new AtlasLoadError(url, `Не удалось загрузить ${url}: ${String(lastError)}`);
}

export async function loadManifest(baseUrl: string, opts: LoadOptions = {}): Promise<AtlasManifest> {
  const res = await fetchWithRetry(`${baseUrl}/models/atlas.json`, opts);
  return (await res.json()) as AtlasManifest;
}

export async function loadChunk(url: string, opts: LoadOptions = {}): Promise<ArrayBuffer> {
  const res = await fetchWithRetry(url, opts);
  if (url.endsWith(".gz") && res.body) {
    const stream = res.body.pipeThrough(new DecompressionStream("gzip"));
    return new Response(stream).arrayBuffer();
  }
  return res.arrayBuffer();
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
