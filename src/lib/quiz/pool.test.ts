import { describe, expect, it } from "vitest";
import type { ContentBundle, StructureEntry, Topic } from "@/lib/content/types";
import type { AtlasManifest, AtlasPart } from "@/lib/atlas/types";
import {
  contextIds,
  courseTopics,
  distinctConcepts,
  groupKey,
  groupsOf,
  topicGroups,
  topicParts,
  visibleIdsForTopic,
} from "./pool";

function makePart(id: string, system: AtlasPart["system"]): AtlasPart {
  return {
    id,
    name: id,
    conceptId: id,
    system,
    chunk: 0,
    positions: 0,
    normals: 0,
    indices: 0,
    vertexCount: 0,
    indexCount: 0,
    bounds: [
      [0, 0, 0],
      [0, 0, 0],
    ],
  };
}

// 6 частей: 2 femur L/R skeletal (lower-limb-bones), tibia L skeletal
// (lower-limb-bones), deltoid L/R muscular (muscles-upper-limb), aorta
// arterial без записи в content (структура вне программы).
const manifest: AtlasManifest = {
  version: "1",
  triangles: 0,
  chunks: [],
  parts: [
    makePart("FEM_L", "skeletal"),
    makePart("FEM_R", "skeletal"),
    makePart("TIB_L", "skeletal"),
    makePart("DELT_L", "muscular"),
    makePart("DELT_R", "muscular"),
    makePart("AORTA", "arterial"),
  ],
};

const structures: Record<string, StructureEntry> = {
  FEM_L: { la: "Femur", ru: "Бедренная кость", topic: "lower-limb-bones", side: "left", aliases: [] },
  FEM_R: { la: "Femur", ru: "Бедренная кость", topic: "lower-limb-bones", side: "right", aliases: [] },
  TIB_L: { la: "Tibia", ru: "Большеберцовая кость", topic: "lower-limb-bones", side: "left", aliases: [] },
  DELT_L: { la: "Deltoideus", ru: "Дельтовидная мышца", topic: "muscles-upper-limb", side: "left", aliases: [] },
  DELT_R: { la: "Deltoideus", ru: "Дельтовидная мышца", topic: "muscles-upper-limb", side: "right", aliases: [] },
  // AORTA intentionally has no content entry (not part of the course).
};

const topics: Topic[] = [
  { id: "osteology", ru: "Остеология", la: "Osteologia" },
  { id: "lower-limb-bones", ru: "Кости нижней конечности", la: "Ossa membri inferioris", parent: "osteology" },
  { id: "myology", ru: "Миология", la: "Myologia" },
  { id: "muscles-upper-limb", ru: "Мышцы верхней конечности", la: "Musculi membri superioris", parent: "myology" },
  { id: "angiology", ru: "Ангиология", la: "Angiologia" },
  { id: "arteries-limbs", ru: "Артерии конечностей", la: "Arteriae membrorum", parent: "angiology" },
  { id: "splanchnology", ru: "Спланхнология", la: "Splanchnologia" },
  { id: "digestive", ru: "Пищеварительная система", la: "Systema digestorium", parent: "splanchnology" },
  { id: "other", ru: "Вне программы первого курса" },
];

const content: ContentBundle = { structures, topics, stress: {} };

describe("courseTopics", () => {
  it("returns leaves except 'other', in topics.json order", () => {
    const leaves = courseTopics(topics);
    expect(leaves.map((t) => t.id)).toEqual([
      "lower-limb-bones",
      "muscles-upper-limb",
      "arteries-limbs",
      "digestive",
    ]);
  });
});

describe("topicParts", () => {
  it("returns the parts of a topic in manifest order with la/ru/side/system", () => {
    const parts = topicParts(content, manifest, "lower-limb-bones");
    expect(parts.map((p) => p.id)).toEqual(["FEM_L", "FEM_R", "TIB_L"]);
    expect(parts[0]).toEqual({
      id: "FEM_L",
      la: "Femur",
      ru: "Бедренная кость",
      side: "left",
      system: "skeletal",
      topic: "lower-limb-bones",
    });
  });

  it("excludes parts without a content entry", () => {
    const parts = topicParts(content, manifest, "lower-limb-bones");
    expect(parts.some((p) => p.id === "AORTA")).toBe(false);
  });
});

describe("contextIds", () => {
  it("returns all skeletal ids for topics under myology", () => {
    expect(contextIds(manifest, topics, "muscles-upper-limb")).toEqual(["FEM_L", "FEM_R", "TIB_L"]);
  });

  it("returns all skeletal ids for topics under angiology", () => {
    expect(contextIds(manifest, topics, "arteries-limbs")).toEqual(["FEM_L", "FEM_R", "TIB_L"]);
  });

  it("returns [] for topics not under myology/arthrology/angiology", () => {
    expect(contextIds(manifest, topics, "lower-limb-bones")).toEqual([]);
    expect(contextIds(manifest, topics, "digestive")).toEqual([]);
  });
});

