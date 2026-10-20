import fs from 'node:fs';
import {brushFaces,surfaceTopology} from '../src/lib/osteology/regions';
import type {BoneDetail,Point3} from '../src/lib/osteology/types';

const root='public/models/bone-details/v1';
const ids=['vertebra-c3','vertebra-c4','vertebra-c5','vertebra-c6','vertebra-c7','vertebra-t1','vertebra-t3','ethmoid-bone','occipital-bone'];
const changes:{boneId:string;pair:string[];faces:number[];notes:string[]}[]=[];
const pending=new Map<string,string>();
for(const id of ids){
 const d:BoneDetail=JSON.parse(fs.readFileSync(`${root}/${id}.json`,'utf8'));
 const data=JSON.parse(fs.readFileSync(`${root}/${id}.surfaces.json`,'utf8'));
 const r:Record<string,number[]>=data.regions;
 const raw=fs.readFileSync(`${root}/${id}.bin`),p=new Float32Array(raw.buffer,raw.byteOffset,d.vertexCount*6);
 const t=surfaceTopology(p.subarray(0,d.vertexCount*3)),all=t.centers.map((_,f)=>f);
 const normal=(f:number,k:number)=>(p[d.vertexCount*3+f*9+k]+p[d.vertexCount*3+f*9+3+k]+p[d.vertexCount*3+f*9+6+k])/3;
 const find=(pattern:RegExp)=>{const l=d.landmarks.find(l=>pattern.test(l.id));if(!l)throw Error(`${id}: ${pattern}`);return l;};
 const select=(fn:(p:Point3,f:number)=>boolean)=>all.filter(f=>fn(t.centers[f],f));
 function patch(point:Point3,radius:number,eligible=all){
  if(!eligible.length)throw Error(`${id}: no candidates`);
  const dist=(f:number)=>Math.hypot(...t.centers[f].map((v,k)=>v-point[k]));
  const seed=eligible.reduce((a,b)=>dist(a)<dist(b)?a:b),allowed=new Set(eligible);
  return brushFaces(t,seed,t.centers[seed],radius).filter(f=>allowed.has(f));
 }
 const paired=(point:Point3,radius:number,eligible=all)=>[...new Set([1,-1].flatMap(sign=>patch([point[0]*sign,point[1],point[2]],radius,eligible.filter(f=>t.centers[f][0]*sign>0))))];
 function pair(a:RegExp,b:RegExp,fa:number[],fb:number[],notes:[string,string],url:string){
  const la=find(a),lb=find(b),aSet=new Set(fa);fb=fb.filter(f=>!aSet.has(f));
  if(!fa.length||!fb.length)throw Error(`${id}: empty separated pair ${la.id}`);
  for(const [l,faces,note] of [[la,fa,notes[0]],[lb,fb,notes[1]]] as const){
   r[l.id]=[...new Set(faces)].sort((a,b)=>a-b);
   l.labelPosition=t.centers[faces[0]];
   l.accuracy='approximate';l.regionMethod='atlas-conflict-repair-v1';
   l.accuracyNote='Приблизительная область по атласу, сопоставленная с геометрией в нескольких ракурсах. Точные границы не проверены анатомом. '+note;
  }
  data.references=[...new Set([...(data.references??[]),url])];
  changes.push({boneId:id,pair:[la.id,lb.id],faces:[r[la.id].length,r[lb.id].length],notes});
 }
 if(/^vertebra-c[3-7]$/.test(id)){
  // Independent anterior/posterior anchors around the visible transverse foramen.
  // Do not subdivide the old transferred anterior patch to invent a posterior one.
  const anchors:Record<string,[Point3,Point3]>={
   'vertebra-c3':[[.67,.3,.68],[.90,.04,.50]],
   'vertebra-c4':[[.70,.20,.67],[.91,.04,.50]],
   'vertebra-c5':[[.67,.15,.75],[.91,-.06,.50]],
   'vertebra-c6':[[.67,.28,.78],[.90,-.05,.54]],
   'vertebra-c7':[[.63,.10,.60],[.91,-.02,.46]],
  };
  const [a,b]=anchors[id];
  pair(/anterior-tubercle-of-transverse/,/posterior-tubercle-of-transverse/,paired(a,.11),paired(b,.11),[
   id==='vertebra-c7'?'У C7 передний бугорок мал и может отсутствовать. Выделен только предполагаемый участок переднего корня; наличие отдельного бугорка этой моделью не подтверждено.':'Передний бугорок: передний участок поперечного отростка у поперечного отверстия, с обеих сторон.',
   'Задний бугорок: заднелатеральный участок поперечного отростка, с обеих сторон.'
  ],'https://www.kenhub.com/en/library/anatomy/cervical-spine');
 }
 if(id==='vertebra-c7'||id==='vertebra-t1'){
  const point:Point3=id==='vertebra-c7'?[.68,.23,.27]:[.62,.30,.28];
  const articular=select((p,f)=>Math.abs(p[0])>.38&&p[1]>.08&&p[2]>.05&&p[2]<.55&&normal(f,1)>.15&&normal(f,2)<-.1);
  const facet=paired(point,.22,articular);
  const process=paired([point[0],point[1]-.10,point[2]+.07],.27);
  pair(/superior-articular-facet-of-vertebra/,/superior-articular-process-of-vertebra/,facet,process,[
   'Суставная площадка на верхнем суставном отростке, обращённая кверху и кзади. Разметка перенесена с ошибочно выбранной дуги.',
   'Показана внесуставная часть верхнего суставного отростка. Его суставная площадка выделяется отдельно; анатомически она является частью отростка.'
  ],id==='vertebra-c7'?'https://www.kenhub.com/en/library/anatomy/cervical-spine':'https://www.kenhub.com/en/library/anatomy/thoracic-vertebrae');
 }
 if(id==='vertebra-t3'){
  // The source cartilage does not reliably isolate these small facets on both
  // sides. Keep the ROI on the posterolateral body, not the articular process.
  const eligible=select(p=>Math.abs(p[0])>.30&&Math.abs(p[0])<.55&&p[1]>.04&&p[1]<.25&&p[2]>.38&&p[2]<.58);
  pair(/superior-costal-facet-/,/pedicle-of-vertebral-arch/,paired([.43,.18,.45],.09,eligible),paired([.34,.10,.35],.17),[
   'Предполагаемая верхняя рёберная ямка на заднелатеральном крае тела. Её малый контур и граница хряща в исходной модели не выделены надёжно; использован локальный ориентир по атласу.',
   'Ножка дуги: костная перемычка позади тела, медиальнее рёберной ямки. Суставная площадка исключена из этой маски.'
  ],'https://www.kenhub.com/en/library/anatomy/thoracic-vertebrae');
 }
 if(id==='ethmoid-bone')for(const [side,sign] of [['left',1],['right',-1]] as const){
  // Use the lateral envelope: some triangles of the old refined patch have
  // reversed stored normals and would otherwise leave a false central hole.
  const orbital=select(p=>p[0]*sign>.48&&p[1]>-.55&&p[1]<.5&&p[2]>-.65&&p[2]<.55);
  const labyrinth=select(p=>p[0]*sign>.28&&p[0]*sign<.9&&p[1]>-.28&&p[1]<.55&&p[2]>-.65&&p[2]<.55);
  pair(new RegExp(`${side}-orbital$`),new RegExp(`${side}-labyrinth$`),orbital,labyrinth,[
   'Латеральная пластинка лабиринта, обращённая в глазницу. Она является частью лабиринта; для выбора выделена отдельно.',
   'Показаны доступные верхние и медиальные участки лабиринта без отдельно выделенной глазничной пластинки. Внутренние ячейки в поверхностной модели не сегментированы.'
  ],'https://www.kenhub.com/en/library/anatomy/the-ethmoid-bone');
 }
 if(id==='occipital-bone'){
  // Elliptical neighborhood fitted to the visible aperture in superior/inferior views.
  const rho=(p:Point3)=>Math.hypot(p[0]/.30,(p[2]-.34)/.34);
  const rim=select(p=>p[1]<-.55&&rho(p)>.80&&rho(p)<1.13);
  const groove=select((p,f)=>p[1]<-.5&&p[2]<.68&&rho(p)>=1.13&&rho(p)<1.40&&normal(f,1)>.25);
  pair(/foramen-magnum-/,/groove-for-marginal-sinus-/,rim,groove,[
   'Выделен костный край большого отверстия; пустой просвет нельзя окрасить как поверхность.',
   'Приблизительная борозда на внутричерепной поверхности вдоль края большого отверстия. Выраженность борозды вариабельна; окрашена область её прохождения, а не подтверждённый глубокий желоб.'
  ],'https://www.kenhub.com/en/library/anatomy/occipital-sinus');
 }
 pending.set(`${root}/${id}.json`,JSON.stringify(d));
 pending.set(`${root}/${id}.surfaces.json`,JSON.stringify(data));
}
if(changes.length!==11)throw Error(`Expected 11 pairs, got ${changes.length}`);
for(const [file,value] of pending)fs.writeFileSync(file,value);
fs.writeFileSync(`${root}/surface-conflict-repairs.json`,JSON.stringify({date:'2026-10-19',accuracy:'approximate',changes},null,2));
console.log(`Separated ${changes.length} pairs on ${ids.length} models`);
