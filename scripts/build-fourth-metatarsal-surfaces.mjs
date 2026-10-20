/** Fourth metatarsal-specific atlas-referenced contours; see content/fourth-metatarsal-surfaces.md. */
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
 let mesh;scene.traverse(n=>{if(n.isMesh&&(n.userData.originalName??n.name)===`Fourth metatarsal bone.${side}`)mesh=n;});
 const g=mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);g.computeBoundingBox();const center=g.boundingBox.getCenter(new Vector3()),size=g.boundingBox.getSize(new Vector3());
 g.applyMatrix4(new Matrix4().makeScale(...Array(3).fill(2/Math.max(size.x,size.y,size.z))).multiply(new Matrix4().makeTranslation(-center.x,-center.y,-center.z)));
 const pos=g.attributes.position,nor=g.attributes.normal,cart=new Set();
 for(const group of mesh.geometry.groups)if(mesh.material[group.materialIndex].name.startsWith('Cartilage'))for(let f=group.start/3;f<(group.start+group.count)/3;f++)cart.add(f);

 const components=[{kind:'source-cartilage',count:cart.size}];
 const positions=[],normals=[],tags=[];
 function emit(v,n,tag){const lengths=[dist(v[0],v[1]),dist(v[1],v[2]),dist(v[2],v[0])];const longest=Math.max(...lengths);if(longest>.04){const a=lengths.indexOf(longest),b=(a+1)%3,c=(a+2)%3;const m=mid(v[a],v[b]),mn=mid(n[a],n[b]);emit([v[a],m,v[c]],[n[a],mn,n[c]],tag);emit([m,v[b],v[c]],[mn,n[b],n[c]],tag);}else{for(let i=0;i<3;i++){positions.push(...v[i]);const len=Math.hypot(...n[i]);normals.push(...n[i].map(x=>x/len));}tags.push(tag);}}
 for(let f=0;f<pos.count/3;f++){let order=mesh.matrixWorld.determinant()<0?[0,2,1]:[0,1,2];emit(order.map(k=>[pos.getX(f*3+k),pos.getY(f*3+k),pos.getZ(f*3+k)]),order.map(k=>[nor.getX(f*3+k),nor.getY(f*3+k),nor.getZ(f*3+k)]),{kind:cart.has(f)?'cartilage':'bone'});}
 const d=JSON.parse(fs.readFileSync(`${dir}/fourth-metatarsal-bone-${side}.json`));
 const terms=[
 ['base','Base of fourth metatarsal','Основание IV плюсневой кости','Basis ossis metatarsalis quarti'],
 ['body','Body of fourth metatarsal','Тело IV плюсневой кости','Corpus ossis metatarsalis quarti'],
 ['neck','Neck of fourth metatarsal','Шейка IV плюсневой кости','Collum ossis metatarsalis quarti'],
 ['head','Head of fourth metatarsal','Головка IV плюсневой кости','Caput ossis metatarsalis quarti'],
 ['proximal-facet','Cuboid facet of fourth metatarsal','Суставная поверхность для кубовидной кости','Facies articularis ossis cuboidei'],
 ['head-articular','Articular surface of fourth metatarsal head','Суставная поверхность головки IV плюсневой кости','Facies articularis capitis ossis metatarsalis quarti'],
 ['lateral-cuneiform','Lateral cuneiform facet of fourth metatarsal','Суставная поверхность для латеральной клиновидной кости','Facies articularis ossis cuneiformis lateralis'],
 ['third-facet','Third metatarsal facet of fourth metatarsal','Суставная поверхность для III плюсневой кости','Facies articularis ossis metatarsalis tertii'],
 ['fifth-facet','Fifth metatarsal facet of fourth metatarsal','Суставная поверхность для V плюсневой кости','Facies articularis ossis metatarsalis quinti'],
 ['anterior','Distal surface of fourth metatarsal','Передняя (дистальная) поверхность IV плюсневой кости','Facies distalis ossis metatarsalis quarti'],
 ['posterior','Proximal surface of fourth metatarsal','Задняя (проксимальная) поверхность IV плюсневой кости','Facies proximalis ossis metatarsalis quarti'],
 ['dorsal','Dorsal surface of fourth metatarsal','Тыльная поверхность IV плюсневой кости','Facies dorsalis ossis metatarsalis quarti'],
 ['plantar','Plantar surface of fourth metatarsal','Подошвенная поверхность IV плюсневой кости','Facies plantaris ossis metatarsalis quarti'],
 ['medial','Medial surface of fourth metatarsal','Медиальная поверхность IV плюсневой кости','Facies medialis ossis metatarsalis quarti'],
 ['lateral','Lateral surface of fourth metatarsal','Латеральная поверхность IV плюсневой кости','Facies lateralis ossis metatarsalis quarti'],
 ];
 d.landmarks=terms.map(([key,en,ru,la])=>({id:d.id+'-'+key,en,ru,la,labelPosition:[0,0,0],pointer:[],source:'editorial',...(['proximal-facet','head-articular'].includes(key)?{}:{accuracy:'approximate',accuracyNote:'Приблизительный контур по атласу на сглаженной модели. Граница не является точной анатомической сегментацией.'})}));
 const names=new Map(d.landmarks.map(l=>[l.en,l.id])),regions=Object.fromEntries(d.landmarks.map(l=>[l.id,[]]));
 for(let f=0;f<tags.length;f++){
  const p=[0,1,2].map(a=>(positions[f*9+a]+positions[f*9+3+a]+positions[f*9+6+a])/3);if(side==='r')p[0]*=-1;const [x,y,z]=p;
  const n=[0,1,2].map(a=>(normals[f*9+a]+normals[f*9+3+a]+normals[f*9+6+a])/3);if(side==='r')n[0]*=-1;
  const kind=tags[f].kind;
  const t=(z-.4*y)/Math.sqrt(1.16),up=(n[1]+.4*n[2])/Math.sqrt(1.16);
  const proximal=kind==='cartilage'&&z<0,distal=kind==='cartilage'&&z>0;
  const base=proximal||t<-.57,head=distal||t>.68,neck=!head&&t>.45,body=!base&&!head&&!neck;
  const nonarticular=kind==='bone';
  const medial=nonarticular&&n[0]<0&&Math.abs(n[0])>Math.abs(up);
  const lateral=nonarticular&&n[0]>=0&&Math.abs(n[0])>Math.abs(up);
  const dorsal=nonarticular&&!medial&&!lateral&&up>=0,plantar=nonarticular&&!medial&&!lateral&&up<0;
  // The source lacks separate side cartilage. These small basal contact
  // areas are schematic, explicitly marked approximate in the UI.
  const medialPatch=base&&medial&&z<-.55&&z>-.80&&y>.16;
  const masks={
   'Base of fourth metatarsal':base,'Body of fourth metatarsal':body,'Neck of fourth metatarsal':neck,'Head of fourth metatarsal':head,
   'Cuboid facet of fourth metatarsal':proximal,'Articular surface of fourth metatarsal head':distal,
   'Lateral cuneiform facet of fourth metatarsal':medialPatch&&z<-.72,
   'Third metatarsal facet of fourth metatarsal':medialPatch&&z>-.70,
   'Fifth metatarsal facet of fourth metatarsal':base&&lateral&&z<-.65&&z>-.88&&y>.15,
   'Distal surface of fourth metatarsal':distal,'Proximal surface of fourth metatarsal':proximal,
   'Dorsal surface of fourth metatarsal':dorsal,'Plantar surface of fourth metatarsal':plantar,'Medial surface of fourth metatarsal':medial,'Lateral surface of fourth metatarsal':lateral,
  };
  for(const [name,yes] of Object.entries(masks))if(yes){const id=names.get(name);if(!id)throw Error(`Unknown ${name}`);regions[id].push(f);}
 }
 for(const [id,faces] of Object.entries(regions))if(!faces.length)throw Error(`Empty ${id}`);
 for(const l of d.landmarks.filter(l=>l.source==='editorial')){const faces=regions[l.id],f=faces[Math.floor(faces.length/2)];l.labelPosition=[0,1,2].map(a=>(positions[f*9+a]+positions[f*9+3+a]+positions[f*9+6+a])/3);}
 const binary=Buffer.concat([Buffer.from(new Float32Array(positions).buffer),Buffer.from(new Float32Array(normals).buffer)]),hash=crypto.createHash('sha256').update(binary).digest('hex');
 fs.writeFileSync(`${dir}/fourth-metatarsal-bone-${side}.bin`,binary);d.vertexCount=positions.length/3;d.regionHash=hash;d.regionsUrl=`/models/bone-details/v1/fourth-metatarsal-bone-${side}.surfaces.json`;
 fs.writeFileSync(`${dir}/fourth-metatarsal-bone-${side}.json`,JSON.stringify(d));
 fs.writeFileSync(`${dir}/fourth-metatarsal-bone-${side}.surfaces.json`,JSON.stringify({version:1,boneId:d.id,sourceHash:hash,sourceModelHash:fbxHash,method:'editorial-contours-and-authored-cartilage',review:'atlas-referenced; not independently expert-reviewed',references:['https://www.kenhub.com/en/library/anatomy/metatarsal-bones','https://www.elsevier.com/resources/anatomy/skeletal-system/appendicular-skeleton/fourth-metatarsal-bone/21104'],regions}));
 report.push({bone:d.id,triangles:tags.length,components,regions:Object.fromEntries(d.landmarks.map(l=>[l.en,regions[l.id].length]))});g.dispose();
}
fs.writeFileSync('../.anatomy-source/fourth-metatarsal-surface-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));

const index=JSON.parse(fs.readFileSync(dir+'/index.json'));for(const bone of index)if(['fourth-metatarsal-bone-l','fourth-metatarsal-bone-r'].includes(bone.id)){const d=JSON.parse(fs.readFileSync(dir+'/'+bone.id+'.json'));bone.landmarkCount=d.landmarks.length;bone.searchText=d.landmarks.map(l=>l.ru+' '+l.la+' '+l.en).join(' ');}fs.writeFileSync(dir+'/index.json',JSON.stringify(index));
