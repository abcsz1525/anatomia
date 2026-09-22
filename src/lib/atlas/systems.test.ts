import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SYSTEMS, SYSTEM_BY_ID } from "./systems";
import type { AtlasManifest } from "./types";

const manifest = JSON.parse(
  readFileSync("public/models/atlas.json", "utf8"),
) as AtlasManifest;

describe("SYSTEMS", () => {
  it("covers every system present in the manifest", () => {
    const inManifest = new Set(manifest.parts.map((p) => p.system));
    for (const id of inManifest) expect(SYSTEM_BY_ID[id], `missing ${id}`).toBeDefined();
    expect(SYSTEMS.length).toBe(inManifest.size);
  });

  it("has unique ids, russian labels and hex colors", () => {
    const ids = new Set(SYSTEMS.map((s) => s.id));
    expect(ids.size).toBe(SYSTEMS.length);
    for (const s of SYSTEMS) {
      expect(s.ru.length).toBeGreaterThan(1);
      expect(s.color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it("shows bones, ligaments and muscles by default (1st year course)", () => {
    const visible = SYSTEMS.filter((s) => s.defaultVisible).map((s) => s.id).sort();
    expect(visible).toEqual(["connective", "muscular", "skeletal"]);
  });
});
