import { supplementSurfaces } from './supplement-surfaces.mjs';
/** Femur-only editorial contours. Coordinates were traced against the four
 * orthographic views of this pinned Z-Anatomy mesh and the atlas references in
 * content/femur-surfaces.md. These are NOT nearest-landmark/Voronoi patches.
 * Each side is read from its own source mesh; reflection only expresses the
 * contours in a common medial/lateral anatomical coordinate frame.
 */
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
const neck=[[-.15,.85],[-.04,.97],[.08,.91],[.11,.84],[.10,.78],[.075,.73],[.02,.65],[-.015,.66],[-.05,.77]];
const greater=[[.10,.86],[.15,.96],[.28,.91],[.28,.76],[.17,.65],[.12,.65],[.09,.74]];
const lesser=[[-.05,.62],[.025,.65],[.055,.60],[.05,.54],[.005,.51],[-.035,.55]];
const linea=[[.065,.30,.002],[.052,.15,.01],[.03,0,.012],[.005,-.20,.012],[-.028,-.40,.009],[-.052,-.55,-.004]];
const crest=[[.19,.84,-.02],[.145,.78,-.055],[.115,.72,-.075],[.09,.66,-.065],[.055,.61,-.055],[.008,.56,-.025]];
const interLine=[[.16,.85,.075],[.10,.79,.095],[.06,.745,.10],[.035,.68,.08],[.005,.60,.04]];
const gluteal=[[.16,.66,-.045],[.13,.56,-.035],[.12,.50,-.022],[.095,.40,-.01],[.065,.29,.002]];
const pectineal=[[.005,.55,-.025],[.045,.48,.002],[.06,.37,.005],[.065,.29,.002]];
const medialSupra=[[-.052,-.55,-.004],[-.095,-.64,-.015],[-.15,-.72,-.025],[-.21,-.80,-.045]];
const lateralSupra=[[-.028,-.50,.0],[.005,-.61,-.02],[.052,-.73,-.04],[.085,-.82,-.055]];
const report=[];
for(const side of ['l','r']){
 let mesh;scene.traverse(n=>{if(n.isMesh&&(n.userData.originalName??n.name)===`Femur.${side}`)mesh=n;});
 const g=mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);g.computeBoundingBox();const center=g.boundingBox.getCenter(new Vector3()),size=g.boundingBox.getSize(new Vector3());
 g.applyMatrix4(new Matrix4().makeScale(...Array(3).fill(2/Math.max(size.x,size.y,size.z))).multiply(new Matrix4().makeTranslation(-center.x,-center.y,-center.z)));
 const pos=g.attributes.position,nor=g.attributes.normal,cart=new Set();
 for(const group of mesh.geometry.groups)if(mesh.material[group.materialIndex].name.startsWith('Cartilage'))for(let f=group.start/3;f<(group.start+group.count)/3;f++)cart.add(f);
 const verts=new Map(),adj=Array.from({length:pos.count/3},()=>new Set());
 for(let f=0;f<pos.count/3;f++)for(let k=0;k<3;k++){const key=[pos.getX(f*3+k),pos.getY(f*3+k),pos.getZ(f*3+k)].map(x=>x.toFixed(6)).join(',');const a=verts.get(key)??[];a.push(f);verts.set(key,a);}
 for(const faces of verts.values())for(const f of faces)for(const n of faces)adj[f].add(n);
 const todo=new Set(adj.map((_,i)=>i).filter(f=>!cart.has(f)));let fovea=new Set();
 while(todo.size){const q=[todo.values().next().value],comp=[];todo.delete(q[0]);while(q.length){const f=q.pop();comp.push(f);for(const n of adj[f])if(todo.delete(n))q.push(n);}if(comp.length<100&&comp.every(f=>pos.getY(f*3)>.8))fovea=new Set(comp);}
 if(fovea.size!==18)throw Error('Review source fovea topology');
 const positions=[],normals=[],tags=[];
 function emit(v,n,tag){const lengths=[dist(v[0],v[1]),dist(v[1],v[2]),dist(v[2],v[0])];const longest=Math.max(...lengths);if(longest>.035){const a=lengths.indexOf(longest),b=(a+1)%3,c=(a+2)%3;const m=mid(v[a],v[b]),mn=mid(n[a],n[b]);emit([v[a],m,v[c]],[n[a],mn,n[c]],tag);emit([m,v[b],v[c]],[mn,n[b],n[c]],tag);}else{for(let i=0;i<3;i++){positions.push(...v[i]);const len=Math.hypot(...n[i]);normals.push(...n[i].map(x=>x/len));}tags.push(tag);}}
 for(let f=0;f<pos.count/3;f++){let order=mesh.matrixWorld.determinant()<0?[0,2,1]:[0,1,2];emit(order.map(k=>[pos.getX(f*3+k),pos.getY(f*3+k),pos.getZ(f*3+k)]),order.map(k=>[nor.getX(f*3+k),nor.getY(f*3+k),nor.getZ(f*3+k)]),{cart:cart.has(f),fovea:fovea.has(f)});}
 const d=JSON.parse(fs.readFileSync(`${dir}/femur-${side}.json`));for(const [key,en,ru,la] of [
 ['head-articular','Articular surface of head of femur','Суставная поверхность головки бедренной кости','Facies articularis capitis femoris'],
 ['medial-condyle-articular','Articular surface of medial condyle of femur','Суставная поверхность медиального мыщелка бедренной кости','Facies articularis condyli medialis femoris'],
 ['lateral-condyle-articular','Articular surface of lateral condyle of femur','Суставная поверхность латерального мыщелка бедренной кости','Facies articularis condyli lateralis femoris']
 ])if(!d.landmarks.some(l=>l.en===en))d.landmarks.push({id:d.id+'-'+key,en,ru,la,labelPosition:[0,0,0],pointer:[],source:'editorial'});
 d.landmarks=d.landmarks.filter(l=>!l.id.includes('-supplement-'));const names=new Map(d.landmarks.map(l=>[l.en,l.id]));const regions=Object.fromEntries(d.landmarks.map(l=>[l.id,[]]));
 for(let f=0;f<tags.length;f++){
  const p=[0,1,2].map(a=>(positions[f*9+a]+positions[f*9+3+a]+positions[f*9+6+a])/3);if(side==='r')p[0]*=-1;const [x,y,z]=p,t=tags[f];
  const isHead=(t.cart&&y>.7)||t.fovea,notHead=!isHead;
  const masks={
   'Head of femur':isHead,
   'Articular surface of head of femur':isHead&&!t.fovea,
   'Articular surface of medial condyle of femur':t.cart&&y<-.82&&x<-.075&&!(y<-.78&&z>.012&&y>-.975),
   'Articular surface of lateral condyle of femur':t.cart&&y<-.82&&x>=-.075&&!(y<-.78&&z>.012&&y>-.975),
   'Fovea for ligament of head of femur':t.fovea,
   'Neck of femur':notHead&&polygon(x,y,neck),
   'Greater trochanter':notHead&&polygon(x,y,greater),
   'Lesser trochanter':polygon(x,y,lesser)&&z<.035,
   'Body of femur':y<.60&&y>-.80&&!polygon(x,y,lesser),
   'Trochanteric fossa':notHead&&z<.05&&z>-.025&&polygon(x,y,[[.105,.88],[.155,.895],[.185,.85],[.16,.79],[.12,.77],[.105,.82]]),
   'Intertrochanteric line':ribbon(p,interLine,.018),
   'Intertrochanteric crest':ribbon(p,crest,.019),
   'Quadrate tubercle':z<-.05&&polygon(x,y,[[.087,.745],[.12,.755],[.14,.725],[.12,.695],[.09,.70]]),
   '(Third trochanter)':z<-.025&&polygon(x,y,[[.11,.64],[.15,.645],[.17,.61],[.14,.585],[.11,.60]]),
   'Gluteal tuberosity':ribbon(p,gluteal,.025),
   'Pectineal line of femur':ribbon(p,pectineal,.014),
   'Linea aspera':ribbon(p,linea,.026),
   'Medial lip of linea aspera':ribbon(p,linea.map(([a,b,c])=>[a-.014,b,c+.002]),.013),
   'Lateral lip of linea aspera':ribbon(p,linea.map(([a,b,c])=>[a+.014,b,c+.002]),.013),
   'Medial supracondylar line':ribbon(p,medialSupra,.017),
   'Lateral supracondylar line':ribbon(p,lateralSupra,.017),
   'Popliteal surface of femur':z<.025&&polygon(x,y,[[-.05,-.54],[.025,-.67],[.07,-.80],[-.02,-.84],[-.20,-.81],[-.13,-.70]]),
   'Intercondylar line':ribbon(p,[[-.14,-.828,-.065],[-.08,-.835,-.072],[-.02,-.83,-.068],[.02,-.825,-.065]],.012),
   'Intercondylar fossa':!t.cart&&y<-.84&&z<-.035&&x>-.135&&x<-.015,
   'Patellar surface of femur':t.cart&&y<-.78&&z>.012&&y>-.975,
   'Medial condyle of femur':y<-.82&&x<-.075,
   'Lateral condyle of femur':y<-.82&&x>=-.075,
   'Medial epicondyle of femur':!t.cart&&x<-.19&&polygon(y,z,[[-.80,-.10],[-.87,-.13],[-.96,-.10],[-.97,.005],[-.88,.04],[-.82,-.01]]),
   'Lateral epicondyle of femur':!t.cart&&x>.066&&polygon(y,z,[[-.80,-.08],[-.86,-.12],[-.92,-.08],[-.93,.0],[-.86,.03],[-.81,-.02]]),
   'Adductor tubercle':!t.cart&&x<-.20&&z<.005&&y>-.84&&y<-.775,
   'Groove for popliteus muscle':x>.06&&ribbon(p,[[.09,-.865,-.125],[.095,-.895,-.11],[.09,-.925,-.075]],.015),
  };
  for(const [name,yes] of Object.entries(masks))if(yes)regions[names.get(name)].push(f);
 }
 for(const [id,faces] of Object.entries(regions))if(!faces.length)throw Error(`Empty ${id}`);
 const binary=Buffer.concat([Buffer.from(new Float32Array(positions).buffer),Buffer.from(new Float32Array(normals).buffer)]),hash=crypto.createHash('sha256').update(binary).digest('hex');
 fs.writeFileSync(`${dir}/femur-${side}.bin`,binary);
 d.vertexCount=positions.length/3;d.regionHash=hash;d.regionsUrl=`/models/bone-details/v1/femur-${side}.surfaces.json`;
 fs.writeFileSync(`${dir}/femur-${side}.json`,JSON.stringify(d));
 fs.writeFileSync(`${dir}/femur-${side}.surfaces.json`,JSON.stringify({version:1,boneId:d.id,sourceHash:hash,sourceModelHash:fbxHash,method:'editorial-contours-and-authored-cartilage',review:'atlas-referenced; not independently expert-reviewed',references:['https://www.kenhub.com/en/library/anatomy/femur','https://anatomy.app/encyclopedia/femur'],regions}));
 report.push({bone:d.id,triangles:tags.length,regions:Object.fromEntries(d.landmarks.map(l=>[l.en,regions[l.id].length]))});g.dispose();
}
fs.writeFileSync('../.anatomy-source/femur-surface-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));

supplementSurfaces('femur');
