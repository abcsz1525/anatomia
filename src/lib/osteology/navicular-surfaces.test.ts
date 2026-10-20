import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { parseRegions } from './regions';
import type { BoneDetail } from './types';
import { latinWords, stressOf, type StressMap } from '../latin';
import coreStress from '../../../content/latin-stress.json';
import boneStress from '../../../content/bone-latin-stress.json';

describe('bundled navicular anatomy', () => {
  for (const side of ['l', 'r']) it(`validates regions, anatomical relations and pronunciation: ${side}`, () => {
    const base = `public/models/bone-details/v1/navicular-bone-${side}`;
    const d: BoneDetail = JSON.parse(readFileSync(`${base}.json`, 'utf8'));
    const bytes = readFileSync(`${base}.bin`);
    expect(bytes.length).toBe(d.vertexCount * 24);
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(d.regionHash);
    const data = JSON.parse(readFileSync(`${base}.surfaces.json`, 'utf8'));
    const regions = parseRegions(data, d.id, d.regionHash!, d.vertexCount / 3, d.landmarks.map(l => l.id));
    expect(Object.keys(regions)).toHaveLength(13);
    const p = new Float32Array(bytes.buffer, bytes.byteOffset, d.vertexCount * 3);
    const byName = (name: string) => regions[d.landmarks.find(l => l.en === name)!.id];
    const mean = (name: string, axis: number) => {
      const faces = byName(name);
      return faces.reduce((s, f) => s + (p[f * 9 + axis] + p[f * 9 + 3 + axis] + p[f * 9 + 6 + axis]) / 3, 0) / faces.length;
    };
    for (const faces of Object.values(regions)) expect(faces.length).toBeGreaterThan(0);

    const reflect=side==='l'?1:-1;
    expect(reflect*mean('Medial surface of navicular bone',0)).toBeLessThan(reflect*mean('Lateral surface of navicular bone',0));
    expect(reflect*mean('Tuberosity of navicular bone',0)).toBeLessThan(-.54);
    expect(mean('Tuberosity of navicular bone',1)).toBeLessThan(-.20);
    expect(mean('Anterior surface of navicular bone',2)).toBeGreaterThan(mean('Posterior surface of navicular bone',2));
    expect(mean('Dorsal surface of navicular bone',1)).toBeGreaterThan(mean('Plantar surface of navicular bone',1));
    const facets=['Facet for medial cuneiform','Facet for intermediate cuneiform','Facet for lateral cuneiform'].map(byName);
    expect(new Set(facets.flat()).size).toBe(facets.flat().length);
    expect(new Set(facets.flat())).toEqual(new Set(byName('Anterior surface of navicular bone')));
    expect(reflect*mean('Facet for medial cuneiform',0)).toBeLessThan(reflect*mean('Facet for intermediate cuneiform',0));
    expect(reflect*mean('Facet for intermediate cuneiform',0)).toBeLessThan(reflect*mean('Facet for lateral cuneiform',0));
    expect(byName('Posterior surface of navicular bone')).toEqual(byName('Talar articular surface of navicular bone'));
    const sides=['Anterior','Posterior','Dorsal','Plantar','Medial','Lateral'].map(n=>byName(n+' surface of navicular bone')).flat();
    expect(sides.length).toBe(d.vertexCount/3);
    expect(new Set(sides).size).toBe(d.vertexCount/3);
    const index=JSON.parse(readFileSync('public/models/bone-details/v1/index.json','utf8'));
    expect(index.find((b:{id:string})=>b.id===d.id).landmarkCount).toBe(13);
    const map = { ...coreStress, ...boneStress } as StressMap;
    for (const l of d.landmarks) for (const word of latinWords(l.la)) expect(stressOf(word, map), word).not.toBeNull();
  });
});
