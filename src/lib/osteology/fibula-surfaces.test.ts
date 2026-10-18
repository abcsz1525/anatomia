import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { parseRegions } from './regions';
import type { BoneDetail } from './types';
import { latinWords, stressOf, type StressMap } from '../latin';
import coreStress from '../../../content/latin-stress.json';
import boneStress from '../../../content/bone-latin-stress.json';

describe('bundled fibular anatomy', () => {
  for (const side of ['l', 'r']) it(`validates regions, anatomical relations and pronunciation: ${side}`, () => {
    const base = `public/models/bone-details/v1/fibula-${side}`;
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
    const body = byName('Body of fibula');
    const surfaces = ['Medial surface of fibula', 'Lateral surface of fibula', 'Posterior surface of fibula'].flatMap(byName);
    expect(surfaces).toHaveLength(body.length);
    expect(new Set(surfaces)).toEqual(new Set(body));
    expect(byName('Anteromedial surface of fibula')).toEqual(byName('Medial surface of fibula'));
    for (const [part, whole] of [
      ['Apex of head of fibula', 'Head of fibula'],
      ['Articular facet of head of fibula', 'Head of fibula'],
      ['Articular facet of lateral malleolus', 'Lateral malleolus'],
      ['Posteromedial surface of fibula', 'Posterior surface of fibula'],
    ]) expect(byName(part).every(f => byName(whole).includes(f))).toBe(true);
    const reflect = side === 'l' ? 1 : -1;
    expect(reflect * mean('Medial surface of fibula', 0)).toBeLessThan(reflect * mean('Lateral surface of fibula', 0));
    expect(mean('Articular facet of head of fibula', 1)).toBeGreaterThan(.89);
    expect(mean('Articular facet of lateral malleolus', 1)).toBeLessThan(-.73);
    expect(mean('Malleolar fossa', 2)).toBeLessThan(mean('Articular facet of lateral malleolus', 2));
    expect(byName('Malleolar fossa').some(f => byName('Articular facet of lateral malleolus').includes(f))).toBe(false);
    expect(byName('Malleolar groove of fibula').some(f => byName('Malleolar fossa').includes(f))).toBe(false);
    expect(mean('Malleolar groove of fibula', 2)).toBeLessThan(-.07);
    const map = { ...coreStress, ...boneStress } as StressMap;
    for (const l of d.landmarks) for (const word of latinWords(l.la)) expect(stressOf(word, map), word).not.toBeNull();
  });
});
