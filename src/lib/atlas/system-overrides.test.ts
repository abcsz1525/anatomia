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

  it("keeps the muscles layer to skeletal muscles, their tendons and fasciae", () => {
    // мышцы органов изучают вместе с органом: глаз, гортань, язык, нёбо, глотка
    const organ = /rectus$|oblique$|levator palpebrae|arytenoid|aryepiglotticus|vocalis|cricothyroid|glossus$|veli palatini|uvular|pharyngeus|pharyngeal constrictor|papillary/i;
    for (const p of manifest.parts.filter((x) => x.system === "muscular")) {
      if (/rectus (femoris|capitis|abdominis)|obliquus|longus colli|oblique head|external oblique|internal oblique/i.test(p.name)) continue;
      expect(p.name).not.toMatch(organ);
    }
    for (const t of topics.filter((x) => x.parent === "myology"))
      for (const s of systemsOfTopic(t.id)) expect(["muscular", "sensory", "respiratory", "digestive", "reproductive"], t.id).toContain(s);
  });

  it("keeps the ligaments layer to joints of the skeleton", () => {
    for (const t of ["ligaments-head-neck", "ligaments-limbs"])
      for (const s of systemsOfTopic(t)) expect(["connective", "muscular", "respiratory", "digestive", "sensory", "reproductive"], t).toContain(s);
    const names = manifest.parts.filter((p) => p.system === "connective").map((p) => p.name);
    for (const n of names) expect(n).not.toMatch(/tendon|laryn|thyro|crico|vocal|epiglott|check ligament|trochlea|raphe|retinaculum|linea alba/i);
  });

  it("puts the larynx together on the respiratory layer", () => {
    expect([...systemsOfTopic("larynx-cartilages")]).toEqual(["respiratory"]);
    const larynx = manifest.parts.filter((p) => /arytenoid|vocalis|cricothyroid|thyrohyoid (ligament|membrane)|conus elasticus|vocal ligament|epiglott/i.test(p.name));
    for (const p of larynx) expect(p.system, p.name).toBe("respiratory");
  });

  it("puts the eye with its muscles and ligaments on the sense organs layer", () => {
    expect([...systemsOfTopic("eye")]).toEqual(["sensory"]);
    const eye = manifest.parts.filter((p) => /^(left |right )?(inferior|superior|lateral|medial) (rectus|oblique)$|^(left |right )?levator palpebrae/i.test(p.name));
    expect(eye.length).toBe(14);
    for (const p of eye) expect(p.system, p.name).toBe("sensory");
  });

  it("puts the perineum with the urogenital organs, as Sinelnikov does", () => {
    const perineum = manifest.parts.filter((p) => /coccygeus|puborectalis|anal sphincter|perineal|levator ani/i.test(p.name));
    expect(perineum.length).toBe(20);
    for (const p of perineum) expect(p.system, p.name).toBe("reproductive");
    for (const p of manifest.parts.filter((x) => /piriformis|obturator internus/i.test(x.name))) expect(p.system).toBe("muscular");
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
