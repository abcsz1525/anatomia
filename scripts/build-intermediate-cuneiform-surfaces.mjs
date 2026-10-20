/** Intermediate cuneiform-specific atlas-referenced contours; see content/intermediate-cuneiform-surfaces.md. */
import fs from 'node:fs';
import crypto from 'node:crypto';
import {FBXLoader} from 'three/examples/jsm/loaders/FBXLoader.js';
import {Vector3,Matrix4} from 'three';
const dir='public/models/bone-details/v1';
const raw=fs.readFileSync('../.anatomy-source/SkeletalSystem100.fbx');
const fbxHash=crypto.createHash('sha256').update(raw).digest('hex');
if(fbxHash!=='294a649765cd060a62a4095da52b9c8ef2d97769aa447e196448aa5f7d596dea')throw Error('Unexpected source');
const scene=new FBXLoader().parse(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength),'');scene.updateMatrixWorld(true);
const dist=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
const mid=(a,b)=>a.map((x,i)=>(x+b[i])/2);
const report=[];
for(const side of ['l','r']){
 let mesh;scene.traverse(n=>{if(n.isMesh&&(n.userData.originalName??n.name)===`Intermediate cuneiform bone.${side}`)mesh=n;});
 const g=mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);g.computeBoundingBox();const center=g.boundingBox.getCenter(new Vector3()),size=g.boundingBox.getSize(new Vector3());
 g.applyMatrix4(new Matrix4().makeScale(...Array(3).fill(2/Math.max(size.x,size.y,size.z))).multiply(new Matrix4().makeTranslation(-center.x,-center.y,-center.z)));
 const pos=g.attributes.position,nor=g.attributes.normal,cart=new Set();
 for(const group of mesh.geometry.groups)if(mesh.material[group.materialIndex].name.startsWith('Cartilage'))for(let f=group.start/3;f<(group.start+group.count)/3;f++)cart.add(f);

 const components=[{kind:'continuous-cartilage',count:cart.size}];
 const positions=[],normals=[],tags=[];
 function emit(v,n,tag){const lengths=[dist(v[0],v[1]),dist(v[1],v[2]),dist(v[2],v[0])];const longest=Math.max(...lengths);if(longest>.04){const a=lengths.indexOf(longest),b=(a+1)%3,c=(a+2)%3;const m=mid(v[a],v[b]),mn=mid(n[a],n[b]);emit([v[a],m,v[c]],[n[a],mn,n[c]],tag);emit([m,v[b],v[c]],[mn,n[b],n[c]],tag);}else{for(let i=0;i<3;i++){positions.push(...v[i]);const len=Math.hypot(...n[i]);normals.push(...n[i].map(x=>x/len));}tags.push(tag);}}
 for(let f=0;f<pos.count/3;f++){let order=mesh.matrixWorld.determinant()<0?[0,2,1]:[0,1,2];emit(order.map(k=>[pos.getX(f*3+k),pos.getY(f*3+k),pos.getZ(f*3+k)]),order.map(k=>[nor.getX(f*3+k),nor.getY(f*3+k),nor.getZ(f*3+k)]),{kind:cart.has(f)?'cartilage':'bone'});}
 const d=JSON.parse(fs.readFileSync(`${dir}/intermediate-cuneiform-bone-${side}.json`));
 const terms=[
 ['navicular','Navicular facet of intermediate cuneiform','Суставная поверхность для ладьевидной кости','Facies articularis navicularis ossis cuneiformis intermedii'],
 ['second-metatarsal','Second metatarsal facet of intermediate cuneiform','Суставная поверхность для II плюсневой кости','Facies articularis ossis metatarsalis secundi'],
 ['medial-cuneiform','Medial cuneiform facet of intermediate cuneiform','Суставная поверхность для медиальной клиновидной кости','Facies articularis ossis cuneiformis medialis'],
 ['lateral-cuneiform','Lateral cuneiform facet of intermediate cuneiform','Суставная поверхность для латеральной клиновидной кости','Facies articularis ossis cuneiformis lateralis'],
 ['anterior','Anterior surface of intermediate cuneiform','Передняя (дистальная) поверхность промежуточной клиновидной кости','Facies anterior ossis cuneiformis intermedii'],
 ['posterior','Posterior surface of intermediate cuneiform','Задняя (проксимальная) поверхность промежуточной клиновидной кости','Facies posterior ossis cuneiformis intermedii'],
 ['dorsal','Dorsal surface of intermediate cuneiform','Тыльная поверхность промежуточной клиновидной кости','Facies dorsalis ossis cuneiformis intermedii'],
 ['plantar','Plantar surface of intermediate cuneiform','Подошвенная поверхность промежуточной клиновидной кости','Facies plantaris ossis cuneiformis intermedii'],
 ['medial','Medial surface of intermediate cuneiform','Медиальная поверхность промежуточной клиновидной кости','Facies medialis ossis cuneiformis intermedii'],
 ['lateral','Lateral surface of intermediate cuneiform','Латеральная поверхность промежуточной клиновидной кости','Facies lateralis ossis cuneiformis intermedii'],
 ];
 d.landmarks=terms.map(([key,en,ru,la])=>({id:d.id+'-'+key,en,ru,la,labelPosition:[0,0,0],pointer:[],source:'editorial'}));
 const names=new Map(d.landmarks.map(l=>[l.en,l.id])),regions=Object.fromEntries(d.landmarks.map(l=>[l.id,[]]));
 for(let f=0;f<tags.length;f++){
  const p=[0,1,2].map(a=>(positions[f*9+a]+positions[f*9+3+a]+positions[f*9+6+a])/3);if(side==='r')p[0]*=-1;const [x,y,z]=p;
  const n=[0,1,2].map(a=>(normals[f*9+a]+normals[f*9+3+a]+normals[f*9+6+a])/3);if(side==='r')n[0]*=-1;
  const kind=tags[f].kind;
  // Authored boundaries follow the posterior and distal ridges of the single
  // cartilage sheet; adjacent bones were used as orientation references.
  const navicular=kind==='cartilage'&&z<-.25&&n[0]<.45;
  const distal=kind==='cartilage'&&!navicular&&z>.05&&n[2]>.25;
  const lateralFacet=kind==='cartilage'&&!navicular&&!distal;
  const nonarticular=kind==='bone';
  const medial=nonarticular&&n[0]<0&&Math.abs(n[0])>Math.abs(n[1]);
  // The source has no separate medial cartilage material. This L-shaped
  // dorsal/proximal facet is an editorial reconstruction, not a measured edge.
  const medialFacet=medial&&n[0]<-.35&&(y>.30+.12*z||z<-.32+.12*y);
  const lateral=lateralFacet||(nonarticular&&n[0]>=0&&Math.abs(n[0])>Math.abs(n[1]));
  const dorsal=nonarticular&&!medial&&!lateral&&n[1]>=0;
  const plantar=nonarticular&&!medial&&!lateral&&n[1]<0;
  const masks={
   'Navicular facet of intermediate cuneiform':navicular,
   'Second metatarsal facet of intermediate cuneiform':distal,
   'Medial cuneiform facet of intermediate cuneiform':medialFacet,
   'Lateral cuneiform facet of intermediate cuneiform':lateralFacet,
   'Anterior surface of intermediate cuneiform':distal,
   'Posterior surface of intermediate cuneiform':navicular,
   'Dorsal surface of intermediate cuneiform':dorsal,
   'Plantar surface of intermediate cuneiform':plantar,
   'Medial surface of intermediate cuneiform':medial,
   'Lateral surface of intermediate cuneiform':lateral,
  };
  for(const [name,yes] of Object.entries(masks))if(yes){const id=names.get(name);if(!id)throw Error(`Unknown ${name}`);regions[id].push(f);}
 }
 for(const [id,faces] of Object.entries(regions))if(!faces.length)throw Error(`Empty ${id}`);
 for(const l of d.landmarks.filter(l=>l.source==='editorial')){const faces=regions[l.id],f=faces[Math.floor(faces.length/2)];l.labelPosition=[0,1,2].map(a=>(positions[f*9+a]+positions[f*9+3+a]+positions[f*9+6+a])/3);}
 const binary=Buffer.concat([Buffer.from(new Float32Array(positions).buffer),Buffer.from(new Float32Array(normals).buffer)]),hash=crypto.createHash('sha256').update(binary).digest('hex');
 fs.writeFileSync(`${dir}/intermediate-cuneiform-bone-${side}.bin`,binary);d.vertexCount=positions.length/3;d.regionHash=hash;d.regionsUrl=`/models/bone-details/v1/intermediate-cuneiform-bone-${side}.surfaces.json`;
 fs.writeFileSync(`${dir}/intermediate-cuneiform-bone-${side}.json`,JSON.stringify(d));
 fs.writeFileSync(`${dir}/intermediate-cuneiform-bone-${side}.surfaces.json`,JSON.stringify({version:1,boneId:d.id,sourceHash:hash,sourceModelHash:fbxHash,method:'editorial-contours-and-authored-cartilage',review:'atlas-referenced; not independently expert-reviewed',references:['https://www.kenhub.com/en/library/anatomy/cuneiform-bones','https://www.elsevier.com/resources/anatomy/skeletal-system/appendicular-skeleton/intermediate-cuneiform-bone/24987'],regions}));
 report.push({bone:d.id,triangles:tags.length,components,regions:Object.fromEntries(d.landmarks.map(l=>[l.en,regions[l.id].length]))});g.dispose();
}
fs.writeFileSync('../.anatomy-source/intermediate-cuneiform-surface-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));

const index=JSON.parse(fs.readFileSync(dir+'/index.json'));for(const bone of index)if(['intermediate-cuneiform-bone-l','intermediate-cuneiform-bone-r'].includes(bone.id)){const d=JSON.parse(fs.readFileSync(dir+'/'+bone.id+'.json'));bone.landmarkCount=d.landmarks.length;bone.searchText=d.landmarks.map(l=>l.ru+' '+l.la+' '+l.en).join(' ');}fs.writeFileSync(dir+'/index.json',JSON.stringify(index));
