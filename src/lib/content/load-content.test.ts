import { describe, expect, it, vi } from "vitest";
import { loadContent } from "./load-content";
import { AtlasLoadError } from "@/lib/atlas/load-atlas";
describe("loadContent", () => {
  it("loads both files from baseUrl", async () => {
    const fetchImpl = vi.fn(async (url: string) =>
      new Response(JSON.stringify(url.endsWith("topics.json") ? [{ id: "t", ru: "Т" }] : { FJ1: { la: "A", ru: "Б", topic: "t", side: "", aliases: [] } }), { status: 200 }));
    const c = await loadContent("http://x", { fetchImpl });
    expect(c.structures.FJ1.la).toBe("A");
    expect(c.topics[0].id).toBe("t");
    expect(fetchImpl).toHaveBeenCalledWith("http://x/content/structures.json", expect.anything());
  });
  it("throws AtlasLoadError on http failure", async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 500 }));
    await expect(loadContent("http://x", { fetchImpl })).rejects.toBeInstanceOf(AtlasLoadError);
  });
});
