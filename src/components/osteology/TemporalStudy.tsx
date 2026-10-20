"use client";
import {useEffect,useMemo,useRef,useState} from 'react';
import {Canvas,useThree} from '@react-three/fiber';
import {OrbitControls} from '@react-three/drei';
import type {OrbitControls as OrbitControlsImpl} from 'three-stdlib';
import {Box3,BufferAttribute,BufferGeometry,DoubleSide,Mesh,Vector3} from 'three';
import Link from 'next/link';
import {WebGLGate} from '@/components/atlas/WebGLGate';
import {AnatomyLabel} from './AnatomyLabel';
import type {BoneLandmark,Point3} from '@/lib/osteology/types';

type Item={id:string;file:string;vertexCount:number;center:Point3;ru?:string;la?:string;color?:string;accuracyNote?:string};
type Manifest={items:Item[];regions:BoneLandmark[];retainedOnOriginal:BoneLandmark[];specimenNotice:string};
type Model={manifest:Manifest;buffers:Record<string,ArrayBuffer>;masks:Record<string,number[]>};
function Part({item,buffer,faces,color,onSelect,opacity=1}:{item:Item;buffer:ArrayBuffer;faces?:number[];color:string;onSelect?:(face:number)=>void;opacity?:number}){
 const geometry=useMemo(()=>{
  const g=new BufferGeometry();
  const p=new Float32Array(buffer,0,item.vertexCount*3),n=new Float32Array(buffer,item.vertexCount*12,item.vertexCount*3);
  const select=(a:Float32Array)=>{if(!faces)return a;const out=new Float32Array(faces.length*9);faces.forEach((f,i)=>out.set(a.subarray(f*9,f*9+9),i*9));return out;};
  g.setAttribute('position',new BufferAttribute(select(p),3));g.setAttribute('normal',new BufferAttribute(select(n),3));
  g.computeBoundingSphere();return g;
 },[buffer,item.vertexCount,faces]);
 useEffect(()=>()=>geometry.dispose(),[geometry]);
 return <mesh geometry={geometry} raycast={opacity<1?()=>{}:Mesh.prototype.raycast} onClick={e=>{e.stopPropagation();onSelect?.(e.faceIndex??-1);}}>
  <meshStandardMaterial color={color} opacity={opacity} transparent={opacity<1} depthWrite={opacity===1} side={DoubleSide} roughness={.7} polygonOffset={!!faces} polygonOffsetFactor={-2} polygonOffsetUnits={-2}/>
 </mesh>;
}
function Camera({point,radius,revision}:{point:Point3;radius:number;revision:number}){
 const controls=useRef<OrbitControlsImpl>(null);
 const size=useThree(state=>state.size);
 useEffect(()=>{const c=controls.current;if(!c)return;const target=new Vector3(...point);const direction=c.object.position.clone().sub(c.target).normalize();const halfFov=Math.atan(Math.tan(20*Math.PI/180)*Math.min(1,size.width/Math.max(1,size.height)));c.target.copy(target);c.object.position.copy(target).addScaledVector(direction,Math.max(.12,radius/Math.sin(halfFov)*1.2));c.update();},[point,radius,revision,size.width,size.height]);
 return <OrbitControls ref={controls} makeDefault minDistance={.05} maxDistance={8}/>;
}
const origin:Point3=[0,0,0];
export function TemporalStudy(){
 const [model,setModel]=useState<Model|null>(null),[error,setError]=useState(''),[selected,setSelected]=useState(''),[revision,setRevision]=useState(0);
 const [mode,setMode]=useState<'solid'|'transparent'|'isolated'>('transparent');
 const [boneOpacity,setBoneOpacity]=useState(.15);
 const [query,setQuery]=useState('');
 useEffect(()=>{const controller=new AbortController();const read=async(url:string)=>{const r=await fetch(url,{signal:controller.signal});if(!r.ok)throw new Error(`Загрузка: ${r.status}`);return r;};
 (async()=>{const manifest:Manifest=await (await read('/models/openear/theta/manifest.json')).json();const masks=await(await read('/models/openear/theta/regions.json')).json();
 const entries=await Promise.all(manifest.items.map(async item=>{const buffer=await(await read(item.file)).arrayBuffer();if(buffer.byteLength!==item.vertexCount*24)throw new Error('Повреждён файл геометрии');return [item.id,buffer] as const;}));
 setModel({manifest,masks,buffers:Object.fromEntries(entries)});
 })().catch(e=>{if(!controller.signal.aborted)setError(String(e));});return()=>controller.abort();},[]);
 const labels=useMemo(()=>model?[...model.manifest.regions,...model.manifest.items.filter(i=>i.id!=='bone').map((i):BoneLandmark=>({id:i.id,en:i.id,ru:i.ru!,la:i.la!,position:i.center,labelPosition:i.center,pointer:[],source:'editorial',accuracy:'approximate',accuracyNote:i.accuracyNote}))]:[],[model]);
 const active=labels.find(l=>l.id===selected),bone=model?.manifest.items.find(i=>i.id==='bone');
 const isWall=!!model?.masks[selected];
 const framing=useMemo(()=>{
  if(!model)return {point:origin,radius:1.5};
  const item=model.manifest.items.find(i=>i.id===(selected&&!isWall?selected:'bone'))!;
  const positions=new Float32Array(model.buffers[item.id],0,item.vertexCount*3);
  const box=new Box3(),p=new Vector3();
  const faces=model.masks[selected];
  if(faces)for(const f of faces)for(let k=0;k<3;k++)box.expandByPoint(p.fromArray(positions,f*9+k*3));
  else for(let i=0;i<positions.length;i+=3)box.expandByPoint(p.fromArray(positions,i));
  return {point:box.getCenter(new Vector3()).toArray() as Point3,radius:box.getSize(new Vector3()).length()/2};
 },[model,selected,isWall]);
 const select=(id:string)=>{setSelected(id);setRevision(n=>n+1);};
 return <main className="min-h-dvh flex flex-col bg-slate-50 text-slate-800">
  <header className="p-4 border-b"><Link className="underline" href="/osteology?bone=temporal-bone-l">← Целая левая височная кость и все её подписи</Link><h1 className="text-xl font-semibold">Подробный образец височной области · OpenEar THETA</h1><p className="text-sm">Препарированный образец с границами распила; не полная изолированная кость. Сторона указана по каталогу Theta-Left.</p></header>
  <Link href="/osteology/temporal-reconstruction" className="block p-4 underline text-teal-800">Открыть учебную реконструкцию целой левой височной кости →</Link>
  {error&&<p role="alert" className="p-4">{error}</p>}
  <div className="flex flex-col lg:flex-row">
   <section className="flex-1 min-w-0" aria-label="Подробная 3D-модель">
    <div className="p-3 border-b flex flex-wrap items-center gap-2" aria-label="Режим просмотра">
     {([['solid','Целый образец'],['transparent','Сквозь кость'],['isolated','Только выбранное']] as const).map(([value,title])=><button key={value} disabled={value==='isolated'&&!selected} aria-pressed={mode===value} onClick={()=>setMode(value)} className={`rounded border px-3 py-2 text-sm disabled:opacity-40 ${mode===value?'bg-teal-100 border-teal-700':'bg-white'}`}>{title}</button>)}
     {mode==='transparent'&&<label className="text-xs">Непрозрачность кости {Math.round(boneOpacity*100)}% <input aria-label="Непрозрачность кости" type="range" min=".05" max=".4" step=".05" value={boneOpacity} onChange={e=>setBoneOpacity(Number(e.target.value))}/></label>}
     <button className="rounded border px-3 py-2 text-sm" onClick={()=>setRevision(n=>n+1)}>Приблизить выбор</button>
    </div>
    <div className="h-[60dvh] min-h-80">{model&&bone?<WebGLGate><Canvas camera={{position:[0,0,-3.8],fov:40,near:.005,far:100}}>
     <color attach="background" args={['#edf0f1']}/><ambientLight intensity={.8}/><directionalLight position={[3,4,-5]} intensity={2.5}/><directionalLight position={[-3,-1,3]} intensity={1}/>
     {mode!=='isolated'&&<Part item={bone} buffer={model.buffers.bone} color="#dfcaaa" opacity={mode==='transparent'?boneOpacity:1} onSelect={face=>{const match=model.manifest.regions.find(r=>model.masks[r.id].includes(face));if(match)select(match.id);}}/>}
     {model.manifest.regions.filter(r=>mode!=='isolated'||r.id===selected).map((r,i)=><Part key={r.id} item={bone} buffer={model.buffers.bone} faces={model.masks[r.id]} color={selected===r.id?'#08bca8':['#dc8bac','#76bcae'][i]} onSelect={()=>select(r.id)}/>)}
     {model.manifest.items.filter(i=>i.id!=='bone'&&(mode!=='isolated'||i.id===selected)).map(i=><Part key={i.id} item={i} buffer={model.buffers[i.id]} color={selected===i.id?'#08bca8':i.color!} onSelect={()=>select(i.id)}/>)}
     <Camera point={framing.point} radius={framing.radius} revision={revision}/>
    </Canvas></WebGLGate>:<p role="status" className="p-4">Загрузка подробной геометрии…</p>}</div>
    <div role="status" aria-label="Выбранная поверхность" className="border-t bg-white p-4 min-h-32">{active?<><AnatomyLabel landmark={active}/><p className="text-xs mt-2">{mode==='isolated'?'Выбранная область показана отдельно.':'Окружающие структуры сохранены. Если они закрывают выбор, включите «Только выбранное».'}</p></>:<p>Выберите цветную область или название справа. Вращение — перетаскиванием, масштаб — колёсиком или жестом двумя пальцами.</p>}</div>
   </section>
   <aside className="p-4 lg:w-80 lg:max-h-[78dvh] overflow-auto border-l" aria-label="Структуры образца">
    <button onClick={()=>{select('');setMode('transparent');setQuery('');}} className="mb-3 underline">Весь образец</button>
    <input aria-label="Поиск структуры" placeholder="Название на русском или латыни" value={query} onChange={e=>setQuery(e.target.value)} className="w-full border rounded p-2 mb-3 text-sm"/>
    <h2 className="font-semibold">Приблизительно перенесённые костные области</h2>
    {labels.map((l,i)=><div key={l.id}>{i===2&&<h2 className="font-semibold mt-4">Авторские сегменты внутренних структур</h2>}{`${l.ru} ${l.la}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())&&<button aria-pressed={selected===l.id} onClick={()=>select(l.id)} className={`w-full text-left rounded p-2 my-1 text-sm ${selected===l.id?'bg-teal-100 ring-2 ring-teal-600':'bg-white border'}`}>{l.ru}<span className="block italic text-xs">{l.la}</span></button>}</div>)}
    {labels.length>0&&!labels.some(l=>`${l.ru} ${l.la}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))&&<p className="text-sm">Структура не найдена.</p>}
    {model&&<details className="mt-4"><summary>Остались на целой модели: {model.manifest.retainedOnOriginal.length}</summary><p className="text-sm">На этом образце достоверный перенос пока невозможен.</p><ul className="text-sm list-disc pl-4">{model.manifest.retainedOnOriginal.map(l=><li key={l.id}>{l.ru}</li>)}</ul><Link className="underline" href="/osteology?bone=temporal-bone-l">Открыть целую кость</Link></details>}
   </aside>
  </div>
  <footer className="p-4 text-xs border-t space-y-1"><p>Источник: <a className="underline" href="https://zenodo.org/records/1473724">Sieber et al., OpenEar (2019)</a> · <a className="underline" href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>. Сетка оптимизирована с шагом 0,4 мм; мелкие детали могли измениться. Подписи и приблизительные области добавлены в проекте.</p><p><a className="underline" href="/models/openear/theta/ATTRIBUTION.txt">Авторство, изменения и ограничения</a> · <a className="underline" href="https://augment.surgery/products/theta-left-openear-3d-temporal-bones">Каталог Theta-Left</a></p></footer>
 </main>;
}
