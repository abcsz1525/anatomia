import type { AtlasManifest } from "@/lib/atlas/types";
import { SYSTEMS } from "@/lib/atlas/systems";
import { sideFor } from "@/lib/content/side";
import type { ContentBundle, StructureEntry, Topic } from "@/lib/content/types";

export const COURSE_SYSTEMS = SYSTEMS.map((s) => s.id);
export interface CsvRow { id: string; en: string; la: string; ru: string; topic: string; aliases: string }
export interface RuleError { row?: number; id?: string; message: string }

// \b only recognises ASCII word chars in JS, so it never matches around Cyrillic
// text; use unicode-aware lookaround boundaries instead so лев(ая|ый|...) /
// прав(ая|ый|...) are actually detected.
const SIDE_WORDS = /(?<![\p{L}\p{N}])(left|right|лев(?:ый|ая|ое|ые)|прав(?:ый|ая|ое|ые))(?![\p{L}\p{N}])/iu;

// Semilunar cusps of the aortic and pulmonary valves: «правая/левая полулунная
// заслонка» is the TA2/Сапин name of the cusp (valvula semilunaris dextra/
// sinistra) — the side is part of the anatomical name, not the mesh side, so
// rule 5 (no side words in la/ru) does not apply to these ids.
export const SIDE_WORD_EXEMPT_IDS: ReadonlySet<string> = new Set([
  "FJ2417", "FJ2427", "FJ2434", // valva trunci pulmonalis: anterior, sinistra, dextra
  "FJ2426", "FJ2431", "FJ2435", // valva aortae: sinistra, posterior, dextra
]);

export function validateContent(rows: CsvRow[], manifest: AtlasManifest, topics: Topic[]): RuleError[] {
  const errors: RuleError[] = [];
  const parts = new Map(manifest.parts.map((p) => [p.id, p]));
  // темы-контейнеры (у них есть дочерние) не принимают строки напрямую:
  // раскладываем структуры только по листьям плюс «other»
  const leafIds = new Set(topics.filter((t) => !topics.some((x) => x.parent === t.id)).map((t) => t.id));
  leafIds.add("other");
  const knownIds = new Set(topics.map((t) => t.id));
  const seen = new Set<string>();
  // правило 8 считает РАЗНЫЕ термины (la), а не строки: левый и правый парный
  // орган — один термин, и тема из одной пары не считается наполненной
  const perTopic = new Map<string, Set<string>>();

  rows.forEach((r, i) => {
    const row = i + 2; // 1-based + header
    const tag = `row ${row} ${r.id}`;
    if (seen.has(r.id)) errors.push({ row, id: r.id, message: `${tag}: duplicate id ${r.id}` });
    seen.add(r.id);
    const part = parts.get(r.id);
    if (!part) { errors.push({ row, id: r.id, message: `${tag}: unknown id ${r.id}` }); return; }
    if (part.name !== r.en) errors.push({ row, id: r.id, message: `${tag}: en mismatch (manifest: "${part.name}")` });
    if (!r.la.trim()) errors.push({ row, id: r.id, message: `${tag}: la is empty` });
    if (!r.ru.trim()) errors.push({ row, id: r.id, message: `${tag}: ru is empty` });
    if (!SIDE_WORD_EXEMPT_IDS.has(r.id) && (SIDE_WORDS.test(r.la) || SIDE_WORDS.test(r.ru)))
      errors.push({ row, id: r.id, message: `${tag}: side word in la/ru` });
    if (!knownIds.has(r.topic)) errors.push({ row, id: r.id, message: `${tag}: unknown topic ${r.topic}` });
    else if (!leafIds.has(r.topic)) errors.push({ row, id: r.id, message: `${tag}: non-leaf topic ${r.topic}` });
    else {
      let terms = perTopic.get(r.topic);
      if (!terms) { terms = new Set<string>(); perTopic.set(r.topic, terms); }
      terms.add(r.la.trim().toLowerCase());
    }
    if (i > 0 && rows[i - 1].id > r.id && !errors.some((e) => e.message.startsWith("rows are not sorted")))
      errors.push({ row: row - 1, message: `rows are not sorted by id (first at row ${row - 1})` });
  });

  for (const p of manifest.parts) {
    if ((COURSE_SYSTEMS as readonly string[]).includes(p.system) && !seen.has(p.id))
      errors.push({ id: p.id, message: `missing: ${p.id} ${p.name}` });
  }
  for (const t of topics) {
    const isLeaf = !topics.some((x) => x.parent === t.id);
    if (!isLeaf || t.id === "other") continue;
    const n = perTopic.get(t.id)?.size ?? 0;
    if (n > 0 && n < 4) errors.push({ message: `topic ${t.id} has ${n} distinct terms (<4)` });
  }
  return errors;
}

export function buildBundle(rows: CsvRow[], manifest: AtlasManifest, topics: Topic[]): ContentBundle {
  void manifest;
  const structures: Record<string, StructureEntry> = {};
  for (const r of rows) {
    structures[r.id] = {
      la: r.la.trim(),
      ru: r.ru.trim(),
      topic: r.topic,
      side: sideFor(r.id, r.en),
      aliases: r.aliases.split(";").map((a) => a.trim()).filter(Boolean),
    };
  }
  return { structures, topics };
}
