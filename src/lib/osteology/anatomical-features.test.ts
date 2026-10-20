import fs from 'node:fs';
import {describe,it,expect} from 'vitest';
import type {BoneDetail,BoneSummary} from './types';
const root='public/models/bone-details/v1';
const index:BoneSummary[]=JSON.parse(fs.readFileSync(root+'/index.json','utf8'));
const load=(id:string):BoneDetail=>JSON.parse(fs.readFileSync(`${root}/${id}.json`,'utf8'));
const regions=(id:string):Record<string,number[]>=>JSON.parse(fs.readFileSync(`${root}/${id}.surfaces.json`,'utf8')).regions;
describe('specific anatomical features',()=>{
 it('every bone has named anatomy independent of directional zones',()=>{
  const audit=JSON.parse(fs.readFileSync(root+'/anatomical-feature-coverage.json','utf8'));
  expect(audit.modelCount).toBe(210);expect(audit.modelsWithoutNamedFeatures).toEqual([]);
  expect(audit.completeAnatomicalInventory).toBe(false);
  for(const b of index){
   const d=load(b.id),named=d.landmarks.filter(l=>!l.id.includes('-direction-zone-'));
   expect(named.length,b.id).toBeGreaterThan(0);expect(b.anatomicalCount,b.id).toBe(named.length);
   for(const l of named.filter(l=>l.id.includes('-anatomy-'))){
    expect(l.source).toBe('editorial');expect(l.accuracy).toBe('approximate');expect(l.regionMethod).toBeTruthy();
    expect(regions(b.id)[l.id]?.length,l.id).toBeGreaterThan(0);
   }
  }
 });
 it('keeps atypical ribs and cervical vertebrae anatomically distinct',()=>{
  for(const side of ['l','r'])for(const number of ['eleventh','twelfth']){
   const names=load(`${number}-rib-${side}`).landmarks.map(l=>l.la).join(' ');
   expect(names).not.toMatch(/Tuberculum costae|Collum costae|Crista capitis/);
   expect(names).toContain('Caput costae');expect(names).toContain('Facies articularis capitis costae');
   if(number==='twelfth')expect(names).not.toContain('Sulcus costae');
  }
  expect(load('atlas-c1').landmarks.map(l=>l.la).join(' ')).not.toContain('Corpus vertebrae');
  expect(load('axis-c2').landmarks.some(l=>l.la==='Dens axis')).toBe(true);
  for(const id of ['vertebra-t11','vertebra-t12'])expect(load(id).landmarks.some(l=>l.la==='Fovea costalis processus transversi')).toBe(false);
  for(const id of ['vertebra-l1','vertebra-l5'])expect(load(id).landmarks.some(l=>l.la==='Foramen transversarium')).toBe(false);
 });
 it('gives distal phalanges a tuberosity and one proximal joint, not a distal trochlea',()=>{
  for(const row of index.filter(b=>b.id.startsWith('distal-phalanx'))){
   const d=load(row.id),r=regions(d.id),names=d.landmarks.map(l=>l.la).join(' ');
   expect(names).toContain('Tuberositas phalangis distalis');expect(names).not.toContain('Trochlea');
   const joint=d.landmarks.find(l=>l.id.endsWith('-base-joint'))!;
   expect(joint.regionMethod).toBe('source-cartilage');expect(r[joint.id].length).toBeGreaterThan(0);
  }
 });
 it('provides distinct carpal joint partners and bilateral mandibular landmarks',()=>{
  for(const side of ['l','r']){
   const d=load(`trapezoid-bone-${side}`),r=regions(d.id);
   const facets=d.landmarks.filter(l=>l.regionMethod==='source-cartilage');
   expect(facets).toHaveLength(4);
   expect(new Set(facets.map(l=>r[l.id].join(','))).size).toBe(4);
   const p=load(`pisiform-bone-${side}`);
   expect(p.landmarks.filter(l=>l.regionMethod==='source-cartilage')).toHaveLength(1);
  }
  const m=load('mandible');for(const suffix of ['sinistrum','dextrum']){
   expect(m.landmarks.some(l=>l.la===`Foramen mandibulae ${suffix}`)).toBe(true);
   expect(m.landmarks.some(l=>l.la===`Caput mandibulae ${suffix}`)).toBe(true);
  }
 });
});
