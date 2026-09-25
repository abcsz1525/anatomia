import { describe, expect, it } from "vitest";
import { guessStress, stressOf } from "./stress";
import type { StressMap } from "./types";

describe("guessStress", () => {
  it("puts one- and two-syllable words on the only possible syllable", () => {
    expect(guessStress("os")).toBe(1);
    expect(guessStress("vena")).toBe(2);
    expect(guessStress("caput")).toBe(2);
    expect(guessStress("lingua")).toBe(2); // lin-gua: ngu — согласный
    expect(guessStress("plexus")).toBe(2);
  });

  it("goes to the third syllable when the penult is short", () => {
    expect(guessStress("arteria")).toBe(3); // гласная перед гласной
    expect(guessStress("musculus")).toBe(3); // суффикс -ulus
    expect(guessStress("humerus")).toBe(3); // одна согласная после гласной
    expect(guessStress("deltoideus")).toBe(3); // de-us: гласная перед гласной
    expect(guessStress("vertebra")).toBe(3); // ver-te-bra: «немая + плавная» br
    expect(guessStress("ostium")).toBe(3);
    expect(guessStress("oesophagus")).toBe(3);
  });

  it("stays on the penult when it is long", () => {
    expect(guessStress("segmentalis")).toBe(2); // суффикс -alis
    expect(guessStress("maxilla")).toBe(2); // гласная перед двумя согласными
    expect(guessStress("platysma")).toBe(2);
    expect(guessStress("obliquus")).toBe(2); // qu — две буквы, позиция долгая
    expect(guessStress("substantia")).toBe(2); // sub-stan-tia: «-ia» не покрывает ядро
    expect(guessStress("ligamentum")).toBe(2); // гласная перед nt
  });

  it("follows the long-suffix table", () => {
    for (const word of [
      "cervicalis", "laterale", "palmaris", "molare", "ligatus", "costata",
      "vagina", "spinosus", "spinosa", "spinosum", "activus", "fissura", "maturus",
      // косвенные падежи и множественное число корпуса
      "intercostales", "dorsales", "costalium", "molares", "alarium",
      "caudati", "caudatae", "termini", "callosi", "spinosae",
    ]) expect(guessStress(word), word).toBe(2);
  });

  it("follows the short-suffix table, where -bilis beats -ilis", () => {
    for (const word of [
      "thoracicus", "thoracica", "thoracicum", "lobulus", "lobula", "lobulum",
      "alveolus", "alveola", "alveolum", "osseus", "ossea", "osseum",
      "radius", "tibia", "ilium", "mobilis",
    ]) expect(guessStress(word), word).toBe(3);
  });

  it("leaves -ilis and -inae out of the long table", () => {
    expect(guessStress("gracilis")).toBe(3); // гра́цилис
    expect(guessStress("retinae")).toBe(3); // рэ́тинэ
  });

  it("makes the position long before x, but lets the suffix table win", () => {
    expect(guessStress("circumflexus")).toBe(2); // гласная перед x — позиция долгая
    expect(guessStress("trapezius")).toBe(3); // суффикс -ius сильнее позиции перед z
  });

  it("ignores letter case", () => {
    expect(guessStress("Arteria")).toBe(3);
  });
});

describe("stressOf", () => {
  const map: StressMap = { vena: 2, arteria: 3 };

  it("reads the dictionary case-insensitively", () => {
    expect(stressOf("vena", map)).toBe(2);
    expect(stressOf("Arteria", map)).toBe(3);
  });

  it("returns null for a word the dictionary does not know", () => {
    expect(stressOf("ignotum", map)).toBeNull();
  });
});
