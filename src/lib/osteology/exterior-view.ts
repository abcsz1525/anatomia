import {BufferAttribute,BufferGeometry,DoubleSide,Mesh,MeshBasicMaterial,Raycaster,Vector3} from 'three';

// Compare visible portions of the actual region, rather than guessing a side
// from its name or its label (which may lie outside the bone).
export function exteriorView(positions:Float32Array,faces:readonly number[],side:string):string {
  if(!faces.length)return 'anterior';
  const lateral=side==='right'?-3.8:3.8;
  const views:[string,Vector3][]=[
    ['anterior',new Vector3(0,0,3.8)],['posterior',new Vector3(0,0,-3.8)],
    ['lateral',new Vector3(lateral,0,0)],['medial',new Vector3(-lateral,0,0)],
    ['superior',new Vector3(0,3.8,0)],['inferior',new Vector3(0,-3.8,0)],
  ];
  const geometry=new BufferGeometry();geometry.setAttribute('position',new BufferAttribute(positions,3));
  const material=new MeshBasicMaterial({side:DoubleSide});
  const mesh=new Mesh(geometry,material);mesh.updateMatrixWorld();
  const samples=[];
  for(let i=0;i<Math.min(32,faces.length);i++){
    const face=faces[Math.floor(i*faces.length/Math.min(32,faces.length))];
    if(!Number.isInteger(face)||face<0||face*9+8>=positions.length)continue;
    const a=new Vector3().fromArray(positions,face*9),b=new Vector3().fromArray(positions,face*9+3),c=new Vector3().fromArray(positions,face*9+6);
    const normal=b.clone().sub(a).cross(c.clone().sub(a));
    samples.push({face,center:a.add(b).add(c).divideScalar(3),normal});
  }
  let best='anterior',bestScore=-1;
  for(const [view,camera] of views){
    let score=0;
    for(const {face,center,normal} of samples){
      const direction=center.clone().sub(camera).normalize();
      const hits=new Raycaster(camera,direction).intersectObject(mesh);
      if(hits[0]?.faceIndex===face||hits[0]?.point.distanceToSquared(center)<1e-10)
        score+=Math.abs(normal.dot(direction));
    }
    if(score>bestScore){bestScore=score;best=view;}
  }
  geometry.dispose();material.dispose();
  return best;
}
