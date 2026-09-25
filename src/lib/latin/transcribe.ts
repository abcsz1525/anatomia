import { stressOf } from "./stress";
import { isTsiGlide, isVowel, syllables } from "./syllables";
import type { StressMap, StressPos } from "./types";

/** Комбинирующий акут: ставится сразу после ударной гласной буквы. */
const ACUTE = "́";

/**
 * Римская цифра с необязательной буквой сегмента: `I`, `XII`, `IVa`, `IVb`.
 * Это не слово: в транскрипцию цифра идёт заглавными, буква сегмента — как есть.
 */
const ROMAN = /^[ivx]+[ab]?$/i;

/**
 * Метка уровня позвонка — буквы вплотную к цифре: `C2`, `Th4`, `L5`, `S1`.
 * Читать её по-латински бессмысленно («ль5»), поэтому она идёт в транскрипцию
 * как есть. Токен цифру не теряет — иначе «L5» распалось бы на слово и число.
 */
const LABEL = /\d/;

const TOKEN = /[a-z0-9]+/gi;

/** Не слово: метка уровня или римская цифра — в словарь ударений не попадает. */
function isLabel(token: string): boolean {
  return LABEL.test(token) || ROMAN.test(token);
}

/** Гласные после твёрдой согласной. `e` читается «э»: vena → вэ́на. */
const HARD_VOWELS: Record<string, string> = {
  a: "а", e: "э", i: "и", o: "о", u: "у", y: "и",
  ae: "э", oe: "э", au: "ау", eu: "эу",
};

/**
 * Йотированный ряд — после `j`: сама «й» в букву уже входит, поэтому `ja` → я,
 * `je` → е, `jo` → ё, `ju` → ю, `ji` → и (`jejunum` → еюну́м). Так латынь
 * записывают русские учебники: «йэ» в русской графике не пишется.
 */
const IOTATED_VOWELS: Record<string, string> = {
  a: "я", e: "е", i: "и", o: "ё", u: "ю", y: "и",
  ae: "е", oe: "е", au: "яу", eu: "еу",
};

/**
 * Тот же ряд после мягкого `l`: мягкость латинского «эль» в кириллице
 * показывает сама гласная — `la` → ля, `lu` → лю, `le` → ле.
 *
 * `lo` — исключение по технике записи: «ё» в русском всегда ударная, и в
 * безударном слоге её прочитали бы с ударением («ко́лон» → «ко́лён»), поэтому
 * `o` после `l` остаётся «о». Диграф `oe` читается как «э», не как «о», —
 * там «ё» не возникает и мягкость сохраняется («е»).
 */
const SOFT_VOWELS: Record<string, string> = { ...IOTATED_VOWELS, o: "о" };

/** Ряд гласных, который задаёт предыдущая согласная. */
type VowelStyle = "hard" | "soft" | "iotated";

const VOWEL_TABLES: Record<VowelStyle, Record<string, string>> = {
  hard: HARD_VOWELS,
  soft: SOFT_VOWELS,
  iotated: IOTATED_VOWELS,
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
  /** Каким рядом читать следующую гласную. */
  next: VowelStyle;
}

function chunk(text: string, length: number, next: VowelStyle = "hard"): Chunk {
  return { text, length, next };
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
    return isVowel(w[i + length]) ? chunk(base, length, "soft") : chunk(`${base}ь`, length);
  }
  if (ch === "j" && isVowel(w[i + 1])) {
    // сама «й» входит в йотированную букву, поэтому согласная пуста:
    // jejunum → еюну́м, jugularis → югуля́рис
    return chunk("", 1, "iotated");
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

/**
 * Акут после ударной гласной. У дифтонга (ау, эу) он на первой гласной, у
 * диграфа (ae → э) — на единственной, то есть всегда после первой буквы.
 * На «ё» знака нет: она ударная сама по себе. «ё» даёт ударное `jo`
 * (`jodum` → ёдум) — единственный источник этой буквы, потому что `lo`
 * читается твёрдо, а безударное `jo` даёт «йо».
 */
export function withAcute(text: string): string {
  return text[0] === "ё" ? text : `${text[0]}${ACUTE}${text.slice(1)}`;
}

function vowelText(nucleus: string, style: VowelStyle, stressed: boolean): string {
  const text = VOWEL_TABLES[style][nucleus] ?? nucleus;
  // «ё» всегда ударная, поэтому безударное `jo` пишем «йо» (major → ма́йор),
  // а ударное остаётся «ё» — знака ударения ему не нужно.
  if (text === "ё" && !stressed) return "йо";
  return stressed ? withAcute(text) : text;
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
  // Номер вне диапазона (в словаре-JSON может оказаться что угодно) — просто
  // читаем слово без ударения, падать на этом нельзя.
  const inRange = stress !== null && Number.isInteger(stress) && stress >= 1 && stress <= syls.length;
  const stressedStart = inRange && syls.length > 1 ? syls[syls.length - stress].start : -1;

  let result = "";
  let style: VowelStyle = "hard";
  let i = 0;
  while (i < w.length) {
    const syllable = nucleusAt.get(i);
    if (syllable) {
      result += vowelText(syllable.nucleus, style, i === stressedStart);
      style = "hard";
      i += syllable.nucleus.length;
      continue;
    }
    const next = consonantAt(w, i);
    result += next.text;
    style = next.next;
    i += next.length;
  }
  return result;
}

/** Слова латинского названия в нижнем регистре, без цифр и меток. */
export function latinWords(phrase: string): string[] {
  return (phrase.match(TOKEN) ?? []).filter((t) => !isLabel(t)).map((t) => t.toLowerCase());
}

/**
 * Транскрипция всего названия: пунктуация и пробелы сохраняются, метки уровней
 * идут как есть, римские цифры — заглавными, слово без словарной пометки
 * читается без знака ударения: показать транскрипцию полезнее, чем ничего.
 */
export function transcribe(phrase: string, map: StressMap): string {
  return phrase.replace(TOKEN, (token) => {
    if (LABEL.test(token)) return token;
    if (ROMAN.test(token)) return token.replace(/^[ivx]+/i, (n) => n.toUpperCase());
    return transcribeWord(token, stressOf(token, map));
  });
}
