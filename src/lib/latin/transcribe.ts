import { stressOf } from "./stress";
import { isTsiGlide, isVowel, syllables } from "./syllables";
import type { StressMap, StressPos } from "./types";

/** Комбинирующий акут: ставится сразу после ударной гласной буквы. */
const ACUTE = "́";

/** Римские цифры в названиях — не слова: «Ramus ventricularis anterior I». */
const ROMAN = /^[ivx]+$/i;

const LATIN_WORD = /[a-z]+/gi;

/** Гласные после твёрдой согласной. `e` читается «э»: vena → вэ́на. */
const HARD_VOWELS: Record<string, string> = {
  a: "а", e: "э", i: "и", o: "о", u: "у", y: "и",
  ae: "э", oe: "э", au: "ау", eu: "эу",
};

/**
 * Те же гласные после мягкого `l`: мягкость латинского «эль» в кириллице
 * показывает сама гласная — `la` → ля, `lo` → лё, `lu` → лю, `le` → ле.
 */
const SOFT_VOWELS: Record<string, string> = {
  a: "я", e: "е", i: "и", o: "ё", u: "ю", y: "и",
  ae: "е", oe: "е", au: "яу", eu: "еу",
};

/** Согласные, у которых нет условий чтения. */
const CONSONANTS: Record<string, string> = {
  b: "б", c: "к", d: "д", f: "ф", g: "г", h: "х", j: "й", k: "к", m: "м",
  n: "н", p: "п", q: "к", r: "р", s: "с", t: "т", v: "в", w: "в", x: "кс", z: "з",
};

const PALATAL_C = new Set(["e", "i", "y"]);
const GREEK_DIGRAPHS: Record<string, string> = { ch: "х", ph: "ф", th: "т", rh: "р" };

interface Chunk {
  /** Кириллица этого куска слова. */
  text: string;
  /** Сколько латинских букв он занял. */
  length: number;
  /** Смягчает ли он следующую гласную (истинно только для `l`/`ll`). */
  softens: boolean;
}

function chunk(text: string, length: number, softens = false): Chunk {
  return { text, length, softens };
}

/**
 * Согласный звук (или немая гласная вроде `u` в `qu`), начинающийся с позиции
 * `i`. Позиции ядер сюда не попадают — их читает `vowelText`.
 */
function consonantAt(w: string, i: number): Chunk {
  const ch = w[i];
  // гласная буква, не ставшая ядром: либо согласный `i` (й), либо `u` внутри
  // `qu`/`ngu` — её уже прочитал предыдущий кусок.
  if (isVowel(ch)) return chunk(ch === "i" ? "й" : "", 1);

  const pair = w.slice(i, i + 2);
  const digraph = GREEK_DIGRAPHS[pair];
  if (digraph) return chunk(digraph, 2);
  if (pair === "qu") return chunk("кв", 2);
  if (pair === "ss") return chunk("сс", 2);
  if (w.slice(i, i + 3) === "ngu" && isVowel(w[i + 3])) return chunk("нгв", 3);

  if (ch === "l") {
    // мягкое `l`: перед гласной мягкость уйдёт в неё, перед согласной и в
    // конце слова её показывает мягкий знак (deltoideus → дэльтои́дэус).
    const length = w[i + 1] === "l" ? 2 : 1;
    const base = length === 2 ? "лл" : "л";
    return isVowel(w[i + length])
      ? chunk(base, length, true)
      : chunk(`${base}ь`, length);
  }
  if (ch === "c") {
    const palatal = PALATAL_C.has(w[i + 1]) || w.slice(i + 1, i + 3) === "ae" || w.slice(i + 1, i + 3) === "oe";
    return chunk(palatal ? "ц" : "к", 1);
  }
  if (ch === "s") {
    // между гласными звонкая (nasalis → наза́лис); в словах греческого
    // происхождения — и перед `m`/`n` (platysma → пляти́зма, chiasma → хиа́зма).
    const next = w[i + 1];
    const voiced = isVowel(w[i - 1]) && (isVowel(next) || next === "m" || next === "n");
    return chunk(voiced ? "з" : "с", 1);
  }
  // `ti` перед гласной → ци (substantia → субста́нциа); после s, t, x — ти
  // (ostium → о́стиум). Условие то же, что снимает `i` с роли ядра слога.
  if (ch === "t" && isTsiGlide(w, i + 1)) return chunk("ци", 2);
  return chunk(CONSONANTS[ch] ?? ch, 1);
}

function vowelText(nucleus: string, soft: boolean, stressed: boolean): string {
  const text = (soft ? SOFT_VOWELS : HARD_VOWELS)[nucleus] ?? nucleus;
  // У дифтонга (ау, эу) ударение на первой гласной, у диграфа (ae → э) —
  // на единственной; в обоих случаях акут идёт сразу за первой буквой.
  return stressed ? `${text[0]}${ACUTE}${text.slice(1)}` : text;
}

/**
 * Русская транскрипция одного латинского слова. `stress` — номер ударного
 * слога с конца; на односложном слове и без словарной пометки (`null`) знак
 * ударения не ставится.
 */
export function transcribeWord(word: string, stress: StressPos | null): string {
  const w = word.toLowerCase();
  const syls = syllables(w);
  const nucleusAt = new Map(syls.map((s) => [s.start, s]));
  // Слишком большой номер (словарь разошёлся со слогоделением) — просто читаем
  // слово без ударения, падать на этом нельзя.
  const stressedStart =
    stress !== null && syls.length > 1 && stress <= syls.length ? syls[syls.length - stress].start : -1;

  let result = "";
  let soft = false;
  let i = 0;
  while (i < w.length) {
    const syllable = nucleusAt.get(i);
    if (syllable) {
      result += vowelText(syllable.nucleus, soft, i === stressedStart);
      soft = false;
      i += syllable.nucleus.length;
      continue;
    }
    const next = consonantAt(w, i);
    result += next.text;
    soft = next.softens;
    i += next.length;
  }
  return result;
}

/** Слова латинского названия в нижнем регистре, без римских цифр. */
export function latinWords(phrase: string): string[] {
  return (phrase.match(LATIN_WORD) ?? []).filter((w) => !ROMAN.test(w)).map((w) => w.toLowerCase());
}

/**
 * Транскрипция всего названия: пунктуация и пробелы сохраняются, римские цифры
 * выводятся заглавными как есть, слово без словарной пометки читается без
 * знака ударения — показать транскрипцию всё равно полезнее, чем ничего.
 */
export function transcribe(phrase: string, map: StressMap): string {
  return phrase.replace(LATIN_WORD, (word) =>
    ROMAN.test(word) ? word.toUpperCase() : transcribeWord(word, stressOf(word, map)),
  );
}
