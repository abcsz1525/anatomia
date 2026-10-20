import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {describe,it,expect} from 'vitest';
import {parseRegions} from './regions';
import type {BoneDetail} from './types';
import {latinWords,stressOf,syllables,transcribeWord,type StressMap} from '../latin';
import core from '../../../content/latin-stress.json';
import bone from '../../../content/bone-latin-stress.json';
describe('hallux proximal phalanx surfaces',()=>{
 for(const side of ['l','r'])it(`validates anatomy, geometry and labels ${side}`,()=>{
  const base=`public/models/bone-details/v1/proximal-phalanx-of-first-finger-of-foot-${side}`;
  const d:BoneDetail=JSON.parse(fs.readFileSync(base+'.json','utf8')),bytes=fs.readFileSync(base+'.bin');
  expect(bytes.length).toBe(d.vertexCount*24);expect(createHash('sha256').update(bytes).digest('hex')).toBe(d.regionHash);
  const r=parseRegions(JSON.parse(fs.readFileSync(base+'.surfaces.json','utf8')),d.id,d.regionHash!,d.vertexCount/3,d.landmarks.map(l=>l.id));
  expect(Object.keys(r)).toHaveLength(11);
  const get=(key:string)=>r[d.id+'-'+key];const p=new Float32Array(bytes.buffer,bytes.byteOffset,d.vertexCount*3);
  const mean=(key:string,axis:number)=>get(key).reduce((sum,f)=>sum+(p[f*9+axis]+p[f*9+3+axis]+p[f*9+6+axis])/3,0)/get(key).length;
  for(const keys of [['base','body','head'],['anterior','posterior','dorsal','plantar','medial','lateral']]){
   const faces=keys.flatMap(get);expect(faces.length).toBe(d.vertexCount/3);expect(new Set(faces).size).toBe(faces.length);
  }
  for(const [parent,child] of [['head','head-articular'],['base','proximal-facet']]){
   const area=new Set(get(parent));for(const f of get(child))expect(area.has(f),`${parent}/${child}`).toBe(true);
  }
  const facets=['proximal-facet','head-articular'].flatMap(get);expect(new Set(facets).size).toBe(facets.length);
  expect(mean('proximal-facet',2)).toBeLessThan(mean('head-articular',2));
  const reflect=side==='l'?1:-1;expect(reflect*mean('medial',0)).toBeLessThan(reflect*mean('lateral',0));
  expect(mean('head',2)).toBeGreaterThan(mean('base',2));expect(mean('dorsal',1)).toBeGreaterThan(mean('plantar',1));
  expect(d.landmarks.filter(l=>l.accuracy==='approximate')).toHaveLength(9);
  expect(d.landmarks.every(l=>l.source==='editorial')).toBe(true);
  const map={...core,...bone} as StressMap;
  for(const l of d.landmarks){expect(r[l.id].length).toBeGreaterThan(0);for(const w of latinWords(l.la)){expect(stressOf(w,map),w).not.toBeNull();if(syllables(w).length>1)expect(transcribeWord(w,stressOf(w,map)),w).toContain('́');}}
  const index=JSON.parse(fs.readFileSync('public/models/bone-details/v1/index.json','utf8'));expect(index.find((b:{id:string})=>b.id===d.id).landmarkCount).toBe(11);
 });
});
