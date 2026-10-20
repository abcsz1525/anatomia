import fs from 'node:fs';
import {surfaceTopology,brushFaces} from '../src/lib/osteology/regions';
import type {BoneDetail,BoneSummary,Point3} from '../src/lib/osteology/types';
import {requirements,reference} from './atlas-review-checklist';

const root='public/models/bone-details/v1';
const index:BoneSummary[]=JSON.parse(fs.readFileSync(root+'/index.json','utf8'));
const cartilage:Record<string,{cartilage:number[]}>=JSON.parse(fs.readFileSync('../.anatomy-source/anatomical-cartilage.json','utf8'));
type ROI=[key:string,ru:string,la:string,point:Point3,radius:number,note?:string];
const manual:Record<string,ROI[]>={
 maxilla:[
  ['anterior-lacrimal-crest','Передний слёзный гребень','Crista lacrimalis anterior',[-.3,.42,.4],.13],
  ['conchal-crest','Раковинный гребень верхней челюсти','Crista conchalis maxillae',[-.52,-.1,.32],.16],
  ['ethmoidal-crest','Решётчатый гребень верхней челюсти','Crista ethmoidalis maxillae',[-.45,.42,.28],.14],
  ['greater-palatine-groove','Большая нёбная борозда верхней челюсти','Sulcus palatinus major maxillae',[-.25,-.52,-.6],.16],
 ],
 'palatine-bone':[
  ['conchal-crest','Раковинный гребень нёбной кости','Crista conchalis ossis palatini',[-.08,-.15,.05],.2],
  ['ethmoidal-crest','Решётчатый гребень нёбной кости','Crista ethmoidalis ossis palatini',[-.08,.3,.05],.18],
  ['greater-palatine-groove','Большая нёбная борозда','Sulcus palatinus major',[.12,-.15,-.2],.2],
  ['nasal-crest','Носовой гребень нёбной кости','Crista nasalis ossis palatini',[-.55,-.55,.15],.18],
 ],
 'temporal-bone':[
  ['inner-carotid','Внутренняя апертура сонного канала — область входа','Apertura interna canalis carotici',[-.65,-.15,.35],.1],
  ['lesser-petrosal','Расщелина канала малого каменистого нерва','Hiatus canalis nervi petrosi minoris',[-.25,.05,.2],.08],
  ['trigeminal','Тройничное вдавление','Impressio trigeminalis',[-.58,.03,.32],.16],
  ['petrotympanic','Каменисто-барабанная щель — костный край','Fissura petrotympanica',[.08,-.2,.23],.13],
  ['mastoid-foramen','Сосцевидное отверстие — предполагаемая область','Foramen mastoideum',[.06,-.05,-.62],.1,'Размер и положение отверстия вариабельны; наличие просвета в модели не подтверждено.'],
 ],
 incus:[['short-limb','Короткая ножка наковальни','Crus breve incudis',[.15,.15,-.72],.28]],
 stapes:[
  ['head','Головка стремени','Caput stapedis',[.88,-.36,-.36],.2],
  ['neck','Шейка стремени','Collum stapedis',[.62,-.3,-.32],.15],
 ],
};
for(const [sign,side,suffix] of [[1,'слева','sinistra'],[-1,'справа','dextra']] as const){
 (manual.mandible??=[]).push(
  [`pterygoid-fovea-${sign}`,`Крыловидная ямка ${side}`,`Fovea pterygoidea ${suffix}`,[sign*.77,.42,-.48],.12],
  [`mylohyoid-groove-${sign}`,`Челюстно-подъязычная борозда ${side}`,`Sulcus mylohyoideus ${sign===1?'sinister':'dexter'}`,[sign*.59,-.05,-.29],.16],
  [`submandibular-fossa-${sign}`,`Поднижнечелюстная ямка ${side}`,`Fovea submandibularis ${suffix}`,[sign*.48,-.42,.27],.2],
  [`condylar-process-${sign}`,`Мыщелковый отросток ${side}`,`Processus condylaris ${sign===1?'sinister':'dexter'}`,[sign*.8,.52,-.6],.3],
 );
 (manual['sphenoid-bone']??=[]).push(
  [`orbital-fissure-${sign}`,`Верхняя глазничная щель ${side} — костный край`,`Fissura orbitalis superior ${suffix}`,[sign*.35,.28,.2],.13],
  [`infratemporal-crest-${sign}`,`Подвисочный гребень ${side}`,`Crista infratemporalis ${suffix}`,[sign*.7,.0,.05],.15],
 );
 (manual['ethmoid-bone']??=[]).push([`bulla-${sign}`,`Решётчатый пузырёк ${side}`,`Bulla ethmoidalis ${suffix}`,[sign*.38,-.04,.05],.17]);
 (manual.coccyx??=[]).push([`transverse-${sign}`,`Поперечный отросток первого копчикового позвонка ${side}`,`Processus transversus vertebrae coccygeae primae ${sign===1?'sinister':'dexter'}`,[sign*.5,.5,0],.2]);
}
const pending=new Map<string,string>();
const audit=[];
for(const row of index){
 const d:BoneDetail=JSON.parse(fs.readFileSync(`${root}/${row.id}.json`,'utf8'));
 const data=JSON.parse(fs.readFileSync(`${root}/${row.id}.surfaces.json`,'utf8'));
 const regions:Record<string,number[]>=data.regions;
 const before=d.landmarks.filter(l=>!l.id.includes('-atlas-gap-'));
 const rule=requirements(d.id),family=d.id.replace(/-[lr]$/,'');
 const sourceUrl=reference(rule.family);
 const added:string[]=[];
 let geometry:ReturnType<typeof surfaceTopology>|undefined;
 function geo(){if(!geometry){const b=fs.readFileSync(`${root}/${d.id}.bin`);geometry=surfaceTopology(new Float32Array(b.buffer,b.byteOffset,d.vertexCount*3));}return geometry;}
 const reflect=d.side==='right'?-1:1;
 const distance=(a:Point3,b:Point3)=>Math.hypot(...a.map((v,k)=>v-b[k]));
 function patch(point:Point3,radius:number,eligible?:number[],mirror=true){
  const t=geo(),p:Point3=[point[0]*(mirror?reflect:1),point[1],point[2]];
  const faces=eligible??t.centers.map((_,i)=>i);
  if(!faces.length)throw Error(`No candidate triangles ${d.id}`);
  const seed=faces.reduce((a,b)=>distance(t.centers[a],p)<distance(t.centers[b],p)?a:b);
  const allowed=eligible?new Set(eligible):null;
  return brushFaces(t,seed,t.centers[seed],radius).filter(f=>!allowed||allowed.has(f));
 }
 function add(key:string,ru:string,la:string,faces:number[],note=''){
  if(!faces.length)throw Error(`Empty gap region ${d.id}/${key}`);
  const id=`${d.id}-atlas-gap-${key}`;
  if(before.some(l=>l.la.toLowerCase()===la.toLowerCase()))return;
  const l={id,ru,la,en:la,labelPosition:geo().centers[faces[0]],pointer:[],source:'editorial' as const,accuracy:'approximate' as const,
   accuracyNote:'Приблизительная область по атласу. Контур и положение сопоставлены с доступной геометрией, но не проверены анатомом. '+note,
   regionMethod:'atlas-gap-review-v1'};
  d.landmarks=d.landmarks.filter(x=>x.id!==id);d.landmarks.push(l);
  regions[id]=[...new Set(faces)].sort((a,b)=>a-b);added.push(la);
 }
 for(const [key,ru,la,point,radius,note] of manual[family]??[])add(key,ru,la,patch(point,radius),note??(/Foramen|Apertura|Hiatus|Fissura/.test(la)?'Выделена область края или входа; ход канала и просвет этой маской не показаны.':''));
 if(family==='tenth-rib'){
  const donor:BoneDetail=JSON.parse(fs.readFileSync(`${root}/ninth-rib-${d.side==='right'?'r':'l'}.json`,'utf8'));
  const l=donor.landmarks.find(l=>l.la==='Angulus costae')!;
  add('angle','Угол X ребра','Angulus costae',patch(l.labelPosition,.18,undefined,false),'Ориентир сопоставлен с соседним IX ребром; индивидуальная кривизна и границы приблизительные.');
 }
 if(/^vertebra-|^axis-c2$/.test(d.id)){
  const joint=d.landmarks.find(l=>l.la==='Facies articularis inferior vertebrae');
  if(!joint)throw Error('Missing inferior joint anchor '+d.id);
  const c=geo().centers,existing=regions[joint.id];
  // Start from each paired inferior facet, extend over the adjoining bony process.
  const faces=new Set<number>();
  for(const sign of [-1,1]){
   const candidates=existing.filter(f=>c[f][0]*sign>=0);
   if(!candidates.length)throw Error('Missing side of inferior facet '+d.id);
   const p=[0,1,2].map(k=>candidates.reduce((s,f)=>s+c[f][k],0)/candidates.length) as Point3;
   for(const f of patch(p,.18,undefined,false))faces.add(f);
  }
  add('inferior-articular-process','Нижние суставные отростки','Processus articularis inferior vertebrae',[...faces],'Парные отростки вокруг нижних суставных площадок; границы с дугой приблизительные.');
 }
 if(family==='ulna'){
  add('supinator-fossa','Ямка супинатора','Fossa supinatoria ulnae',patch([.05,.72,.05],.1));
  const t=geo(),b=fs.readFileSync(`${root}/${d.id}.bin`),a=new Float32Array(b.buffer,b.byteOffset,d.vertexCount*6);
  const faces=t.centers.flatMap((p,f)=>p[1]>-.7&&p[1]<.65&&a[d.vertexCount*3+f*9+2]>0.25?[f]:[]);
  add('anterior-surface','Передняя поверхность тела локтевой кости','Facies anterior ulnae',faces,'Приблизительные границы между краями тела кости.');
 }
 if(family==='parietal-bone'){
  const border=d.landmarks.find(l=>l.la==='Margo sagittalis ossis parietalis')!;
  // Groove runs just inside the sagittal border, not on the convex outer table.
  const c=geo().centers,faces=regions[border.id],p=[0,1,2].map(k=>faces.reduce((s,f)=>s+c[f][k],0)/faces.length) as Point3;
  p[0]+=.025*reflect;p[1]-=.035;
  add('sagittal-sinus-groove','Борозда верхнего сагиттального синуса','Sulcus sinus sagittalis superioris',patch(p,.22,undefined,false),'Выделен участок внутреннего края; полный ход борозды не сегментирован.');
 }
 if(family==='capitate-bone')for(const [n,x] of [['II',.42],['IV',-.4]] as const){
  add('metacarpal-'+n,`Суставная площадка для ${n} пястной кости — вариабельная`,`Facies articularis pro osse metacarpali ${n}`,patch([x,-.76,0],.2,cartilage[d.id].cartilage),'Вариабельная малая фасетка; её отдельная граница в исходном хряще не подтверждена.');
 }
 if(d.id.includes('metacarpal-bone')){
  const n=['first','second','third','fourth','fifth'].indexOf(d.id.split('-')[0])+1;
  const joint=d.landmarks.find(l=>l.la==='Facies articularis basis ossis metacarpalis')!;
  const eligible=regions[joint.id],c=geo().centers;
  const min=[0,1,2].map(k=>Math.min(...eligible.map(f=>c[f][k]))),max=[0,1,2].map(k=>Math.max(...eligible.map(f=>c[f][k])));
  const at=(x:number,y:number):Point3=>[min[0]+(max[0]-min[0])*(reflect===1?x:1-x),min[1]+(max[1]-min[1])*y,(min[2]+max[2])/2];
  const partners:Record<number,[string,string,number,number][]>= {
   1:[['кости-трапеции','osse trapezio',.5,1]],
   2:[['кости-трапеции','osse trapezio',.95,.85],['трапециевидной кости','osse trapezoideo',.5,1],['головчатой кости','osse capitato',.1,.9],['III пястной кости','osse metacarpali III',0,.25]],
   3:[['головчатой кости','osse capitato',.5,1],['II пястной кости','osse metacarpali II',1,.25],['IV пястной кости','osse metacarpali IV',0,.25]],
   4:[['крючковидной кости','osse hamato',.3,1],['головчатой кости','osse capitato',.85,.95],['III пястной кости','osse metacarpali III',1,.25],['V пястной кости','osse metacarpali V',0,.25]],
   5:[['крючковидной кости','osse hamato',.5,1],['IV пястной кости','osse metacarpali IV',1,.25]],
  };
  const groups=partners[n].map(([, ,x,y])=>patch(at(x,y),n===1?.3:.12,eligible,false));
  if(n===2){
   // The medial cartilage is contiguous: proximal part faces capitate,
   // distal part faces MC III. A single brush would select both identically.
   const medial=[...new Set([...groups[2],...groups[3]])].sort((a,b)=>c[b][1]-c[a][1]);
   const split=Math.ceil(medial.length/2);groups[2]=medial.slice(0,split);groups[3]=medial.slice(split);
  }
  for(const [i,[ru,la]] of partners[n].entries())add('base-partner-'+i,'Суставная площадка основания для '+ru,'Facies articularis pro '+la,groups[i],'Учебное разделение исходной суставной поверхности по костям-партнёрам. Малые площадки и двойные фасетки не разделены точно.');
 }
 // Fix duplicated source word, retaining IDs and all masks.
 for(const l of d.landmarks)l.la=l.la.replace(/^(Crista supracondylaris (?:lateralis|medialis)) crista$/,'$1 humeri');
 const named=d.landmarks.filter(l=>!l.id.includes('-direction-zone-'));
 const checks=rule.terms.map(term=>({term,presentBefore:before.some(l=>new RegExp(term,'i').test(l.la)),landmarkIds:named.filter(l=>new RegExp(term,'i').test(l.la)).map(l=>l.id)}));
 const unresolved:string[]=[];
 if(/femur|tibia|fibula|humerus|radius|ulna|metacarpal|metatarsal|phalanx/.test(d.id))unresolved.push('Индивидуальные питательные отверстия: просветы не подтверждены геометрией; точные места не добавлены.');
 if(family==='mandible')unresolved.push('Canalis mandibulae: внутренний ход отсутствует в поверхностной модели; отмечены только наружные отверстия.');
 if(['temporal-bone','maxilla','ethmoid-bone','sphenoid-bone','frontal-bone'].includes(family))unresolved.push('Внутренние каналы, стенки пазух и ячеек: для полноценной разметки нужны срезы/внутренняя геометрия.');
 row.landmarkCount=d.landmarks.length;row.anatomicalCount=named.length;row.searchText=named.map(l=>`${l.ru} ${l.la} ${l.en}`).join(' ');
 if(added.length){
  if(d.surfaceCoverage){d.surfaceCoverage='atlas-features';row.surfaceCoverage='atlas-features';}
  data.references=[...new Set([...(data.references??[]),sourceUrl])];data.atlasGapReview='2026-10-19; approximate contours; incomplete anatomical inventory';
 }
 pending.set(`${root}/${d.id}.json`,JSON.stringify(d));pending.set(`${root}/${d.id}.surfaces.json`,JSON.stringify(data));
 audit.push({id:d.id,ru:d.ru,family:rule.family,reference:sourceUrl,references:[...new Set([...(data.references??[]),sourceUrl])],checks,added,missingChecklist:checks.filter(c=>!c.landmarkIds.length).map(c=>c.term),unresolved,anatomicalRegions:named.length});
}
const missing=audit.flatMap(b=>b.missingChecklist.map(term=>({id:b.id,term})));
if(missing.length){console.log(JSON.stringify({missing},null,2));throw Error('Checklist gaps remain; no asset files written');}
for(const [path,value] of pending)fs.writeFileSync(path,value);
fs.writeFileSync(root+'/index.json',JSON.stringify(index));
const report={reviewDate:'2026-10-19',modelCount:index.length,completeAnatomicalInventory:false,scope:'Core atlas checklist plus identified external landmarks; internal cavities and individual nutrient foramina excluded',added:audit.reduce((s,b)=>s+b.added.length,0),models:audit};
fs.writeFileSync(root+'/atlas-review.json',JSON.stringify(report,null,2)+'\n');
const lines=[
 '# Сверка анатомических образований — 19 октября 2026','',
 `Проверены все ${index.length} моделей по явному учебному перечню. Добавлено ${report.added} приблизительных областей; теперь ${index.reduce((s,b)=>s+b.anatomicalCount!,0)} именованных областей. Условные направления не входят в это число.`,'',
 '**Это сверка наружных ориентиров по контрольному перечню, не полный перечень TA2 и не экспертная верификация всех контуров.** Нулевое число пропусков относится только к этому перечню. Индивидуальные питательные отверстия, скрытые каналы и полости остаются ограничением поверхностной геометрии.','',
 'Перечень задан независимо от масок в `scripts/atlas-review-checklist.ts`. Машинный отчёт `public/models/bone-details/v1/atlas-review.json` содержит для каждой кости проверенные термины, прежнее наличие, идентификаторы областей, источники и нерешённые ограничения.','',
 'После старых генераторов следует запускать `scripts/build-atlas-gap-surfaces.ts`, затем `scripts/build-bone-stress-draft.ts`. При ошибке перечня новые файлы моделей не записываются. Прежние маски и бинарная геометрия сохранены.','',
 'Новые контуры приблизительные. Суставные площадки пясти ограничены исходным хрящом основания; смежные площадки разделены редакционно. Отверстия обозначают предполагаемый край/вход, не внутренний канал. Вариабельные фасетки головчатой кости и сосцевидное отверстие подписаны отдельно. Непроверенные ударения отмечаются в интерфейсе как предварительные.','',
 'Координаты не опубликованы в текстовых атласах: это приблизительное сопоставление с мешем. Нижние суставные отростки привязаны к существующим парным суставным площадкам, угол X ребра — к ориентиру соседнего IX ребра.','',
 '## Результат для каждой модели','',
 '| Модель | Контрольных терминов | Новые области | Остаточные ограничения |',
 '|---|---:|---|---|',
 ...audit.map(b=>`| [${b.ru} · ${b.id}](${b.reference}) | ${b.checks.length} | ${b.added.join('; ')||'В контрольном перечне новых пропусков не найдено'} | ${b.unresolved.join(' ')||'Полнота вне контрольного перечня и точность контуров не подтверждены.'} |`),
 '', '## Дополнительные источники','',
 '- [Челюстно-лицевые образования, Masaryk University](https://is.muni.cz/el/1411/podzim2014/VSAN0131s/um/50710131/splanchnocranium.pdf).',
 '- [Вариабельные фасетки головчатой кости, Kenhub](https://www.kenhub.com/en/videos/carpal-bones?t=683).',
 '- [Борозды внутренней поверхности свода черепа, Kenhub](https://www.kenhub.com/en/library/anatomy/calvaria).',
 '- [Отверстия и щели черепа, Kenhub](https://www.kenhub.com/en/library/anatomy/foramina-and-fissures-of-the-skull).','',
 '- Словарные ударения: incūdis — [Дворецкий](https://ashishkin.ru/wp-content/uploads/2019/03/Latinskii---Dvoretskii--.pdf); stapēdis — [учебник ОНМедУ, 2018](https://resource.odmu.edu.ua/chair/download/103960/XpoghkteJVU7Gfw5OKYjTg/Latin.%20Textbook-2018.pdf). Crus — односложное слово. Эти формы внесены в основной костный словарь.','',
];
fs.writeFileSync('content/atlas-review.md',lines.join('\n'));
console.log(JSON.stringify({models:audit.length,added:report.added,named:index.reduce((s,b)=>s+b.anatomicalCount!,0),missing}));
