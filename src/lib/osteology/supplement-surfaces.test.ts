import fs from 'node:fs';
import {describe,it,expect} from 'vitest';
import {latinWords,syllables,stressOf,transcribeWord,type StressMap} from '../latin';
import core from '../../../content/latin-stress.json';
import bone from '../../../content/bone-latin-stress.json';
import type {BoneDetail} from './types';
describe('supplementary surfaces',()=>{
 for(const kind of ['femur','talus'])for(const side of ['l','r'])it(`${kind}-${side} coverage, containment and pronunciation`,()=>{
  const base=`public/models/bone-details/v1/${kind}-${side}`;
  const d:BoneDetail=JSON.parse(fs.readFileSync(base+'.json','utf8'));
  const r:Record<string,number[]>=JSON.parse(fs.readFileSync(base+'.surfaces.json','utf8')).regions;
  const get=(name:string)=>r[d.landmarks.find(l=>l.en===name)!.id];
  const added=d.landmarks.filter(l=>l.id.includes('-supplement-'));
  const faces=added.flatMap(l=>r[l.id]);
  expect(new Set(faces).size).toBe(faces.length);
  expect(new Set(faces)).toEqual(new Set(kind==='femur'?get('Body of femur'):Array.from({length:d.vertexCount/3},(_,i)=>i)));
  if(kind==='femur'){
   const art=get('Articular surface of head of femur'),fovea=new Set(get('Fovea for ligament of head of femur'));
   expect(art.some(f=>fovea.has(f))).toBe(false);
   expect(new Set([...art,...fovea])).toEqual(new Set(get('Head of femur')));
   for(const sideName of ['Medial','Lateral']){
    const parent=new Set(get(sideName+' condyle of femur'));
    for(const f of get('Articular surface of '+sideName.toLowerCase()+' condyle of femur'))expect(parent.has(f)).toBe(true);
   }
  }else{
   for(const [parent,child] of [['Superior','Superior facet of talus'],['Medial','Medial malleolar facet'],['Lateral','Lateral malleolar facet'],['Inferior','Posterior calcaneal articular facet']]){
    const mask=new Set(get(parent+' surface of talus'));for(const f of get(child))expect(mask.has(f)).toBe(true);
   }
  }
  const map={...core,...bone} as StressMap;
  for(const l of d.landmarks)for(const w of latinWords(l.la)){
   expect(stressOf(w,map),w).not.toBeNull();
   if(syllables(w).length>1)expect(transcribeWord(w,stressOf(w,map)),w).toContain('́');
  }
 });
});
