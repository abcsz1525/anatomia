import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { parseRegions } from './regions';
import type { BoneDetail } from './types';
import { latinWords, stressOf, type StressMap } from '../latin';
import coreStress from '../../../content/latin-stress.json';
import boneStress from '../../../content/bone-latin-stress.json';

describe('bundled calcaneal anatomy', () => {
  for (const side of ['l', 'r']) it(`validates regions, anatomical relations and pronunciation: ${side}`, () => {
    const base = `public/models/bone-details/v1/calcaneus-${side}`;
    const d: BoneDetail = JSON.parse(readFileSync(`${base}.json`, 'utf8'));
    const bytes = readFileSync(`${base}.bin`);
    expect(bytes.length).toBe(d.vertexCount * 24);
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(d.regionHash);
    const data = JSON.parse(readFileSync(`${base}.surfaces.json`, 'utf8'));
    const regions = parseRegions(data, d.id, d.regionHash!, d.vertexCount / 3, d.landmarks.map(l => l.id));
    expect(Object.keys(regions)).toHaveLength(23);
    const p = new Float32Array(bytes.buffer, bytes.byteOffset, d.vertexCount * 3);
    const byName = (name: string) => regions[d.landmarks.find(l => l.en === name)!.id];
    const mean = (name: string, axis: number) => {
      const faces = byName(name);
      return faces.reduce((s, f) => s + (p[f * 9 + axis] + p[f * 9 + 3 + axis] + p[f * 9 + 6 + axis]) / 3, 0) / faces.length;
    };
    for (const faces of Object.values(regions)) expect(faces.length).toBeGreaterThan(0);

    const reflect=side==='l'?1:-1;
    expect(reflect*mean('Medial surface of calcaneus',0)).toBeLessThan(reflect*mean('Lateral surface of calcaneus',0));
    expect(reflect*mean('Medial process of calcaneal tuberosity',0)).toBeLessThan(reflect*mean('Lateral process of calcaneal tuberosity',0));
    expect(mean('Anterior talar articular surface',2)).toBeGreaterThan(mean('Middle talar articular surface',2));
    expect(mean('Middle talar articular surface',2)).toBeGreaterThan(mean('Posterior talar articular surface',2));
    expect(mean('Anterior surface of calcaneus',2)).toBeGreaterThan(mean('Posterior surface of calcaneus',2));
    expect(mean('Superior surface of calcaneus',1)).toBeGreaterThan(mean('Inferior surface of calcaneus',1));
    const parent=new Set(byName('Calcaneal tuberosity'));
    for(const name of ['Medial process of calcaneal tuberosity','Lateral process of calcaneal tuberosity'])for(const f of byName(name))expect(parent.has(f)).toBe(true);
    const facets=['Posterior talar articular surface','Middle talar articular surface','Anterior talar articular surface','Articular surface for cuboid'].map(byName);
    expect(new Set(facets.flat()).size).toBe(facets.flat().length);
    const sustent=new Set(byName('Sustentaculum tali'));
    for(const f of byName('Middle talar articular surface'))expect(sustent.has(f)).toBe(true);
    const floor=new Set(byName('Tarsal sinus'));
    for(const f of byName('Calcaneal sulcus'))expect(floor.has(f)).toBe(true);
    expect(facets.flat().some(f=>floor.has(f))).toBe(false);
    expect(byName('Anterior surface of calcaneus')).toEqual(byName('Articular surface for cuboid'));
    const index=JSON.parse(readFileSync('public/models/bone-details/v1/index.json','utf8'));
    expect(index.find((b:{id:string})=>b.id===d.id).landmarkCount).toBe(23);
    const map = { ...coreStress, ...boneStress } as StressMap;
    for (const l of d.landmarks) for (const word of latinWords(l.la)) expect(stressOf(word, map), word).not.toBeNull();
  });
});
