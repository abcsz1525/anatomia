import { describe, expect, it } from "vitest";
import { SIDE_WORD_EXEMPT_IDS, buildBundle, validateContent, type CsvRow } from "./content-rules";
import type { AtlasManifest } from "@/lib/atlas/types";
import type { Topic } from "@/lib/content/types";

const part = (id: string, name: string, system: "skeletal" | "muscular" | "arterial" | "cardiac") => ({
  id, name, conceptId: "FMA0", system, chunk: 0, positions: 0, normals: 0, indices: 0, vertexCount: 0, indexCount: 0,
  bounds: [[0, 0, 0], [1, 1, 1]] as [[number, number, number], [number, number, number]],
});
const manifest: AtlasManifest = {
  version: "t", triangles: 0, chunks: [],
  parts: [
    part("FJ1", "Left femur", "skeletal"), part("FJ2", "Right femur", "skeletal"),
    part("FJ3", "Left tibia", "skeletal"), part("FJ4", "Right tibia", "skeletal"),
    part("FJ5", "Sternum", "skeletal"), part("FJ6", "Left fibula", "skeletal"),
    part("FJ7", "Right fibula", "skeletal"), part("FJ8", "Left patella", "skeletal"),
    part("FJ9", "Aorta", "arterial"),
  ],
};
const topics: Topic[] = [
  { id: "osteology", ru: "Остеология" }, { id: "lower-limb-bones", ru: "Кости ноги", parent: "osteology" },
  { id: "thorax", ru: "Грудная клетка", parent: "osteology" }, { id: "other", ru: "Прочее" },
];
const ok: CsvRow[] = [
  { id: "FJ1", en: "Left femur", la: "Femur", ru: "Бедренная кость", topic: "lower-limb-bones", aliases: "os femoris; бедро" },
  { id: "FJ2", en: "Right femur", la: "Femur", ru: "Бедренная кость", topic: "lower-limb-bones", aliases: "" },
  { id: "FJ3", en: "Left tibia", la: "Tibia", ru: "Большеберцовая кость", topic: "lower-limb-bones", aliases: "" },
  { id: "FJ4", en: "Right tibia", la: "Tibia", ru: "Большеберцовая кость", topic: "lower-limb-bones", aliases: "" },
  { id: "FJ5", en: "Sternum", la: "Sternum", ru: "Грудина", topic: "other", aliases: "" },
  // тема должна набрать ≥4 РАЗНЫХ термина, поэтому пар femur/tibia не хватает
  { id: "FJ6", en: "Left fibula", la: "Fibula", ru: "Малоберцовая кость", topic: "lower-limb-bones", aliases: "" },
  { id: "FJ7", en: "Right fibula", la: "Fibula", ru: "Малоберцовая кость", topic: "lower-limb-bones", aliases: "" },
  { id: "FJ8", en: "Left patella", la: "Patella", ru: "Надколенник", topic: "lower-limb-bones", aliases: "" },
  // COURSE_SYSTEMS теперь включает все системы (включая arterial), поэтому
  // FJ9 (Aorta) тоже обязателен по правилу 7 — держим строку в "other",
  // чтобы не задевать правило 8 (там ≥4 термина не требуются)
  { id: "FJ9", en: "Aorta", la: "Aorta", ru: "Аорта", topic: "other", aliases: "" },
];

