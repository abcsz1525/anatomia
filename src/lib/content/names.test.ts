import { describe, expect, it } from "vitest";
import type { StressMap } from "@/lib/latin";
import { displayNames, searchLabels, sideLabel, transcription } from "./names";
import type { Topic } from "./types";
const stress: StressMap = { femur: 2, arteria: 3, carotis: 2, interna: 2 };
const topics: Topic[] = [{ id: "osteology", ru: "Остеология" }, { id: "lower-limb-bones", ru: "Кости нижней конечности", parent: "osteology" }];
const femur = { la: "Femur", ru: "Бедренная кость", topic: "lower-limb-bones", side: "left" as const, aliases: ["os femoris"] };
describe("displayNames", () => {
  it("renders translated entry with side, topic path and transcription", () => {
    expect(displayNames("Left femur", femur, topics, stress)).toEqual({
      la: "Femur", ru: "Бедренная кость", en: "Left femur", laRu: "фэ́мур", sideRu: "слева",
      topicRu: "Кости нижней конечности · Остеология", translated: true,
    });
  });
  it("falls back for untranslated parts", () => {
    expect(displayNames("Aorta", undefined, topics, stress)).toEqual({ la: "", ru: "", en: "Aorta", laRu: "", sideRu: "", topicRu: "", translated: false });
  });
  it("leaves laRu empty when the dictionary did not load", () => {
    expect(displayNames("Left femur", femur, topics, {}).laRu).toBe("");
  });
});

describe("transcription", () => {
  it("reads the whole phrase with stress marks", () => {
    expect(transcription("Arteria carotis interna", stress)).toBe("артэ́риа каро́тис интэ́рна");
  });
  it("is empty without a name or without a dictionary", () => {
    expect(transcription("", stress)).toBe("");
    // пустой словарь — это «не загрузился»: чтение без ударений не показываем
    expect(transcription("Femur", {})).toBe("");
  });
});
describe("searchLabels", () => {
  it("collects all languages and aliases", () => {
    expect(searchLabels("Left femur", femur)).toEqual(["Left femur", "Femur", "Бедренная кость", "os femoris"]);
    expect(searchLabels("Aorta", undefined)).toEqual(["Aorta"]);
  });
});
describe("sideLabel", () => {
  it("maps sides to adverbial russian labels", () => {
    expect(sideLabel("left")).toBe("слева");
    expect(sideLabel("right")).toBe("справа");
    expect(sideLabel("")).toBe("");
  });
});
