import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import type { AtlasManifest } from "@/lib/atlas/types";
import { COURSE_SYSTEMS } from "./content-rules";

const manifest = JSON.parse(readFileSync("public/models/v1/atlas.json", "utf8")) as AtlasManifest;
mkdirSync("content/source", { recursive: true });
for (const system of COURSE_SYSTEMS) {
  const rows = manifest.parts.filter((p) => p.system === system).sort((a, b) => (a.id < b.id ? -1 : 1));
  writeFileSync(`content/source/names-${system}.tsv`, rows.map((p) => `${p.id}\t${p.name}`).join("\n") + "\n");
  console.log(`${system}: ${rows.length}`);
}
