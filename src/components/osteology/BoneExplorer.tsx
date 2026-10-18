"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { WebGLGate } from "@/components/atlas/WebGLGate";
import { makeManual, manualKey, parseManual } from "@/lib/osteology/manual";
import type { BoneDetail, BoneLandmark, BoneSummary, Point3 } from "@/lib/osteology/types";
import { parseRegions, regionKey, type SurfaceRegions } from "@/lib/osteology/regions";
import { AnatomyLabel } from "./AnatomyLabel";

const Scene = dynamic(()=>import("./BoneScene"),{ssr:false,loading:()=> <p className="p-6">Подготовка 3D…</p>});
const side = (s:string) => s==="left"?"слева":s==="right"?"справа":"";
const label = (b:BoneSummary) => `${b.ru}${b.side?` (${side(b.side)})`:""}`;
const normalize = (s:string) => s.toLowerCase().replace(/ё/g,"е");
const button = "min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm hover:bg-slate-50 disabled:opacity-40";
const input = "min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-base";

function BoneWorkspace({ bone }: { bone:BoneSummary }) {
  const longitudinalLimb = /^(femur|tibia|fibula|patella|humerus|radius|ulna)-/.test(bone.id);
  const [loaded,setLoaded] = useState<{detail:BoneDetail;buffer:ArrayBuffer}|null>(null);
  const [error,setError] = useState("");
  const [retry,setRetry] = useState(0);
  const [selected,setSelected] = useState<string|null>(null);
  const [q,setQ] = useState("");
  const [showAll,setShowAll] = useState(true);
  const [regions,setRegions] = useState<SurfaceRegions>({});
  const [bundled,setBundled] = useState<SurfaceRegions>({});
  const [paintMode,setPaintMode] = useState<'off'|'paint'|'erase'>('off');
  const [radius,setRadius] = useState(0.04);
  const [history,setHistory] = useState<SurfaceRegions[]>([]);
  const regionFile=useRef<HTMLInputElement>(null);
  const [reset,setReset] = useState(0);
  const [view,setView] = useState('anterior');
  const [manual,setManual] = useState<BoneLandmark[]>([]);
  const [editor,setEditor] = useState(false);
  const [placing,setPlacing] = useState(false);
  const [ru,setRu] = useState("");
  const [la,setLa] = useState("");
  const [notice,setNotice] = useState("");
  const file = useRef<HTMLInputElement>(null);
  useEffect(()=>{
    const controller=new AbortController();
    (async()=>{
      const response=await fetch(`/models/bone-details/v1/${bone.id}.json`,{signal:controller.signal});
      if(!response.ok) throw new Error("Не удалось загрузить анатомические метки");
      const detail:BoneDetail=await response.json();
      const geometry=await fetch(detail.geometryUrl,{signal:controller.signal});
      if(!geometry.ok) throw new Error("Не удалось загрузить геометрию кости");
      const buffer=await geometry.arrayBuffer();
      if(buffer.byteLength!==detail.vertexCount*24) throw new Error("Файл геометрии повреждён");
      let initial:SurfaceRegions={};
      if(detail.regionsUrl){
        const response=await fetch(detail.regionsUrl,{signal:controller.signal});
        if(!response.ok)throw new Error('Не удалось загрузить разметку поверхности');
        initial=parseRegions(await response.json(),bone.id,detail.regionHash??detail.sourceHash,detail.vertexCount/3,detail.landmarks.map(l=>l.id));
      }
      if(controller.signal.aborted) return;
      setLoaded({detail,buffer}); setError("");
      setBundled(initial);setRegions(initial);
      try {
        const saved=localStorage.getItem(manualKey(bone.id,detail.sourceHash));
        const drafts=saved?parseManual(JSON.parse(saved),bone.id,detail.sourceHash).landmarks:[];
        setManual(drafts);
        const savedRegions=localStorage.getItem(regionKey(bone.id,detail.regionHash??detail.sourceHash));
        if(savedRegions)setRegions({...initial,...parseRegions(JSON.parse(savedRegions),bone.id,detail.regionHash??detail.sourceHash,detail.vertexCount/3,[...detail.landmarks,...drafts].map(l=>l.id))});
      } catch { setNotice("Не удалось прочитать сохранённые метки. Исходная запись сохранена в браузере."); }
    })().catch(e=>{if(!controller.signal.aborted)setError(e instanceof Error?e.message:String(e));});
    return ()=>controller.abort();
  },[bone.id,retry]);
  const landmarks=useMemo(()=>[...(loaded?.detail.landmarks??[]),...manual],[loaded,manual]);
  const shown=landmarks.filter(l=>normalize(`${l.ru} ${l.la} ${l.en}`).includes(normalize(q.trim())));
  const active=landmarks.find(l=>l.id===selected);
  function select(id:string){setSelected(id);setPaintMode('off');setPlacing(false);}
  function saveRegions(next:SurfaceRegions,remember=true) {
    if(!loaded)return;
    if(remember)setHistory(h=>[...h.slice(-29),regions]);
    setRegions(next);
    try{localStorage.setItem(regionKey(bone.id,loaded.detail.regionHash??loaded.detail.sourceHash),JSON.stringify({version:1,boneId:bone.id,sourceHash:loaded.detail.regionHash??loaded.detail.sourceHash,regions:next}));}
    catch{setNotice('Не удалось сохранить области в браузере. Экспортируйте файл перед выходом.');}
  }
  function paint(faces:number[]) {
    if(!selected || paintMode==='off')return;
    const next=new Set(regions[selected]??[]);
    faces.forEach(f=>paintMode==='erase'?next.delete(f):next.add(f));
    saveRegions({...regions,[selected]:[...next]});
  }
  function exportRegions(){
    if(!loaded)return;
    const url=URL.createObjectURL(new Blob([JSON.stringify({version:1,boneId:bone.id,sourceHash:loaded.detail.regionHash??loaded.detail.sourceHash,regions},null,2)],{type:'application/json'}));
    const a=document.createElement('a');a.href=url;a.download=`${bone.id}-surfaces.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  async function importRegions(f:File){
    if(!loaded)return;
    try{
      if(f.size>10_000_000)throw new Error('Файл слишком большой');
      const next=parseRegions(JSON.parse(await f.text()),bone.id,loaded.detail.regionHash??loaded.detail.sourceHash,loaded.detail.vertexCount/3,landmarks.map(l=>l.id));
      saveRegions({...regions,...next});setNotice('Области импортированы. Проверьте границы на модели.');
    }catch(e){setNotice(e instanceof Error?e.message:String(e));}
  }
  function persist(next:BoneLandmark[]) {
    if(!loaded) return;
    setManual(next);
    try { localStorage.setItem(manualKey(bone.id,loaded.detail.sourceHash),JSON.stringify({version:1,boneId:bone.id,sourceHash:loaded.detail.sourceHash,landmarks:next})); }
    catch { setNotice("Не удалось сохранить в браузере. Экспортируйте метки перед выходом."); }
  }
  function place(position:Point3) {
    if(!placing || !ru.trim() || !la.trim()) return;
    const marker=makeManual(ru,la,position);
    persist([...manual,marker]); setSelected(marker.id); setPlacing(false); setRu("");setLa("");
    setNotice("Метка сохранена как черновик. Проверьте анатомическое положение по атласу.");
  }
  function exportManual() {
    if(!loaded)return;
    const blob=new Blob([JSON.stringify({version:1,boneId:bone.id,sourceHash:loaded.detail.sourceHash,landmarks:manual},null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob),a=document.createElement("a");
    a.href=url;a.download=`${bone.id}-landmarks.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  async function importManual(selectedFile:File) {
    if(!loaded)return;
    try {
      if(selectedFile.size>2_000_000)throw new Error("Файл слишком большой");
      const data=parseManual(JSON.parse(await selectedFile.text()),bone.id,loaded.detail.sourceHash);
      const merged=new Map(manual.map(l=>[l.id,l])); data.landmarks.forEach(l=>merged.set(l.id,l));
      persist([...merged.values()]);setNotice(`Импортировано меток: ${data.landmarks.length}`);
    }catch(e){setNotice(e instanceof Error?e.message:String(e));}
  }
  return <div className="flex min-h-0 flex-1 flex-col lg:flex-row" data-testid="bone-workspace">
    <section className="flex h-[75dvh] min-h-[580px] flex-1 flex-col lg:h-auto lg:min-h-0" aria-label={`3D: ${label(bone)}`}>
      <div className="shrink-0 px-4 py-3">
        <h1 className="text-lg font-semibold">{label(bone)}</h1><p className="text-sm italic text-slate-600">{bone.la}</p>
      </div>
      <div className="relative min-h-0 flex-1" data-testid="bone-viewport">
      {error?<div role="alert" className="p-6"><p>{error}</p><button className={button} onClick={()=>{setError("");setRetry(n=>n+1);}}>Повторить</button></div>
      :loaded?<WebGLGate><Scene detail={loaded.detail} buffer={loaded.buffer} landmarks={shown} selectedId={selected} showAll={showAll} reset={reset} placing={placing} onSelect={select} onPlace={place} regions={regions} paintMode={paintMode} radius={radius} onPaint={paint} view={view}/></WebGLGate>
      :<p role="status" className="p-6">Загрузка кости…</p>}
      </div>
      <div className="shrink-0 border-t bg-white p-3">
      <div className="flex flex-wrap items-center gap-2">
        <button className={button} onClick={()=>setReset(n=>n+1)}>Сбросить ракурс</button>
        <select className={button} aria-label="Ракурс кости" value={view} onChange={e=>setView(e.target.value)}>
          <option value="anterior">Спереди · anterior</option><option value="posterior">Сзади · posterior</option><option value="medial">Медиально · medialis</option><option value="lateral">Латерально · lateralis</option>
          <option value="superior">{longitudinalLimb?'Сверху · проксимально · proximalis':'Сверху · краниально · superior'}</option><option value="inferior">{longitudinalLimb?'Снизу · дистально · distalis':'Снизу · каудально · inferior'}</option>
        </select>
        <label className={`${button} flex items-center gap-2`}><input type="checkbox" checked={showAll} onChange={e=>setShowAll(e.target.checked)}/>Показать области</label>
        <span className="rounded bg-white/85 px-2 py-1 text-xs text-slate-600">Вращайте кость мышью или пальцем · прокрутка — масштаб</span>
      </div>
      <p className="mt-2 text-xs text-slate-500">{view==='medial'?'Медиально — со стороны средней линии тела.':view==='lateral'?'Латерально — с наружной стороны, дальше от средней линии тела.':view==='anterior'?'Спереди — anterior, передняя сторона.':view==='posterior'?'Сзади — posterior, задняя сторона.':view==='superior'?(longitudinalLimb?'Проксимально — со стороны конца, расположенного ближе к туловищу; сверху — superior.':'Краниально — со стороны головы; сверху — superior.'):(longitudinalLimb?'Дистально — со стороны конца, расположенного дальше от туловища; снизу — inferior.':'Каудально — со стороны нижнего конца тела; снизу — inferior.')}</p>
      <div role="status" aria-label="Выбранная поверхность" aria-live="polite" aria-atomic="true" className="mt-3 min-h-28 rounded-xl border border-teal-100 bg-teal-50 p-3">
        {active?<AnatomyLabel landmark={active}/>:<p className="text-sm text-slate-600">Нажмите на поверхность кости — здесь появятся её название и произношение.</p>}
      </div>
      {placing&&<div role="status" className="mt-3 rounded-xl bg-amber-100 p-3 text-sm">Нажмите на нужную точку поверхности кости. <button className="underline" onClick={()=>setPlacing(false)}>Отмена</button></div>}
      </div>
    </section>
    <aside className="flex min-h-0 flex-col border-t bg-white lg:w-[340px] lg:border-l lg:border-t-0" aria-label="Образования кости">
      <div className="space-y-3 border-b p-4">
        <h2 className="font-semibold">Анатомические образования <span className="text-slate-500">{landmarks.length}</span></h2>
        <input className={input} placeholder="Отверстие, головка, foramen…" aria-label="Поиск образования" value={q} onChange={e=>setQ(e.target.value)}/>
        <p className="text-xs leading-relaxed text-slate-500">Нажмите на окрашенную поверхность — появится название и произношение. {loaded?.detail.regionsUrl?'Разметка загружена из проекта. Повторное нажатие переключает перекрывающиеся образования.':'Границы областей задаются вручную. Исходные указатели Z-Anatomy не содержат этих границ.'}</p>
      </div>
      <div className="max-h-[55dvh] flex-1 overflow-y-auto p-3 lg:max-h-none">
        {shown.length?<ul className="space-y-1">{shown.map(l=><li key={l.id}>
          <button type="button" aria-pressed={selected===l.id} className={`min-h-12 w-full rounded-lg px-3 py-2 text-left ${selected===l.id?"bg-teal-50 ring-1 ring-teal-600":"hover:bg-slate-50"}`} onClick={()=>select(l.id)}>
            <span className="block text-sm font-medium">{l.ru}</span><span className="block text-xs italic text-slate-500">{l.la}</span>
            {l.source==="manual"&&<span className="text-[11px] text-amber-700">Ручная метка · черновик</span>}
            <span className="block text-[11px] text-slate-500">{regions[l.id]?.length?(bundled[l.id]===regions[l.id]?'Разметка из проекта':'Локальная разметка'):'Граница области ещё не размечена'}</span>
          </button>
        </li>)}</ul>:<p className="p-3 text-sm text-slate-600">{q?"По этому запросу ничего не найдено.":"Для этой кости в исходнике нет меток. Можно начать ручную разметку ниже."}</p>}
        {active?.source==="manual"&&<button className={`${button} mt-3 text-red-700`} onClick={()=>{persist(manual.filter(l=>l.id!==active.id));const next={...regions};delete next[active.id];saveRegions(next,false);setHistory([]);setSelected(null);setPaintMode('off');}}>Удалить выбранную ручную метку</button>}
        <details className="mt-4 border-t pt-3" data-testid="surface-editor">
          <summary className="cursor-pointer py-2 text-sm font-medium">Разметка поверхности</summary>
          <div className="space-y-3 py-2 text-sm">
            <p>Выберите образование в списке. Закрашивайте его поверхность кликами; вращайте кость перетаскиванием. Области могут перекрываться: повторное нажатие переключает образования.</p>
            <p className="text-xs text-amber-800">Это ручные черновики границ. Они сохраняются только в этом браузере; экспортируйте их для резервной копии.</p>
            <label className="block">Размер кисти <input aria-label="Размер кисти" type="range" min="0.005" max="0.16" step="0.005" value={radius} onChange={e=>setRadius(Number(e.target.value))} className="w-full"/></label>
            <div className="flex flex-wrap gap-2">
              <button className={button} disabled={!active} aria-pressed={paintMode==='paint'} onClick={()=>{setPaintMode('paint');setPlacing(false);}}>Закрасить</button>
              <button className={button} disabled={!active} aria-pressed={paintMode==='erase'} onClick={()=>{setPaintMode('erase');setPlacing(false);}}>Стереть</button>
              <button className={button} onClick={()=>setPaintMode('off')}>Просмотр</button>
              <button className={button} disabled={!history.length} onClick={()=>{saveRegions(history[history.length-1],false);setHistory(h=>h.slice(0,-1));}}>Отменить мазок</button>
            </div>
            <p role="status">{paintMode==='off'?'Нажмите на область для выбора.':`${paintMode==='paint'?'Закрашивание':'Стирание'}: ${active?.ru??''}`}</p>
            <div className="flex gap-2"><button className={button} disabled={!Object.values(regions).some(f=>f.length)} onClick={exportRegions}>Экспорт областей</button><button className={button} disabled={!loaded} onClick={()=>regionFile.current?.click()}>Импорт областей</button></div>
            <input type="file" ref={regionFile} className="hidden" accept="application/json,.json" onChange={e=>{const f=e.target.files?.[0];if(f)void importRegions(f);e.target.value='';}}/>
          </div>
        </details>
        <details open={editor} onToggle={e=>setEditor(e.currentTarget.open)} className="mt-4 border-t pt-3">
          <summary className="cursor-pointer py-2 text-sm font-medium">Ручная разметка</summary>
          <div className="mt-2 space-y-2">
            <p className="text-xs leading-relaxed text-slate-500">Укажите название и точку на поверхности. Черновики хранятся только в этом браузере; экспортируйте их для передачи и резервной копии.</p>
            <input className={input} maxLength={250} aria-label="Русское название новой метки" placeholder="Русское название" value={ru} onChange={e=>{setRu(e.target.value);setPlacing(false);}}/>
            <input className={input} maxLength={250} aria-label="Латинское название новой метки" placeholder="Латинское название" value={la} onChange={e=>{setLa(e.target.value);setPlacing(false);}}/>
            <button className={`${button} w-full`} disabled={!loaded||!ru.trim()||!la.trim()} onClick={()=>{setPlacing(true);setPaintMode('off');}}>Поставить метку на кости</button>
            <div className="flex gap-2"><button className={button} disabled={!loaded||!manual.length} onClick={exportManual}>Экспорт</button><button className={button} disabled={!loaded} onClick={()=>file.current?.click()}>Импорт</button></div>
            <input ref={file} type="file" accept="application/json,.json" className="hidden" onChange={e=>{const f=e.target.files?.[0];if(f)void importManual(f);e.target.value="";}}/>
          </div>
        </details>
        {notice&&<p role="status" className="mt-3 rounded-lg bg-amber-50 p-3 text-xs">{notice}</p>}
      </div>
      <p className="border-t px-4 py-3 text-[11px] text-slate-500">Геометрия и исходные указатели: <a href="https://github.com/LluisV/Z-Anatomy" target="_blank" rel="noreferrer" className="underline">Z-Anatomy</a>, CC BY-SA 4.0. <a href="/models/bone-details/v1/ATTRIBUTION.txt" className="underline">Источники</a></p>
    </aside>
  </div>;
}

export function BoneExplorer() {
  const params=useSearchParams();
  const [bones,setBones]=useState<BoneSummary[]>([]);
  const [error,setError]=useState("");
  const [query,setQuery]=useState("");
  const [picked,setPicked]=useState<string|null>(null);
  useEffect(()=>{
    const controller=new AbortController();
    fetch("/models/bone-details/v1/index.json",{signal:controller.signal}).then(r=>{if(!r.ok)throw new Error("Не удалось загрузить каталог костей");return r.json();}).then(setBones).catch(e=>{if(!controller.signal.aborted)setError(String(e));});
    return()=>controller.abort();
  },[]);
  const requested=params.get("bone"),part=params.get("part");
  const bone=bones.find(b=>picked?b.id===picked:requested?b.id===requested:part?b.partIds.includes(part):b.id==="femur-l");
  const filtered=bones.filter(b=>normalize(`${b.ru} ${b.la} ${b.en} ${b.searchText}`).includes(normalize(query.trim())));
  return <main className="flex min-h-dvh flex-col bg-slate-50 text-slate-800 lg:h-dvh lg:overflow-hidden">
    <header className="flex min-h-14 shrink-0 items-center gap-4 border-b bg-white px-4">
      <Link href={part?`/atlas?focus=${encodeURIComponent(part)}`:"/atlas"} className="rounded px-2 py-3 text-sm hover:bg-slate-100">← Атлас</Link>
      <span className="font-semibold">Строение костей</span>
      <span className="ml-auto hidden text-xs text-slate-500 sm:block">{bones.length} моделей · области поверхности</span>
    </header>
    {error?<p role="alert" className="p-6">{error} <button className={button} onClick={()=>location.reload()}>Повторить</button></p>:<div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      <aside className="flex shrink-0 flex-col border-b bg-white p-3 lg:w-60 lg:border-b-0 lg:border-r" aria-label="Каталог костей">
        <input className={input} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Кость или образование…" aria-label="Поиск кости или образования"/>
        <select className={`${input} mt-2 lg:hidden`} value={bone?.id??""} aria-label="Выбрать кость" onChange={e=>setPicked(e.target.value)}>
          {!bone&&<option value="">Выберите кость</option>}{filtered.map(b=><option key={b.id} value={b.id}>{label(b)} · {b.landmarkCount} меток</option>)}
        </select>
        <div className="mt-3 hidden min-h-0 flex-1 overflow-y-auto lg:block"><ul className="space-y-1">{filtered.map(b=><li key={b.id}>
          <button onClick={()=>setPicked(b.id)} aria-pressed={b.id===bone?.id} className={`w-full rounded-lg px-3 py-2 text-left text-sm ${b.id===bone?.id?"bg-slate-100 font-semibold":"hover:bg-slate-50"}`}>
            {label(b)}<span className="block text-xs font-normal text-slate-500">{b.landmarkCount?`Образований: ${b.landmarkCount}`:"Без исходных меток"}</span>
          </button></li>)}</ul>{!filtered.length&&<p className="p-3 text-sm">Ничего не найдено</p>}</div>
      </aside>
      {bone?<BoneWorkspace key={bone.id} bone={bone}/>:<p role="status" className="p-6">{bones.length?"Кость не найдена. Выберите её в каталоге.":"Загрузка каталога…"}</p>}
    </div>}
  </main>;
}
