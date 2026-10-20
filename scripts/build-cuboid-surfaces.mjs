import { approximateSurfaces } from './approximate-surfaces.mjs';
/** Cuboid-specific atlas-referenced contours; see content/cuboid-surfaces.md. */
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
function polygon(x,y,points){let inside=false;for(let i=0,j=points.length-1;i<points.length;j=i++) {const [a,b]=points[i],[c,d]=points[j];if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)inside=!inside;}return inside;}
function ribbon(p,points,width){for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],d=b.map((v,k)=>v-a[k]);const t=Math.max(0,Math.min(1,p.reduce((s,v,k)=>s+(v-a[k])*d[k],0)/d.reduce((s,v)=>s+v*v,0)));if(dist(p,a.map((v,k)=>v+t*d[k]))<=width)return true;}return false;}

const report=[];
for(const side of ['l','r']){
 let mesh;scene.traverse(n=>{if(n.isMesh&&(n.userData.originalName??n.name)===`Cuboid bone.${side}`)mesh=n;});
 const g=mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);g.computeBoundingBox();const center=g.boundingBox.getCenter(new Vector3()),size=g.boundingBox.getSize(new Vector3());
 g.applyMatrix4(new Matrix4().makeScale(...Array(3).fill(2/Math.max(size.x,size.y,size.z))).multiply(new Matrix4().makeTranslation(-center.x,-center.y,-center.z)));
 const pos=g.attributes.position,nor=g.attributes.normal,cart=new Set();
 for(const group of mesh.geometry.groups)if(mesh.material[group.materialIndex].name.startsWith('Cartilage'))for(let f=group.start/3;f<(group.start+group.count)/3;f++)cart.add(f);

 const vertexFaces=new Map(),adj=Array.from({length:pos.count/3},()=>new Set());
 for(let f=0;f<pos.count/3;f++)for(let k=0;k<3;k++){const key=[pos.getX(f*3+k),pos.getY(f*3+k),pos.getZ(f*3+k)].map(x=>x.toFixed(6)).join(',');const a=vertexFaces.get(key)??[];a.push(f);vertexFaces.set(key,a);}
 for(const faces of vertexFaces.values())for(const f of faces)for(const n of faces)adj[f].add(n);
 const cartilageKind=new Map(),todo=new Set(cart),components=[];
 while(todo.size){const q=[todo.values().next().value],comp=[];todo.delete(q[0]);while(q.length){const f=q.pop();comp.push(f);for(const n of adj[f])if(todo.delete(n))q.push(n);}const centroid=[0,1,2].map(a=>comp.reduce((s,f)=>s+pos.array[f*9+a],0)/comp.length);const kind=centroid[2]<0?'calcaneal':centroid[1]<0?'metatarsal':'cuneiform';for(const f of comp)cartilageKind.set(f,kind);components.push({kind,count:comp.length});}
 if(components.length!==3||new Set(components.map(c=>c.kind)).size!==3)throw Error('Review cuboid cartilage components');
 const positions=[],normals=[],tags=[];
 function emit(v,n,tag){const lengths=[dist(v[0],v[1]),dist(v[1],v[2]),dist(v[2],v[0])];const longest=Math.max(...lengths);if(longest>.04){const a=lengths.indexOf(longest),b=(a+1)%3,c=(a+2)%3;const m=mid(v[a],v[b]),mn=mid(n[a],n[b]);emit([v[a],m,v[c]],[n[a],mn,n[c]],tag);emit([m,v[b],v[c]],[mn,n[b],n[c]],tag);}else{for(let i=0;i<3;i++){positions.push(...v[i]);const len=Math.hypot(...n[i]);normals.push(...n[i].map(x=>x/len));}tags.push(tag);}}
 for(let f=0;f<pos.count/3;f++){let order=mesh.matrixWorld.determinant()<0?[0,2,1]:[0,1,2];emit(order.map(k=>[pos.getX(f*3+k),pos.getY(f*3+k),pos.getZ(f*3+k)]),order.map(k=>[nor.getX(f*3+k),nor.getY(f*3+k),nor.getZ(f*3+k)]),{kind:cartilageKind.get(f)??'bone'});}
 const d=JSON.parse(fs.readFileSync(`${dir}/cuboid-bone-${side}.json`));
 const extra=[
 ['calcaneal','Calcaneal articular surface of cuboid','Суставная поверхность для пяточной кости','Facies articularis calcanea ossis cuboidei'],
 ['fourth-metatarsal','Facet for fourth metatarsal','Суставная поверхность для IV плюсневой кости','Facies articularis ossis metatarsalis quarti'],
 ['fifth-metatarsal','Facet for fifth metatarsal','Суставная поверхность для V плюсневой кости','Facies articularis ossis metatarsalis quinti'],
 ['cuneiform','Facet for lateral cuneiform of cuboid','Суставная поверхность для латеральной клиновидной кости','Facies articularis ossis cuneiformis lateralis'],
 ['anterior','Anterior surface of cuboid','Передняя поверхность кубовидной кости','Facies anterior ossis cuboidei'],
 ['posterior','Posterior surface of cuboid','Задняя поверхность кубовидной кости','Facies posterior ossis cuboidei'],
 ['dorsal','Dorsal surface of cuboid','Тыльная поверхность кубовидной кости','Facies dorsalis ossis cuboidei'],
 ['plantar','Plantar surface of cuboid','Подошвенная поверхность кубовидной кости','Facies plantaris ossis cuboidei'],
 ['medial','Medial surface of cuboid','Медиальная поверхность кубовидной кости','Facies medialis ossis cuboidei'],
 ['lateral','Lateral surface of cuboid','Латеральная поверхность кубовидной кости','Facies lateralis ossis cuboidei'],
 ];
 for(const [key,en,ru,la] of extra)if(!d.landmarks.some(l=>l.en===en))d.landmarks.push({id:d.id+'-'+key,en,ru,la,labelPosition:[0,0,0],pointer:[],source:'editorial'});
 d.landmarks=d.landmarks.filter(l=>!l.id.includes('-approx-'));const names=new Map(d.landmarks.map(l=>[l.en,l.id])),regions=Object.fromEntries(d.landmarks.map(l=>[l.id,[]]));
 for(let f=0;f<tags.length;f++){
  const p=[0,1,2].map(a=>(positions[f*9+a]+positions[f*9+3+a]+positions[f*9+6+a])/3);if(side==='r')p[0]*=-1;const [x,y,z]=p;
  const n=[0,1,2].map(a=>(normals[f*9+a]+normals[f*9+3+a]+normals[f*9+6+a])/3);if(side==='r')n[0]*=-1;
  const kind=tags[f].kind;
  const nonarticular=kind==='bone';
  // Trace the oblique metatarsal division on the anterior mesh; verify its
  // orientation against the adjacent IV/V metatarsals in the source skeleton.
  const edge=x<.30?-.70+(x-.22)*2.625:x<.60?-.49+(x-.30)*.133333:-.45+(x-.60)*1.08;
  const fourth=kind==='metatarsal'&&y>=edge;
  const fifth=kind==='metatarsal'&&!fourth;
  const medial=kind==='cuneiform'||(nonarticular&&n[0]<0&&Math.abs(n[0])>Math.abs(n[1]));
  const lateral=nonarticular&&n[0]>=0&&Math.abs(n[0])>Math.abs(n[1]);
  const dorsal=nonarticular&&!medial&&!lateral&&n[1]>=0;
  const plantar=nonarticular&&!medial&&!lateral&&n[1]<0;
  const groove=nonarticular&&y<-.35&&ribbon([x,0,z],[[.65,0,-.48],[.40,0,-.36],[.15,0,-.20],[-.10,0,.02],[-.28,0,.18]],.085);
  const tuberosity=nonarticular&&y<-.68&&polygon(x,z,[[-.35,-.72],[.10,-.76],[.28,-.52],[.07,-.34],[-.24,-.38]]);
  const masks={
   'Groove for tendon of fibularis longus muscle of cuboid bone':groove,
   'Tuberosity of cuboid bone':tuberosity,
   'Calcaneal articular surface of cuboid':kind==='calcaneal',
   'Facet for fourth metatarsal':fourth,
   'Facet for fifth metatarsal':fifth,
   'Facet for lateral cuneiform of cuboid':kind==='cuneiform',
   'Anterior surface of cuboid':kind==='metatarsal',
   'Posterior surface of cuboid':kind==='calcaneal',
   'Dorsal surface of cuboid':dorsal,
   'Plantar surface of cuboid':plantar,
   'Medial surface of cuboid':medial,
   'Lateral surface of cuboid':lateral,
  };
  for(const [name,yes] of Object.entries(masks))if(yes){const id=names.get(name);if(!id)throw Error(`Unknown ${name}`);regions[id].push(f);}
 }
 for(const [id,faces] of Object.entries(regions))if(!faces.length)throw Error(`Empty ${id}`);
 for(const l of d.landmarks.filter(l=>l.source==='editorial')){const faces=regions[l.id],f=faces[Math.floor(faces.length/2)];l.labelPosition=[0,1,2].map(a=>(positions[f*9+a]+positions[f*9+3+a]+positions[f*9+6+a])/3);}
 const binary=Buffer.concat([Buffer.from(new Float32Array(positions).buffer),Buffer.from(new Float32Array(normals).buffer)]),hash=crypto.createHash('sha256').update(binary).digest('hex');
 fs.writeFileSync(`${dir}/cuboid-bone-${side}.bin`,binary);d.vertexCount=positions.length/3;d.regionHash=hash;d.regionsUrl=`/models/bone-details/v1/cuboid-bone-${side}.surfaces.json`;
 fs.writeFileSync(`${dir}/cuboid-bone-${side}.json`,JSON.stringify(d));
 fs.writeFileSync(`${dir}/cuboid-bone-${side}.surfaces.json`,JSON.stringify({version:1,boneId:d.id,sourceHash:hash,sourceModelHash:fbxHash,method:'editorial-contours-and-authored-cartilage',review:'atlas-referenced; not independently expert-reviewed',references:['https://anatomy.app/encyclopedia/cuboid-bone'],regions}));
 report.push({bone:d.id,triangles:tags.length,components,regions:Object.fromEntries(d.landmarks.map(l=>[l.en,regions[l.id].length]))});g.dispose();
}
fs.writeFileSync('../.anatomy-source/cuboid-surface-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));

const index=JSON.parse(fs.readFileSync(dir+'/index.json'));for(const bone of index)if(['cuboid-bone-l','cuboid-bone-r'].includes(bone.id)){const d=JSON.parse(fs.readFileSync(dir+'/'+bone.id+'.json'));bone.landmarkCount=d.landmarks.length;bone.searchText=d.landmarks.map(l=>l.ru+' '+l.la+' '+l.en).join(' ');}fs.writeFileSync(dir+'/index.json',JSON.stringify(index));

approximateSurfaces('cuboid-bone');
