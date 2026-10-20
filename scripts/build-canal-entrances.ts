import fs from 'node:fs';
import {surfaceTopology, brushFaces} from '../src/lib/osteology/regions';
import type {BoneDetail, BoneSummary, Point3} from '../src/lib/osteology/types';

const root='public/models/bone-details/v1';
const index:BoneSummary[]=JSON.parse(fs.readFileSync(`${root}/index.json`,'utf8'));
// These are surface proxies, never a reconstruction of an absent lumen.
const specs=[
 {family:'hip-bone',key:'obturator-entry',anchor:'Sulcus obturatorius',ru:'Запирательный канал — костная область входа',la:'Canalis obturatorius',axis:2,radius:.075,note:'Костная часть входа у запирательной борозды. Нижнюю стенку образует запирательная мембрана, которой в модели нет.',url:'https://www.kenhub.com/en/library/anatomy/hip-bone'},
 {family:'maxilla',key:'infraorbital-entry',anchor:'Sulcus infraorbitalis',ru:'Подглазничный канал — глазничный вход',la:'Canalis infraorbitalis',axis:2,radius:.08,note:'Предполагаемый переход переднего участка подглазничной борозды в канал. Костная крыша и внутренний просвет не подтверждены.',url:'https://www.kenhub.com/en/library/anatomy/infraorbital-nerve'},
 {family:'palatine-bone',key:'sphenopalatine-rim',anchor:'Incisura sphenopalatina',ru:'Клиновидно-нёбное отверстие — нёбная часть края',la:'Foramen sphenopalatinum',axis:1,radius:.12,note:'Показана часть края у клиновидно-нёбной вырезки. Полное отверстие возникает при соединении с клиновидной костью.',url:'https://www.kenhub.com/en/library/anatomy/anatomy-of-the-pterygopalatine-fossa'},
 {family:'temporal-bone',key:'jugular-rim',anchor:'Fossa jugularis',ru:'Яремное отверстие — височная часть края',la:'Foramen jugulare',axis:1,radius:.09,note:'Предполагаемая область края рядом с яремной ямкой. Полное отверстие образовано височной и затылочной костями; внутренние перегородки не размечены.',url:'https://www.kenhub.com/en/library/anatomy/jugular-foramen'},
];
const pending=new Map<string,string>();
const additions=[];
for(const spec of specs)for(const side of ['l','r']){
 const id=`${spec.family}-${side}`,row=index.find(b=>b.id===id)!;
 const d:BoneDetail=JSON.parse(fs.readFileSync(`${root}/${id}.json`,'utf8'));
 const data=JSON.parse(fs.readFileSync(`${root}/${id}.surfaces.json`,'utf8'));
 const anchor=d.landmarks.find(l=>l.la===spec.anchor);
 if(!anchor)throw Error(`Missing anchor: ${id} ${spec.anchor}`);
 const allowed:number[]=data.regions[anchor.id];
 if(!allowed?.length)throw Error(`Missing anchor mask: ${id}`);
 const raw=fs.readFileSync(`${root}/${id}.bin`);
 const topology=surfaceTopology(new Float32Array(raw.buffer,raw.byteOffset,d.vertexCount*3));
 // A connected patch at the entrance-facing end of the existing atlas region.
 const seed=allowed.reduce((a,b)=>topology.centers[a][spec.axis]>topology.centers[b][spec.axis]?a:b);
 const eligible=new Set(allowed);
 const faces=brushFaces(topology,seed,topology.centers[seed],spec.radius).filter(f=>eligible.has(f)).sort((a,b)=>a-b);
 if(!faces.length)throw Error(`Empty entrance: ${id}`);
 const landmarkId=`${id}-canal-entry-${spec.key}`;
 d.landmarks=d.landmarks.filter(l=>l.id!==landmarkId);
 d.landmarks.push({id:landmarkId,ru:spec.ru,la:spec.la,en:spec.la,labelPosition:topology.centers[seed] as Point3,pointer:[],source:'editorial',accuracy:'approximate',accuracyNote:'Приблизительная область по атласу; точные границы и наличие просвета не подтверждены геометрией. '+spec.note,regionMethod:'atlas-canal-entrance-v1'});
 data.regions[landmarkId]=faces;
 data.references=[...new Set([...(data.references??[]),spec.url])];
 row.landmarkCount=d.landmarks.length;
 row.anatomicalCount=d.landmarks.filter(l=>!l.id.includes('-direction-zone-')).length;
 row.searchText=d.landmarks.filter(l=>!l.id.includes('-direction-zone-')).map(l=>`${l.ru} ${l.la} ${l.en}`).join(' ');
 pending.set(`${root}/${id}.json`,JSON.stringify(d));
 pending.set(`${root}/${id}.surfaces.json`,JSON.stringify(data));
 additions.push({boneId:id,landmarkId,anchorId:anchor.id,faces:faces.length,reference:spec.url});
}
for(const [file,value] of pending)fs.writeFileSync(file,value);
fs.writeFileSync(`${root}/index.json`,JSON.stringify(index));
fs.writeFileSync(`${root}/canal-entrance-review.json`,JSON.stringify({date:'2026-10-19',completeAnatomicalInventory:false,additions,limitations:['Отмечены участки внешней поверхности, а не просветы и внутренний ход каналов.','Питательные отверстия длинных костей и мелкие канальцы височной кости без подтверждённого просвета не добавлены.','Края составных отверстий показаны только на кости, содержащей опорную вырезку или ямку.']},null,2));
console.log(`Added/updated ${additions.length} approximate entrance regions`);
