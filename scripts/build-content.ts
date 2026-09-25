import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { parse } from "csv-parse/sync";
import type { AtlasManifest } from "@/lib/atlas/types";
import type { Topic } from "@/lib/content/types";
import type { StressMap } from "@/lib/latin";
import { COURSE_SYSTEMS, buildBundle, validateContent, type CsvRow } from "./content-rules";

const report = process.argv.includes("--report");
const manifest = JSON.parse(readFileSync("public/models/v1/atlas.json", "utf8")) as AtlasManifest;
const topics = JSON.parse(readFileSync("content/topics.json", "utf8")) as Topic[];
const rows = parse(readFileSync("content/structures.csv", "utf8"), { columns: true, skip_empty_lines: true, trim: true }) as CsvRow[];
const stress = JSON.parse(readFileSync("content/latin-stress.json", "utf8")) as StressMap;

const errors = validateContent(rows, manifest, topics, stress);
if (report) {
  const have = new Set(rows.map((r) => r.id));
  for (const s of COURSE_SYSTEMS) {
    const parts = manifest.parts.filter((p) => p.system === s);
    const done = parts.filter((p) => have.has(p.id)).length;
    console.log(`${s}: ${done}/${parts.length}`);
  }
  const other = errors.filter((e) => !e.message.startsWith("missing:"));
  console.log(`other errors: ${other.length}`);
  for (const e of other.slice(0, 50)) console.log("  " + e.message);
  process.exit(0);
}
if (errors.length) {
  for (const e of errors) console.error(e.message);
  console.error(`\n${errors.length} content error(s)`);
  process.exit(1);
}
const bundle = buildBundle(rows, manifest, topics);
mkdirSync("public/content", { recursive: true });
writeFileSync("public/content/structures.json", JSON.stringify(bundle.structures));
writeFileSync("public/content/topics.json", JSON.stringify(bundle.topics));
// словарь ударений лежит рядом с бандлами и грузится тем же fetch: транскрипция
// считается в рантайме, в structures.json её нет
writeFileSync("public/content/latin-stress.json", JSON.stringify(stress));
console.log(`content ok: ${rows.length} structures, ${topics.length} topics, ${Object.keys(stress).length} stressed words`);
