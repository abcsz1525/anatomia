import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { conceptKey, shadeIndices, shadePalette } from "./part-colors";
import { applySystemOverrides } from "./system-overrides";
import type { AtlasManifest } from "./types";

const manifest = applySystemOverrides(
  JSON.parse(readFileSync("public/models/v1/atlas.json", "utf8")) as AtlasManifest,
);
const partsOf = (system: string) => manifest.parts.filter((p) => p.system === system);
const byName = (system: string, name: string) => partsOf(system).findIndex((p) => p.name === name);

describe("shadePalette", () => {
  it("gives distinct shades around the system colour", () => {
    const hex = shadePalette("#d9a066").map((c) => c.getHexString());
    expect(new Set(hex).size).toBe(hex.length);
    expect(hex[0]).toBe("d9a066");
  });
});

describe("conceptKey", () => {
  it("ignores the side", () => {
    expect(conceptKey("Left tibialis anterior")).toBe(conceptKey("Right tibialis anterior"));
    expect(conceptKey("Distal phalanx of left thumb")).toBe(conceptKey("Distal phalanx of right thumb"));
  });
});

describe("shadeIndices", () => {
  it("colours both sides of a structure alike", () => {
    const parts = partsOf("muscular");
    const shades = shadeIndices(parts, shadePalette("#b5453f").length);
    expect(shades[byName("muscular", "Left sartorius")]).toBe(shades[byName("muscular", "Right sartorius")]);
  });

  it("separates the sections of the gut", () => {
    const parts = partsOf("digestive");
    const shades = shadeIndices(parts, shadePalette("#d9a066").length);
    const at = (n: string) => shades[byName("digestive", n)];
    expect(at("Stomach")).not.toBe(at("Duodenum"));
    expect(at("Ascending colon")).not.toBe(at("Transverse colon"));
    expect(at("Transverse colon")).not.toBe(at("Descending colon"));
    expect(at("Middle part of jejunum")).not.toBe(at("Middle part of ileum"));
  });
});
