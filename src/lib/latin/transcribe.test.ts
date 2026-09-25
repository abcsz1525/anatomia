import { describe, expect, it } from "vitest";
import { latinWords, transcribe, transcribeWord, withAcute } from "./transcribe";
import type { StressMap } from "./types";

describe("transcribeWord", () => {
  it("reads the words of the plan's example list", () => {
    expect(transcribeWord("musculus", 3)).toBe("му́скулюс");
    expect(transcribeWord("arteria", 3)).toBe("артэ́риа");
    expect(transcribeWord("segmentalis", 2)).toBe("сэгмэнта́лис");
    expect(transcribeWord("maxilla", 2)).toBe("макси́лля");
    expect(transcribeWord("vena", 2)).toBe("вэ́на");
    expect(transcribeWord("caput", 2)).toBe("ка́пут");
    expect(transcribeWord("obliquus", 2)).toBe("обли́квус");
    expect(transcribeWord("lingua", 2)).toBe("ли́нгва");
    expect(transcribeWord("substantia", 2)).toBe("субста́нциа");
    expect(transcribeWord("ostium", 3)).toBe("о́стиум");
    expect(transcribeWord("jejunum", 2)).toBe("йэйу́нум");
    expect(transcribeWord("major", 2)).toBe("ма́йор");
    expect(transcribeWord("nasalis", 2)).toBe("наза́лис");
    expect(transcribeWord("brachium", 3)).toBe("бра́хиум");
    expect(transcribeWord("cervicalis", 2)).toBe("цэрвика́лис");
    expect(transcribeWord("deltoideus", 3)).toBe("дэльтои́дэус");
    expect(transcribeWord("perineum", 2)).toBe("пэринэ́ум");
    expect(transcribeWord("ophthalmicus", 3)).toBe("офта́льмикус");
  });

  it("gives a one-syllable word no stress mark", () => {
    expect(transcribeWord("os", 1)).toBe("ос");
    expect(transcribeWord("fel", 1)).toBe("фэль");
  });

  it("gives a word missing from the dictionary no stress mark", () => {
    expect(transcribeWord("arteria", null)).toBe("артэриа");
    // номер слога больше, чем слогов (словарь разошёлся со слогоделением)
    expect(transcribeWord("vena", 3)).toBe("вэна");
  });

  it("reads single vowels", () => {
    expect(transcribeWord("humerus", 3)).toBe("ху́мэрус"); // u → у, e → э
    expect(transcribeWord("gingiva", 2)).toBe("гинги́ва"); // i → и, g → г перед i
    expect(transcribeWord("zygomaticus", 3)).toBe("зигома́тикус"); // y → и, z → з
  });

  it("reads ae/oe as э and au/eu as ау/эу", () => {
    expect(transcribeWord("caecum", 2)).toBe("цэ́кум");
    expect(transcribeWord("oesophagus", 3)).toBe("эзо́фагус");
    expect(transcribeWord("auris", 2)).toBe("а́урис"); // акут после первой гласной дифтонга
    expect(transcribeWord("aponeurosis", 2)).toBe("апонэуро́зис");
  });

  it("reads i before a vowel at the start of a word and j as й", () => {
    expect(transcribeWord("iodum", 2)).toBe("йо́дум");
    expect(transcribeWord("jejunum", 2)).toBe("йэйу́нум");
    expect(transcribeWord("major", 2)).toBe("ма́йор");
  });

  it("reads c as ц before e, i, y, ae, oe and as к otherwise", () => {
    expect(transcribeWord("cervicalis", 2)).toBe("цэрвика́лис");
    expect(transcribeWord("caput", 2)).toBe("ка́пут");
    expect(transcribeWord("caecum", 2)).toBe("цэ́кум");
    expect(transcribeWord("cystis", 2)).toBe("ци́стис");
  });

  it("softens l before every vowel and writes ль before a consonant", () => {
    expect(transcribeWord("lamina", 3)).toBe("ля́мина"); // la → ля
    expect(transcribeWord("musculus", 3)).toBe("му́скулюс"); // lu → лю
    expect(transcribeWord("levator", 2)).toBe("лева́тор"); // le → ле
    expect(transcribeWord("cervicalis", 2)).toBe("цэрвика́лис"); // li → ли
    expect(transcribeWord("lymphaticus", 3)).toBe("лимфа́тикус"); // ly → ли
    expect(transcribeWord("maxilla", 2)).toBe("макси́лля"); // ll читается так же
    expect(transcribeWord("deltoideus", 3)).toBe("дэльтои́дэус"); // перед согласной
    expect(transcribeWord("fel", 1)).toBe("фэль"); // в конце слова
  });

  // `lo` — исключение по технике записи: «ё» в русском всегда ударная, и в
  // безударном слоге её прочитали бы с ударением. Мягкость остальных гласных
  // это не трогает, даже в обрусевших словах («плексус», «платизма»).
  it("reads lo hard, and keeps l soft everywhere else", () => {
    expect(transcribeWord("longus", 2)).toBe("ло́нгус");
    expect(transcribeWord("lobus", 2)).toBe("ло́бус");
    expect(transcribeWord("colon", 2)).toBe("ко́лон"); // безударное lo
    expect(transcribeWord("lobulus", 3)).toBe("ло́булюс"); // и ло, и лю в одном слове
    expect(transcribeWord("plexus", 2)).toBe("пле́ксус");
    expect(transcribeWord("platysma", 2)).toBe("пляти́зма");
    expect(transcribeWord("lateralis", 2)).toBe("лятэра́лис");
  });

  it("reads qu as кв and ngu + vowel as нгв", () => {
    expect(transcribeWord("obliquus", 2)).toBe("обли́квус");
    expect(transcribeWord("lingua", 2)).toBe("ли́нгва");
    expect(transcribeWord("sanguineus", 3)).toBe("сангви́нэус");
    expect(transcribeWord("longus", 2)).toBe("ло́нгус"); // перед согласной ngu — «нгу»
  });

  it("voices s between vowels and before m, n", () => {
    expect(transcribeWord("nasalis", 2)).toBe("наза́лис");
    expect(transcribeWord("platysma", 2)).toBe("пляти́зма"); // греческое sm → зм
    expect(transcribeWord("chiasma", 2)).toBe("хиа́зма");
    expect(transcribeWord("fossa", 2)).toBe("фо́сса"); // ss остаётся глухой
    expect(transcribeWord("ostium", 3)).toBe("о́стиум"); // перед согласной — с
  });

  it("reads ti + vowel as ци, but leaves ти after s, t, x", () => {
    expect(transcribeWord("substantia", 2)).toBe("субста́нциа");
    expect(transcribeWord("ostium", 3)).toBe("о́стиум");
    expect(transcribeWord("mixtio", 3)).toBe("ми́кстио");
  });

  it("reads x as кс", () => {
    expect(transcribeWord("plexus", 2)).toBe("пле́ксус");
    expect(transcribeWord("maxilla", 2)).toBe("макси́лля");
  });

  it("reads the Greek digraphs ch, ph, th, rh", () => {
    expect(transcribeWord("brachium", 3)).toBe("бра́хиум");
    expect(transcribeWord("ophthalmicus", 3)).toBe("офта́льмикус");
    expect(transcribeWord("thorax", 2)).toBe("то́ракс");
    expect(transcribeWord("rhomboideus", 3)).toBe("ромбои́дэус");
  });

  it("puts the acute right after the stressed vowel letter", () => {
    const acute = String.fromCharCode(0x301); // тот же знак, что в ожиданиях выше, но видимый
    expect(transcribeWord("vena", 2)).toBe(`вэ${acute}на`);
    expect(transcribeWord("caecum", 2)).toBe(`цэ${acute}кум`); // диграф ae — одна э, знак после неё
    expect(transcribeWord("auris", 2)).toBe(`а${acute}урис`); // дифтонг — знак после первой гласной
    expect(transcribeWord("lobus", 2)).toBe(`ло${acute}бус`);
  });

  it("never puts the acute on ё, which is stressed by itself", () => {
    const acute = String.fromCharCode(0x301);
    expect(withAcute("ё")).toBe("ё");
    expect(withAcute("э")).toBe(`э${acute}`);
    expect(withAcute("ау")).toBe(`а${acute}у`);
    // в самой транскрипции «ё» не появляется вовсе: lo читается твёрдо
    for (const [word, stress] of [["lobus", 2], ["colon", 2], ["longus", 2], ["callosum", 2]] as const) {
      expect(transcribeWord(word, stress), word).not.toContain("ё");
    }
  });

  it("ignores letter case", () => {
    expect(transcribeWord("Vena", 2)).toBe("вэ́на");
  });
});

