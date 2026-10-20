import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {expect,it} from 'vitest';
import {parseRegions} from './regions';
import type {BoneDetail,BoneSummary} from './types';

it('ships bilateral approximate entrances attached to valid existing surface geometry',()=>{
 const root='public/models/bone-details/v1';
 const report=JSON.parse(fs.readFileSync(`${root}/canal-entrance-review.json`,'utf8'));
 const index:BoneSummary[]=JSON.parse(fs.readFileSync(`${root}/index.json`,'utf8'));
 expect(report.completeAnatomicalInventory).toBe(false);
 expect(report.additions).toHaveLength(8);
 for(const entry of report.additions){
  const d:BoneDetail=JSON.parse(fs.readFileSync(`${root}/${entry.boneId}.json`,'utf8'));
  const raw=fs.readFileSync(`${root}/${d.id}.bin`);
  const hash=createHash('sha256').update(raw).digest('hex');
  expect(hash).toBe(d.regionHash);
  const masks=parseRegions(JSON.parse(fs.readFileSync(`${root}/${d.id}.surfaces.json`,'utf8')),d.id,hash,d.vertexCount/3,d.landmarks.map(l=>l.id));
  const l=d.landmarks.find(l=>l.id===entry.landmarkId)!;
  expect(l.accuracy).toBe('approximate');
  expect(l.accuracyNote).toContain('не подтверждены');
  expect(l.ru).toMatch(/[а-я]/i);expect(l.la).toBeTruthy();
  expect(masks[l.id].length).toBeGreaterThan(0);
  const anchor=new Set(masks[entry.anchorId]);
  expect(masks[l.id].every(f=>anchor.has(f))).toBe(true);
  expect(index.find(b=>b.id===d.id)?.landmarkCount).toBe(d.landmarks.length);
  expect(new Set(d.landmarks.map(l=>l.id)).size).toBe(d.landmarks.length);
 }
});
