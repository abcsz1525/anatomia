import { gzipSync } from "node:zlib";
import { describe, expect, it, vi } from "vitest";
import { AtlasLoadError, loadAllChunks, loadChunk, loadManifest } from "./load-atlas";
import type { AtlasManifest } from "./types";

function okResponse(body: BodyInit, type = "application/octet-stream") {
  return new Response(body, { status: 200, headers: { "content-type": type } });
}

const manifest: AtlasManifest = {
  version: "test",
  parts: [],
  triangles: 0,
  chunks: [
    { url: "/models/a.bin", bytes: 4, gzip: "/models/a.bin.gz", gzipBytes: 20 },
    { url: "/models/b.bin", bytes: 4, gzip: "/models/b.bin.gz", gzipBytes: 20 },
  ],
};

describe("loadManifest", () => {
  it("fetches and parses atlas.json from baseUrl", async () => {
    const fetchImpl = vi.fn(async () => okResponse(JSON.stringify(manifest), "application/json"));
    const m = await loadManifest("http://x", { fetchImpl });
    expect(fetchImpl).toHaveBeenCalledWith("http://x/models/atlas.json", expect.anything());
    expect(m.chunks.length).toBe(2);
  });
});

describe("loadChunk", () => {
  it("decompresses .gz payloads", async () => {
    const raw = new Uint8Array([1, 2, 3, 4]);
    const fetchImpl = vi.fn(async () => okResponse(gzipSync(raw)));
    const buf = await loadChunk("http://x/models/a.bin.gz", { fetchImpl });
    expect(Array.from(new Uint8Array(buf))).toEqual([1, 2, 3, 4]);
  });

  it("returns raw bytes for non-gz urls", async () => {
    const fetchImpl = vi.fn(async () => okResponse(new Uint8Array([9, 8])));
    const buf = await loadChunk("http://x/models/a.bin", { fetchImpl });
    expect(Array.from(new Uint8Array(buf))).toEqual([9, 8]);
  });

  it("retries after a failure and succeeds", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 500 }))
      .mockResolvedValueOnce(okResponse(new Uint8Array([7])));
    const buf = await loadChunk("http://x/models/a.bin", { fetchImpl, retryDelayMs: 0 });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(new Uint8Array(buf)[0]).toBe(7);
  });

  it("throws AtlasLoadError after exhausting retries", async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 503 }));
    await expect(
      loadChunk("http://x/models/a.bin", { fetchImpl, retries: 2, retryDelayMs: 0 }),
    ).rejects.toBeInstanceOf(AtlasLoadError);
    expect(fetchImpl).toHaveBeenCalledTimes(3); // 1 + 2 retries
  });
});

describe("loadAllChunks", () => {
  it("loads gzip urls in manifest order and reports progress", async () => {
    const fetchImpl = vi.fn(async (url: string) =>
      okResponse(gzipSync(new Uint8Array([url.includes("/a.") ? 1 : 2]))),
    );
    const progress: Array<[number, number]> = [];
    const buffers = await loadAllChunks(manifest, "http://x", (l, t) => progress.push([l, t]), { fetchImpl });
    expect(new Uint8Array(buffers[0])[0]).toBe(1);
    expect(new Uint8Array(buffers[1])[0]).toBe(2);
    expect(progress.at(-1)).toEqual([2, 2]);
  });
});
