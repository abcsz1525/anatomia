import { describe, expect, it } from "vitest";
import { buildIndex, normalize, search } from "./search";

const index = buildIndex([
  { id: "FJ1", labels: ["Left femur", "Femur sinistrum", "Левая бедренная кость"] },
  { id: "FJ2", labels: ["Right femur", "Femur dextrum", "Правая бедренная кость"] },
  { id: "FJ3", labels: ["Left tibia", "Tibia sinistra", "Левая большеберцовая кость"] },
  { id: "FJ4", labels: ["Sternum", "Грудина"] },
]);

describe("normalize", () => {
  it("lowercases, maps ё to е and collapses spaces", () => {
    expect(normalize("  Чёрный   Кот ")).toBe("черный кот");
  });
});

describe("search", () => {
  it("returns empty for blank query", () => {
    expect(search(index, "  ")).toEqual([]);
  });
  it("matches any language, prefix matches rank first", () => {
    expect(search(index, "femur")).toEqual(["FJ1", "FJ2"]);
    expect(search(index, "бедрен")[0]).toBe("FJ1");
    expect(search(index, "Tibia")).toEqual(["FJ3"]);
  });
  it("prefers label-start over mid-word matches", () => {
    const r = search(index, "st");
    expect(r[0]).toBe("FJ4"); // "Sternum" starts with st; "sinistrum" contains st
  });
  it("respects limit", () => {
    expect(search(index, "кость", 2).length).toBe(2);
  });
});
