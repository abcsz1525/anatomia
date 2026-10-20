import { approximateSurfaces } from './approximate-surfaces.mjs';
/** Calcaneus-specific atlas-referenced contours; see content/calcaneus-surfaces.md. */
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
 let mesh;scene.traverse(n=>{if(n.isMesh&&(n.userData.originalName??n.name)===`Calcaneus.${side}`)mesh=n;});
 const g=mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);g.computeBoundingBox();const center=g.boundingBox.getCenter(new Vector3()),size=g.boundingBox.getSize(new Vector3());
 g.applyMatrix4(new Matrix4().makeScale(...Array(3).fill(2/Math.max(size.x,size.y,size.z))).multiply(new Matrix4().makeTranslation(-center.x,-center.y,-center.z)));
 const pos=g.attributes.position,nor=g.attributes.normal,cart=new Set();
 for(const group of mesh.geometry.groups)if(mesh.material[group.materialIndex].name.startsWith('Cartilage'))for(let f=group.start/3;f<(group.start+group.count)/3;f++)cart.add(f);

 const vertexFaces=new Map(),adj=Array.from({length:pos.count/3},()=>new Set());
 for(let f=0;f<pos.count/3;f++)for(let k=0;k<3;k++){const key=[pos.getX(f*3+k),pos.getY(f*3+k),pos.getZ(f*3+k)].map(x=>x.toFixed(6)).join(',');const a=vertexFaces.get(key)??[];a.push(f);vertexFaces.set(key,a);}
 for(const faces of vertexFaces.values())for(const f of faces)for(const n of faces)adj[f].add(n);
 const cartilageKind=new Map(),todo=new Set(cart),components=[];
 while(todo.size){const q=[todo.values().next().value],comp=[];todo.delete(q[0]);while(q.length){const f=q.pop();comp.push(f);for(const n of adj[f])if(todo.delete(n))q.push(n);}const centroid=[0,1,2].map(a=>comp.reduce((s,f)=>s+pos.array[f*9+a],0)/comp.length);const kind=centroid[2]>.83?'cuboid':centroid[2]<.32?'posterior':centroid[0]*(side==='r'?-1:1)<-.26?'middle':'anterior';for(const f of comp)cartilageKind.set(f,kind);components.push({kind,count:comp.length});}
 if(components.length!==4||new Set(components.map(c=>c.kind)).size!==4)throw Error('Review calcaneal cartilage components');
 const positions=[],normals=[],tags=[];
 function emit(v,n,tag){const lengths=[dist(v[0],v[1]),dist(v[1],v[2]),dist(v[2],v[0])];const longest=Math.max(...lengths);if(longest>.04){const a=lengths.indexOf(longest),b=(a+1)%3,c=(a+2)%3;const m=mid(v[a],v[b]),mn=mid(n[a],n[b]);emit([v[a],m,v[c]],[n[a],mn,n[c]],tag);emit([m,v[b],v[c]],[mn,n[b],n[c]],tag);}else{for(let i=0;i<3;i++){positions.push(...v[i]);const len=Math.hypot(...n[i]);normals.push(...n[i].map(x=>x/len));}tags.push(tag);}}
 for(let f=0;f<pos.count/3;f++){let order=mesh.matrixWorld.determinant()<0?[0,2,1]:[0,1,2];emit(order.map(k=>[pos.getX(f*3+k),pos.getY(f*3+k),pos.getZ(f*3+k)]),order.map(k=>[nor.getX(f*3+k),nor.getY(f*3+k),nor.getZ(f*3+k)]),{kind:cartilageKind.get(f)??'bone'});}
 const d=JSON.parse(fs.readFileSync(`${dir}/calcaneus-${side}.json`));
 const sinus=d.landmarks.find(l=>l.en==='Tarsal sinus');sinus.ru='Пазуха предплюсны — костное дно';
 const extra=[
 ['posterior-talar','Posterior talar articular surface','Задняя таранная суставная поверхность','Facies articularis talaris posterior'],
 ['middle-talar','Middle talar articular surface','Средняя таранная суставная поверхность','Facies articularis talaris media'],
 ['anterior-talar','Anterior talar articular surface','Передняя таранная суставная поверхность','Facies articularis talaris anterior'],
 ['body','Body of calcaneus','Тело пяточной кости','Corpus calcanei'],
 ['superior','Superior surface of calcaneus','Верхняя поверхность пяточной кости','Facies superior calcanei'],
 ['inferior','Inferior surface of calcaneus','Подошвенная поверхность пяточной кости','Facies inferior calcanei'],
 ['medial','Medial surface of calcaneus','Медиальная поверхность пяточной кости','Facies medialis calcanei'],
 ['lateral','Lateral surface of calcaneus','Латеральная поверхность пяточной кости','Facies lateralis calcanei'],
 ['posterior','Posterior surface of calcaneus','Задняя поверхность пяточной кости','Facies posterior calcanei'],
 ['anterior','Anterior surface of calcaneus','Передняя поверхность пяточной кости','Facies anterior calcanei'],
 ];
 for(const [key,en,ru,la] of extra)if(!d.landmarks.some(l=>l.en===en))d.landmarks.push({id:d.id+'-'+key,en,ru,la,labelPosition:[0,0,0],pointer:[],source:'editorial'});
 d.landmarks=d.landmarks.filter(l=>!l.id.includes('-approx-'));const names=new Map(d.landmarks.map(l=>[l.en,l.id])),regions=Object.fromEntries(d.landmarks.map(l=>[l.id,[]]));
 for(let f=0;f<tags.length;f++){
  const p=[0,1,2].map(a=>(positions[f*9+a]+positions[f*9+3+a]+positions[f*9+6+a])/3);if(side==='r')p[0]*=-1;const [x,y,z]=p;
  const n=[0,1,2].map(a=>(normals[f*9+a]+normals[f*9+3+a]+normals[f*9+6+a])/3);if(side==='r')n[0]*=-1;
  const kind=tags[f].kind;
  const nonarticular=kind==='bone';
  const sulcus=nonarticular&&y>.23&&polygon(x,z,[[-.40,.31],[-.25,.46],[.05,.48],[.33,.47],[.35,.29],[.10,.25],[-.20,.28]]);
  const sinusFloor=sulcus||(nonarticular&&y>.18&&y<.44&&polygon(x,z,[[.08,.26],[.45,.23],[.56,.37],[.49,.61],[.18,.60],[.05,.45]]));
  const sustent=kind==='middle'||(x<-.28&&z>.30&&z<.68&&y>.28);
  const tuberosity=z<-.40-.35*y||(y<-.43&&z<-.06);
  const posterior=nonarticular&&z<-.57&&n[2]<-.4;
  const absX=Math.abs(n[0]);
  const plantar=nonarticular&&!posterior&&-n[1]>=absX;
  const medial=nonarticular&&n[0]<0&&absX>Math.abs(n[1])&&!posterior;
  const lateral=nonarticular&&n[0]>=0&&absX>Math.abs(n[1])&&!posterior;
  const superior=kind==='posterior'||kind==='middle'||kind==='anterior'||(nonarticular&&n[1]>=absX&&!posterior);
  const masks={
   'Calcaneal sulcus':sulcus,
   'Sustentaculum tali':sustent,
   'Tarsal sinus':sinusFloor,
   'Calcaneal tubercle':nonarticular&&y<-.09&&z>.52&&z<.82,
   'Articular surface for cuboid':kind==='cuboid',
   'Lateral process of calcaneal tuberosity':tuberosity&&x>-.02&&y<-.50&&z<-.35,
   'Anterior process of calcaneus':nonarticular&&x>.38&&z>.46&&y>.13,
   'Groove for tendon of flexor hallucis longus of calcaneus':nonarticular&&x<-.28&&ribbon(p,[[-.37,.31,.29],[-.37,.33,.40],[-.38,.34,.52],[-.35,.30,.61]],.055),
   'Medial process of calcaneal tuberosity':tuberosity&&x<-.15&&y<-.48&&z<-.03,
   'Calcaneal tuberosity':tuberosity,
   'Posterior talar articular surface':kind==='posterior',
   'Middle talar articular surface':kind==='middle',
   'Anterior talar articular surface':kind==='anterior',
   'Body of calcaneus':!tuberosity&&!sustent&&kind!=='cuboid',
   'Superior surface of calcaneus':superior,
   'Inferior surface of calcaneus':plantar,
   'Medial surface of calcaneus':medial,
   'Lateral surface of calcaneus':lateral,
   'Posterior surface of calcaneus':posterior,
   'Anterior surface of calcaneus':kind==='cuboid',
  };
  for(const [name,yes] of Object.entries(masks))if(yes){const id=names.get(name);if(!id)throw Error(`Unknown ${name}`);regions[id].push(f);}
 }
 for(const [id,faces] of Object.entries(regions))if(!faces.length)throw Error(`Empty ${id}`);
 for(const l of d.landmarks.filter(l=>l.source==='editorial')){const faces=regions[l.id],f=faces[Math.floor(faces.length/2)];l.labelPosition=[0,1,2].map(a=>(positions[f*9+a]+positions[f*9+3+a]+positions[f*9+6+a])/3);}
 const binary=Buffer.concat([Buffer.from(new Float32Array(positions).buffer),Buffer.from(new Float32Array(normals).buffer)]),hash=crypto.createHash('sha256').update(binary).digest('hex');
 fs.writeFileSync(`${dir}/calcaneus-${side}.bin`,binary);d.vertexCount=positions.length/3;d.regionHash=hash;d.regionsUrl=`/models/bone-details/v1/calcaneus-${side}.surfaces.json`;
 fs.writeFileSync(`${dir}/calcaneus-${side}.json`,JSON.stringify(d));
 fs.writeFileSync(`${dir}/calcaneus-${side}.surfaces.json`,JSON.stringify({version:1,boneId:d.id,sourceHash:hash,sourceModelHash:fbxHash,method:'editorial-contours-and-authored-cartilage',review:'atlas-referenced; not independently expert-reviewed',references:['https://www.kenhub.com/en/library/anatomy/calcaneus','https://anatomy.app/encyclopedia/calcaneus'],regions}));
 report.push({bone:d.id,triangles:tags.length,components,regions:Object.fromEntries(d.landmarks.map(l=>[l.en,regions[l.id].length]))});g.dispose();
}
fs.writeFileSync('../.anatomy-source/calcaneus-surface-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));

const index=JSON.parse(fs.readFileSync(dir+'/index.json'));for(const bone of index)if(['calcaneus-l','calcaneus-r'].includes(bone.id)){const d=JSON.parse(fs.readFileSync(dir+'/'+bone.id+'.json'));bone.landmarkCount=d.landmarks.length;bone.searchText=d.landmarks.map(l=>l.ru+' '+l.la+' '+l.en).join(' ');}fs.writeFileSync(dir+'/index.json',JSON.stringify(index));

approximateSurfaces('calcaneus');
