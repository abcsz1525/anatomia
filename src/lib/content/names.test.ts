import { describe, expect, it } from "vitest";
import { displayNames, searchLabels } from "./names";
import type { Topic } from "./types";
const topics: Topic[] = [{ id: "osteology", ru: "Остеология" }, { id: "lower-limb-bones", ru: "Кости нижней конечности", parent: "osteology" }];
const femur = { la: "Femur", ru: "Бедренная кость", topic: "lower-limb-bones", side: "left" as const, aliases: ["os femoris"] };
describe("displayNames", () => {
  it("renders translated entry with side and topic path", () => {
    expect(displayNames("Left femur", femur, topics)).toEqual({
      la: "Femur", ru: "Бедренная кость", en: "Left femur", sideRu: "слева",
      topicRu: "Кости нижней конечности · Остеология", translated: true,
    });
  });
  it("falls back for untranslated parts", () => {
    expect(displayNames("Aorta", undefined, topics)).toEqual({ la: "", ru: "", en: "Aorta", sideRu: "", topicRu: "", translated: false });
  });
});
describe("searchLabels", () => {
  it("collects all languages and aliases", () => {
    expect(searchLabels("Left femur", femur)).toEqual(["Left femur", "Femur", "Бедренная кость", "os femoris"]);
    expect(searchLabels("Aorta", undefined)).toEqual(["Aorta"]);
  });
});
