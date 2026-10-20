import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { parseRegions } from './regions';
import type { BoneDetail } from './types';
import { latinWords, stressOf, type StressMap } from '../latin';
import coreStress from '../../../content/latin-stress.json';
import boneStress from '../../../content/bone-latin-stress.json';

describe('bundled cuboid anatomy', () => {
  for (const side of ['l', 'r']) it(`validates regions, anatomical relations and pronunciation: ${side}`, () => {
    const base = `public/models/bone-details/v1/cuboid-bone-${side}`;
    const d: BoneDetail = JSON.parse(readFileSync(`${base}.json`, 'utf8'));
    const bytes = readFileSync(`${base}.bin`);
    expect(bytes.length).toBe(d.vertexCount * 24);
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(d.regionHash);
    const data = JSON.parse(readFileSync(`${base}.surfaces.json`, 'utf8'));
    const regions = parseRegions(data, d.id, d.regionHash!, d.vertexCount / 3, d.landmarks.map(l => l.id));
    expect(Object.keys(regions)).toHaveLength(14);
    const p = new Float32Array(bytes.buffer, bytes.byteOffset, d.vertexCount * 3);
    const byName = (name: string) => regions[d.landmarks.find(l => l.en === name)!.id];
    const mean = (name: string, axis: number) => {
      const faces = byName(name);
      return faces.reduce((s, f) => s + (p[f * 9 + axis] + p[f * 9 + 3 + axis] + p[f * 9 + 6 + axis]) / 3, 0) / faces.length;
    };
    for (const faces of Object.values(regions)) expect(faces.length).toBeGreaterThan(0);

    const reflect=side==='l'?1:-1;
    expect(reflect*mean('Medial surface of cuboid',0)).toBeLessThan(reflect*mean('Lateral surface of cuboid',0));
    expect(mean('Tuberosity of cuboid bone',1)).toBeLessThan(-.68);
    expect(mean('Groove for tendon of fibularis longus muscle of cuboid bone',1)).toBeLessThan(-.35);
    expect(mean('Anterior surface of cuboid',2)).toBeGreaterThan(mean('Posterior surface of cuboid',2));
    expect(mean('Dorsal surface of cuboid',1)).toBeGreaterThan(mean('Plantar surface of cuboid',1));
    const fourth=byName('Facet for fourth metatarsal'),fifth=byName('Facet for fifth metatarsal');
    expect(fourth.some(f=>fifth.includes(f))).toBe(false);
    expect(new Set([...fourth,...fifth])).toEqual(new Set(byName('Anterior surface of cuboid')));
    expect(reflect*mean('Facet for fourth metatarsal',0)).toBeLessThan(reflect*mean('Facet for fifth metatarsal',0));
    expect(byName('Posterior surface of cuboid')).toEqual(byName('Calcaneal articular surface of cuboid'));
    const medial=new Set(byName('Medial surface of cuboid'));
    for(const f of byName('Facet for lateral cuneiform of cuboid'))expect(medial.has(f)).toBe(true);
    const sides=['Anterior','Posterior','Dorsal','Plantar','Medial','Lateral'].map(n=>byName(n+' surface of cuboid')).flat();
    expect(sides.length).toBe(d.vertexCount/3);
    expect(new Set(sides).size).toBe(d.vertexCount/3);
    const articular=new Set([...fourth,...fifth,...byName('Calcaneal articular surface of cuboid'),...byName('Facet for lateral cuneiform of cuboid')]);
    for(const name of ['Tuberosity of cuboid bone','Groove for tendon of fibularis longus muscle of cuboid bone'])for(const f of byName(name))expect(articular.has(f)).toBe(false);
    const index=JSON.parse(readFileSync('public/models/bone-details/v1/index.json','utf8'));
    expect(index.find((b:{id:string})=>b.id===d.id).landmarkCount).toBe(14);
    const map = { ...coreStress, ...boneStress } as StressMap;
    for (const l of d.landmarks) for (const word of latinWords(l.la)) expect(stressOf(word, map), word).not.toBeNull();
  });
});
