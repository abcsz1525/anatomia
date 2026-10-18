/** Tibia-specific atlas-referenced contours; see content/tibia-surfaces.md. */
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

// Intersect the original mesh with transverse planes, then follow its three
// anatomically identified ridges. This retains the shaft twist and curvature.
function profileAt(pos,y){const pts=[];for(let f=0;f<pos.count/3;f++){const v=[0,1,2].map(k=>[pos.getX(f*3+k),pos.getY(f*3+k),pos.getZ(f*3+k)]);for(let k=0;k<3;k++){const a=v[k],b=v[(k+1)%3];if((a[1]<=y&&b[1]>y)||(b[1]<=y&&a[1]>y)){const t=(y-a[1])/(b[1]-a[1]);pts.push(a.map((x,j)=>x+t*(b[j]-x)));}}}return pts;}
const report=[];
for(const side of ['l','r']){
 let mesh;scene.traverse(n=>{if(n.isMesh&&(n.userData.originalName??n.name)===`Tibia.${side}`)mesh=n;});
 const g=mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);g.computeBoundingBox();const center=g.boundingBox.getCenter(new Vector3()),size=g.boundingBox.getSize(new Vector3());
 g.applyMatrix4(new Matrix4().makeScale(...Array(3).fill(2/Math.max(size.x,size.y,size.z))).multiply(new Matrix4().makeTranslation(-center.x,-center.y,-center.z)));
 const pos=g.attributes.position,nor=g.attributes.normal,cart=new Set();
 for(const group of mesh.geometry.groups)if(mesh.material[group.materialIndex].name.startsWith('Cartilage'))for(let f=group.start/3;f<(group.start+group.count)/3;f++)cart.add(f);

 const vertexFaces=new Map(),adj=Array.from({length:pos.count/3},()=>new Set());
 for(let f=0;f<pos.count/3;f++)for(let k=0;k<3;k++){const key=[pos.getX(f*3+k),pos.getY(f*3+k),pos.getZ(f*3+k)].map(x=>x.toFixed(6)).join(',');const a=vertexFaces.get(key)??[];a.push(f);vertexFaces.set(key,a);}
 for(const faces of vertexFaces.values())for(const f of faces)for(const n of faces)adj[f].add(n);
 const cartilageKind=new Map(),todo=new Set(cart),components=[];
 while(todo.size){const q=[todo.values().next().value],comp=[];todo.delete(q[0]);while(q.length){const f=q.pop();comp.push(f);for(const n of adj[f])if(todo.delete(n))q.push(n);}const cx=comp.reduce((s,f)=>s+pos.getX(f*3),0)/comp.length*(side==='r'?-1:1),cy=comp.reduce((s,f)=>s+pos.getY(f*3),0)/comp.length;const kind=cy<0?'distal':cy<.92?'fibular':cx<0?'medial':'lateral';for(const f of comp)cartilageKind.set(f,kind);components.push({kind,count:comp.length});}
 if(components.length!==4||new Set(components.map(c=>c.kind)).size!==4)throw Error('Review tibial cartilage components');
 const profiles=[];
 for(let y=-.82;y<=.821;y+=.02){const pts=profileAt(pos,y).map(p=>[side==='r'?-p[0]:p[0],p[1],p[2]]);const pick=fn=>pts.reduce((a,b)=>fn(a)>fn(b)?a:b);const anterior=pick(p=>p[2]),interosseous=pick(p=>p[0]),medial=pick(p=>-p[0]-.5*p[2]);const center=mid(mid(anterior,interosseous),medial);profiles.push({y,anterior,interosseous,medial,center});}
 const positions=[],normals=[],tags=[];
 function emit(v,n,tag){const lengths=[dist(v[0],v[1]),dist(v[1],v[2]),dist(v[2],v[0])];const longest=Math.max(...lengths);if(longest>.035){const a=lengths.indexOf(longest),b=(a+1)%3,c=(a+2)%3;const m=mid(v[a],v[b]),mn=mid(n[a],n[b]);emit([v[a],m,v[c]],[n[a],mn,n[c]],tag);emit([m,v[b],v[c]],[mn,n[b],n[c]],tag);}else{for(let i=0;i<3;i++){positions.push(...v[i]);const len=Math.hypot(...n[i]);normals.push(...n[i].map(x=>x/len));}tags.push(tag);}}
 for(let f=0;f<pos.count/3;f++){let order=mesh.matrixWorld.determinant()<0?[0,2,1]:[0,1,2];emit(order.map(k=>[pos.getX(f*3+k),pos.getY(f*3+k),pos.getZ(f*3+k)]),order.map(k=>[nor.getX(f*3+k),nor.getY(f*3+k),nor.getZ(f*3+k)]),{kind:cartilageKind.get(f)??'bone'});}
 const d=JSON.parse(fs.readFileSync(`${dir}/tibia-${side}.json`));
 const names=new Map(d.landmarks.map(l=>[l.en,l.id])),regions=Object.fromEntries(d.landmarks.map(l=>[l.id,[]]));
 const soleal=[[.14,.80,0],[.065,.73,0],[-.025,.61,0],[-.055,.53,0],[-.06,.50,0]];
 for(let f=0;f<tags.length;f++){
  const p=[0,1,2].map(a=>(positions[f*9+a]+positions[f*9+3+a]+positions[f*9+6+a])/3);if(side==='r')p[0]*=-1;const [x,y,z]=p;
  const v=[0,1,2].map(k=>positions.slice(f*9+k*3,f*9+k*3+3)),a=v[1].map((t,k)=>t-v[0][k]),b=v[2].map((t,k)=>t-v[0][k]);let n=[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];const len=Math.hypot(...n);n=n.map(t=>t/len);if(side==='r')n[0]*=-1;
  const kind=tags[f].kind,topCart=kind==='medial'||kind==='lateral';
  const inter=!topCart&&y>.928&&polygon(x,z,[[-.085,.11],[.045,.10],[.048,-.055],[.015,-.17],[-.07,-.17],[-.09,-.045]]);
  const eminence=y>.968&&z>-.10&&z<.015&&x>-.08&&x<.048;
  const profile=profiles.reduce((a,b)=>Math.abs(a.y-y)<Math.abs(b.y-y)?a:b);
  const angle=point=>Math.atan2(point[2]-profile.center[2],point[0]-profile.center[0]);
  const wrap=a=>(a+Math.PI*4)%(Math.PI*2);
  const theta=wrap(angle(p)-angle(profile.interosseous)),front=wrap(angle(profile.anterior)-angle(profile.interosseous)),medial=wrap(angle(profile.medial)-angle(profile.interosseous));
  const body=y<.80&&y>-.80;
  const facetMalleolus=kind==='distal'&&x<-.065&&n[0]>.45&&y<-.90;
  const fibularNotch=y<-.76&&x>.055&&z<.025&&n[0]>.25&&y>-.962;
  const inferior=kind==='distal'&&!facetMalleolus&&!fibularNotch&&n[1]<-.3;
  const masks={
   'Body of tibia':body,
   'Lateral surface of tibia':body&&theta<=front,
   'Medial surface of tibia':body&&theta>front&&theta<=medial,
   'Posterior surface of tibia':body&&theta>medial,
   'Anterior border of tibia':body&&dist(p,profile.anterior)<.02,
   'Interosseous border of tibia':body&&dist(p,profile.interosseous)<.017,
   'Medial border of tibia':body&&dist(p,profile.medial)<.017,
   'Soleal line':kind==='bone'&&z<.03&&n[2]<-.10&&ribbon([x,y,0],soleal,.014),
   'Tibial tuberosity':z>.115&&polygon(x,y,[[-.04,.87],[.03,.90],[.095,.87],[.11,.78],[.065,.69],[.015,.68],[-.025,.75]]),
   'Tubercle of iliotibial tract':z>.05&&polygon(x,y,[[.095,.87],[.165,.85],[.185,.80],[.15,.75],[.095,.72],[.085,.79]]),
   'Medial condyle of tibia':y>.80&&x<-.025,
   'Lateral condyle of tibia':y>.80&&x>=-.025,
   'Articular surface of medial condyle':kind==='medial',
   'Superior articular surface of lateral condyle':kind==='lateral',
   'Superior articular surfaces of tibia':topCart,
   'Tibial plateau':topCart||inter||eminence,
   'Intercondylar area':inter||eminence,
   'Anterior intercondylar area':inter&&z>=.015,
   'Posterior intercondylar area':inter&&z<-.09,
   'Intercondylar eminence':eminence,
   'Medial intercondylar tubercle':eminence&&x<-.022,
   'Lateral intercondylar tubercle':eminence&&x>=-.022,
   'Fibular articular facet':kind==='fibular',
   'Fibular notch':fibularNotch,
   'Inferior articular surface of tibia':inferior,
   'Medial malleolus':x<-.085&&y<-.86,
   'Articular facet of medial malleolus':facetMalleolus,
   'Posterior malleolus':y<-.88&&z<-.125&&x>-.08&&x<.10,
   'Malleolar groove of tibia':ribbon(p,[[-.055,-.80,-.10],[-.065,-.88,-.145],[-.10,-.96,-.12]],.019),
  };
  for(const [name,yes] of Object.entries(masks))if(yes){const id=names.get(name);if(!id)throw Error(`Unknown ${name}`);regions[id].push(f);}
 }
 for(const [id,faces] of Object.entries(regions))if(!faces.length)throw Error(`Empty ${id}`);
 const binary=Buffer.concat([Buffer.from(new Float32Array(positions).buffer),Buffer.from(new Float32Array(normals).buffer)]),hash=crypto.createHash('sha256').update(binary).digest('hex');
 fs.writeFileSync(`${dir}/tibia-${side}.bin`,binary);d.vertexCount=positions.length/3;d.regionHash=hash;d.regionsUrl=`/models/bone-details/v1/tibia-${side}.surfaces.json`;
 fs.writeFileSync(`${dir}/tibia-${side}.json`,JSON.stringify(d));
 fs.writeFileSync(`${dir}/tibia-${side}.surfaces.json`,JSON.stringify({version:1,boneId:d.id,sourceHash:hash,sourceModelHash:fbxHash,method:'editorial-contours-and-authored-cartilage',review:'atlas-referenced; not independently expert-reviewed',references:['https://www.kenhub.com/en/library/anatomy/tibia','https://anatomy.app/encyclopedia/tibia'],regions}));
 report.push({bone:d.id,triangles:tags.length,components,regions:Object.fromEntries(d.landmarks.map(l=>[l.en,regions[l.id].length]))});g.dispose();
}
fs.writeFileSync('../.anatomy-source/tibia-surface-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
