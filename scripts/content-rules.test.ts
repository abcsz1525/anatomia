import { describe, expect, it } from "vitest";
import { buildBundle, validateContent, type CsvRow } from "./content-rules";
import type { AtlasManifest } from "@/lib/atlas/types";
import type { Topic } from "@/lib/content/types";
import { guessStress, latinWords, type StressMap } from "@/lib/latin";

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

// правило 9 требует словарь ровно под таблицу: все слова la и ничего лишнего.
// Собираем его из самих строк, чтобы каждый тест не выписывал его руками.
const stressFor = (rows: CsvRow[]): StressMap =>
  Object.fromEntries(rows.flatMap((r) => latinWords(r.la)).map((w) => [w, guessStress(w)]));
const check = (rows: CsvRow[], m: AtlasManifest = manifest, t: Topic[] = topics) =>
  validateContent(rows, m, t, stressFor(rows));

describe("validateContent", () => {
  it("accepts a complete, sorted, valid table", () => {
    expect(check(ok)).toEqual([]);
  });
  it("reports missing course parts", () => {
    const errs = check(ok.slice(0, 4));
    expect(errs.map((e) => e.message)).toContain("missing: FJ5 Sternum");
  });
  it("rejects duplicate ids, unknown ids, name mismatch, empty la/ru, side words, unknown topic", () => {
    const bad: CsvRow[] = [
      ...ok,
      { id: "FJ1", en: "Left femur", la: "Femur", ru: "Бедренная кость", topic: "lower-limb-bones", aliases: "" },
      { id: "FJ404", en: "Nope", la: "X", ru: "Y", topic: "other", aliases: "" },
    ];
    bad[2] = { ...bad[2], en: "Tibia left", ru: "Левая большеберцовая кость", la: "", topic: "nope" };
    const msgs = check(bad).map((e) => e.message).join("\n");
    expect(msgs).toMatch(/duplicate id FJ1/);
    expect(msgs).toMatch(/unknown id FJ404/);
    expect(msgs).toMatch(/FJ3.*en mismatch/);
    expect(msgs).toMatch(/FJ3.*la is empty/);
    expect(msgs).toMatch(/FJ3.*side word/);
    expect(msgs).toMatch(/FJ3.*unknown topic nope/);
  });
  it("requires the side in ru exactly when la carries a Latin side word", () => {
    const cuspManifest: AtlasManifest = { ...manifest, parts: [...manifest.parts, part("FJ2435", "Anterior cusp of aortic valve", "cardiac")] };
    const cusp: CsvRow = { id: "FJ2435", en: "Anterior cusp of aortic valve", la: "Valva aortae, valvula semilunaris dextra",
      ru: "Клапан аорты, правая полулунная заслонка", topic: "other", aliases: "" };
    // ids are strings: "FJ2435" sorts between "FJ2" and "FJ3"
    const rows = [ok[0], ok[1], cusp, ...ok.slice(2)];
    expect(check(rows, cuspManifest)).toEqual([]);
    // la с латинской стороной, а ru без неё — ошибка
    const noSide = rows.map((r) => (r.id === "FJ2435" ? { ...r, ru: "Клапан аорты, полулунная заслонка" } : r));
    expect(check(noSide, cuspManifest).map((e) => e.message).join("\n")).toMatch(/FJ2435.*side missing in ru/);
    // косвенный падеж тоже засчитывается
    const oblique = rows.map((r) => (r.id === "FJ2435" ? { ...r, la: "Cavitas ventriculi sinistri", ru: "Полость левого желудочка" } : r));
    expect(check(oblique, cuspManifest)).toEqual([]);
    // а без латинской стороны «Левая …» в ru по-прежнему запрещена
    const invented = rows.map((r) => (r.id === "FJ5" ? { ...r, ru: "Левая грудина" } : r));
    const msgs = check(invented, cuspManifest).map((e) => e.message);
    expect(msgs.join("\n")).toMatch(/FJ5.*side word in la\/ru/);
    expect(msgs.some((m) => m.includes("FJ2435"))).toBe(false);
    // …и в косвенном падеже тоже
    const invented2 = rows.map((r) => (r.id === "FJ5" ? { ...r, ru: "Ветвь левой грудины" } : r));
    expect(check(invented2, cuspManifest).map((e) => e.message).join("\n")).toMatch(/FJ5.*side word in la\/ru/);
    // родительный падеж латинской стороны требует стороны в ru
    const genitive = rows.map((r) => (r.id === "FJ2435" ? { ...r, la: "Ramus circumflexus arteriae coronariae sinistrae", ru: "Огибающая ветвь венечной артерии" } : r));
    expect(check(genitive, cuspManifest).map((e) => e.message).join("\n")).toMatch(/FJ2435.*side missing in ru/);
  });
  it("rejects a container topic: rows belong to leaves only", () => {
    const rows = ok.map((r) => (r.id === "FJ5" ? { ...r, topic: "osteology" } : r));
    const msgs = check(rows).map((e) => e.message);
    expect(msgs.join("\n")).toMatch(/FJ5.*non-leaf topic osteology/);
    // и такая строка не засчитывается ни одной теме
    expect(msgs.some((m) => m.startsWith("topic osteology"))).toBe(false);
  });
  it("requires ≥4 distinct terms per course topic and sorted ids", () => {
    const rows = ok.map((r) => (r.id === "FJ5" ? { ...r, topic: "thorax" } : r));
    expect(check(rows).map((e) => e.message)).toContain("topic thorax has 1 distinct terms (<4)");
    // 4 строки, но всего 2 термина (две пары) — тема всё ещё не наполнена
    const pairsOnly = ok.filter((r) => r.id !== "FJ8").map((r) => (r.id === "FJ6" || r.id === "FJ7" ? { ...r, topic: "thorax" } : r));
    expect(check(pairsOnly).map((e) => e.message)).toContain("topic lower-limb-bones has 2 distinct terms (<4)");
    const unsorted = [ok[1], ok[0], ...ok.slice(2)];
    expect(check(unsorted).map((e) => e.message)).toContain("rows are not sorted by id (first at row 2)");
  });
  it("requires latin-stress.json to cover every la word and to carry nothing else", () => {
    const full = stressFor(ok);
    const noFemur = { ...full };
    delete noFemur.femur;
    const missing = validateContent(ok, manifest, topics, noFemur).map((e) => e.message);
    expect(missing).toContain('row 2 FJ1: latin word "femur" missing from latin-stress.json (run pnpm build:stress)');
    // femur стоит в двух строках, но ругаемся на слово один раз
    expect(missing.filter((m) => m.includes('"femur"'))).toHaveLength(1);
    // ключ, которого больше нет ни в одной la, — словарь начал гнить
    expect(validateContent(ok, manifest, topics, { ...full, obsoletus: 3 }).map((e) => e.message))
      .toContain('latin-stress.json has unused word "obsoletus"');
    // значение вне 1|2|3 и ключ не из строчных латинских букв
    const broken = validateContent(ok, manifest, topics, { ...full, Femur: 2, sternum: 4 } as unknown as StressMap).map((e) => e.message);
    expect(broken).toContain('latin-stress.json has bad word "Femur" (lower-case Latin letters only)');
    expect(broken).toContain('latin-stress.json has bad stress 4 for "sternum" (expected 1, 2 or 3)');
  });
});

describe("buildBundle", () => {
  it("derives side and splits aliases", () => {
    const b = buildBundle(ok, manifest, topics);
    expect(b.structures.FJ1).toEqual({ la: "Femur", ru: "Бедренная кость", topic: "lower-limb-bones", side: "left", aliases: ["os femoris", "бедро"] });
    expect(b.structures.FJ5.side).toBe("");
    // la называет сторону сама — бейдж не нужен
    const named = ok.map((r) => (r.id === "FJ1" ? { ...r, la: "Femur sinistrum", ru: "Левая бедренная кость" } : r));
    expect(buildBundle(named, manifest, topics).structures.FJ1.side).toBe("");
    expect(b.topics).toEqual(topics);
  });
});
