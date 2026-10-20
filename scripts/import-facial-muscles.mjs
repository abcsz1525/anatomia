/** Import actual Z-Anatomy facial meshes, registered against shared skull landmarks. */
import fs from 'node:fs';
import crypto from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {FBXLoader} from 'three/examples/jsm/loaders/FBXLoader.js';
import {Matrix4} from 'three';
import {parse} from 'csv-parse/sync';
const dir='public/models/v1',path=dir+'/atlas.json';
const atlas=JSON.parse(fs.readFileSync(path));
const terms=JSON.parse(fs.readFileSync('content/facial-muscles.json'));
const raw=fs.readFileSync('../.anatomy-source/MuscularSystem100.fbx');
const hash=crypto.createHash('sha256').update(raw).digest('hex');
if(hash!=='4c19df534d5d84aabbce08604306aa0485b43e8a2483c72a95b569e1dfea2279')throw Error('Unexpected muscle source version');
const scene=new FBXLoader().parse(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength),'');scene.updateMatrixWorld(true);
const skeletonRaw=fs.readFileSync('../.anatomy-source/SkeletalSystem100.fbx');
const skeleton=new FBXLoader().parse(skeletonRaw.buffer.slice(skeletonRaw.byteOffset,skeletonRaw.byteOffset+skeletonRaw.byteLength),'');skeleton.updateMatrixWorld(true);
const bones=[];skeleton.traverse(n=>{if(n.isMesh&&['Mandible','Frontal bone','Zygomatic bone.r'].includes(n.userData.originalName??n.name)){const g=n.geometry.clone().applyMatrix4(n.matrixWorld);g.computeBoundingBox();bones.push({name:n.userData.originalName??n.name,bounds:[g.boundingBox.min.toArray(),g.boundingBox.max.toArray()]});g.dispose();}});
const anchors=[['Mandible','Mandible'],['Frontal bone','Frontal bone'],['Zygomatic bone.r','Right zygomatic bone']];
// Fit positive axis scales + translation from matching skull bounding-box extrema.
const pairs=anchors.flatMap(([src,dst])=>{const a=bones.find(b=>b.name===src),b=atlas.parts.find(p=>p.name===dst);if(!a||!b)throw Error('Missing skull anchor');return [0,1].map(i=>[a.bounds[i],b.bounds[i]]);});
const scale=[],offset=[];for(let k=0;k<3;k++){const x=pairs.map(p=>p[0][k]),y=pairs.map(p=>p[1][k]);const mx=x.reduce((a,b)=>a+b)/x.length,my=y.reduce((a,b)=>a+b)/y.length;const s=x.reduce((a,v,i)=>a+(v-mx)*(y[i]-my),0)/x.reduce((a,v)=>a+(v-mx)**2,0);scale.push(s);offset.push(my-s*mx);}
const residual=Math.max(...pairs.flatMap(([a,b])=>a.map((v,k)=>Math.abs(v*scale[k]+offset[k]-b[k]))));
if(residual>.004||scale.some(s=>s<.009||s>.012))throw Error('Skull registration outside tolerance');
const matrix=new Matrix4().makeScale(...scale);matrix.setPosition(...offset);
const chunkUrl='/models/v1/facial-z-anatomy.bin';
let chunk=atlas.chunks.findIndex(c=>c.url===chunkUrl);if(chunk<0)chunk=atlas.chunks.length;
const blocks=[],parts=[],rows=[];let size=0;
function put(a){while(size%4){blocks.push(Buffer.alloc(1));size++;}const at=size,b=Buffer.from(a.buffer,a.byteOffset,a.byteLength);blocks.push(b);size+=b.length;return at;}
for(const [source,ru,la] of terms)for(const side of ['l','r']){
 let mesh;scene.traverse(n=>{if(n.isMesh&&(n.userData.originalName??n.name)===source+'.'+side)mesh=n;});if(!mesh)throw Error('Missing '+source+'.'+side);
 const g=mesh.geometry.clone().applyMatrix4(mesh.matrixWorld).applyMatrix4(matrix);g.computeBoundingBox();
 const p=g.attributes.position,n=g.attributes.normal;const normals=new Int16Array(n.count*3);for(let i=0;i<n.count;i++){const len=Math.hypot(n.getX(i),n.getY(i),n.getZ(i));for(let a=0;a<3;a++)normals[i*3+a]=Math.round(n.array[i*3+a]/len*32767);}
 const indices=Uint32Array.from({length:p.count},(_,i)=>i);if(mesh.matrixWorld.determinant()<0)for(let i=0;i<indices.length;i+=3)[indices[i+1],indices[i+2]]=[indices[i+2],indices[i+1]];
 const id='ZF-'+source.toLowerCase().replace(/[^a-z0-9]+/g,'-')+'-'+side,name=(side==='l'?'Left ':'Right ')+source;
 parts.push({id,name,conceptId:id,system:'muscular',chunk,positions:put(p.array),normals:put(normals),indices:put(indices),vertexCount:p.count,indexCount:indices.length,bounds:[g.boundingBox.min.toArray(),g.boundingBox.max.toArray()]});
 rows.push({id,en:name,la,ru,topic:'muscles-head',aliases:/masseter|pterygoid|^Temporalis/.test(source)?'жевательные мышцы;мышцы жевания;mastication':'мимические мышцы;мышцы лица;facial expression'});g.dispose();
}
const bytes=Buffer.concat(blocks),gz=gzipSync(bytes);fs.writeFileSync(dir+'/facial-z-anatomy-mastication.bin.gz',gz);
atlas.chunks[chunk]={url:chunkUrl,bytes:bytes.length,gzip:'/models/v1/facial-z-anatomy-mastication.bin.gz',gzipBytes:gz.length};
atlas.parts=atlas.parts.filter(p=>!p.id.startsWith('ZF-')).concat(parts);
atlas.concepts=atlas.concepts.filter(p=>!p.id.startsWith('ZF-')).concat(parts.map(p=>({id:p.id,name:p.name,elements:[p.id]})));
atlas.triangles=atlas.parts.reduce((sum,p)=>sum+p.indexCount/3,0);
atlas.supplements={...atlas.supplements,facialMuscles:{source:'Z-Anatomy / LluisV',license:'CC BY-SA 4.0',sha256:hash,count:parts.length,scale,offset,maxAnchorResidualMeters:residual,registration:'Approximate affine fit to mandible, frontal bone and right zygomatic bone; not expert-validated'}};
fs.writeFileSync(path,JSON.stringify(atlas));
fs.writeFileSync(dir+'/atlas-mastication-20261019.json',JSON.stringify(atlas));
const csv='content/structures.csv',all=parse(fs.readFileSync(csv,'utf8'),{columns:true,skip_empty_lines:true}).filter(r=>!r.id.startsWith('ZF-')).concat(rows).sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
const keys=['id','en','la','ru','topic','aliases'],quote=v=>'"'+String(v??'').replaceAll('"','""')+'"';
// Preserve existing CSV text; new ZF rows sort after the original FJ rows.
const original=fs.readFileSync(csv,'utf8').split(/\r?\n/).filter(l=>!/^"?ZF-/.test(l)).join('\n').trimEnd();
fs.writeFileSync(csv,original+'\n'+all.filter(r=>r.id.startsWith('ZF-')).map(r=>keys.map(k=>quote(r[k])).join(',')).join('\n')+'\n');
console.log(JSON.stringify({parts:parts.length,triangles:parts.reduce((s,p)=>s+p.indexCount/3,0),scale,offset,residual,gzipBytes:gz.length,hash},null,2));
