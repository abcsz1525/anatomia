import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { parseRegions } from './regions';
import type { BoneDetail } from './types';
import { latinWords, stressOf, transcribe, type StressMap } from '../latin';
import coreStress from '../../../content/latin-stress.json';
import boneStress from '../../../content/bone-latin-stress.json';

describe('bundled lateral cuneiform anatomy', () => {
  for (const side of ['l', 'r']) it(`validates regions, anatomical relations and pronunciation: ${side}`, () => {
    const base = `public/models/bone-details/v1/lateral-cuneiform-bone-${side}`;
    const d: BoneDetail = JSON.parse(readFileSync(`${base}.json`, 'utf8'));
    const bytes = readFileSync(`${base}.bin`);
    expect(bytes.length).toBe(d.vertexCount * 24);
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(d.regionHash);
    const data = JSON.parse(readFileSync(`${base}.surfaces.json`, 'utf8'));
    const regions = parseRegions(data, d.id, d.regionHash!, d.vertexCount / 3, d.landmarks.map(l => l.id));
    expect(Object.keys(regions)).toHaveLength(12);
    const p = new Float32Array(bytes.buffer, bytes.byteOffset, d.vertexCount * 3);
    const byName = (name: string) => regions[d.landmarks.find(l => l.en === name)!.id];
    const mean = (name: string, axis: number) => {
      const faces = byName(name);
      return faces.reduce((s, f) => s + (p[f * 9 + axis] + p[f * 9 + 3 + axis] + p[f * 9 + 6 + axis]) / 3, 0) / faces.length;
    };
    for (const faces of Object.values(regions)) expect(faces.length).toBeGreaterThan(0);

    const reflect=side==='l'?1:-1;
    expect(reflect*mean('Medial surface of lateral cuneiform',0)).toBeLessThan(reflect*mean('Lateral surface of lateral cuneiform',0));
    expect(mean('Anterior surface of lateral cuneiform',2)).toBeGreaterThan(mean('Posterior surface of lateral cuneiform',2));
    expect(mean('Dorsal surface of lateral cuneiform',1)).toBeGreaterThan(mean('Plantar surface of lateral cuneiform',1));
    const facets=['Navicular','Second metatarsal','Third metatarsal','Fourth metatarsal','Intermediate cuneiform','Cuboid'].map(n=>byName(n+' facet of lateral cuneiform'));
    expect(new Set(facets.flat()).size).toBe(facets.flat().length);
    expect(byName('Anterior surface of lateral cuneiform')).toEqual([...byName('Third metatarsal facet of lateral cuneiform'),...byName('Fourth metatarsal facet of lateral cuneiform')].sort((a,b)=>a-b));
    expect(byName('Posterior surface of lateral cuneiform')).toEqual(byName('Navicular facet of lateral cuneiform'));
    for(const [surface,facet] of [['Medial','Intermediate cuneiform'],['Medial','Second metatarsal'],['Lateral','Cuboid']]){
      const area=new Set(byName(surface+' surface of lateral cuneiform'));
      for(const f of byName(facet+' facet of lateral cuneiform'))expect(area.has(f)).toBe(true);
    }
    const sides=['Anterior','Posterior','Dorsal','Plantar','Medial','Lateral'].map(n=>byName(n+' surface of lateral cuneiform')).flat();
    expect(sides.length).toBe(d.vertexCount/3);
    expect(new Set(sides).size).toBe(d.vertexCount/3);
    expect(d.landmarks.every(l=>l.source==='editorial')).toBe(true);
    const index=JSON.parse(readFileSync('public/models/bone-details/v1/index.json','utf8'));
    expect(index.find((b:{id:string})=>b.id===d.id).landmarkCount).toBe(12);
    const map = { ...coreStress, ...boneStress } as StressMap;
    expect(transcribe('tertii', map)).toBe('тэ́рции');
    for (const l of d.landmarks) for (const word of latinWords(l.la)) expect(stressOf(word, map), word).not.toBeNull();
  });
});
