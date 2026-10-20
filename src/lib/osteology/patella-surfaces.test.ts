import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { parseRegions } from './regions';
import type { BoneDetail } from './types';
import { latinWords, stressOf, type StressMap } from '../latin';
import coreStress from '../../../content/latin-stress.json';
import boneStress from '../../../content/bone-latin-stress.json';

describe('bundled patellar anatomy', () => {
  for (const side of ['l', 'r']) it(`validates regions, anatomical relations and pronunciation: ${side}`, () => {
    const base = `public/models/bone-details/v1/patella-${side}`;
    const d: BoneDetail = JSON.parse(readFileSync(`${base}.json`, 'utf8'));
    const bytes = readFileSync(`${base}.bin`);
    expect(bytes.length).toBe(d.vertexCount * 24);
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(d.regionHash);
    const data = JSON.parse(readFileSync(`${base}.surfaces.json`, 'utf8'));
    const regions = parseRegions(data, d.id, d.regionHash!, d.vertexCount / 3, d.landmarks.map(l => l.id));
    expect(Object.keys(regions)).toHaveLength(18);
    const p = new Float32Array(bytes.buffer, bytes.byteOffset, d.vertexCount * 3);
    const byName = (name: string) => regions[d.landmarks.find(l => l.en === name)!.id];
    const mean = (name: string, axis: number) => {
      const faces = byName(name);
      return faces.reduce((s, f) => s + (p[f * 9 + axis] + p[f * 9 + 3 + axis] + p[f * 9 + 6 + axis]) / 3, 0) / faces.length;
    };
    for (const faces of Object.values(regions)) expect(faces.length).toBeGreaterThan(0);

    const medial=byName('Medial articular facet of patella'), lateral=byName('Lateral articular facet of patella');
    expect(new Set([...medial,...lateral])).toEqual(new Set(byName('Articular surface of patella')));
    expect(medial.some(f=>lateral.includes(f))).toBe(false);
    const reflect=side==='l'?1:-1;
    expect(reflect*mean('Medial articular facet of patella',0)).toBeLessThan(reflect*mean('Lateral articular facet of patella',0));
    expect(reflect*mean('Medial border of patella',0)).toBeLessThan(-.55);
    expect(reflect*mean('Lateral border of patella',0)).toBeGreaterThan(.55);
    expect(mean('Base of patella',1)).toBeGreaterThan(.7);
    expect(mean('Apex of patella',1)).toBeLessThan(-.72);
    expect(mean('Anterior surface of patella',2)).toBeGreaterThan(mean('Posterior surface of patella',2));
    expect(byName('Non-articular posterior area of patella').some(f=>byName('Articular surface of patella').includes(f))).toBe(false);
    const index=JSON.parse(readFileSync('public/models/bone-details/v1/index.json','utf8'));
    expect(index.find((b:{id:string})=>b.id===d.id).landmarkCount).toBe(18);
    const map = { ...coreStress, ...boneStress } as StressMap;
    for (const l of d.landmarks) for (const word of latinWords(l.la)) expect(stressOf(word, map), word).not.toBeNull();
  });
});
