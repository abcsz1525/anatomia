import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {expect,it} from 'vitest';
import {partGeometry} from './parse-chunk';
import type {AtlasManifest} from './types';
import {latinWords,syllables,stressOf,transcribeWord,type StressMap} from '../latin';
import stress from '../../../content/latin-stress.json';
import terms from '../../../content/facial-muscles.json';

it('loads paired facial meshes with valid geometry, head registration and translated labels',()=>{
 const m=JSON.parse(fs.readFileSync('public/models/v1/atlas.json','utf8')) as AtlasManifest;
 const parts=m.parts.filter(p=>p.id.startsWith('ZF-'));
 expect(parts).toHaveLength(52);expect(new Set(m.parts.map(p=>p.id)).size).toBe(m.parts.length);
 const b=gunzipSync(fs.readFileSync('public/models/v1/facial-z-anatomy-mastication.bin.gz'));
 const ab=b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength) as ArrayBuffer;
 for(const p of parts){
  const g=partGeometry(ab,p);expect(p.system).toBe('muscular');expect(p.indexCount%3).toBe(0);
  expect(g.indices.length).toBeGreaterThan(0);expect(Math.max(...g.indices)).toBeLessThan(p.vertexCount);
  expect(p.bounds[0][1]).toBeGreaterThan(1.45);expect(p.bounds[1][1]).toBeLessThan(1.80);
  const midX=(p.bounds[0][0]+p.bounds[1][0])/2;expect(p.name.startsWith('Left')?midX>0:midX<0).toBe(true);
  expect(g.positions.every(Number.isFinite)).toBe(true);
  let maxNormalError=0;
  for(let i=0;i<g.normals.length;i+=3)maxNormalError=Math.max(maxNormalError,Math.abs(Math.hypot(g.normals[i],g.normals[i+1],g.normals[i+2])-1));
  expect(maxNormalError).toBeLessThan(.0005);
 }
 for(const [source,ru,la] of terms){
  expect(ru).not.toBe('');expect(parts.filter(p=>p.name.endsWith(source))).toHaveLength(2);
  for(const w of latinWords(la)){const s=stressOf(w,stress as StressMap);expect(s,w).not.toBeNull();if(syllables(w).length>1)expect(transcribeWord(w,s),w).toContain('́');}
 }
 const content=fs.readFileSync('public/content/structures.json','utf8');for(const p of parts)expect(content).toContain(p.id);
});
