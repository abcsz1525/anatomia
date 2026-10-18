/** Fibula-specific atlas-referenced contours; see content/fibula-surfaces.md. */
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
 let mesh;scene.traverse(n=>{if(n.isMesh&&(n.userData.originalName??n.name)===`Fibula.${side}`)mesh=n;});
 const g=mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);g.computeBoundingBox();const center=g.boundingBox.getCenter(new Vector3()),size=g.boundingBox.getSize(new Vector3());
 g.applyMatrix4(new Matrix4().makeScale(...Array(3).fill(2/Math.max(size.x,size.y,size.z))).multiply(new Matrix4().makeTranslation(-center.x,-center.y,-center.z)));
 const pos=g.attributes.position,nor=g.attributes.normal,cart=new Set();
 for(const group of mesh.geometry.groups)if(mesh.material[group.materialIndex].name.startsWith('Cartilage'))for(let f=group.start/3;f<(group.start+group.count)/3;f++)cart.add(f);


 const profiles=[];
 for(let y=-.72;y<=.741;y+=.01){
  const pts=profileAt(pos,y).map(p=>[side==='r'?-p[0]:p[0],p[1],p[2]]);
  const pick=fn=>pts.reduce((a,b)=>fn(a)>fn(b)?a:b);
  const anterior=pick(p=>p[2]),interosseous=pick(p=>-p[0]),posterior=pick(p=>-p[2]);
  const center=[0,1,2].map(k=>pts.reduce((s,p)=>s+p[k],0)/pts.length);
  profiles.push({y,anterior,interosseous,posterior,center});
 }
 const positions=[],normals=[],tags=[];
 function emit(v,n,tag){const lengths=[dist(v[0],v[1]),dist(v[1],v[2]),dist(v[2],v[0])];const longest=Math.max(...lengths);if(longest>.018){const a=lengths.indexOf(longest),b=(a+1)%3,c=(a+2)%3;const m=mid(v[a],v[b]),mn=mid(n[a],n[b]);emit([v[a],m,v[c]],[n[a],mn,n[c]],tag);emit([m,v[b],v[c]],[mn,n[b],n[c]],tag);}else{for(let i=0;i<3;i++){positions.push(...v[i]);const len=Math.hypot(...n[i]);normals.push(...n[i].map(x=>x/len));}tags.push(tag);}}
 for(let f=0;f<pos.count/3;f++){let order=mesh.matrixWorld.determinant()<0?[0,2,1]:[0,1,2];emit(order.map(k=>[pos.getX(f*3+k),pos.getY(f*3+k),pos.getZ(f*3+k)]),order.map(k=>[nor.getX(f*3+k),nor.getY(f*3+k),nor.getZ(f*3+k)]),{kind:cart.has(f)?(pos.getY(f*3)>0?'head':'malleolus'):'bone'});}

 const d=JSON.parse(fs.readFileSync(dir+'/fibula-'+side+'.json'));
 for(const l of d.landmarks)if(l.en==='Articular facet of head of fibula')l.ru='Суставная поверхность головки малоберцовой кости';
 const names=new Map(d.landmarks.map(l=>[l.en,l.id])),regions=Object.fromEntries(d.landmarks.map(l=>[l.id,[]]));
 for(let f=0;f<tags.length;f++){
  const p=[0,1,2].map(a=>(positions[f*9+a]+positions[f*9+3+a]+positions[f*9+6+a])/3);if(side==='r')p[0]*=-1;const [x,y,z]=p;
  const kind=tags[f].kind;
  const nx=(normals[f*9]+normals[f*9+3]+normals[f*9+6])/3*(side==='r'?-1:1);
  const profile=profiles.reduce((a,b)=>Math.abs(a.y-y)<Math.abs(b.y-y)?a:b);
  const angle=point=>Math.atan2(point[2]-profile.center[2],point[0]-profile.center[0]);
  const wrap=a=>(a+Math.PI*4)%(Math.PI*2);
  const theta=wrap(angle(p)-angle(profile.anterior)),inter=wrap(angle(profile.interosseous)-angle(profile.anterior)),back=wrap(angle(profile.posterior)-angle(profile.anterior));
  const body=y<.74&&y>-.72;
  const medial=body&&theta<=inter,posterior=body&&theta>inter&&theta<=back;
  // The medial crest divides the posterior face; it joins the interosseous
  // border distally. The longitudinal outline is separate from that border.
  const crestFraction=Math.max(0,Math.min(.55,(y+.60)/1.34*.55));
  const crestAngle=inter+(back-inter)*crestFraction;
  const radius=Math.hypot(x-profile.center[0],z-profile.center[2]);
  const crest=body&&y>-.60&&y<.70&&Math.abs(theta-crestAngle)*radius<.006;
  const fossa=kind==='bone'&&nx<-.25&&x<-.035&&polygon(z,y,[[-.09,-.85],[-.045,-.88],[-.033,-.94],[-.06,-.98],[-.09,-.94]]);
  // Posterior groove for fibular tendons: follows the back of the malleolus,
  // not the source pointer tip on its inferior pole.
  const groove=kind==='bone'&&!fossa&&ribbon(p,[[-.060,-.72,-.083],[-.065,-.76,-.084],[-.058,-.81,-.085],[-.058,-.846,-.089],[-.052,-.88,-.091],[-.040,-.914,-.091],[-.016,-.957,-.088]],.014);
  const masks={
   'Head of fibula':y>=.84,
   'Apex of head of fibula':y>.966&&z<.012,
   'Neck of fibula':y>=.74&&y<.84,
   'Articular facet of head of fibula':kind==='head',
   'Body of fibula':body,
   'Anterior border of fibula':body&&dist(p,profile.anterior)<.012,
   'Interosseous crest of fibula':body&&dist(p,profile.interosseous)<.010,
   'Posterior border of fibula':body&&dist(p,profile.posterior)<.012,
   'Medial border of fibula':crest,
   'Medial surface of fibula':medial,
   'Anteromedial surface of fibula':medial,
   'Posterior surface of fibula':posterior,
   'Posteromedial surface of fibula':posterior&&theta<=crestAngle,
   'Lateral surface of fibula':body&&theta>back,
   'Lateral malleolus':y<=-.72,
   'Articular facet of lateral malleolus':kind==='malleolus',
   'Malleolar fossa':fossa,
   'Malleolar groove of fibula':groove,
  };
  for(const [name,yes] of Object.entries(masks))if(yes){const id=names.get(name);if(!id)throw Error('Unknown '+name);regions[id].push(f);}
 }
 for(const [id,faces] of Object.entries(regions))if(!faces.length)throw Error(`Empty ${id}`);
 const binary=Buffer.concat([Buffer.from(new Float32Array(positions).buffer),Buffer.from(new Float32Array(normals).buffer)]),hash=crypto.createHash('sha256').update(binary).digest('hex');
 fs.writeFileSync(`${dir}/fibula-${side}.bin`,binary);d.vertexCount=positions.length/3;d.regionHash=hash;d.regionsUrl=`/models/bone-details/v1/fibula-${side}.surfaces.json`;
 fs.writeFileSync(`${dir}/fibula-${side}.json`,JSON.stringify(d));
 fs.writeFileSync(`${dir}/fibula-${side}.surfaces.json`,JSON.stringify({version:1,boneId:d.id,sourceHash:hash,sourceModelHash:fbxHash,method:'editorial-contours-and-authored-cartilage',review:'atlas-referenced; not independently expert-reviewed',references:['https://www.kenhub.com/en/library/anatomy/fibula','https://anatomy.app/encyclopedia/fibula'],regions}));
 report.push({bone:d.id,triangles:tags.length,regions:Object.fromEntries(d.landmarks.map(l=>[l.en,regions[l.id].length]))});g.dispose();
}
fs.writeFileSync('../.anatomy-source/fibula-surface-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
