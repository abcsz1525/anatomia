import fs from 'node:fs';
import {describe,it,expect} from 'vitest';
import {latinWords,syllables,stressOf,transcribeWord,type StressMap} from '../latin';
import core from '../../../content/latin-stress.json';
import bone from '../../../content/bone-latin-stress.json';
import type {BoneDetail} from './types';
describe('explicit approximate regions',()=>{
 for(const [kind,count] of [['patella',7],['calcaneus',3],['navicular-bone',2],['cuboid-bone',2],['medial-cuneiform-bone',1]] as const)for(const side of ['l','r'])it(`${kind}-${side}`,()=>{
  const base=`public/models/bone-details/v1/${kind}-${side}`;
  const d:BoneDetail=JSON.parse(fs.readFileSync(base+'.json','utf8'));
  const regions:Record<string,number[]>=JSON.parse(fs.readFileSync(base+'.surfaces.json','utf8')).regions;
  const added=d.landmarks.filter(l=>l.id.includes('-approx-'));
  expect(added).toHaveLength(count);
  const map={...core,...bone} as StressMap;
  for(const l of added){
   expect(l.accuracy).toBe('approximate');expect(l.accuracyNote!.length).toBeGreaterThan(30);
   expect(regions[l.id].length).toBeGreaterThan(0);
   for(const f of regions[l.id])expect(Number.isInteger(f)&&f>=0&&f<d.vertexCount/3).toBe(true);
   for(const w of latinWords(l.la)){expect(stressOf(w,map),w).not.toBeNull();if(syllables(w).length>1)expect(transcribeWord(w,stressOf(w,map)),w).toContain('́');}
  }
  if(kind==='patella'){
   const all=added.flatMap(l=>regions[l.id]);expect(new Set(all).size).toBe(all.length);
   const parent=d.landmarks.find(l=>l.en==='Articular surface of patella')!;
   expect(new Set(all)).toEqual(new Set(regions[parent.id]));
  }
  if(kind==='navicular-bone'||kind==='cuboid-bone')expect(added.find(l=>l.ru.includes('(вариант)'))!.accuracyNote).toContain('не подтверждено');
 });
});
