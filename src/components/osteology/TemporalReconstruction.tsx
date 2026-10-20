"use client";
import {useEffect,useState} from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {WebGLGate} from '@/components/atlas/WebGLGate';
import {AnatomyLabel} from './AnatomyLabel';
import type {BoneDetail} from '@/lib/osteology/types';
import type {Canal} from './TemporalCanalScene';
import type {SurfaceRegions} from '@/lib/osteology/regions';

const CanalScene=dynamic(()=>import('./TemporalCanalScene'),{ssr:false});
const Scene=dynamic(()=>import('./BoneScene'),{ssr:false});
type Model={detail:BoneDetail & {entranceViews?:Record<string,string>};buffer:ArrayBuffer;regions:SurfaceRegions;canals:Canal[]};
const views=[['lateral','Снаружи'],['medial','Изнутри'],['inferior','Снизу'],['superior','Сверху'],['anterior','Спереди'],['posterior','Сзади']];
export function TemporalReconstruction(){
 const [model,setModel]=useState<Model|null>(null),[error,setError]=useState('');
 const [internal,setInternal]=useState(false),[canalMode,setCanalMode]=useState<'cut'|'transparent'|'isolated'>('cut'),[offset,setOffset]=useState(-.1);
 const [selected,setSelected]=useState<string|null>(null),[view,setView]=useState('lateral'),[reset,setReset]=useState(0);
 useEffect(()=>{
  const controller=new AbortController();
  const read=async(url:string)=>{const r=await fetch(url,{signal:controller.signal});if(!r.ok)throw new Error(`Не удалось загрузить модель (${r.status})`);return r;};
  (async()=>{
   const detail:BoneDetail=await(await read('/models/temporal-reconstruction/v1/detail.json')).json();
   const buffer=await(await read(detail.geometryUrl)).arrayBuffer();
   const regions:SurfaceRegions=await(await read('/models/temporal-reconstruction/v1/regions.json')).json();
   if(buffer.byteLength!==detail.vertexCount*24)throw new Error('Повреждён файл геометрии');
   for(const l of detail.landmarks)if(!regions[l.id]?.length||regions[l.id].some(f=>!Number.isInteger(f)||f<0||f>=detail.vertexCount/3))throw new Error('Повреждена разметка');
   const canalData:{items:Canal[]}=await(await read('/models/temporal-reconstruction/v1/canals.json')).json();
   if(!controller.signal.aborted)setModel({detail,buffer,regions,canals:canalData.items});
  })().catch(e=>{if(!controller.signal.aborted)setError(String(e));});
  return()=>controller.abort();
 },[]);
 const select=(id:string,orient=false)=>{
  setSelected(id);setInternal(id.startsWith('canal-'));
  if(id.startsWith('canal-')){if(orient){setCanalMode('cut');setOffset(-.1);}return;}
  if(orient){setView(model?.detail.entranceViews?.[id]??(/carotid|stylomastoid|mandibular|articular|mastoid-notch/.test(id)?'inferior':'lateral'));setReset(n=>n+1);}
 };
 const active=[...(model?.detail.landmarks??[]),...(model?.canals??[])].find(l=>l.id===selected);
 return <main className="min-h-dvh bg-slate-50 text-slate-800">
  <header className="p-4 border-b space-y-2">
   <Link href="/osteology/temporal" className="underline">← Образец OpenEar</Link>
   <h1 className="text-xl font-semibold">Левая височная кость · учебная реконструкция</h1>
   <p className="text-sm text-amber-900">Девятый этап: узел коленца, большой каменистый и промежуточный нервы; использованы анатомические описания MedUniver. Цветные формы — приблизительные схемы тканей, полостей и ходов; точные границы не подтверждены. Срез убирает часть оболочки кости; траектории остаются целиком видимыми. Геометрия требует анатомической проверки.</p>
  </header>
  {error&&<p role="alert" className="p-4">{error}</p>}
  {!model&&!error&&<p role="status" className="p-4">Загрузка реконструкции…</p>}
  {model&&<div className="flex flex-col lg:flex-row">
   <section className="flex-1 min-w-0" aria-label="Реконструкция кости">
    {!internal&&<div className="p-3 flex flex-wrap gap-2">{views.map(([id,title])=><button key={id} aria-pressed={view===id} className={`border rounded px-3 py-2 ${view===id?'bg-teal-100':'bg-white'}`} onClick={()=>{setView(id);setReset(n=>n+1);}}>{title}</button>)}</div>}
    <div className="p-3 border-b space-y-2">
     <button className="border rounded p-2" aria-pressed={internal} onClick={()=>{setInternal(!internal);setSelected(null);}}>Внутренние структуры</button>
     {internal&&<><div className="flex flex-wrap gap-2">{([['cut','Срез кости'],['transparent','Прозрачная кость'],['isolated','Только выбранная структура']] as const).map(([id,title])=><button key={id} aria-pressed={canalMode===id} onClick={()=>setCanalMode(id)} className="border rounded p-2">{title}</button>)}</div>{canalMode==='cut'&&<label className="block text-sm">Уровень среза <input aria-label="Уровень среза" type="range" min="-0.6" max="0.4" step="0.01" value={offset} onChange={e=>setOffset(Number(e.target.value))}/></label>}<p className="text-xs text-amber-900">Все внутренние структуры схематические. Кость полупрозрачна; цветные полости и траектории не обрезаются плоскостью.</p></>}
    </div>
    <div className="h-[58dvh] min-h-80"><WebGLGate>{internal?<CanalScene buffer={model.buffer} vertexCount={model.detail.vertexCount} items={model.canals} selected={selected} mode={canalMode} offset={offset} onSelect={id=>select(id)}/>:<Scene detail={model.detail} buffer={model.buffer} landmarks={model.detail.landmarks} selectedId={selected} showAll reset={reset} placing={false} regions={model.regions} paintMode="off" radius={.03} view={view} section="none" sectionOffset={0} onSelect={id=>select(id)} onPlace={()=>{}} onPaint={()=>{}}/>}</WebGLGate></div>
    <div role="status" aria-label="Выбранная поверхность" className="p-4 border-t bg-white min-h-32">{active?<AnatomyLabel landmark={active}/>:<p>Нажмите цветную область или название справа. Подпись и транскрипция появятся здесь.</p>}</div>
   </section>
   <aside className="p-4 lg:w-80 border-l lg:max-h-[80dvh] overflow-auto" aria-label="Области реконструкции">
    <h2 className="font-semibold mb-2">Приблизительно: {model.detail.landmarks.length} областей и {model.canals.length} внутренних структур</h2>
    <h3 className="font-semibold">Внутренние структуры · приблизительно</h3>
    {[...model.canals.filter(c=>c.group==='nerves'),...model.canals.filter(c=>c.group==='ear-muscles'),...model.canals.filter(c=>c.group==='mastoid'),...model.canals.filter(c=>c.group==='middle-ear'),...model.canals.filter(c=>c.group==='labyrinth'),...model.canals.filter(c=>!c.group)].map(c=><button key={c.id} aria-pressed={selected===c.id} onClick={()=>select(c.id,true)} className={`block w-full text-left border rounded p-2 mb-2 ${selected===c.id?'bg-teal-100 ring-2 ring-teal-600':'bg-white'}`}><span style={{color:c.color}}>● </span>{c.ru}<span className="block italic text-xs">{c.la}</span><span className="block text-xs text-amber-900">Приблизительная реконструкция</span></button>)}
    <h3 className="font-semibold">Наружные области и входы</h3>
    {model.detail.landmarks.map(l=><button key={l.id} aria-pressed={selected===l.id} onClick={()=>select(l.id,true)} className={`block w-full text-left border rounded p-2 mb-2 ${selected===l.id?'bg-teal-100 ring-2 ring-teal-600':'bg-white'}`}>{l.ru}<span className="block italic text-xs">{l.la}</span><span className="block text-xs text-amber-900">Приблизительно</span></button>)}
   </aside>
  </div>}
  <footer className="p-4 border-t text-sm space-y-2">
   <p>Основа: Z-Anatomy, Gauthier Kervyn и участники, CC BY-SA 4.0. Сглаживание, изменение кончика отростка, схематические углубления и цветная разметка выполнены в проекте.</p>
   <p><a className="underline" href="/models/temporal-reconstruction/v1/ATTRIBUTION.txt">Источники и ограничения</a> · <a className="underline" href="https://meduniver.com/Medical/Anatom/605.html">MedUniver: нервы внутреннего слухового прохода</a> · <Link className="underline" href="/osteology?bone=temporal-bone-l">Исходная кость со всеми подписями</Link></p>
  </footer>
 </main>;
}
