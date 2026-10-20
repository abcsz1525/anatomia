import fs from 'node:fs';
const dir='public/models/bone-details/v1';
// Add general anatomical surfaces to the existing, hash-bound geometry.
// Cartilage masks take priority over normal-based editorial transitions.
export function supplementSurfaces(kind){
 for(const side of ['l','r']){
  const base=`${dir}/${kind}-${side}`,d=JSON.parse(fs.readFileSync(base+'.json')),data=JSON.parse(fs.readFileSync(base+'.surfaces.json'));
  const buf=fs.readFileSync(base+'.bin'),a=new Float32Array(buf.buffer,buf.byteOffset,buf.length/4),offset=d.vertexCount*3;
  const get=name=>data.regions[d.landmarks.find(l=>l.en===name)?.id]??[];
  const set=name=>new Set(get(name));
  const additions=[];
  function add(key,en,ru,la,faces){if(!faces.length)throw Error(`Empty ${en}`);const id=d.id+'-supplement-'+key;const f=faces[0];const l={id,en,ru,la,labelPosition:[0,1,2].map(k=>(a[f*9+k]+a[f*9+3+k]+a[f*9+6+k])/3),pointer:[],source:'editorial'};d.landmarks=d.landmarks.filter(x=>x.id!==id);d.landmarks.push(l);data.regions[id]=faces;additions.push(en);}
  function normal(f){const n=[0,1,2].map(k=>(a[offset+f*9+k]+a[offset+f*9+3+k]+a[offset+f*9+6+k])/3);if(side==='r')n[0]*=-1;return n;}
  if(kind==='femur'){
   const groups={anterior:[],posterior:[],medial:[],lateral:[]};
   for(const f of get('Body of femur')){const [x,,z]=normal(f);const k=Math.abs(z)>=Math.abs(x)?(z>=0?'anterior':'posterior'):(x>=0?'lateral':'medial');groups[k].push(f);}
   for(const [k,ru,la] of [['anterior','Передняя','anterior'],['posterior','Задняя','posterior'],['medial','Медиальная','medialis'],['lateral','Латеральная','lateralis']])add(k,`${k[0].toUpperCase()+k.slice(1)} surface of femur`,`${ru} поверхность тела бедренной кости`,`Facies ${la} femoris`,groups[k]);
   data.references=[...new Set([...data.references,'https://www.elsevier.com/resources/anatomy/skeletal-system/appendicular-skeleton/anterior-surface-of-femur/23750'])];
  }
  if(kind==='talus'){
   const groups={anterior:[],posterior:[],superior:[],inferior:[],medial:[],lateral:[]};
   const front=set('Navicular articular surface'),top=set('Superior facet of talus'),med=set('Medial malleolar facet'),lat=set('Lateral malleolar facet'),back=set('Posterior process of talus');
   const lower=new Set(['Posterior calcaneal articular facet','Middle facet for calcaneus','Anterior calcaneal articular facet','Facet for plantar calcaneonavicular ligament','Facet for calcaneonavicular part of bifurcate ligament','Talar sulcus'].flatMap(get));
   for(let f=0;f<d.vertexCount/3;f++){
    const n=normal(f);let k;
    if(front.has(f))k='anterior';else if(top.has(f))k='superior';else if(med.has(f))k='medial';else if(lat.has(f))k='lateral';else if(lower.has(f))k='inferior';else if(back.has(f))k='posterior';else{const axis=n.map(Math.abs).indexOf(Math.max(...n.map(Math.abs)));k=axis===0?(n[0]>=0?'lateral':'medial'):axis===1?(n[1]>=0?'superior':'inferior'):(n[2]>=0?'anterior':'posterior');}groups[k].push(f);
   }
   for(const [k,ru,la] of [['anterior','Передняя (дистальная)','anterior'],['posterior','Задняя (проксимальная)','posterior'],['superior','Верхняя','superior'],['inferior','Нижняя','inferior'],['medial','Медиальная','medialis'],['lateral','Латеральная','lateralis']])add(k,`${k[0].toUpperCase()+k.slice(1)} surface of talus`,`${ru} поверхность таранной кости`,`Facies ${la} tali`,groups[k]);
   data.references=[...new Set([...data.references,'https://www.ncbi.nlm.nih.gov/books/NBK541086/'])];
  }
  fs.writeFileSync(base+'.json',JSON.stringify(d));fs.writeFileSync(base+'.surfaces.json',JSON.stringify(data));
  const index=JSON.parse(fs.readFileSync(dir+'/index.json'));const row=index.find(x=>x.id===d.id);row.landmarkCount=d.landmarks.length;row.searchText=d.landmarks.map(l=>l.ru+' '+l.la+' '+l.en).join(' ');fs.writeFileSync(dir+'/index.json',JSON.stringify(index));console.log(d.id,additions);
 }
}
