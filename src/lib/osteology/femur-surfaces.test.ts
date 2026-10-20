import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { describe,expect,it } from 'vitest';
import { parseRegions } from './regions';
import type { BoneDetail } from './types';
import { latinWords,stressOf,type StressMap } from '../latin';
import coreStress from '../../../content/latin-stress.json';
import boneStress from '../../../content/bone-latin-stress.json';

describe('bundled femur surfaces',()=>{
  for(const side of ['l','r'])it(`loads all 35 regions against exact geometry: ${side}`,()=>{
    const base=`public/models/bone-details/v1/femur-${side}`;
    const detail:BoneDetail=JSON.parse(readFileSync(`${base}.json`,'utf8'));
    const bytes=readFileSync(`${base}.bin`);
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(detail.regionHash);
    const data=JSON.parse(readFileSync(`${base}.surfaces.json`,'utf8'));
    const regions=parseRegions(data,detail.id,detail.regionHash!,detail.vertexCount/3,detail.landmarks.map(l=>l.id));
    expect(Object.keys(regions)).toHaveLength(35);
    const positions=new Float32Array(bytes.buffer,bytes.byteOffset,detail.vertexCount*3);
    const byName=(name:string)=>regions[detail.landmarks.find(l=>l.en===name)!.id];
    const mean=(faces:number[],axis:number)=>faces.reduce((s,f)=>s+(positions[f*9+axis]+positions[f*9+3+axis]+positions[f*9+6+axis])/3,0)/faces.length;
    for(const faces of Object.values(regions))expect(faces.length).toBeGreaterThan(0);
    const head=new Set(byName('Head of femur'));
    expect(byName('Fovea for ligament of head of femur').every(f=>head.has(f))).toBe(true);
    expect(mean(byName('Head of femur'),1)).toBeGreaterThan(.8);
    expect(mean(byName('Patellar surface of femur'),2)).toBeGreaterThan(0);
    expect(mean(byName('Intercondylar fossa'),2)).toBeLessThan(0);
    const reflect=side==='l'?1:-1;
    expect(reflect*mean(byName('Medial supracondylar line'),0)).toBeLessThan(reflect*mean(byName('Lateral supracondylar line'),0));
    expect(byName('Body of femur').some(f=>head.has(f))).toBe(false);
    const map={...coreStress,...boneStress} as StressMap;
    for(const l of detail.landmarks)for(const word of latinWords(l.la))expect(stressOf(word,map),word).not.toBeNull();
  });
});
