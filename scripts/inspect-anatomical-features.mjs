import fs from 'node:fs';
import crypto from 'node:crypto';
import {FBXLoader} from 'three/examples/jsm/loaders/FBXLoader.js';
const root='public/models/bone-details/v1';
const raw=fs.readFileSync('../.anatomy-source/SkeletalSystem100.fbx');
if(crypto.createHash('sha256').update(raw).digest('hex')!=='294a649765cd060a62a4095da52b9c8ef2d97769aa447e196448aa5f7d596dea')throw Error('Unexpected source');
const scene=new FBXLoader().parse(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength),'');
const meshes=new Map();scene.traverse(n=>{if(n.isMesh)meshes.set(n.userData.originalName??n.name,n);});
const out={};
for(const row of JSON.parse(fs.readFileSync(root+'/index.json'))){
 const d=JSON.parse(fs.readFileSync(`${root}/${row.id}.json`));const mesh=meshes.get(d.sourceName);
 if(!mesh||mesh.geometry.attributes.position.count!==d.vertexCount)continue;
 const cartilage=[];
 for(const group of mesh.geometry.groups){const mat=Array.isArray(mesh.material)?mesh.material[group.materialIndex]:mesh.material;if(/^Cartilage/.test(mat.name))for(let f=group.start/3;f<(group.start+group.count)/3;f++)cartilage.push(f);}
 out[d.id]={vertexCount:d.vertexCount,cartilage};
}
fs.writeFileSync('../.anatomy-source/anatomical-cartilage.json',JSON.stringify(out));
console.log(Object.entries(out).filter(([,d])=>d.cartilage.length).map(([id,d])=>`${id}: ${d.cartilage.length}`).join('\n'));
