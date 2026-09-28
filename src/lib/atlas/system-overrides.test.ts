import { readFileSync } from "node:fs";
import { parse } from "csv-parse/sync";
import { describe, expect, it } from "vitest";
import type { Topic } from "@/lib/content/types";
import { SYSTEM_OVERRIDES, applySystemOverrides } from "./system-overrides";
import type { AtlasManifest, SystemId } from "./types";

const raw = JSON.parse(readFileSync("public/models/v1/atlas.json", "utf8")) as AtlasManifest;
const manifest = applySystemOverrides(raw);
const topics = JSON.parse(readFileSync("content/topics.json", "utf8")) as Topic[];
const rows = parse(readFileSync("content/structures.csv", "utf8"), { columns: true }) as { id: string; topic: string }[];
const topicOf = new Map(rows.map((r) => [r.id, r.topic]));
const parentOf = new Map(topics.map((t) => [t.id, t.parent]));

function systemsOfTopic(topic: string): Set<SystemId> {
  return new Set(manifest.parts.filter((p) => topicOf.get(p.id) === topic).map((p) => p.system));
}

describe("SYSTEM_OVERRIDES", () => {
  it("lists every id once, and each one really changes the manifest", () => {
    const rawById = new Map(raw.parts.map((p) => [p.id, p.system]));
    const ids = Object.values(SYSTEM_OVERRIDES).flat();
    expect(new Set(ids).size).toBe(ids.length);
    for (const [system, list] of Object.entries(SYSTEM_OVERRIDES))
      for (const id of list) {
        expect(rawById.has(id), `unknown ${id}`).toBe(true);
        expect(rawById.get(id), `stale ${id}`).not.toBe(system);
      }
  });

  it("keeps the bones layer to bones only", () => {
    const names = manifest.parts.filter((p) => p.system === "skeletal").map((p) => p.name);
    for (const n of names) expect(n).not.toMatch(/cartilage|disk|tooth|gingiva|tract|fibularis|tibialis|levator|subscapularis/i);
    for (const p of manifest.parts.filter((x) => x.system === "skeletal"))
      expect(parentOf.get(topicOf.get(p.id) ?? ""), p.name).toBe("osteology");
  });

  it("puts every muscle topic on the muscles layer", () => {
    for (const t of topics.filter((x) => x.parent === "myology"))
      expect([...systemsOfTopic(t.id)], t.id).toEqual(["muscular"]);
  });

  it("puts ligaments and cartilages on their own layer", () => {
    for (const t of ["ligaments-head-neck", "ligaments-limbs", "larynx-cartilages"])
      expect([...systemsOfTopic(t)], t).toEqual(["connective"]);
  });

  it("keeps brain ventricles out of the heart layer", () => {
    expect([...systemsOfTopic("cns")]).toEqual(["nervous"]);
  });
});

describe("digestive layer", () => {
  it("keeps the pharynx wall between the tongue and the oesophagus", () => {
    const pharynx = manifest.parts.filter((p) => /pharyngeal constrictor|pharyngeus/i.test(p.name));
    expect(pharynx.length).toBe(12);
    for (const p of pharynx) expect(p.system, p.name).toBe("digestive");
  });
});