const MAP: StressMap = {
  arteria: 3, carotis: 2, interna: 2, ramus: 2, ventricularis: 2, anterior: 3,
  valva: 2, aortae: 2, valvula: 3, semilunaris: 2, dextra: 2, femur: 2,
};

describe("transcribe", () => {
  it("reads a whole Latin name in lower case", () => {
    expect(transcribe("Arteria carotis interna", MAP)).toBe("артэ́риа каро́тис интэ́рна");
  });

  it("keeps Roman numerals as they are, in upper case", () => {
    expect(transcribe("Ramus ventricularis anterior I", MAP)).toBe("ра́мус вэнтрикуля́рис антэ́риор I");
    expect(transcribe("Ramus ii", MAP)).toBe("ра́мус II");
  });

  it("keeps punctuation and spacing", () => {
    expect(transcribe("Valva aortae, valvula semilunaris dextra", MAP)).toBe(
      "ва́льва ао́ртэ, ва́львуля сэмилюна́рис дэ́кстра",
    );
    expect(transcribe("  Vena   cava  ", { vena: 2, cava: 2 })).toBe("  вэ́на   ка́ва  ");
  });

  it("still reads a word the dictionary does not know, just without the acute", () => {
    expect(transcribe("Femur ignotum", MAP)).toBe("фэ́мур игнотум");
    expect(transcribe("Femur", {})).toBe("фэмур");
  });
});

describe("latinWords", () => {
  it("returns lower-case words without Roman numerals", () => {
    expect(latinWords("Ramus ventricularis anterior I")).toEqual(["ramus", "ventricularis", "anterior"]);
    expect(latinWords("Valva aortae, valvula semilunaris dextra")).toEqual([
      "valva", "aortae", "valvula", "semilunaris", "dextra",
    ]);
    expect(latinWords("Arteria segmenti anterioris II")).toEqual(["arteria", "segmenti", "anterioris"]);
  });

  it("returns an empty list for a name without Latin letters", () => {
    expect(latinWords("I, II")).toEqual([]);
  });
});