describe("visibleIdsForTopic", () => {
  it("unions topicParts ids with contextIds, without duplicates", () => {
    const ids = visibleIdsForTopic(content, manifest, topics, "muscles-upper-limb");
    expect(ids).toEqual(["DELT_L", "DELT_R", "FEM_L", "FEM_R", "TIB_L"]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("equals topicParts ids when contextIds is empty", () => {
    const ids = visibleIdsForTopic(content, manifest, topics, "lower-limb-bones");
    expect(ids).toEqual(["FEM_L", "FEM_R", "TIB_L"]);
  });
});

describe("distinctConcepts", () => {
  it("returns unique la values in order of first appearance", () => {
    const parts = topicParts(content, manifest, "lower-limb-bones");
    expect(distinctConcepts(parts)).toEqual(["Femur", "Tibia"]);
  });
});

describe("groupKey", () => {
  it("joins la and side", () => {
    const [femL, femR, tibL] = topicParts(content, manifest, "lower-limb-bones");
    expect(groupKey(femL)).toBe("Femur|left");
    expect(groupKey(femR)).toBe("Femur|right");
    expect(groupKey(tibL)).toBe("Tibia|left");
  });

  it("separates sides of the same la", () => {
    const [femL, femR] = topicParts(content, manifest, "lower-limb-bones");
    expect(groupKey(femL)).not.toBe(groupKey(femR));
  });

  it("matches an empty side only with an empty side", () => {
    const unpaired = { id: "X", la: "Sacrum", ru: "Крестец", side: "" as const, system: "skeletal" as const, topic: "t" };
    const left = { ...unpaired, id: "Y", side: "left" as const };
    expect(groupKey(unpaired)).toBe("Sacrum|");
    expect(groupKey(unpaired)).not.toBe(groupKey(left));
  });
});

describe("groupsOf", () => {
  it("keys every part by la|side, ids in manifest order", () => {
    const parts = topicParts(content, manifest, "lower-limb-bones");
    const groups = groupsOf(parts);
    expect([...groups.keys()]).toEqual(["Femur|left", "Femur|right", "Tibia|left"]);
    expect(groups.get("Femur|left")).toEqual(["FEM_L"]);
    expect(groups.get("Tibia|left")).toEqual(["TIB_L"]);
  });

  it("collects the duplicate meshes of one structure into one group", () => {
    // две половины одной мышцы: разные id, одна и та же la и сторона
    const parts = [
      { id: "FJ1475", la: "Flexor digitorum superficialis", ru: "Сгибатель", side: "right" as const, system: "muscular" as const, topic: "t" },
      { id: "FJ1499", la: "Flexor digitorum superficialis", ru: "Сгибатель", side: "right" as const, system: "muscular" as const, topic: "t" },
      { id: "FJ1476", la: "Flexor digitorum superficialis", ru: "Сгибатель", side: "left" as const, system: "muscular" as const, topic: "t" },
    ];
    const groups = groupsOf(parts);
    expect(groups.size).toBe(2);
    expect(groups.get("Flexor digitorum superficialis|right")).toEqual(["FJ1475", "FJ1499"]);
    expect(groups.get("Flexor digitorum superficialis|left")).toEqual(["FJ1476"]);
  });

  it("returns an empty map for no parts", () => {
    expect(groupsOf([]).size).toBe(0);
  });

  it("covers every part exactly once", () => {
    const parts = topicParts(content, manifest, "muscles-upper-limb");
    const ids = [...groupsOf(parts).values()].flat();
    expect(ids.sort()).toEqual(parts.map((p) => p.id).sort());
  });
});

describe("topicGroups", () => {
  it("groups course topics under their parent, with concept counts", () => {
    expect(topicGroups(content, manifest)).toEqual([
      { id: "osteology", ru: "Остеология", topics: [{ id: "lower-limb-bones", ru: "Кости нижней конечности", concepts: 2 }] },
      { id: "myology", ru: "Миология", topics: [{ id: "muscles-upper-limb", ru: "Мышцы верхней конечности", concepts: 1 }] },
    ]);
  });

  it("skips topics without concepts", () => {
    // arteries-limbs: единственная артерия манифеста без записи в structures.json;
    // digestive: частей в манифесте нет вовсе
    const ids = topicGroups(content, manifest).flatMap((g) => g.topics.map((t) => t.id));
    expect(ids).not.toContain("arteries-limbs");
    expect(ids).not.toContain("digestive");
  });

  it("makes a top-level topic without a parent its own group", () => {
    const loose: ContentBundle = {
      structures,
      topics: [{ id: "lower-limb-bones", ru: "Кости нижней конечности", la: "Ossa membri inferioris" }],
      stress: {},
    };
    expect(topicGroups(loose, manifest)).toEqual([
      { id: "lower-limb-bones", ru: "Кости нижней конечности", topics: [{ id: "lower-limb-bones", ru: "Кости нижней конечности", concepts: 2 }] },
    ]);
  });
});
