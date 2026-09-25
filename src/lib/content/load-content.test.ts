import { describe, expect, it, vi } from "vitest";
import { loadContent } from "./load-content";
import { AtlasLoadError } from "@/lib/atlas/load-atlas";
/** Трёхфайловый контент: имена, темы и словарь ударений. */
function contentFor(url: string): string {
  if (url.endsWith("topics.json")) return JSON.stringify([{ id: "t", ru: "Т" }]);
  if (url.endsWith("latin-stress.json")) return JSON.stringify({ femur: 2 });
  return JSON.stringify({ FJ1: { la: "A", ru: "Б", topic: "t", side: "", aliases: [] } });
}

describe("loadContent", () => {
  it("loads all three files from baseUrl", async () => {
    const fetchImpl = vi.fn(async (url: string) => new Response(contentFor(url), { status: 200 }));
    const c = await loadContent("http://x", { fetchImpl });
    expect(c.structures.FJ1.la).toBe("A");
    expect(c.topics[0].id).toBe("t");
    expect(c.stress).toEqual({ femur: 2 });
    expect(fetchImpl).toHaveBeenCalledWith("http://x/content/structures.json", expect.anything());
    expect(fetchImpl).toHaveBeenCalledWith("http://x/content/latin-stress.json", expect.anything());
  });

  it("falls back to an empty dictionary when only the stress file fails", async () => {
    const fetchImpl = vi.fn(async (url: string) =>
      url.endsWith("latin-stress.json")
        ? new Response(null, { status: 404 })
        : new Response(contentFor(url), { status: 200 }));
    const c = await loadContent("http://x", { fetchImpl });
    // имена на месте — пропадает только транскрипция
    expect(c.structures.FJ1.la).toBe("A");
    expect(c.topics[0].id).toBe("t");
    expect(c.stress).toEqual({});
  });
  it("throws AtlasLoadError on http failure", async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 500 }));
    await expect(loadContent("http://x", { fetchImpl })).rejects.toBeInstanceOf(AtlasLoadError);
  });
});
