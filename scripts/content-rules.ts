import type { AtlasManifest } from "@/lib/atlas/types";
import { sideFor } from "@/lib/content/side";
import type { ContentBundle, StructureEntry, Topic } from "@/lib/content/types";

export const COURSE_SYSTEMS = ["skeletal", "connective", "muscular"] as const;
export interface CsvRow { id: string; en: string; la: string; ru: string; topic: string; aliases: string }
export interface RuleError { row?: number; id?: string; message: string }

// \b only recognises ASCII word chars in JS, so it never matches around Cyrillic
// text; use unicode-aware lookaround boundaries instead so лев(ая|ый|...) /
// прав(ая|ый|...) are actually detected.
const SIDE_WORDS = /(?<![\p{L}\p{N}])(left|right|лев(?:ый|ая|ое|ые)|прав(?:ый|ая|ое|ые))(?![\p{L}\p{N}])/iu;

export function validateContent(rows: CsvRow[], manifest: AtlasManifest, topics: Topic[]): RuleError[] {
  const errors: RuleError[] = [];
  const parts = new Map(manifest.parts.map((p) => [p.id, p]));
  const topicIds = new Set(topics.map((t) => t.id));
  const seen = new Set<string>();
  const perTopic = new Map<string, number>();

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
    if (SIDE_WORDS.test(r.la) || SIDE_WORDS.test(r.ru)) errors.push({ row, id: r.id, message: `${tag}: side word in la/ru` });
    if (!topicIds.has(r.topic)) errors.push({ row, id: r.id, message: `${tag}: unknown topic ${r.topic}` });
    else perTopic.set(r.topic, (perTopic.get(r.topic) ?? 0) + 1);
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
    const n = perTopic.get(t.id) ?? 0;
    if (n > 0 && n < 4) errors.push({ message: `topic ${t.id} has ${n} structures (<4)` });
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
