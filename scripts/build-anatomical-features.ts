import fs from 'node:fs';
import {surfaceTopology,brushFaces} from '../src/lib/osteology/regions';
import type {BoneDetail,BoneSummary,Point3} from '../src/lib/osteology/types';
import {cranialFeatures,carpalFacets} from './anatomical-feature-catalog';

const root='public/models/bone-details/v1';
const index:BoneSummary[]=JSON.parse(fs.readFileSync(root+'/index.json','utf8'));
const cartilage:Record<string,{vertexCount:number;cartilage:number[]}>=JSON.parse(fs.readFileSync('../.anatomy-source/anatomical-cartilage.json','utf8'));
const source=new Map(index.map(b=>[b.id,JSON.parse(fs.readFileSync(`${root}/${b.id}.json`,'utf8')) as BoneDetail]));
const sourceRegions=new Map(index.map(b=>[b.id,JSON.parse(fs.readFileSync(`${root}/${b.id}.surfaces.json`,'utf8')).regions as Record<string,number[]>]));
const geometries=new Map<string,ReturnType<typeof geometry>>();
const donorAnchors=new Map<string,Point3>();
function geometry(id:string){
 const d=source.get(id)!,buf=fs.readFileSync(`${root}/${id}.bin`),a=new Float32Array(buf.buffer,buf.byteOffset,d.vertexCount*6);
 const topology=surfaceTopology(a.subarray(0,d.vertexCount*3));
 const min=[0,1,2].map(k=>Math.min(...topology.centers.map(p=>p[k]))),max=[0,1,2].map(k=>Math.max(...topology.centers.map(p=>p[k])));
 return {a,topology,min,max};
}
function geo(id:string){if(!geometries.has(id))geometries.set(id,geometry(id));return geometries.get(id)!;}
const normalize=(s:string)=>s.toLowerCase().replace(/[()]/g,'').trim();
const report:{id:string;added:number;anatomicalRegions:number;methods:Record<string,string>}[]=[];
const pending=new Map<string,string>();
const ordinal=['first','second','third','fourth','fifth','sixth','seventh','eighth','ninth','tenth','eleventh','twelfth'];
for(const row of index){
 const d=structuredClone(source.get(row.id)!);
 // Keep the earlier 34 individually traced bones intact.
 if(!d.surfaceCoverage)continue;
 const data=JSON.parse(fs.readFileSync(`${root}/${d.id}.surfaces.json`,'utf8'));
 const regions=data.regions as Record<string,number[]>;
 const oldCount=d.landmarks.filter(l=>!l.id.includes('-anatomy-')).length;
 for(const l of d.landmarks.filter(l=>l.id.includes('-anatomy-')))delete regions[l.id];
 d.landmarks=d.landmarks.filter(l=>!l.id.includes('-anatomy-'));
 const g=geo(d.id),centers=g.topology.centers,count=centers.length;
 const cart=new Set(cartilage[d.id]?.cartilage??[]),reflect=d.side==='right'?-1:1;
 const methods:Record<string,string>={};const refs=new Set<string>(data.references??[]);
 const canonical=(p:Point3):Point3=>[p[0]*reflect,p[1],p[2]];
 const all=centers.map((_,f)=>f);
 const norm=(f:number):Point3=>[0,1,2].map(k=>(g.a[d.vertexCount*3+f*9+k]+g.a[d.vertexCount*3+f*9+3+k]+g.a[d.vertexCount*3+f*9+6+k])/3) as Point3;
 const select=(fn:(p:Point3,n:Point3,f:number)=>boolean)=>all.filter(f=>fn(canonical(centers[f]),canonical(norm(f)),f));
 function add(key:string,en:string,ru:string,la:string,faces:number[],method:string,extra=''){
  if(!faces.length)throw Error(`Empty anatomical feature: ${d.id}/${key}`);
  const existing=d.landmarks.find(l=>normalize(l.en)===normalize(en)||normalize(l.la)===normalize(la));
  const id=existing?.id??`${d.id}-anatomy-${key}`;
  const note=method==='source-cartilage'?'Область следует материалу суставного хряща исходной модели. Разделение на отдельные суставные площадки приблизительное.':'Приблизительный контур конкретного анатомического образования по атласу; положение и границы требуют экспертной проверки.';
  const l=existing??{id,en,ru,la,labelPosition:centers[faces[0]],pointer:[],source:'editorial' as const};
  l.accuracy='approximate';l.accuracyNote=note+' '+extra;l.regionMethod=method;
  if(!existing)d.landmarks.push(l);
  regions[id]=[...new Set(faces)].sort((a,b)=>a-b);methods[id]=method;
 }
 function patch(p:Point3,radius=.18,mirror=true,restrict?:Set<number>){
  const point:Point3=[p[0]*(mirror?reflect:1),p[1],p[2]];
  const eligible=restrict?[...restrict]:all;
  if(!eligible.length)throw Error(`No eligible surface ${d.id}`);
  const seed=eligible.reduce((best,f)=>distance(centers[f],point)<distance(centers[best],point)?f:best,eligible[0]);
  return brushFaces(g.topology,seed,centers[seed],radius).filter(f=>!restrict||restrict.has(f));
 }
 function transfer(donor:string,accept:(name:string)=>boolean,mirror=false){
  const sd=source.get(donor)!,sg=geo(donor),sr=sourceRegions.get(donor)!;
  for(const l of sd.landmarks.filter(l=>l.source==='z-anatomy'&&accept(l.en))){
   if(d.landmarks.some(x=>normalize(x.la)===normalize(l.la)))continue;
   if(!sr[l.id]?.length)throw Error(`Missing donor region ${l.id}`);
   // Read the immutable authored leader, not a region modified by a previous run.
   if(!donorAnchors.has(l.id)){
    const pts=new Map<string,Point3>();for(let i=0;i<l.pointer.length;i+=3){const p=l.pointer.slice(i,i+3) as Point3;pts.set(p.join(','),p);}
    let best=Infinity,anchor=sg.topology.centers[0];
    for(const p of pts.values())for(const c of sg.topology.centers){const dist=distance(p,c);if(dist<best){best=dist;anchor=c;}}
    donorAnchors.set(l.id,anchor);
   }
   const c=donorAnchors.get(l.id)!;
   const p=c.map((v,k)=>{const t=(v-sg.min[k])/(sg.max[k]-sg.min[k]);return g.min[k]+(k===0&&mirror?1-t:t)*(g.max[k]-g.min[k]);}) as Point3;
   add('homolog-'+l.id,l.en,l.ru,l.la,patch(p,.15,false),'homologous-atlas-transfer',`Ориентир сопоставлен с ${sd.ru}; индивидуальные размеры и вариантность не подтверждены. Для отверстия окрашена область его костного края, а не просвет.`);
  }
 }
 // Phalanges and metacarpals: ends and shaft along each mesh's principal axis.
 if(/phalanx|metacarpal-bone/.test(d.id)){
  const foot=d.id.includes('of-foot'),distal=d.id.startsWith('distal-'),metacarpal=d.id.includes('metacarpal');
  let axis:Point3=foot?[0,0,1]:[0,-1,0];
  const mean=[0,1,2].map(k=>centers.reduce((s,p)=>s+p[k],0)/count);
  for(let iter=0;iter<18;iter++){
   const v=[0,0,0];for(const p of centers){const dot=p.reduce((s,x,k)=>s+(x-mean[k])*axis[k],0);for(let k=0;k<3;k++)v[k]+=(p[k]-mean[k])*dot;}
   const length=Math.hypot(...v);axis=v.map(x=>x/length) as Point3;
  }
  if((foot?axis[2]:-axis[1])<0)axis=axis.map(x=>-x) as Point3;
  const t=centers.map(p=>p.reduce((s,v,k)=>s+v*axis[k],0)),lo=Math.min(...t),range=Math.max(...t)-lo;
  const u=t.map(v=>(v-lo)/range),part=(a:number,b:number,articular=false)=>all.filter(f=>u[f]>=a&&u[f]<=b&&(!articular||cart.has(f)));
  const gen=metacarpal?'ossis metacarpalis':`phalangis ${distal?'distalis':d.id.startsWith('middle-')?'mediae':'proximalis'} ${foot?'pedis':'manus'}`;
  const en=metacarpal?'metacarpal bone':`phalanx of ${foot?'foot':'hand'}`;
  add('base',metacarpal?'Metacarpal base':`Base of ${en}`,'Основание',`Basis ${gen}`,part(0,.23),'anatomical-axis-partition');
  add('shaft',`Body of ${en}`,'Тело',`Corpus ${gen}`,part(.23,.73),'anatomical-axis-partition');
  if(!distal){
   add('head',`Head of ${en}`,'Головка',`Caput ${gen}`,part(.73,1),'anatomical-axis-partition');
   if(metacarpal)add('neck','Neck of metacarpal bone','Шейка',`Collum ${gen}`,part(.64,.79),'anatomical-axis-partition');
   add('head-joint',metacarpal?'Articular surface of metacarpal head':`Trochlea of ${en}`,metacarpal?'Суставная поверхность головки':'Блок фаланги — суставная поверхность головки',`${metacarpal?'Facies articularis capitis':'Trochlea'} ${gen}`,part(.5,1,true),'source-cartilage');
  }else add('tuberosity',`Tuberosity of distal phalanx of ${foot?'foot':'hand'}`,'Бугристость дистальной фаланги',`Tuberositas phalangis distalis ${foot?'pedis':'manus'}`,part(.76,1),'anatomical-axis-partition');
  add('base-joint','Articular surface of base','Суставная поверхность основания',`Facies articularis basis ${gen}`,part(0,.5,true),'source-cartilage');
  refs.add(`https://www.kenhub.com/en/library/anatomy/${metacarpal?'metacarpal-bones':foot?'phalanges-of-the-foot':'the-phalanges'}`);
  if(d.id.startsWith('fifth-metacarpal'))add('tuberosity','Tuberosity of fifth metacarpal','Бугристость V пястной кости','Tuberositas ossis metacarpalis V',part(0,.18).filter(f=>canonical(norm(f))[0]<0),'anatomical-axis-partition');
 }
 // Region-specific vertebral anatomy; atlas and axis are handled separately below.
 if(/^vertebra-[ctl]/.test(d.id)){
  const region=d.id.match(/^vertebra-([ctl])(\d+)/)!,kind=region[1],number=+region[2];
  transfer('vertebra-l3',name=>!['Vertebra','Intervertebral foramen','Lateral part of transverse process','Costal part of transverse process'].includes(name));
  if(kind==='c')transfer('vertebra-c4',name=>name!=='Cervical vertebra');
  if(kind==='t'){
   transfer('vertebra-t8',name=>name==='Transverse costal facet'&&number<=10||name==='Superior costal facet'&&number<=9||name==='Inferior costal facet'&&number<=8);
   if(number>=10)add('costal-facet','Costal facet of vertebral body','Рёберная ямка тела позвонка','Fovea costalis corporis vertebrae',select((p,n,f)=>cart.has(f)&&Math.abs(p[0])>.25&&p[2]>0),'source-cartilage');
  }
  const front=(g.max[2]+g.min[2])/2;
  add('body','Vertebral body','Тело позвонка','Corpus vertebrae',select(p=>p[2]>front+.12*(g.max[2]-g.min[2])),'anatomical-partition');
  add('spinous','Spinous process','Остистый отросток','Processus spinosus',select(p=>p[2]<g.min[2]+.25*(g.max[2]-g.min[2])&&Math.abs(p[0])<.35),'anatomical-partition');
  if(kind==='l'){
   transfer('vertebra-l3',name=>['Lateral part of transverse process','Costal part of transverse process'].includes(name));
   for(const sign of [-1,1]){
    add('mammillary-'+sign,`Mammillary process ${sign}`,'Сосцевидный отросток '+(sign>0?'слева':'справа'),'Processus mammillaris '+(sign>0?'sinister':'dexter'),patch([sign*.45,.27,-.28],.12,false),'atlas-local-contour');
    add('accessory-'+sign,`Accessory process ${sign}`,'Добавочный отросток '+(sign>0?'слева':'справа'),'Processus accessorius '+(sign>0?'sinister':'dexter'),patch([sign*.62,-.05,-.20],.1,false),'atlas-local-contour');
   }
  }
  refs.add(`https://www.kenhub.com/en/library/anatomy/${kind==='c'?'cervical-spine':kind==='t'?'thoracic-vertebrae':'lumbar-vertebrae'}`);
 }
 if(d.id==='axis-c2'){
  transfer('vertebra-l3',name=>['Vertebral body','Vertebral arch','Spinous process','Pedicle of vertebral arch','Lamina of vertebral arch','Vertebral foramen','Transverse process','Inferior articular facet of vertebra'].includes(name));
  transfer('vertebra-c4',name=>name==='Foramen transversarium');
  add('superior-joint','Superior articular surface of axis','Верхние суставные поверхности осевого позвонка','Facies articulares superiores axis',select((p,n,f)=>cart.has(f)&&n[1]>.25&&Math.abs(p[0])>.2),'source-cartilage');
 }
 if(d.id==='atlas-c1'){
  transfer('vertebra-c4',name=>['Foramen transversarium'].includes(name));
  add('vertebral-foramen','Vertebral foramen of atlas','Позвоночное отверстие атланта — костный край','Foramen vertebrale atlantis',select((p,n)=>Math.abs(p[0])<.55&&Math.abs(p[2])<.5&&p[0]*n[0]+p[2]*n[2]<0),'atlas-local-contour','Выделен обращённый в отверстие костный край; просвет не является поверхностью.');
 }
 // Ribs: do not transfer the neck/tubercle/crest to floating ribs.
 if(/-rib-[lr]$/.test(d.id)){
  const number=ordinal.indexOf(d.id.split('-')[0])+1,donor=`sixth-rib-${d.side==='right'?'r':'l'}`;
  transfer(donor,name=>name!=='Rib'&&!(number>=11&&/Neck|neck|Tubercle|tubercle/.test(name))&&!(number===1||number>=10)&&name!=='Costal groove');
  if(number===1||number>=10)transfer(donor,name=>['Head of rib','Body of rib'].includes(name)||number===10&&['Neck of rib','Tubercle of rib','Articular facet of tubercle of rib'].includes(name));
  const head=number>=11?[...cart]:select((p,n,f)=>cart.has(f)&&p[1]>g.min[1]+.8*(g.max[1]-g.min[1]));
  if(number===1||number>=10)add('head-facet','Articular surface of head of rib','Суставная поверхность головки ребра','Facies articularis capitis costae',head,'source-cartilage');
  if(number>1&&number<12)transfer(donor,name=>name==='Costal groove');
  if(number===1){
   transfer(donor,name=>['Neck of rib','Tubercle of rib','Articular facet of tubercle of rib'].includes(name));
   add('scalene','Scalene tubercle','Бугорок передней лестничной мышцы','Tuberculum musculi scaleni anterioris',patch([.3,0,.2],.18),'atlas-local-contour');
   add('artery-groove','Groove for subclavian artery','Борозда подключичной артерии','Sulcus arteriae subclaviae',patch([.55,.25,-.1],.18),'atlas-local-contour');
   add('vein-groove','Groove for subclavian vein','Борозда подключичной вены','Sulcus venae subclaviae',patch([.4,-.15,.45],.18),'atlas-local-contour');
  }
  if(number===2)add('serratus','Tuberosity for serratus anterior','Бугристость передней зубчатой мышцы','Tuberositas musculi serrati anterioris',patch([.52,0,.1],.22),'atlas-local-contour');
  if(number===11)transfer(donor,name=>name==='Angle of rib');
  refs.add('https://www.kenhub.com/en/library/anatomy/the-ribs');
 }
 // Individual carpal articular facets, constrained to authored cartilage when available.
 const family=d.id.replace(/-[lr]$/,'');
 for(const facet of carpalFacets[family]??[]){
  const [key,ru,la,p,radius]=facet;
  add(key,key,ru,la,patch(p,radius,true,cart),'source-cartilage','Название суставного партнёра сверено по атласу; разделение соседних фасеток на сглаженном меше приблизительное.');
  refs.add('https://www.kenhub.com/en/library/anatomy/carpal-bones');
 }
 // Individually placed skull and small-bone features, reviewed in three orthographic views.
 for(const feature of cranialFeatures[family]??[]){
  const [key,ru,la,p,radius]=feature;
  add(key,key,ru,la,patch(p,radius),'atlas-local-contour',/foramen|canalis|meatus/i.test(la)?'Показана предполагаемая область костного края/входа. Просвет или ход канала может отсутствовать в упрощённой геометрии.':'');
  refs.add(family==='mandible'?'https://www.kenhub.com/en/library/anatomy/the-mandible':family==='maxilla'?'https://www.kenhub.com/en/library/anatomy/the-maxilla':'https://www.kenhub.com/en/library/anatomy/the-skull');
 }
 if(d.id==='parietal-bone-l')transfer('parietal-bone-r',()=>true,true);
 // Midline vertebrae have paired pedicles, transverse processes and joint facets.
 if(/^vertebra-|^atlas-c1$|^axis-c2$/.test(d.id)){
  for(const l of d.landmarks){
   if(!/pedicle|lamina of vertebral|articular facet of vertebra|articular process of vertebra|vertebral notch|transverse process|foramen transversarium|groove for spinal nerve|costal facet/i.test(l.en))continue;
   if(l.source==='z-anatomy'&&l.regionMethod==='bilateral-atlas-contour'){methods[l.id]=l.regionMethod;continue;}
   const faces=regions[l.id];if(!faces?.length)continue;
   // Always reflect each existing face center; this is stable on repeat builds.
   const mirrored=new Set<number>(faces);
   for(const f of faces){const p=centers[f];let best=0,dist=Infinity;for(let j=0;j<count;j++){const q=centers[j],r=(p[0]+q[0])**2+(p[1]-q[1])**2+(p[2]-q[2])**2;if(r<dist){dist=r;best=j;}}mirrored.add(best);}
   regions[l.id]=[...mirrored].sort((a,b)=>a-b);l.regionMethod='bilateral-atlas-contour';methods[l.id]='bilateral-atlas-contour';
   l.accuracyNote='Приблизительные парные области конкретного образования. Расположение сопоставлено с анатомическим образцом, правая и левая границы требуют проверки. Для отверстий выделен костный край, не просвет.';
  }
 }
 // Named large articular surfaces on the remaining appendicular bones.
 const cartilageNames:Record<string,[string,string,string][]>={
  humerus:[['head','Суставная поверхность головки плечевой кости','Facies articularis capitis humeri'],['condyle','Суставная поверхность мыщелка плечевой кости','Facies articularis condyli humeri']],
  'sesamoid-bones-of-foot':[['all','Суставные поверхности сесамовидных костей для головки I плюсневой','Facies articulares ossium sesamoideorum']],
 };
 for(const [key,ru,la] of cartilageNames[family]??[]){
  const faces=[...cart].filter(f=>key==='all'||(key==='head'?centers[f][1]>0:centers[f][1]<0));
  add('articular-'+key,'Articular '+key,ru,la,faces,'source-cartilage');
 }
 // Subdivide authored cartilage only among the known joints of this bone.
 const jointNames:Record<string,string[]>={
  radius:['Articular circumference of head of radius','Articular facet of head of radius','Carpal articular surface','Ulnar notch'],
  ulna:['Trochlear notch','Radial notch','Articular circumference of head of ulna'],
  clavicle:['Sternal articular surface','Acromial facet'],
  scapula:['Glenoid fossa','Clavicular facet'],
  'hip-bone':['Lunate surface','Auricular surface of ilium','Symphysial surface of pubis'],
 };
 if(jointNames[family]){
  const joints=jointNames[family].map(en=>d.landmarks.find(l=>l.en===en)!);
  if(joints.some(l=>!l))throw Error(`Missing joint name ${d.id}`);
  const anchors=joints.map(l=>{
   const pts=new Map<string,Point3>();for(let i=0;i<l.pointer.length;i+=3){const p=l.pointer.slice(i,i+3) as Point3;pts.set(p.join(','),p);}
   let best=Infinity,anchor=centers[0];for(const p of pts.values())for(const f of cart){const dist=distance(p,centers[f]);if(dist<best){best=dist;anchor=centers[f];}}
   return anchor;
  });
  const groups:number[][]=joints.map(()=>[]);
  for(const f of cart){let best=0;for(let k=1;k<anchors.length;k++)if(distance(centers[f],anchors[k])<distance(centers[f],anchors[best]))best=k;groups[best].push(f);}
  joints.forEach((l,i)=>add('joint-'+i,l.en,l.ru,l.la,groups[i],'source-cartilage','Разделение исходного хрящевого участка опирается на авторские анатомические указатели; границы соседних площадок приблизительные.'));
 }
 // Existing model attribution/geometry hashes and manual browser drafts remain unchanged.
 if(Object.keys(methods).length){
  d.surfaceCoverage='atlas-features';row.surfaceCoverage='atlas-features';
  data.method='atlas-specific-features-v1';data.review='atlas-referenced approximate contours; incomplete inventory; not independently expert-reviewed';data.references=[...refs];
  data.featureMethods=methods;
 }
 row.landmarkCount=d.landmarks.length;row.anatomicalCount=d.landmarks.filter(l=>!l.id.includes('-direction-zone-')).length;
 row.searchText=d.landmarks.map(l=>`${l.ru} ${l.la} ${l.en}`).join(' ');
 pending.set(`${root}/${d.id}.json`,JSON.stringify(d));pending.set(`${root}/${d.id}.surfaces.json`,JSON.stringify(data));
 report.push({id:d.id,added:d.landmarks.length-oldCount,anatomicalRegions:row.anatomicalCount,methods});
}
for(const row of index)row.anatomicalCount??=row.landmarkCount;
// Validate all selectors before replacing any asset; a failed rule leaves the last build usable.
for(const [path,value] of pending)fs.writeFileSync(path,value);
fs.writeFileSync(root+'/index.json',JSON.stringify(index));
fs.writeFileSync(root+'/anatomical-feature-coverage.json',JSON.stringify({modelCount:index.length,completeAnatomicalInventory:false,modelsWithoutNamedFeatures:index.filter(b=>!b.anatomicalCount).map(b=>b.id),added:report.reduce((s,b)=>s+b.added,0),models:report},null,2)+'\n');
console.log(JSON.stringify({processed:report.length,added:report.reduce((s,b)=>s+b.added,0),withoutNamedFeatures:index.filter(b=>!b.anatomicalCount).map(b=>b.id)}));
function distance(a:Point3,b:Point3){return Math.hypot(...a.map((v,k)=>v-b[k]));}
