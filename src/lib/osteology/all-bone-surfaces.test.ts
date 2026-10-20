import fs from 'node:fs';
import crypto from 'node:crypto';
import {describe,expect,it} from 'vitest';
import {parseRegions,surfaceTopology} from './regions';
import type {BoneDetail,BoneSummary} from './types';
import {latinWords,stressOf,transcribe,type StressMap} from '../latin';
import core from '../../../content/latin-stress.json';
import bone from '../../../content/bone-latin-stress.json';
import draft from '../../../content/bone-latin-stress-draft.json';

const root='public/models/bone-details/v1';
const index:BoneSummary[]=JSON.parse(fs.readFileSync(`${root}/index.json`,'utf8'));
describe('all bone surface coverage',()=>{
  it('loads regions for every model without claiming anatomical completeness',()=>{
    const report=JSON.parse(fs.readFileSync(`${root}/surface-coverage.json`,'utf8'));
    expect(index).toHaveLength(210);expect(report.modelsWithoutRegions).toEqual([]);
    expect(report.completeAnatomicalInventory).toBe(false);
    expect(index.filter(b=>b.surfaceCoverage)).toHaveLength(176);
    for(const row of index){
      const d:BoneDetail=JSON.parse(fs.readFileSync(`${root}/${row.id}.json`,'utf8'));
      const buf=fs.readFileSync(`${root}/${row.id}.bin`);
      expect(crypto.createHash('sha256').update(buf).digest('hex'),d.id).toBe(d.regionHash);
      const data=JSON.parse(fs.readFileSync(`${root}/${row.id}.surfaces.json`,'utf8'));
      const r=parseRegions(data,d.id,d.regionHash!,d.vertexCount/3,d.landmarks.map(l=>l.id));
      expect(Object.keys(r).length,d.id).toBe(d.landmarks.length);
      expect(Object.values(r).every(f=>f.length>0),d.id).toBe(true);
      if(!d.surfaceCoverage)continue;
      expect(data.review).toContain('incomplete');
      const directions=d.landmarks.filter(l=>l.id.includes('-direction-zone-'));
      const faces=directions.flatMap(l=>r[l.id]);
      expect(faces.length,d.id).toBe(d.vertexCount/3);
      expect(new Set(faces).size,d.id).toBe(faces.length);
      const map={...draft,...core,...bone} as StressMap;
      for(const l of d.landmarks){
        expect(l.accuracy,l.id).toBe('approximate');expect(l.accuracyNote!.length).toBeGreaterThan(60);
        for(const w of latinWords(l.la))expect(stressOf(w,map),`${l.id}: ${w}`).not.toBeNull();
        expect(transcribe(l.la,map),l.id).toMatch(/[а-я]/i);
      }
    }
  });
  it('keeps source neighborhoods connected on thin and folded surfaces',()=>{
    for(const id of ['humerus-l','frontal-bone','scapula-r']){
      const d:BoneDetail=JSON.parse(fs.readFileSync(`${root}/${id}.json`,'utf8'));
      const r=JSON.parse(fs.readFileSync(`${root}/${id}.surfaces.json`,'utf8')).regions;
      const buf=fs.readFileSync(`${root}/${id}.bin`),a=new Float32Array(buf.buffer,buf.byteOffset,d.vertexCount*3);
      const t=surfaceTopology(a);
      for(const l of d.landmarks.filter(l=>l.source==='z-anatomy'&&!l.regionMethod)){
        const faces=new Set<number>(r[l.id]),seen=new Set<number>(),queue=[r[l.id][0]];
        while(queue.length){const f=queue.pop()!;if(seen.has(f))continue;seen.add(f);for(const n of t.neighbors[f])if(faces.has(n)&&!seen.has(n))queue.push(n);}
        expect(seen.size,l.id).toBe(faces.size);
      }
    }
  });
});
