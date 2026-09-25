import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { parse } from "csv-parse/sync";
import { guessStress, latinWords, syllables, transcribeWord, type StressMap } from "@/lib/latin";
import type { CsvRow } from "./content-rules";

const DICT = "content/latin-stress.json";
// --check ничего не пишет: он нужен в CI и в ревью, чтобы поймать строку,
// добавленную в csv без обновления словаря
const checkOnly = process.argv.includes("--check");

const rows = parse(readFileSync("content/structures.csv", "utf8"), { columns: true, skip_empty_lines: true, trim: true }) as CsvRow[];
// римские цифры («Ramus ventricularis anterior I») latinWords отбрасывает сам:
// это не слова и ударения у них нет
const words = new Set<string>();
for (const r of rows) for (const w of latinWords(r.la)) words.add(w);

const dict: StressMap = existsSync(DICT) ? (JSON.parse(readFileSync(DICT, "utf8")) as StressMap) : {};
// дописываем ТОЛЬКО недостающие: значения в словаре вычитаны человеком и
// пересчёту по правилам не подлежат, иначе ревью Task 3 стиралось бы каждым прогоном
const added = [...words].filter((w) => !(w in dict)).sort();

if (checkOnly) {
  for (const w of added) console.error(`missing: ${w}`);
  if (added.length) {
    console.error(`\n${added.length} word(s) missing from ${DICT} (run pnpm build:stress)`);
    process.exit(1);
  }
  console.log(`stress ok: ${Object.keys(dict).length} words, nothing to add`);
  process.exit(0);
}

for (const w of added) dict[w] = guessStress(w);
// файл читает и правит человек, поэтому он отсортирован и с отступом в 2 пробела
const sorted = Object.fromEntries(Object.keys(dict).sort().map((w) => [w, dict[w]]));
writeFileSync(DICT, JSON.stringify(sorted, null, 2) + "\n");

if (added.length) {
  const pad = Math.max(...added.map((w) => w.length));
  console.log("слово · слогов · ударение · транскрипция");
  for (const w of added) {
    const stress = dict[w];
    console.log(`${w.padEnd(pad)} · ${syllables(w).length} · ${stress} · ${transcribeWord(w, stress)}`);
  }
}
console.log(`\n${added.length} added, ${Object.keys(sorted).length} words total in ${DICT}`);
