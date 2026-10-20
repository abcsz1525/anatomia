/** Reproducible approximate teaching zones, never expert anatomical contours. */
import fs from 'node:fs';
import crypto from 'node:crypto';
import {Triangle, Vector3} from 'three';
import {surfaceTopology, brushFaces} from '../src/lib/osteology/regions';
import type {BoneDetail, BoneSummary, Point3} from '../src/lib/osteology/types';

const root='public/models/bone-details/v1';
const method='approximate-directional-zones-and-source-leader-neighborhoods';
const index:BoneSummary[]=JSON.parse(fs.readFileSync(`${root}/index.json`,'utf8'));
const report:{id:string; regions:number; sourceNeighborhoods:number; directionalZones:number}[]=[];
const hash=(bytes:Buffer)=>crypto.createHash('sha256').update(bytes).digest('hex');
const references=['https://github.com/LluisV/Z-Anatomy','https://openstax.org/books/anatomy-and-physiology-2e/pages/1-6-anatomical-terminology'];

for(const row of index){
  const base=`${root}/${row.id}`;
  if(fs.existsSync(base+'.surfaces.json')&&JSON.parse(fs.readFileSync(base+'.surfaces.json','utf8')).method!==method)continue;
  const d:BoneDetail=JSON.parse(fs.readFileSync(base+'.json','utf8'));
  const buffer=fs.readFileSync(base+'.bin');
  if(buffer.length!==d.vertexCount*24)throw Error(`Invalid geometry: ${d.id}`);
  const a=new Float32Array(buffer.buffer,buffer.byteOffset,buffer.length/4);
  const topology=surfaceTopology(a.subarray(0,d.vertexCount*3));
  const count=d.vertexCount/3,regions:Record<string,number[]>={};
  // Existing source labels and leader geometry remain intact and independently sided.
  d.landmarks=d.landmarks.filter(l=>!l.id.includes('-direction-zone-'));
  const tri=new Triangle(),point=new Vector3(),nearest=new Vector3();
  function nearestFace(p:Point3){
    point.fromArray(p);let best=Infinity,face=0;
    for(let f=0;f<count;f++){
      tri.a.fromArray(a,f*9);tri.b.fromArray(a,f*9+3);tri.c.fromArray(a,f*9+6);
      tri.closestPointToPoint(point,nearest);const distance=nearest.distanceToSquared(point);
      if(distance<best){best=distance;face=f;}
    }
    return {face,distance:best};
  }
  for(const l of d.landmarks){
    // The farthest pair establishes the long axis of the original leader prism.
    // Average its end caps, then use the cap nearest the actual surface (not the label).
    const unique=new Map<string,Point3>();
    for(let i=0;i<l.pointer.length;i+=3){const p=l.pointer.slice(i,i+3) as Point3;unique.set(p.join(','),p);}
    const pts=[...unique.values()];
    if(!pts.length)throw Error(`Missing source leader: ${l.id}`);
    let span=0,ends=[pts[0],pts[0]];
    for(const p of pts)for(const q of pts){const s=p.reduce((n,x,k)=>n+(x-q[k])**2,0);if(s>span){span=s;ends=[p,q];}}
    const axis=ends[1].map((v,k)=>v-ends[0][k]);
    const projections=pts.map(p=>p.reduce((s,v,k)=>s+v*axis[k],0));
    const lo=Math.min(...projections),hi=Math.max(...projections);
    const caps=[pts.filter((_,i)=>projections[i]<lo+(hi-lo)*.2),pts.filter((_,i)=>projections[i]>hi-(hi-lo)*.2)];
    const hits=caps.filter(c=>c.length).map(c=>nearestFace([0,1,2].map(k=>c.reduce((s,p)=>s+p[k],0)/c.length) as Point3));
    const seed=hits.sort((x,y)=>x.distance-y.distance)[0];
    if(!seed)throw Error(`Invalid leader: ${l.id}`);
    regions[l.id]=brushFaces(topology,seed.face,topology.centers[seed.face],.08).sort((x,y)=>x-y);
    l.accuracy='approximate';
    l.accuracyNote='Приблизительная зона около исходного указателя Z-Anatomy. Цвет показывает место образования, а не его полный контур; границы и площадь не подтверждены анатомической проверкой.';
  }
  const sourceNeighborhoods=d.landmarks.length;
  // Descriptive orientation sectors only: these do not invent named articular facets.
  const directions=[
    ['left','Участок поверхности, обращённый влево','Facies sinistra'],
    ['right','Участок поверхности, обращённый вправо','Facies dextra'],
    ['superior','Участок поверхности, обращённый вверх','Facies superior'],
    ['inferior','Участок поверхности, обращённый вниз','Facies inferior'],
    ['anterior','Участок поверхности, обращённый вперёд','Facies anterior'],
    ['posterior','Участок поверхности, обращённый назад','Facies posterior'],
  ];
  const groups:number[][]=directions.map(()=>[]);
  for(let f=0;f<count;f++){
    const n=[0,1,2].map(k=>(a[d.vertexCount*3+f*9+k]+a[d.vertexCount*3+f*9+3+k]+a[d.vertexCount*3+f*9+6+k])/3);
    const axis=n.map(Math.abs).indexOf(Math.max(...n.map(Math.abs)));
    groups[axis*2+(n[axis]>=0?0:1)].push(f);
  }
  directions.forEach(([key,ru,la],i)=>{
    if(!groups[i].length)return;
    const id=`${d.id}-direction-zone-${key}`;
    d.landmarks.push({id,en:`${key} facing surface zone`,ru,la,labelPosition:topology.centers[groups[i][0]],pointer:[],source:'editorial',accuracy:'approximate',accuracyNote:'Условный участок по направлению поверхности в анатомическом положении. Это ориентир, а не отдельная именованная анатомическая поверхность. Границы приблизительные; полный перечень образований кости ещё не составлен.'});
    regions[id]=groups[i];
  });
  d.regionHash=hash(buffer);d.regionsUrl=`/models/bone-details/v1/${d.id}.surfaces.json`;
  d.surfaceCoverage='approximate-baseline';row.surfaceCoverage='approximate-baseline';
  row.landmarkCount=d.landmarks.length;row.searchText=d.landmarks.map(l=>`${l.ru} ${l.la} ${l.en}`).join(' ');
  fs.writeFileSync(base+'.json',JSON.stringify(d));
  fs.writeFileSync(base+'.surfaces.json',JSON.stringify({version:1,boneId:d.id,sourceHash:d.regionHash,sourceModelHash:d.sourceHash,method,review:'automatic approximate baseline; not anatomically verified; incomplete landmark inventory',references,regions}));
  report.push({id:d.id,regions:d.landmarks.length,sourceNeighborhoods,directionalZones:d.landmarks.length-sourceNeighborhoods});
}
fs.writeFileSync(`${root}/index.json`,JSON.stringify(index));
fs.writeFileSync(`${root}/surface-coverage.json`,JSON.stringify({models:index.length,previouslyDetailed:index.length-report.length,approximateBaseline:report.length,completeAnatomicalInventory:false,modelsWithoutRegions:index.filter(b=>!fs.existsSync(`${root}/${b.id}.surfaces.json`)).map(b=>b.id),baselineModels:report},null,2)+'\n');
console.log(JSON.stringify({models:index.length,baselineModels:report.length,sourceNeighborhoods:report.reduce((n,b)=>n+b.sourceNeighborhoods,0),directionalZones:report.reduce((n,b)=>n+b.directionalZones,0)}));
