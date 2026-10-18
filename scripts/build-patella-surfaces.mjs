/** Patella-specific atlas-referenced contours; see content/patella-surfaces.md. */
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

// Intersect the original mesh with transverse planes, then follow its three
// anatomically identified ridges. This retains the shaft twist and curvature.
function profileAt(pos,y){const pts=[];for(let f=0;f<pos.count/3;f++){const v=[0,1,2].map(k=>[pos.getX(f*3+k),pos.getY(f*3+k),pos.getZ(f*3+k)]);for(let k=0;k<3;k++){const a=v[k],b=v[(k+1)%3];if((a[1]<=y&&b[1]>y)||(b[1]<=y&&a[1]>y)){const t=(y-a[1])/(b[1]-a[1]);pts.push(a.map((x,j)=>x+t*(b[j]-x)));}}}return pts;}
const report=[];
for(const side of ['l','r']){
 let mesh;scene.traverse(n=>{if(n.isMesh&&(n.userData.originalName??n.name)===`Patella.${side}`)mesh=n;});
 const g=mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);g.computeBoundingBox();const center=g.boundingBox.getCenter(new Vector3()),size=g.boundingBox.getSize(new Vector3());
 g.applyMatrix4(new Matrix4().makeScale(...Array(3).fill(2/Math.max(size.x,size.y,size.z))).multiply(new Matrix4().makeTranslation(-center.x,-center.y,-center.z)));
 const pos=g.attributes.position,nor=g.attributes.normal,cart=new Set();
 for(const group of mesh.geometry.groups)if(mesh.material[group.materialIndex].name.startsWith('Cartilage'))for(let f=group.start/3;f<(group.start+group.count)/3;f++)cart.add(f);


