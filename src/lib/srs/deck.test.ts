import { describe, expect, it } from "vitest";
import type { ContentBundle, StructureEntry, Topic } from "@/lib/content/types";
import type { AtlasManifest, AtlasPart } from "@/lib/atlas/types";
import { allDeck, topicDeck } from "./deck";

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

// Same fixture shape as src/lib/quiz/pool.test.ts: 2 femur L/R skeletal
// (lower-limb-bones), tibia L skeletal (lower-limb-bones), deltoid L/R
// muscular (muscles-upper-limb), aorta arterial without a content entry.
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
};

const topics: Topic[] = [
  { id: "osteology", ru: "Остеология", la: "Osteologia" },
  { id: "lower-limb-bones", ru: "Кости нижней конечности", la: "Ossa membri inferioris", parent: "osteology" },
  { id: "myology", ru: "Миология", la: "Myologia" },
  { id: "muscles-upper-limb", ru: "Мышцы верхней конечности", la: "Musculi membri superioris", parent: "myology" },
  { id: "other", ru: "Вне программы первого курса" },
];

const content: ContentBundle = { structures, topics, stress: {} };

describe("topicDeck", () => {
  it("returns one card per distinct concept, in distinctConcepts order", () => {
    const deck = topicDeck(content, manifest, "lower-limb-bones");
    expect(deck.map((c) => c.la)).toEqual(["Femur", "Tibia"]);
  });

  it("uses the key of the first part sharing the la for ru, lower-cased+trimmed key", () => {
    const deck = topicDeck(content, manifest, "lower-limb-bones");
    expect(deck[0]).toEqual({ key: "femur", la: "Femur", ru: "Бедренная кость", topic: "lower-limb-bones" });
    expect(deck[1]).toEqual({ key: "tibia", la: "Tibia", ru: "Большеберцовая кость", topic: "lower-limb-bones" });
  });

  it("produces one card for a concept split across multiple meshes/sides", () => {
    const deck = topicDeck(content, manifest, "muscles-upper-limb");
    expect(deck).toHaveLength(1);
    expect(deck[0]).toEqual({ key: "deltoideus", la: "Deltoideus", ru: "Дельтовидная мышца", topic: "muscles-upper-limb" });
  });
});

describe("allDeck", () => {
  it("concatenates topicDeck over courseTopics, in topics order", () => {
    const deck = allDeck(content, manifest);
    expect(deck.map((c) => c.key)).toEqual(["femur", "tibia", "deltoideus"]);
  });

  it("drops later duplicates by key across topics", () => {
    const dupTopics: Topic[] = [
      { id: "a", ru: "A" },
      { id: "b", ru: "B" },
    ];
    const dupStructures: Record<string, StructureEntry> = {
      X1: { la: "Femur", ru: "Бедренная кость", topic: "a", side: "left", aliases: [] },
      X2: { la: "Femur", ru: "Дубликат", topic: "b", side: "left", aliases: [] },
    };
    const dupManifest: AtlasManifest = {
      version: "1",
      triangles: 0,
      chunks: [],
      parts: [makePart("X1", "skeletal"), makePart("X2", "skeletal")],
    };
    const dupContent: ContentBundle = { structures: dupStructures, topics: dupTopics, stress: {} };
    const deck = allDeck(dupContent, dupManifest);
    expect(deck).toHaveLength(1);
    expect(deck[0]).toEqual({ key: "femur", la: "Femur", ru: "Бедренная кость", topic: "a" });
  });

  it("returns an empty deck for no topics/parts", () => {
    expect(allDeck({ structures: {}, topics: [], stress: {} }, { version: "1", triangles: 0, chunks: [], parts: [] })).toEqual([]);
  });
});
