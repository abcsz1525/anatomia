import fs from 'node:fs';
import {describe,it,expect} from 'vitest';
import type {BoneDetail,BoneSummary} from './types';
import {requirements} from '../../../scripts/atlas-review-checklist';
const root='public/models/bone-details/v1';
const index:BoneSummary[]=JSON.parse(fs.readFileSync(root+'/index.json','utf8'));
const load=(id:string):BoneDetail=>JSON.parse(fs.readFileSync(`${root}/${id}.json`,'utf8'));
const masks=(id:string):Record<string,number[]>=>JSON.parse(fs.readFileSync(`${root}/${id}.surfaces.json`,'utf8')).regions;
describe('atlas gap review',()=>{
 it('checks every model against the explicit inventory without implying exhaustive anatomy',()=>{
  const audit=JSON.parse(fs.readFileSync(root+'/atlas-review.json','utf8'));
  expect(audit.completeAnatomicalInventory).toBe(false);
  expect(new Set(audit.models.map((b:{id:string})=>b.id))).toEqual(new Set(index.map(b=>b.id)));
  for(const b of index){
   const d=load(b.id),r=masks(b.id);
   for(const term of requirements(b.id).terms){
    const hits=d.landmarks.filter(l=>!l.id.includes('-direction-zone-')&&new RegExp(term,'i').test(l.la));
    expect(hits.length,`${b.id}: ${term}`).toBeGreaterThan(0);
    for(const l of hits)expect(r[l.id]?.length,l.id).toBeGreaterThan(0);
   }
   for(const l of d.landmarks.filter(l=>l.id.includes('-atlas-gap-'))){
    expect(l.accuracy).toBe('approximate');expect(l.accuracyNote).toContain('Приблизитель');
    expect(l.ru).toMatch(/[а-я]/i);expect(l.la).toBeTruthy();
   }
  }
 });
 it('keeps metacarpal partner patches distinct and inside authored base cartilage on both sides',()=>{
  for(const side of ['l','r'])for(const n of ['first','second','third','fourth','fifth']){
   const d=load(`${n}-metacarpal-bone-${side}`),r=masks(d.id);
   const base=d.landmarks.find(l=>l.la==='Facies articularis basis ossis metacarpalis')!;
   const allowed=new Set(r[base.id]),partners=d.landmarks.filter(l=>l.id.includes('-atlas-gap-base-partner-'));
   expect(partners.length).toBeGreaterThan(0);
   expect(new Set(partners.map(l=>r[l.id].join(','))).size).toBe(partners.length);
   for(const l of partners)expect(r[l.id].every(f=>allowed.has(f)),l.id).toBe(true);
  }
 });
 it('does not duplicate existing authored features and preserves both sides of vertebral additions',()=>{
  let authored=0;
  for(const b of index){const d=load(b.id);authored+=d.landmarks.filter(l=>l.source==='z-anatomy').length;
   expect(new Set(d.landmarks.map(l=>l.id)).size,b.id).toBe(d.landmarks.length);
   if(!/^vertebra-|^axis-c2$/.test(b.id))continue;
   const l=d.landmarks.find(l=>l.id.endsWith('-atlas-gap-inferior-articular-process'))!,r=masks(b.id);
   const raw=fs.readFileSync(`${root}/${b.id}.bin`),p=new Float32Array(raw.buffer,raw.byteOffset,d.vertexCount*3);
   const x=r[l.id].map(f=>(p[f*9]+p[f*9+3]+p[f*9+6])/3);
   expect(Math.min(...x)).toBeLessThan(0);expect(Math.max(...x)).toBeGreaterThan(0);
  }
  expect(authored).toBe(827);
 });
});