const profiles=[];for(let y=-.48;y<.95;y+=.01){const pts=profileAt(pos,y).map(p=>[side==='r'?-p[0]:p[0],p[1],p[2]]).filter(p=>Math.abs(p[0])<.6);if(pts.length)profiles.push({y,ridge:pts.reduce((a,b)=>a[2]<b[2]?a:b)});}
 const positions=[],normals=[],tags=[];
 function emit(v,n,tag){const lengths=[dist(v[0],v[1]),dist(v[1],v[2]),dist(v[2],v[0])];const longest=Math.max(...lengths);if(longest>.045){const a=lengths.indexOf(longest),b=(a+1)%3,c=(a+2)%3;const m=mid(v[a],v[b]),mn=mid(n[a],n[b]);emit([v[a],m,v[c]],[n[a],mn,n[c]],tag);emit([m,v[b],v[c]],[mn,n[b],n[c]],tag);}else{for(let i=0;i<3;i++){positions.push(...v[i]);const len=Math.hypot(...n[i]);normals.push(...n[i].map(x=>x/len));}tags.push(tag);}}
 for(let f=0;f<pos.count/3;f++){let order=mesh.matrixWorld.determinant()<0?[0,2,1]:[0,1,2];emit(order.map(k=>[pos.getX(f*3+k),pos.getY(f*3+k),pos.getZ(f*3+k)]),order.map(k=>[nor.getX(f*3+k),nor.getY(f*3+k),nor.getZ(f*3+k)]),{kind:cart.has(f)?'cartilage':'bone'});}


 const d=JSON.parse(fs.readFileSync(dir+'/patella-'+side+'.json'));
 const terms=[
 ['base','Base of patella','Основание надколенника','Basis patellae'],
 ['apex','Apex of patella','Верхушка надколенника','Apex patellae'],
 ['anterior','Anterior surface of patella','Передняя поверхность надколенника','Facies anterior patellae'],
 ['posterior','Posterior surface of patella','Задняя поверхность надколенника','Facies posterior patellae'],
 ['articular','Articular surface of patella','Суставная поверхность надколенника','Facies articularis patellae'],
 ['medial-facet','Medial articular facet of patella','Медиальная суставная фасетка надколенника','Facies articularis medialis patellae'],
 ['lateral-facet','Lateral articular facet of patella','Латеральная суставная фасетка надколенника','Facies articularis lateralis patellae'],
 ['ridge','Vertical ridge of patella','Вертикальный гребень суставной поверхности','Crista verticalis patellae'],
 ['medial-border','Medial border of patella','Медиальный край надколенника','Margo medialis patellae'],
 ['lateral-border','Lateral border of patella','Латеральный край надколенника','Margo lateralis patellae'],
 ['nonarticular','Non-articular posterior area of patella','Нижний несуставной участок задней поверхности','Pars nonarticularis faciei posterioris patellae'],
 ];
 d.landmarks=terms.map(([key,en,ru,la])=>({id:d.id+'-'+key,en,ru,la,labelPosition:[0,0,0],pointer:[],source:'editorial'}));
 const regions=Object.fromEntries(d.landmarks.map(l=>[l.id,[]]));
 for(let f=0;f<tags.length;f++){
  const p=[0,1,2].map(a=>(positions[f*9+a]+positions[f*9+3+a]+positions[f*9+6+a])/3);if(side==='r')p[0]*=-1;const [x,y]=p;
  const n=[0,1,2].map(a=>(normals[f*9+a]+normals[f*9+3+a]+normals[f*9+6+a])/3);if(side==='r')n[0]*=-1;
  const back=tags[f].kind==='cartilage'||n[2]<-.2;
  // The source cartilage material also covers the inferior pole. Restrict the
  // articular mask to the superior region, above the visible transverse break.
  const articular=tags[f].kind==='cartilage'&&y>-.48;
  const ridge=profiles.reduce((a,b)=>Math.abs(a.y-y)<Math.abs(b.y-y)?a:b).ridge;
  const masks={base:y>.70,apex:y<-.72,anterior:!back&&n[2]>.15,posterior:back,
   articular,'medial-facet':articular&&x<ridge[0],'lateral-facet':articular&&x>=ridge[0],
   ridge:articular&&Math.abs(x-ridge[0])<.045,
   'medial-border':y>-.72&&y<.70&&x<-.55&&n[0]<-.55,
   'lateral-border':y>-.72&&y<.70&&x>.55&&n[0]>.55,
   nonarticular:back&&!articular&&y<=-.48};
  for(const [key,yes] of Object.entries(masks))if(yes)regions[d.id+'-'+key].push(f);
 }
 for(const l of d.landmarks){const faces=regions[l.id];if(!faces.length)throw Error('Empty '+l.id);const f=faces[Math.floor(faces.length/2)];l.labelPosition=[0,1,2].map(a=>(positions[f*9+a]+positions[f*9+3+a]+positions[f*9+6+a])/3);}
 for(const [id,faces] of Object.entries(regions))if(!faces.length)throw Error(`Empty ${id}`);
 const binary=Buffer.concat([Buffer.from(new Float32Array(positions).buffer),Buffer.from(new Float32Array(normals).buffer)]),hash=crypto.createHash('sha256').update(binary).digest('hex');
 fs.writeFileSync(`${dir}/patella-${side}.bin`,binary);d.vertexCount=positions.length/3;d.regionHash=hash;d.regionsUrl=`/models/bone-details/v1/patella-${side}.surfaces.json`;
 fs.writeFileSync(`${dir}/patella-${side}.json`,JSON.stringify(d));
 fs.writeFileSync(`${dir}/patella-${side}.surfaces.json`,JSON.stringify({version:1,boneId:d.id,sourceHash:hash,sourceModelHash:fbxHash,method:'editorial-contours-and-authored-cartilage',review:'atlas-referenced; not independently expert-reviewed',references:['https://www.kenhub.com/en/library/anatomy/patella','https://www.ncbi.nlm.nih.gov/books/NBK519534/'],regions}));
 report.push({bone:d.id,triangles:tags.length,regions:Object.fromEntries(d.landmarks.map(l=>[l.en,regions[l.id].length]))});g.dispose();
}
fs.writeFileSync('../.anatomy-source/patella-surface-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));

const index=JSON.parse(fs.readFileSync(dir+'/index.json'));for(const bone of index)if(['patella-l','patella-r'].includes(bone.id)){const d=JSON.parse(fs.readFileSync(dir+'/'+bone.id+'.json'));bone.landmarkCount=d.landmarks.length;bone.searchText=d.landmarks.map(l=>l.ru+' '+l.la+' '+l.en).join(' ');}fs.writeFileSync(dir+'/index.json',JSON.stringify(index));
