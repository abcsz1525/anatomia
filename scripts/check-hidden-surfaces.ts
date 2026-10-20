import fs from 'node:fs';
import {BufferGeometry,BufferAttribute,Mesh,MeshBasicMaterial,DoubleSide,Raycaster,Vector3} from 'three';
const root='public/models/bone-details/v1';
for(const id of ['sphenoid-bone','sacrum','ethmoid-bone']){
 const d=JSON.parse(fs.readFileSync(`${root}/${id}.json`,'utf8'));
 const regions=JSON.parse(fs.readFileSync(`${root}/${id}.surfaces.json`,'utf8')).regions;
 const buf=fs.readFileSync(`${root}/${id}.bin`),pos=new Float32Array(buf.buffer,buf.byteOffset,d.vertexCount*3);
 const geometry=new BufferGeometry();geometry.setAttribute('position',new BufferAttribute(pos,3));
 const mesh=new Mesh(geometry,new MeshBasicMaterial({side:DoubleSide}));mesh.updateMatrixWorld();
 for(const l of d.landmarks.filter((l:{la:string})=>/Canalis pterygoideus|Canalis sacralis|Concha nasalis superior|Bulla ethmoidalis/.test(l.la))){
  const set=new Set<number>(regions[l.id]),visible=[];
  const dirs:Vector3[]=[];for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)for(let z=-1;z<=1;z++)if(x||y||z)dirs.push(new Vector3(x,y,z).normalize());
  for(const f of set){const a=new Vector3().fromArray(pos,f*9),b=new Vector3().fromArray(pos,f*9+3),c=new Vector3().fromArray(pos,f*9+6);const center=a.clone().add(b).add(c).divideScalar(3),normal=b.clone().sub(a).cross(c.clone().sub(a)).normalize();
   for(const dir of [...dirs,normal,normal.clone().negate()]){const hits=new Raycaster(center.clone().addScaledVector(dir,4),dir.clone().negate()).intersectObject(mesh);if(hits[0]?.faceIndex!=null&&set.has(hits[0].faceIndex)){visible.push({direction:dir.toArray(),center:center.toArray(),face:f});break;}}
   if(visible.length>=3)break;
  }
  const bounds={min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]};
  for(const f of set)for(let v=0;v<3;v++)for(let axis=0;axis<3;axis++){bounds.min[axis]=Math.min(bounds.min[axis],pos[f*9+v*3+axis]);bounds.max[axis]=Math.max(bounds.max[axis],pos[f*9+v*3+axis]);}
  console.log(JSON.stringify({id:l.id,faces:set.size,bounds,visible}));
 }
 geometry.dispose();(mesh.material as MeshBasicMaterial).dispose();
}
