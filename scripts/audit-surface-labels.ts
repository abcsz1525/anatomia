import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {faceRegions,nextSurface,parseRegions} from '../src/lib/osteology/regions';
import {latinWords,stressOf,transcribe,type StressMap} from '../src/lib/latin';
import type {BoneDetail,BoneSummary} from '../src/lib/osteology/types';

const root='public/models/bone-details/v1';
const index:BoneSummary[]=JSON.parse(fs.readFileSync(`${root}/index.json`,'utf8'));
const dictionary=(name:string)=>JSON.parse(fs.readFileSync(`content/${name}.json`,'utf8'));
const stress:StressMap={...dictionary('bone-latin-stress-draft'),...dictionary('latin-stress'),...dictionary('bone-latin-stress')};
const errors:string[]=[],models=[];
for(const row of index){
 const d:BoneDetail=JSON.parse(fs.readFileSync(`${root}/${row.id}.json`,'utf8'));
 const raw=fs.readFileSync(`${root}/${d.id}.bin`),hash=createHash('sha256').update(raw).digest('hex');
 if(hash!==d.regionHash)errors.push(`${d.id}: geometry hash`);
 const regions=parseRegions(JSON.parse(fs.readFileSync(`${root}/${d.id}.surfaces.json`,'utf8')),d.id,hash,d.vertexCount/3,d.landmarks.map(l=>l.id));
 const named=d.landmarks.filter(l=>!l.id.includes('-direction-zone-'));
 const byFace=faceRegions(regions,named.map(l=>l.id));
 const identical=new Map<string,string[]>();
 for(const l of d.landmarks){
  if(!regions[l.id]?.length||!l.ru.trim()||!l.la.trim())errors.push(`${l.id}: missing region/label`);
  if(!transcribe(l.la,stress).match(/[а-я]/i)||latinWords(l.la).some(w=>stressOf(w,stress)===null))errors.push(`${l.id}: pronunciation`);
  if(l.id.includes('-direction-zone-'))continue;
  const ids=byFace.get(regions[l.id][0])??[];
  let selected:string|null=null;const reached=new Set<string>();
  for(let i=0;i<ids.length;i++){selected=nextSurface(ids,selected);if(selected)reached.add(selected);}
  if(!reached.has(l.id))errors.push(`${l.id}: unreachable selection`);
  const key=[...regions[l.id]].sort((a,b)=>a-b).join(',');
  identical.set(key,[...(identical.get(key)??[]),l.id]);
 }
 if(row.landmarkCount!==d.landmarks.length)errors.push(`${d.id}: count`);
 const overlaps=[...identical.values()].filter(ids=>ids.length>1);
 // Generic whole-side aliases may intentionally match the corresponding articular facet.
 // Other identical masks cannot certify distinct anatomical structures.
 const unresolved=overlaps.filter(ids=>!ids.some(id=>/-(anterior|posterior)$/.test(id))&&!ids.every(id=>/fibula-.*medial-surface/.test(id)));
 for(const ids of unresolved)for(const id of ids){
  const l=d.landmarks.find(l=>l.id===id)!;
  const warning='Границы не разделены: эта маска совпадает с областью «'+ids.filter(i=>i!==id).map(i=>d.landmarks.find(l=>l.id===i)!.ru).join(' / ')+'». Различие положений на модели не подтверждено; требуется отдельная анатомическая проверка.';
  l.accuracy='approximate';
  if(!l.accuracyNote?.includes('Границы не разделены:'))l.accuracyNote=(l.accuracyNote??'Приблизительная область.')+' '+warning;
 }
 fs.writeFileSync(`${root}/${d.id}.json`,JSON.stringify(d));
 models.push({id:d.id,named:named.length,total:d.landmarks.length,identicalMasks:overlaps,unresolvedAnatomicalMasks:unresolved});
}
const report={date:'2026-10-19',anatomicallyVerified:false,browserVerified:false,modelsChecked:models.length,namedRegions:models.reduce((s,b)=>s+b.named,0),totalRegions:models.reduce((s,b)=>s+b.total,0),errors,models};
fs.writeFileSync(`${root}/surface-interaction-audit.json`,JSON.stringify(report,null,2));
console.log(JSON.stringify({...report,models:undefined,unresolvedGroups:models.reduce((s,b)=>s+b.unresolvedAnatomicalMasks.length,0)}));
if(errors.length)process.exitCode=1;
