"use client";
import {useEffect,useMemo,useRef} from 'react';
import {Canvas,useThree} from '@react-three/fiber';
import {OrbitControls} from '@react-three/drei';
import {BufferGeometry,BufferAttribute,CatmullRomCurve3,TubeGeometry,SphereGeometry,Box3,Vector3,Plane,DoubleSide} from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type {OrbitControls as ControlsType} from 'three-stdlib';
import type {BoneLandmark,Point3} from '@/lib/osteology/types';
type Shape={points:Point3[];radius:number;shape?:'ellipsoid'|'mesh'|'compound';scale?:Point3;vertices?:number[];parts?:Shape[]};
export type Canal=BoneLandmark & Shape & {color:string;bulbs?:Point3[];group?:'labyrinth'|'middle-ear'|'mastoid'|'ear-muscles'|'nerves';wall?:boolean};
function makeGeometry(item:Shape):BufferGeometry{
 if(item.shape==='compound'){const parts=item.parts!.map(p=>{const g=makeGeometry(p);if(!g.index)return g;const plain=g.toNonIndexed();g.dispose();return plain;});const merged=mergeGeometries(parts);parts.forEach(p=>p.dispose());if(!merged)throw new Error('Ошибка сборки структуры');return merged;}
 if(item.shape==='mesh'){const g=new BufferGeometry();g.setAttribute('position',new BufferAttribute(new Float32Array(item.vertices!),3));g.computeVertexNormals();g.setAttribute('uv',new BufferAttribute(new Float32Array(item.vertices!.length/3*2),2));return g;}
 if(item.shape==='ellipsoid'){const g=new SphereGeometry(1,40,24);g.scale(...item.scale!);g.translate(...item.points[0]);return g;}
 return new TubeGeometry(new CatmullRomCurve3(item.points.map(p=>new Vector3(...p)),false,'centripetal'),Math.max(96,item.points.length*3),item.radius,16,false);
}
type Props={buffer:ArrayBuffer;vertexCount:number;items:Canal[];selected:string|null;mode:'cut'|'transparent'|'isolated';offset:number;onSelect:(id:string)=>void};
function Camera({items,selected,mode}:Pick<Props,'items'|'selected'|'mode'>){
 const ref=useRef<ControlsType>(null);const {camera,size}=useThree();
 useEffect(()=>{
  const item=mode==='isolated'?items.find(x=>x.id===selected):undefined;
  const center=new Vector3(-.1,-.1,0);let radius=1.1;
  if(item){const box=new Box3().setFromPoints(item.points.map(p=>new Vector3(...p)));box.getCenter(center);radius=box.getSize(new Vector3()).length()/2+(item.scale?Math.max(...item.scale):item.radius*2);}
  const halfFov=Math.atan(Math.tan(20*Math.PI/180)*Math.min(1,size.width/Math.max(size.height,1)));
  const distance=Math.max(.15,radius/Math.sin(halfFov)*1.15);
  camera.position.copy(center).addScaledVector(new Vector3(.55,.9,-.8).normalize(),distance);ref.current?.target.copy(center);ref.current?.update();
 },[camera,size.width,size.height,items,selected,mode]);
 return <OrbitControls ref={ref} makeDefault minDistance={.08} maxDistance={15}/>;
}
function Bone({buffer,vertexCount,mode,offset}:Props){
 const geometry=useMemo(()=>{const g=new BufferGeometry();g.setAttribute('position',new BufferAttribute(new Float32Array(buffer,0,vertexCount*3),3));g.setAttribute('normal',new BufferAttribute(new Float32Array(buffer,vertexCount*12,vertexCount*3),3));return g;},[buffer,vertexCount]);
 useEffect(()=>()=>geometry.dispose(),[geometry]);
 const planes=useMemo(()=>mode==='cut'?[new Plane(new Vector3(0,-1,0),offset)]:[],[mode,offset]);
 return mode==='isolated'?null:<mesh geometry={geometry} raycast={()=>{}}><meshStandardMaterial color="#dfcfb3" transparent opacity={mode==='cut'?.3:.14} depthWrite={false} side={DoubleSide} clippingPlanes={planes}/></mesh>;
}
function Path({item,selected,onSelect}:{item:Canal;selected:boolean;onSelect:(id:string)=>void}){
 const geometry=useMemo(()=>makeGeometry(item),[item]);
 useEffect(()=>()=>geometry.dispose(),[geometry]);
 return <group onClick={e=>{if(e.delta>5)return;e.stopPropagation();onSelect(item.id);}}>
  <mesh geometry={geometry}><meshStandardMaterial color={selected?'#00ffd2':item.color} emissive={selected?'#009c82':'#000000'} emissiveIntensity={.45} roughness={.55} side={DoubleSide} transparent={(item.shape==='ellipsoid'||item.wall)&&!selected} opacity={!selected?(item.wall?.13:item.shape==='ellipsoid'?.3:1):1} depthWrite={(!item.wall&&item.shape!=='ellipsoid')||selected}/></mesh>
  {item.bulbs?.map((p,i)=><mesh key={i} position={p}><sphereGeometry args={[item.radius*1.65,20,12]}/><meshStandardMaterial color={selected?'#00ffd2':item.color}/></mesh>)}
 </group>;
}
export default function TemporalCanalScene(props:Props){
 return <Canvas camera={{position:[2,3,-3],fov:40}} onCreated={({gl})=>{gl.localClippingEnabled=true;}} dpr={[1,2]} style={{touchAction:'none'}}>
  <color attach="background" args={['#edf0f1']}/><ambientLight intensity={1.5}/><directionalLight position={[2,4,-3]} intensity={2}/>
  <Bone {...props}/>
  {props.items.filter(c=>!(props.selected?.startsWith('canal-nerve-')&&['canal-facial','canal-internal-acoustic','canal-chorda','canal-greater-petrosal'].includes(c.id))).filter(c=>!(props.selected?.startsWith('canal-muscle-tensor')&&c.id==='canal-tensor')).filter(c=>props.mode!=='isolated'||!props.selected||c.id===props.selected).map(c=><Path key={c.id} item={c} selected={props.selected===c.id} onSelect={props.onSelect}/>)}
  <Camera items={props.items} selected={props.selected} mode={props.mode}/>
 </Canvas>;
}
