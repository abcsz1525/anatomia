import { approximateSurfaces } from './approximate-surfaces.mjs';
/** Navicular-specific atlas-referenced contours; see content/navicular-surfaces.md. */
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
 let mesh;scene.traverse(n=>{if(n.isMesh&&(n.userData.originalName??n.name)===`Navicular bone.${side}`)mesh=n;});
 const g=mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);g.computeBoundingBox();const center=g.boundingBox.getCenter(new Vector3()),size=g.boundingBox.getSize(new Vector3());
 g.applyMatrix4(new Matrix4().makeScale(...Array(3).fill(2/Math.max(size.x,size.y,size.z))).multiply(new Matrix4().makeTranslation(-center.x,-center.y,-center.z)));
 const pos=g.attributes.position,nor=g.attributes.normal,cart=new Set();
 for(const group of mesh.geometry.groups)if(mesh.material[group.materialIndex].name.startsWith('Cartilage'))for(let f=group.start/3;f<(group.start+group.count)/3;f++)cart.add(f);

 const vertexFaces=new Map(),adj=Array.from({length:pos.count/3},()=>new Set());
 for(let f=0;f<pos.count/3;f++)for(let k=0;k<3;k++){const key=[pos.getX(f*3+k),pos.getY(f*3+k),pos.getZ(f*3+k)].map(x=>x.toFixed(6)).join(',');const a=vertexFaces.get(key)??[];a.push(f);vertexFaces.set(key,a);}
 for(const faces of vertexFaces.values())for(const f of faces)for(const n of faces)adj[f].add(n);
 const cartilageKind=new Map(),todo=new Set(cart),components=[];
 while(todo.size){const q=[todo.values().next().value],comp=[];todo.delete(q[0]);while(q.length){const f=q.pop();comp.push(f);for(const n of adj[f])if(todo.delete(n))q.push(n);}const centroid=[0,1,2].map(a=>comp.reduce((s,f)=>s+pos.array[f*9+a],0)/comp.length);const kind=centroid[2]<0?'talar':'cuneiform';for(const f of comp)cartilageKind.set(f,kind);components.push({kind,count:comp.length});}
 if(components.length!==2||new Set(components.map(c=>c.kind)).size!==2)throw Error('Review navicular cartilage components');
 const positions=[],normals=[],tags=[];
 function emit(v,n,tag){const lengths=[dist(v[0],v[1]),dist(v[1],v[2]),dist(v[2],v[0])];const longest=Math.max(...lengths);if(longest>.04){const a=lengths.indexOf(longest),b=(a+1)%3,c=(a+2)%3;const m=mid(v[a],v[b]),mn=mid(n[a],n[b]);emit([v[a],m,v[c]],[n[a],mn,n[c]],tag);emit([m,v[b],v[c]],[mn,n[b],n[c]],tag);}else{for(let i=0;i<3;i++){positions.push(...v[i]);const len=Math.hypot(...n[i]);normals.push(...n[i].map(x=>x/len));}tags.push(tag);}}
 for(let f=0;f<pos.count/3;f++){let order=mesh.matrixWorld.determinant()<0?[0,2,1]:[0,1,2];emit(order.map(k=>[pos.getX(f*3+k),pos.getY(f*3+k),pos.getZ(f*3+k)]),order.map(k=>[nor.getX(f*3+k),nor.getY(f*3+k),nor.getZ(f*3+k)]),{kind:cartilageKind.get(f)??'bone'});}
 const d=JSON.parse(fs.readFileSync(`${dir}/navicular-bone-${side}.json`));
 const extra=[
 ['talar','Talar articular surface of navicular bone','Суставная поверхность для головки таранной кости','Facies articularis talaris ossis navicularis'],
 ['medial-cuneiform','Facet for medial cuneiform','Суставная поверхность для медиальной клиновидной кости','Facies articularis cuneiformis medialis'],
 ['intermediate-cuneiform','Facet for intermediate cuneiform','Суставная поверхность для промежуточной клиновидной кости','Facies articularis cuneiformis intermedia'],
 ['lateral-cuneiform','Facet for lateral cuneiform','Суставная поверхность для латеральной клиновидной кости','Facies articularis cuneiformis lateralis'],
 ['anterior','Anterior surface of navicular bone','Передняя поверхность ладьевидной кости','Facies anterior ossis navicularis'],
 ['posterior','Posterior surface of navicular bone','Задняя поверхность ладьевидной кости','Facies posterior ossis navicularis'],
 ['dorsal','Dorsal surface of navicular bone','Тыльная поверхность ладьевидной кости','Facies dorsalis ossis navicularis'],
 ['plantar','Plantar surface of navicular bone','Подошвенная поверхность ладьевидной кости','Facies plantaris ossis navicularis'],
 ['medial','Medial surface of navicular bone','Медиальная поверхность ладьевидной кости','Facies medialis ossis navicularis'],
 ['lateral','Lateral surface of navicular bone','Латеральная поверхность ладьевидной кости','Facies lateralis ossis navicularis'],
 ];
 for(const [key,en,ru,la] of extra)if(!d.landmarks.some(l=>l.en===en))d.landmarks.push({id:d.id+'-'+key,en,ru,la,labelPosition:[0,0,0],pointer:[],source:'editorial'});
 d.landmarks=d.landmarks.filter(l=>!l.id.includes('-approx-'));const names=new Map(d.landmarks.map(l=>[l.en,l.id])),regions=Object.fromEntries(d.landmarks.map(l=>[l.id,[]]));
 for(let f=0;f<tags.length;f++){
  const p=[0,1,2].map(a=>(positions[f*9+a]+positions[f*9+3+a]+positions[f*9+6+a])/3);if(side==='r')p[0]*=-1;const [x,y,z]=p;
  const n=[0,1,2].map(a=>(normals[f*9+a]+normals[f*9+3+a]+normals[f*9+6+a])/3);if(side==='r')n[0]*=-1;
  const kind=tags[f].kind;
  const nonarticular=kind==='bone';
  // Two ridges meet near the plantar apex of the intermediate facet. These
  // contours were traced on the anterior mesh in canonical left coordinates.
  const medialEdge=.10+.05*(y+.31);
  const lateralEdge=.10+1.17*Math.max(0,y+.31);
  const medialFacet=kind==='cuneiform'&&x<medialEdge;
  const intermediateFacet=kind==='cuneiform'&&!medialFacet&&y>=-.31&&x<lateralEdge;
  const lateralFacet=kind==='cuneiform'&&!medialFacet&&!intermediateFacet;
  const medial=nonarticular&&n[0]<0&&Math.abs(n[0])>Math.abs(n[1]);
  const lateral=nonarticular&&n[0]>=0&&Math.abs(n[0])>Math.abs(n[1]);
  const dorsal=nonarticular&&!medial&&!lateral&&n[1]>=0;
  const plantar=nonarticular&&!medial&&!lateral&&n[1]<0;
  const masks={
   'Tuberosity of navicular bone':nonarticular&&x<-.54&&y<-.20&&z<.12,
   'Talar articular surface of navicular bone':kind==='talar',
   'Facet for medial cuneiform':medialFacet,
   'Facet for intermediate cuneiform':intermediateFacet,
   'Facet for lateral cuneiform':lateralFacet,
   'Anterior surface of navicular bone':kind==='cuneiform',
   'Posterior surface of navicular bone':kind==='talar',
   'Dorsal surface of navicular bone':dorsal,
   'Plantar surface of navicular bone':plantar,
   'Medial surface of navicular bone':medial,
   'Lateral surface of navicular bone':lateral,
  };
  for(const [name,yes] of Object.entries(masks))if(yes){const id=names.get(name);if(!id)throw Error(`Unknown ${name}`);regions[id].push(f);}
 }
 for(const [id,faces] of Object.entries(regions))if(!faces.length)throw Error(`Empty ${id}`);
 for(const l of d.landmarks.filter(l=>l.source==='editorial')){const faces=regions[l.id],f=faces[Math.floor(faces.length/2)];l.labelPosition=[0,1,2].map(a=>(positions[f*9+a]+positions[f*9+3+a]+positions[f*9+6+a])/3);}
 const binary=Buffer.concat([Buffer.from(new Float32Array(positions).buffer),Buffer.from(new Float32Array(normals).buffer)]),hash=crypto.createHash('sha256').update(binary).digest('hex');
 fs.writeFileSync(`${dir}/navicular-bone-${side}.bin`,binary);d.vertexCount=positions.length/3;d.regionHash=hash;d.regionsUrl=`/models/bone-details/v1/navicular-bone-${side}.surfaces.json`;
 fs.writeFileSync(`${dir}/navicular-bone-${side}.json`,JSON.stringify(d));
 fs.writeFileSync(`${dir}/navicular-bone-${side}.surfaces.json`,JSON.stringify({version:1,boneId:d.id,sourceHash:hash,sourceModelHash:fbxHash,method:'editorial-contours-and-authored-cartilage',review:'atlas-referenced; not independently expert-reviewed',references:['https://www.kenhub.com/en/library/anatomy/navicular-bone','https://anatomy.app/encyclopedia/navicular-bone'],regions}));
 report.push({bone:d.id,triangles:tags.length,components,regions:Object.fromEntries(d.landmarks.map(l=>[l.en,regions[l.id].length]))});g.dispose();
}
fs.writeFileSync('../.anatomy-source/navicular-surface-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));

const index=JSON.parse(fs.readFileSync(dir+'/index.json'));for(const bone of index)if(['navicular-bone-l','navicular-bone-r'].includes(bone.id)){const d=JSON.parse(fs.readFileSync(dir+'/'+bone.id+'.json'));bone.landmarkCount=d.landmarks.length;bone.searchText=d.landmarks.map(l=>l.ru+' '+l.la+' '+l.en).join(' ');}fs.writeFileSync(dir+'/index.json',JSON.stringify(index));


approximateSurfaces('navicular-bone');
