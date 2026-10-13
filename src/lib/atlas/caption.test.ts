import { describe, expect, it } from "vitest";
import { captionFor } from "./caption";

describe("captionFor", () => {
  it("описывает состояние сцены по величине разнесения", () => {
    expect(captionFor(0, null)).toBe("Взрослый мужчина");
    expect(captionFor(0.05, null)).toBe("Взрослый мужчина");
    expect(captionFor(0.3, null)).toBe("Разнесённые структуры");
    expect(captionFor(0.95, null)).toBe("Разнесённые структуры");
    expect(captionFor(1, null)).toBe("Инвентарь");
  });

  it("при изоляции показывает имя структуры", () => {
    expect(captionFor(0, "Femur")).toBe("Femur");
    expect(captionFor(1, "Femur")).toBe("Femur");
  });
});
