import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import {BufferGeometry,BufferAttribute,Mesh,MeshBasicMaterial,DoubleSide,Raycaster,Vector3} from 'three';
import {internalViews} from './internal-views';
import {sectionPlane,sectionRaycast} from './section';

describe('internal view presets against bundled models',()=>{
  for(const [id,preset] of Object.entries(internalViews))it(`exposes a clickable face of ${id}`,()=>{
    const bone=id.startsWith('ethmoid-')?'ethmoid-bone':id.startsWith('sphenoid-')?'sphenoid-bone':'sacrum';
    const root=`public/models/bone-details/v1/${bone}`;
    const detail=JSON.parse(readFileSync(`${root}.json`,'utf8'));
    expect(detail.landmarks.some((l:{id:string})=>l.id===id)).toBe(true);
    const regions=JSON.parse(readFileSync(`${root}.surfaces.json`,'utf8')).regions;
    const faces=new Set<number>(regions[id]);
    const bytes=readFileSync(`${root}.bin`);
    const positions=new Float32Array(bytes.buffer,bytes.byteOffset,detail.vertexCount*3);
    const geometry=new BufferGeometry();geometry.setAttribute('position',new BufferAttribute(positions,3));
    const material=new MeshBasicMaterial({side:DoubleSide});
    const mesh=new Mesh(geometry,material);mesh.updateMatrixWorld();
    mesh.raycast=sectionRaycast(sectionPlane(preset.section,preset.offset));
    const camera=preset.view==='posterior'?new Vector3(0,0,-3.8):new Vector3(preset.view==='lateral'?3.8:-3.8,0,0);
    let reachable=false;
    for(const face of faces){
      const center=new Vector3();
      for(let v=0;v<3;v++)center.add(new Vector3().fromArray(positions,face*9+v*3));
      center.divideScalar(3);
      const hits=new Raycaster(camera,center.sub(camera).normalize()).intersectObject(mesh);
      if(hits[0]?.faceIndex!=null&&faces.has(hits[0].faceIndex)){reachable=true;break;}
    }
    geometry.dispose();material.dispose();
    expect(reachable).toBe(true);
  });
});
