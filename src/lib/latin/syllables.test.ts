import { describe, expect, it } from "vitest";
import { syllables } from "./syllables";

const nuclei = (word: string) => syllables(word).map((s) => s.nucleus);

describe("syllables", () => {
  it("splits oe on a morpheme seam, but keeps the digraph elsewhere", () => {
    // thyro-epiglottica: «o» закрывает соединительную основу, «e» начинает корень
    expect(syllables("thyroepiglottica")).toHaveLength(7);
    expect(syllables("hyoepiglotticum")).toHaveLength(7);
    // обычный диграф: coe-li-a-cus, oe-so-pha-gus
    expect(syllables("coeliacus")).toHaveLength(4);
    expect(syllables("oesophagus")).toHaveLength(4);
  });

  it("gives one syllable per vowel", () => {
    expect(nuclei("os")).toEqual(["o"]);
    expect(nuclei("vena")).toEqual(["e", "a"]);
    expect(nuclei("musculus")).toEqual(["u", "u", "u"]);
    expect(nuclei("arteria")).toEqual(["a", "e", "i", "a"]);
  });

  it("reports where the nucleus sits in the Latin spelling", () => {
    expect(syllables("caput")).toEqual([
      { nucleus: "a", start: 1 },
      { nucleus: "u", start: 3 },
    ]);
    expect(syllables("lingua")).toEqual([
      { nucleus: "i", start: 1 },
      { nucleus: "a", start: 5 },
    ]);
  });

  it("reads ae/oe/au as one nucleus", () => {
    expect(nuclei("caecum")).toEqual(["ae", "u"]);
    expect(nuclei("aortae")).toEqual(["a", "o", "ae"]);
    expect(nuclei("oesophagus")).toEqual(["oe", "o", "a", "u"]);
    expect(nuclei("auris")).toEqual(["au", "i"]);
  });

  it("reads eu as a diphthong, but splits the -eus/-eum ending", () => {
    expect(nuclei("aponeurosis")).toEqual(["a", "o", "eu", "o", "i"]);
    // deltoide-us и perine-um: здесь e и u принадлежат разным слогам
    expect(nuclei("deltoideus")).toEqual(["e", "o", "i", "e", "u"]);
    expect(nuclei("perineum")).toEqual(["e", "i", "e", "u"]);
  });

  it("counts qu and ngu + vowel as single consonants", () => {
    expect(nuclei("obliquus")).toEqual(["o", "i", "u"]); // o-bli-quus, три слога
    expect(nuclei("lingua")).toEqual(["i", "a"]); // lin-gua, два слога
    expect(nuclei("longus")).toEqual(["o", "u"]); // перед согласной ngu — это «нгу»
    expect(nuclei("sanguineus")).toEqual(["a", "i", "e", "u"]);
  });

  it("drops the i of ti + vowel, because ти сливается в «ци»", () => {
    expect(nuclei("substantia")).toEqual(["u", "a", "a"]); // sub-stan-tia
    expect(nuclei("ostium")).toEqual(["o", "i", "u"]); // после s остаётся «ти»: os-ti-um
    expect(nuclei("brachium")).toEqual(["a", "i", "u"]);
  });

  it("drops the consonantal i (й)", () => {
    expect(nuclei("iodum")).toEqual(["o", "u"]);
  });

  it("ignores letter case", () => {
    expect(nuclei("Arteria")).toEqual(["a", "e", "i", "a"]);
  });
});
