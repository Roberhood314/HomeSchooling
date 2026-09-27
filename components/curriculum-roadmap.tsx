"use client";

import { useEffect, useState } from "react";

export function CurriculumRoadmap({ age, onAgeChange }: { age:number; onAgeChange:(age:number)=>Promise<void> | void }) {
  const [band,setBand]=useState<any>(null);
  const [busy,setBusy]=useState(false);

  useEffect(()=>{
    fetch("/api/curriculum/framework?age="+age,{cache:"no-store"})
      .then(r=>r.json()).then(d=>setBand(d.band)).catch(()=>setBand(null));
  },[age]);

  async function change(next:number){
    setBusy(true);
    try { await onAgeChange(next); }
    finally { setBusy(false); }
  }

  return <section className="card" style={{gridColumn:"span 12"}}>
    <div style={{display:"flex",justifyContent:"space-between",gap:16,alignItems:"flex-start",flexWrap:"wrap"}}>
      <div>
        <small style={{color:"#5f54d9",fontWeight:800}}>AGE-BASED LEARNING PATH</small>
        <h2 style={{margin:"6px 0"}}>{band ? band.stage : "Đang tải lộ trình..."}</h2>
        {band && <p style={{color:"#66708b",marginTop:4}}>Tuổi {age} • {band.sessionMinutes} phút/buổi • khoảng {band.weeklySessions} buổi/tuần</p>}
      </div>
      <div className="row">
        {[3,4,5,6,7,8,9].map(a=><button key={a} className={a===age?"violetBtn":"mutedBtn"} disabled={busy} onClick={()=>change(a)}>{a} tuổi</button>)}
      </div>
    </div>

    {band && <>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:12,marginTop:16}}>
        {Object.entries(band.subjects).map(([subject,def]:any)=><div key={subject} style={{padding:16,border:"1px solid #e5e9f2",borderRadius:18,background:"#fafbff"}}>
          <b>{subject}</b>
          <div style={{fontSize:13,color:"#66708b",marginTop:8,lineHeight:1.6}}>{def.units.slice(0,4).join(" • ")}</div>
        </div>)}
      </div>
      <div style={{marginTop:16,padding:16,borderRadius:16,background:"#f4f1ff"}}>
        <b>Mục tiêu phát triển</b>
        <div style={{marginTop:8,color:"#56607d",lineHeight:1.7}}>{band.goals.join(" • ")}</div>
      </div>
    </>}
  </section>;
}
