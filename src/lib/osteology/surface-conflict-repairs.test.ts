import fs from 'node:fs';
import {describe,it,expect} from 'vitest';
import type {BoneDetail} from './types';
import {surfaceTopology,faceRegions,nextSurface} from './regions';

const root='public/models/bone-details/v1';
const report=JSON.parse(fs.readFileSync(`${root}/surface-conflict-repairs.json`,'utf8')) as {changes:{boneId:string;pair:string[]}[]};
describe('separate atlas conflict regions',()=>{
 it('keeps all 11 pairs nonempty, disjoint, selectable and explicitly approximate',()=>{
  expect(report.changes).toHaveLength(11);
  expect(new Set(report.changes.map(c=>c.boneId)).size).toBe(9);
  for(const change of report.changes){
   const d:BoneDetail=JSON.parse(fs.readFileSync(`${root}/${change.boneId}.json`,'utf8'));
   const regions=JSON.parse(fs.readFileSync(`${root}/${d.id}.surfaces.json`,'utf8')).regions;
   const [a,b]=change.pair.map(id=>regions[id] as number[]),first=new Set(a);
   expect(a.length).toBeGreaterThan(0);expect(b.length).toBeGreaterThan(0);
   expect(b.some(f=>first.has(f)),change.boneId).toBe(false);
   const byFace=faceRegions(regions,d.landmarks.filter(l=>!l.id.includes('-direction-zone-')).map(l=>l.id));
   for(const id of change.pair){
    const l=d.landmarks.find(l=>l.id===id)!;
    expect(l.accuracy).toBe('approximate');expect(l.regionMethod).toBe('atlas-conflict-repair-v1');
    expect(l.accuracyNote).not.toContain('Границы не разделены');
    const ids=byFace.get(regions[id][0])!;let picked:string|null=null;const seen=new Set<string>();
    for(let i=0;i<ids.length;i++){picked=nextSurface(ids,picked);seen.add(picked!);}
    expect(seen.has(id),id).toBe(true);
   }
  }
 });
 it('preserves bilateral landmarks and their independent anatomical locations',()=>{
  for(const change of report.changes.filter(c=>c.boneId.startsWith('vertebra-'))){
   const d:BoneDetail=JSON.parse(fs.readFileSync(`${root}/${change.boneId}.json`,'utf8'));
   const regions=JSON.parse(fs.readFileSync(`${root}/${d.id}.surfaces.json`,'utf8')).regions;
   const raw=fs.readFileSync(`${root}/${d.id}.bin`),t=surfaceTopology(new Float32Array(raw.buffer,raw.byteOffset,d.vertexCount*3));
   const points=change.pair.map(id=>(regions[id] as number[]).map(f=>t.centers[f]));
   for(const p of points){expect(Math.min(...p.map(p=>p[0]))).toBeLessThan(0);expect(Math.max(...p.map(p=>p[0]))).toBeGreaterThan(0);}
   const mean=(i:number,k:number)=>points[i].reduce((s,p)=>s+p[k],0)/points[i].length;
   if(change.pair[0].includes('anterior-tubercle'))expect(mean(0,2)).toBeGreaterThan(mean(1,2)+.05);
   if(change.pair[0].includes('superior-articular-facet')){
    // Old masks lay on the posterior lamina near the spinous process.
    expect(mean(0,2)).toBeGreaterThan(.05);
    expect(points[0].every(p=>Math.abs(p[0])>.38)).toBe(true);
   }
   if(d.id==='vertebra-t3')expect(mean(0,2)).toBeGreaterThan(mean(1,2));
  }
 });
 it('does not present the variable C7 anterior tubercle as verified anatomy',()=>{
  const d:BoneDetail=JSON.parse(fs.readFileSync(`${root}/vertebra-c7.json`,'utf8'));
  const l=d.landmarks.find(l=>l.id.includes('anterior-tubercle'))!;
  expect(l.accuracyNote).toContain('может отсутствовать');
  expect(l.accuracyNote).toContain('не подтверждено');
 });
});