describe("validateContent", () => {
  it("accepts a complete, sorted, valid table", () => {
    expect(validateContent(ok, manifest, topics)).toEqual([]);
  });
  it("reports missing course parts", () => {
    const errs = validateContent(ok.slice(0, 4), manifest, topics);
    expect(errs.map((e) => e.message)).toContain("missing: FJ5 Sternum");
  });
  it("rejects duplicate ids, unknown ids, name mismatch, empty la/ru, side words, unknown topic", () => {
    const bad: CsvRow[] = [
      ...ok,
      { id: "FJ1", en: "Left femur", la: "Femur", ru: "Бедренная кость", topic: "lower-limb-bones", aliases: "" },
      { id: "FJ404", en: "Nope", la: "X", ru: "Y", topic: "other", aliases: "" },
    ];
    bad[2] = { ...bad[2], en: "Tibia left", ru: "Левая большеберцовая кость", la: "", topic: "nope" };
    const msgs = validateContent(bad, manifest, topics).map((e) => e.message).join("\n");
    expect(msgs).toMatch(/duplicate id FJ1/);
    expect(msgs).toMatch(/unknown id FJ404/);
    expect(msgs).toMatch(/FJ3.*en mismatch/);
    expect(msgs).toMatch(/FJ3.*la is empty/);
    expect(msgs).toMatch(/FJ3.*side word/);
    expect(msgs).toMatch(/FJ3.*unknown topic nope/);
  });
  it("exempts the semilunar cusps from the side-word rule (side is part of the name)", () => {
    const cuspManifest: AtlasManifest = { ...manifest, parts: [...manifest.parts, part("FJ2435", "Anterior cusp of aortic valve", "cardiac")] };
    const cusp: CsvRow = { id: "FJ2435", en: "Anterior cusp of aortic valve", la: "Valva aortae, valvula semilunaris dextra",
      ru: "Клапан аорты, правая полулунная заслонка", topic: "other", aliases: "" };
    // ids are strings: "FJ2435" sorts between "FJ2" and "FJ3"
    const rows = [ok[0], ok[1], cusp, ...ok.slice(2)];
    expect(SIDE_WORD_EXEMPT_IDS.has("FJ2435")).toBe(true);
    expect(validateContent(rows, cuspManifest, topics)).toEqual([]);
    // a non-exempt id with the same word still fails
    const notExempt = rows.map((r) => (r.id === "FJ5" ? { ...r, ru: "Правая грудина" } : r));
    const msgs = validateContent(notExempt, cuspManifest, topics).map((e) => e.message);
    expect(msgs.join("\n")).toMatch(/FJ5.*side word/);
    expect(msgs.some((m) => m.includes("FJ2435"))).toBe(false);
  });
  it("rejects a container topic: rows belong to leaves only", () => {
    const rows = ok.map((r) => (r.id === "FJ5" ? { ...r, topic: "osteology" } : r));
    const msgs = validateContent(rows, manifest, topics).map((e) => e.message);
    expect(msgs.join("\n")).toMatch(/FJ5.*non-leaf topic osteology/);
    // и такая строка не засчитывается ни одной теме
    expect(msgs.some((m) => m.startsWith("topic osteology"))).toBe(false);
  });
  it("requires ≥4 distinct terms per course topic and sorted ids", () => {
    const rows = ok.map((r) => (r.id === "FJ5" ? { ...r, topic: "thorax" } : r));
    expect(validateContent(rows, manifest, topics).map((e) => e.message)).toContain("topic thorax has 1 distinct terms (<4)");
    // 4 строки, но всего 2 термина (две пары) — тема всё ещё не наполнена
    const pairsOnly = ok.filter((r) => r.id !== "FJ8").map((r) => (r.id === "FJ6" || r.id === "FJ7" ? { ...r, topic: "thorax" } : r));
    expect(validateContent(pairsOnly, manifest, topics).map((e) => e.message)).toContain("topic lower-limb-bones has 2 distinct terms (<4)");
    const unsorted = [ok[1], ok[0], ...ok.slice(2)];
    expect(validateContent(unsorted, manifest, topics).map((e) => e.message)).toContain("rows are not sorted by id (first at row 2)");
  });
});

describe("buildBundle", () => {
  it("derives side and splits aliases", () => {
    const b = buildBundle(ok, manifest, topics);
    expect(b.structures.FJ1).toEqual({ la: "Femur", ru: "Бедренная кость", topic: "lower-limb-bones", side: "left", aliases: ["os femoris", "бедро"] });
    expect(b.structures.FJ5.side).toBe("");
    expect(b.topics).toEqual(topics);
  });
});
