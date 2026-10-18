import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { BoneDetail, BoneSummary } from "./types";

const root = path.resolve("public/models/bone-details/v1");
const index:BoneSummary[]=JSON.parse(fs.readFileSync(path.join(root,"index.json"),"utf8"));
const coverage=JSON.parse(fs.readFileSync(path.join(root,"coverage.json"),"utf8"));

describe("authored bone assets",()=>{
  it("keeps complete geometry and bilingual leaders for each indexed model",()=>{
    let count=0;
    const withoutSourceLandmarks:string[]=[];
    const ids=new Set<string>();
    for(const b of index){
      expect(ids.has(b.id)).toBe(false);ids.add(b.id);
      const d:BoneDetail=JSON.parse(fs.readFileSync(path.join(root,`${b.id}.json`),"utf8"));
      expect(d.sourceHash).toBe(coverage.sourceHash);
      expect(d.vertexCount%3).toBe(0);
      expect(fs.statSync(path.join(root,`${b.id}.bin`)).size).toBe(d.vertexCount*24);
      expect(d.landmarks.length).toBe(b.landmarkCount);
      for(const l of d.landmarks){
        expect(l.ru.length>0 && l.la.length>0).toBe(true);
        if(l.source==='editorial'){
          expect(l.pointer).toEqual([]);
          expect(d.regionsUrl).toBeTruthy();
          const regions=JSON.parse(fs.readFileSync(path.join(root,`${b.id}.surfaces.json`),'utf8')).regions;
          expect(regions[l.id]?.length).toBeGreaterThan(0);
        }else{
          expect(l.source).toBe("z-anatomy");
          expect(l.pointer.length>0 && l.pointer.length%9===0).toBe(true);
        }
        expect([...l.pointer,...l.labelPosition].every(Number.isFinite)).toBe(true);
      }
      const sourceCount=d.landmarks.filter(l=>l.source==='z-anatomy').length;
      count+=sourceCount;
      if(!sourceCount)withoutSourceLandmarks.push(b.id);
    }
    expect(count).toBe(coverage.landmarks);
    expect(withoutSourceLandmarks).toEqual(coverage.bonesWithoutLandmarks);
  });
  it("keeps the two sides independently mapped to the existing atlas",()=>{
    expect(index.find(b=>b.id==="femur-l")?.partIds).toEqual(["FJ3259"]);
    expect(index.find(b=>b.id==="femur-r")?.partIds).toEqual(["FJ3365"]);
    expect(index.find(b=>b.id==="humerus-l")?.partIds).toEqual(["FJ3262"]);
    expect(index.find(b=>b.id==="humerus-r")?.partIds).toEqual(["FJ3368"]);
  });
});
