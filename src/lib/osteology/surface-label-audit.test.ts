import fs from 'node:fs';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it} from 'vitest';
import {faceRegions,nextSurface} from './regions';
import {AnatomyLabel} from '../../components/osteology/AnatomyLabel';
import type {BoneDetail,BoneSummary} from './types';

it('selects each named region in overlapping masks and renders its label and pronunciation',()=>{
 const root='public/models/bone-details/v1';
 const index:BoneSummary[]=JSON.parse(fs.readFileSync(`${root}/index.json`,'utf8'));
 for(const row of index){
  const d:BoneDetail=JSON.parse(fs.readFileSync(`${root}/${row.id}.json`,'utf8'));
  const regions=JSON.parse(fs.readFileSync(`${root}/${row.id}.surfaces.json`,'utf8')).regions;
  const named=d.landmarks.filter(l=>!l.id.includes('-direction-zone-'));
  const faces=faceRegions(regions,named.map(l=>l.id));
  for(const l of named){
   const ids=faces.get(regions[l.id][0])!;
   const reached=new Set<string>();let selected:string|null=null;
   for(let i=0;i<ids.length;i++){selected=nextSurface(ids,selected);reached.add(selected!);}
   expect(reached.has(l.id),l.id).toBe(true);
   const markup=renderToStaticMarkup(createElement(AnatomyLabel,{landmark:l}));
   expect(markup,l.id).toContain(l.la.replace(/&/g,'&amp;'));
   expect(markup,l.id).toMatch(/\[[^\]]*[а-я][^\]]*\]/i);
   if(l.accuracy==='approximate')expect(markup).toContain('Приблизительная область');
  }
 }
},30000);

it('does not select invisible directions and cycles small overlapping patches deterministically',()=>{
 const regions={wide:[0,1,2],small:[1],hidden:[1]};
 const faces=faceRegions(regions,['wide','small']);
 expect(faces.get(1)).toEqual(['small','wide']);
 expect(nextSurface(faces.get(1)!,null)).toBe('small');
 expect(nextSurface(faces.get(1)!,'small')).toBe('wide');
 expect(nextSurface(faces.get(1)!,'wide')).toBe('small');
 expect(nextSurface([],null)).toBeNull();
});
