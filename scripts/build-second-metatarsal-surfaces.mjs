/** Second metatarsal-specific atlas-referenced contours; see content/second-metatarsal-surfaces.md. */
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
 let mesh;scene.traverse(n=>{if(n.isMesh&&(n.userData.originalName??n.name)===`Second metatarsal bone.${side}`)mesh=n;});
 const g=mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);g.computeBoundingBox();const center=g.boundingBox.getCenter(new Vector3()),size=g.boundingBox.getSize(new Vector3());
 g.applyMatrix4(new Matrix4().makeScale(...Array(3).fill(2/Math.max(size.x,size.y,size.z))).multiply(new Matrix4().makeTranslation(-center.x,-center.y,-center.z)));
 const pos=g.attributes.position,nor=g.attributes.normal,cart=new Set();
 for(const group of mesh.geometry.groups)if(mesh.material[group.materialIndex].name.startsWith('Cartilage'))for(let f=group.start/3;f<(group.start+group.count)/3;f++)cart.add(f);

 const components=[{kind:'source-cartilage',count:cart.size}];
 const positions=[],normals=[],tags=[];
 function emit(v,n,tag){const lengths=[dist(v[0],v[1]),dist(v[1],v[2]),dist(v[2],v[0])];const longest=Math.max(...lengths);if(longest>.04){const a=lengths.indexOf(longest),b=(a+1)%3,c=(a+2)%3;const m=mid(v[a],v[b]),mn=mid(n[a],n[b]);emit([v[a],m,v[c]],[n[a],mn,n[c]],tag);emit([m,v[b],v[c]],[mn,n[b],n[c]],tag);}else{for(let i=0;i<3;i++){positions.push(...v[i]);const len=Math.hypot(...n[i]);normals.push(...n[i].map(x=>x/len));}tags.push(tag);}}
 for(let f=0;f<pos.count/3;f++){let order=mesh.matrixWorld.determinant()<0?[0,2,1]:[0,1,2];emit(order.map(k=>[pos.getX(f*3+k),pos.getY(f*3+k),pos.getZ(f*3+k)]),order.map(k=>[nor.getX(f*3+k),nor.getY(f*3+k),nor.getZ(f*3+k)]),{kind:cart.has(f)?'cartilage':'bone'});}
 const d=JSON.parse(fs.readFileSync(`${dir}/second-metatarsal-bone-${side}.json`));
 const terms=[
 ['base','Base of second metatarsal','Основание II плюсневой кости','Basis ossis metatarsalis secundi'],
 ['body','Body of second metatarsal','Тело II плюсневой кости','Corpus ossis metatarsalis secundi'],
 ['neck','Neck of second metatarsal','Шейка II плюсневой кости','Collum ossis metatarsalis secundi'],
 ['head','Head of second metatarsal','Головка II плюсневой кости','Caput ossis metatarsalis secundi'],
 ['proximal-facet','Intermediate cuneiform facet of second metatarsal','Суставная поверхность для промежуточной клиновидной кости','Facies articularis ossis cuneiformis intermedii'],
 ['head-articular','Articular surface of second metatarsal head','Суставная поверхность головки II плюсневой кости','Facies articularis capitis ossis metatarsalis secundi'],
 ['medial-cuneiform','Medial cuneiform facet of second metatarsal','Суставная поверхность для медиальной клиновидной кости','Facies articularis ossis cuneiformis medialis'],
 ['lateral-cuneiform','Lateral cuneiform facet of second metatarsal','Суставная поверхность для латеральной клиновидной кости','Facies articularis ossis cuneiformis lateralis'],
 ['third-facet','Third metatarsal facet of second metatarsal','Суставная поверхность для III плюсневой кости','Facies articularis ossis metatarsalis tertii'],
 ['first-facet','First metatarsal facet of second metatarsal','Суставная фасетка для I плюсневой кости (вариант)','Facies articularis ossis metatarsalis primi'],
 ['anterior','Distal surface of second metatarsal','Передняя (дистальная) поверхность II плюсневой кости','Facies distalis ossis metatarsalis secundi'],
 ['posterior','Proximal surface of second metatarsal','Задняя (проксимальная) поверхность II плюсневой кости','Facies proximalis ossis metatarsalis secundi'],
 ['dorsal','Dorsal surface of second metatarsal','Тыльная поверхность II плюсневой кости','Facies dorsalis ossis metatarsalis secundi'],
 ['plantar','Plantar surface of second metatarsal','Подошвенная поверхность II плюсневой кости','Facies plantaris ossis metatarsalis secundi'],
 ['medial','Medial surface of second metatarsal','Медиальная поверхность II плюсневой кости','Facies medialis ossis metatarsalis secundi'],
 ['lateral','Lateral surface of second metatarsal','Латеральная поверхность II плюсневой кости','Facies lateralis ossis metatarsalis secundi'],
 ];
 d.landmarks=terms.map(([key,en,ru,la])=>({id:d.id+'-'+key,en,ru,la,labelPosition:[0,0,0],pointer:[],source:'editorial',...(['head-articular'].includes(key)?{}:{accuracy:'approximate',accuracyNote:key==='first-facet'?'Условное расположение вариантной фасетки по атласу. Её наличие на исходной модели не подтверждено.':'Приблизительный контур по атласу на сглаженной модели. Граница не является точной анатомической сегментацией.'})}));
 const names=new Map(d.landmarks.map(l=>[l.en,l.id])),regions=Object.fromEntries(d.landmarks.map(l=>[l.id,[]]));
 for(let f=0;f<tags.length;f++){
  const p=[0,1,2].map(a=>(positions[f*9+a]+positions[f*9+3+a]+positions[f*9+6+a])/3);if(side==='r')p[0]*=-1;const [x,y,z]=p;
  const n=[0,1,2].map(a=>(normals[f*9+a]+normals[f*9+3+a]+normals[f*9+6+a])/3);if(side==='r')n[0]*=-1;
  const kind=tags[f].kind;
  // Oblique long axis, matching the foot's source pose. Basal cartilage
  // wraps around both sides; facet boundaries below are editorial estimates.
  const t=(z-.5*y)/Math.sqrt(1.25),up=(n[1]+.5*n[2])/Math.sqrt(1.25);
  const basal=kind==='cartilage'&&z<0,distal=kind==='cartilage'&&z>0;
  const base=basal||t<-.65,head=distal||t>.70,neck=!head&&t>.47,body=!base&&!head&&!neck;
  const backFacing=basal&&(n[2]-.5*n[1])<-.55;
  const medialFacet=basal&&!backFacing&&n[0]<-.40;
  const lateralBasal=basal&&!backFacing&&!medialFacet&&n[0]>.40;
  const lateralCuneiform=lateralBasal&&z<-.82;
  const third=lateralBasal&&!lateralCuneiform;
  const proximal=basal&&!medialFacet&&!lateralBasal;
  const nonarticular=kind==='bone';
  const medial=medialFacet||(nonarticular&&n[0]<0&&Math.abs(n[0])>Math.abs(up));
  const lateral=lateralBasal||(nonarticular&&n[0]>=0&&Math.abs(n[0])>Math.abs(up));
  const dorsal=nonarticular&&!medial&&!lateral&&up>=0,plantar=nonarticular&&!medial&&!lateral&&up<0;
  const masks={
   'Base of second metatarsal':base,'Body of second metatarsal':body,'Neck of second metatarsal':neck,'Head of second metatarsal':head,
   'Intermediate cuneiform facet of second metatarsal':proximal,'Articular surface of second metatarsal head':distal,
   'Medial cuneiform facet of second metatarsal':medialFacet,
   'Lateral cuneiform facet of second metatarsal':lateralCuneiform,
   'Third metatarsal facet of second metatarsal':third,
   'First metatarsal facet of second metatarsal':nonarticular&&base&&medial&&z>-.78&&z<-.60&&y>.20,
   'Distal surface of second metatarsal':distal,'Proximal surface of second metatarsal':proximal,
   'Dorsal surface of second metatarsal':dorsal,'Plantar surface of second metatarsal':plantar,'Medial surface of second metatarsal':medial,'Lateral surface of second metatarsal':lateral,
  };
  for(const [name,yes] of Object.entries(masks))if(yes){const id=names.get(name);if(!id)throw Error(`Unknown ${name}`);regions[id].push(f);}
 }
 for(const [id,faces] of Object.entries(regions))if(!faces.length)throw Error(`Empty ${id}`);
 for(const l of d.landmarks.filter(l=>l.source==='editorial')){const faces=regions[l.id],f=faces[Math.floor(faces.length/2)];l.labelPosition=[0,1,2].map(a=>(positions[f*9+a]+positions[f*9+3+a]+positions[f*9+6+a])/3);}
 const binary=Buffer.concat([Buffer.from(new Float32Array(positions).buffer),Buffer.from(new Float32Array(normals).buffer)]),hash=crypto.createHash('sha256').update(binary).digest('hex');
 fs.writeFileSync(`${dir}/second-metatarsal-bone-${side}.bin`,binary);d.vertexCount=positions.length/3;d.regionHash=hash;d.regionsUrl=`/models/bone-details/v1/second-metatarsal-bone-${side}.surfaces.json`;
 fs.writeFileSync(`${dir}/second-metatarsal-bone-${side}.json`,JSON.stringify(d));
 fs.writeFileSync(`${dir}/second-metatarsal-bone-${side}.surfaces.json`,JSON.stringify({version:1,boneId:d.id,sourceHash:hash,sourceModelHash:fbxHash,method:'editorial-contours-and-authored-cartilage',review:'atlas-referenced; not independently expert-reviewed',references:['https://www.kenhub.com/en/library/anatomy/metatarsal-bones','https://www.elsevier.com/resources/anatomy/skeletal-system/appendicular-skeleton/distal-articular-facet-of-second-metatarsal-bone/20923'],regions}));
 report.push({bone:d.id,triangles:tags.length,components,regions:Object.fromEntries(d.landmarks.map(l=>[l.en,regions[l.id].length]))});g.dispose();
}
fs.writeFileSync('../.anatomy-source/second-metatarsal-surface-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));

const index=JSON.parse(fs.readFileSync(dir+'/index.json'));for(const bone of index)if(['second-metatarsal-bone-l','second-metatarsal-bone-r'].includes(bone.id)){const d=JSON.parse(fs.readFileSync(dir+'/'+bone.id+'.json'));bone.landmarkCount=d.landmarks.length;bone.searchText=d.landmarks.map(l=>l.ru+' '+l.la+' '+l.en).join(' ');}fs.writeFileSync(dir+'/index.json',JSON.stringify(index));
