"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useThree, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { BufferAttribute, BufferGeometry, Color, DoubleSide } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { BoneDetail, BoneLandmark, Point3 } from "@/lib/osteology/types";
import { brushFaces, surfaceTopology, faceRegions, nextSurface, type SurfaceRegions } from "@/lib/osteology/regions";
import { sectionPlane, sectionRaycast, type SectionSide } from "@/lib/osteology/section";

function Controls({ reset, view, side }: { reset:number; view:string; side:string }) {
  const { camera } = useThree();
  const controls = useRef<OrbitControlsImpl>(null);
  useEffect(()=>{
    const lateral=side==='right'?-3.8:3.8;
    const vertical=view==='superior'||view==='inferior';
    camera.up.set(0,vertical?0:1,view==='superior'?-1:vertical?1:0);
    camera.position.set(view==='lateral'?lateral:view==='medial'?-lateral:0,view==='superior'?3.8:view==='inferior'?-3.8:0,view==='posterior'?-3.8:view==='anterior'?3.8:0);
    controls.current?.target.set(0,0,0); controls.current?.update();
  },[camera,reset,view,side]);
  return <OrbitControls ref={controls} makeDefault enableDamping minDistance={0.15} maxDistance={9} />;
}

type Props = {
  detail:BoneDetail; buffer:ArrayBuffer; landmarks:BoneLandmark[]; selectedId:string|null;
  showAll:boolean; reset:number; placing:boolean; regions:SurfaceRegions;
  paintMode:'off'|'paint'|'erase'; radius:number;
  view:string;
  section:SectionSide; sectionOffset:number;
  onSelect(id:string):void; onPlace(point:Point3):void; onPaint(faces:number[]):void;
};

function Surface({detail,buffer,landmarks,selectedId,showAll,placing,regions,paintMode,radius,onSelect,onPlace,onPaint,section,sectionOffset}:Props) {
  const plane=useMemo(()=>sectionPlane(section,sectionOffset),[section,sectionOffset]);
  const raycast=useMemo(()=>sectionRaycast(plane),[plane]);
  const [hover,setHover]=useState<number|null>(null);
  const [preview,setPreview]=useState<number[]>([]);
  const geometry=useMemo(()=>{
    if(buffer.byteLength!==detail.vertexCount*24)throw new Error('Повреждена геометрия кости');
    const g=new BufferGeometry();
    g.setAttribute('position',new BufferAttribute(new Float32Array(buffer,0,detail.vertexCount*3),3));
    g.setAttribute('normal',new BufferAttribute(new Float32Array(buffer,detail.vertexCount*12,detail.vertexCount*3),3));
    g.setAttribute('color',new BufferAttribute(new Float32Array(detail.vertexCount*3),3));
    return g;
  },[buffer,detail.vertexCount]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  const topology=useMemo(()=>surfaceTopology(geometry.attributes.position.array as Float32Array),[geometry]);
  const byFace=useMemo(()=>faceRegions(regions,landmarks.map(l=>l.id)),[regions,landmarks]);
  const hoverIds=hover===null?[]:byFace.get(hover)??[];
  const hovered=hoverIds.includes(selectedId??'')?selectedId:hoverIds[0];
  useEffect(()=>{
    const attr=geometry.attributes.color;
    const base=new Color('#e9dac0'), active=new Color('#20b5a7'), highlight=new Color('#ffbd55');
    const palette=new Map(landmarks.map(l=>{const hash=Array.from(l.en||l.la).reduce((s,c)=>(s*31+c.charCodeAt(0))>>>0,0);return [l.id,new Color().setHSL((hash%360)/360,.38,.64)] as const;}));
    const brush=new Set(preview);
    for(let f=0;f<detail.vertexCount/3;f++) {
      const ids=byFace.get(f)??[];
      const color=paintMode!=='off'&&brush.has(f)?highlight:selectedId&&ids.includes(selectedId)?active:hovered&&ids.includes(hovered)?highlight:showAll&&ids.length?(palette.get(ids[0])??base):base;
      for(let v=0;v<3;v++)attr.setXYZ(f*3+v,color.r,color.g,color.b);
    }
    // Three.js owns this GPU buffer; flagging its imperative update is not a React state mutation.
    // eslint-disable-next-line react-hooks/immutability
    attr.needsUpdate=true;
  },[geometry,byFace,selectedId,showAll,hovered,detail.vertexCount,preview,paintMode,landmarks]);
  function move(e:ThreeEvent<PointerEvent>) {
    if(e.faceIndex==null)return;
    setHover(e.faceIndex);
    if(paintMode!=='off')setPreview(brushFaces(topology,e.faceIndex,e.point.toArray() as Point3,radius));
  }
  return <>
    <mesh geometry={geometry} raycast={raycast} onPointerMove={move} onPointerOut={()=>{setHover(null);setPreview([]);}}
      onClick={e=>{
        if(e.delta>5 || e.faceIndex==null)return;
        e.stopPropagation();
        if(placing){onPlace(e.point.toArray() as Point3);return;}
        if(paintMode!=='off'){onPaint(brushFaces(topology,e.faceIndex,e.point.toArray() as Point3,radius));return;}
        const ids=byFace.get(e.faceIndex)??[];
        const next=nextSurface(ids,selectedId);
        if(next)onSelect(next);
      }}>
      <meshStandardMaterial vertexColors roughness={0.78} side={DoubleSide} clippingPlanes={plane?[plane]:null}/>
    </mesh>
  </>;
}

export default function BoneScene(props:Props) {
  return <Canvas camera={{position:[0,0,3.8],fov:40}} onCreated={({gl})=>{gl.localClippingEnabled=true;}} dpr={[1,2]} style={{touchAction:'none',cursor:props.placing||props.paintMode!=='off'?'crosshair':'pointer'}}>
    <color attach="background" args={['#edf0f1']}/>
    <ambientLight intensity={1.15}/>
    <directionalLight position={[3,4,5]} intensity={2.2}/>
    <directionalLight position={[-3,1,-3]} intensity={0.9}/>
    <Surface {...props}/>
    <Controls reset={props.reset} view={props.view} side={props.detail.side}/>
  </Canvas>;
}
