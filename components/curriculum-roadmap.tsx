"use client";

import { useEffect, useMemo, useState } from "react";

type Lesson = {
  id:string;
  subject:string;
  title:string;
  level:number;
  min_age?:number;
  max_age?:number;
  skills?:string[];
  content?:any;
};

export function CurriculumRoadmap({
  age,
  lessons,
  onAgeChange
}: {
  age:number;
  lessons:Lesson[];
  onAgeChange:(age:number)=>Promise<void> | void;
}) {
  const [band,setBand]=useState<any>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");

  useEffect(()=>{
    setError("");
    fetch("/api/curriculum/framework?age="+age,{cache:"no-store"})
      .then(async r=>{
        const d=await r.json();
        if(!r.ok || !d.band) throw new Error(d.error||"Không tải được khung giáo trình");
        setBand(d.band);
      })
      .catch((e)=>{setBand(null);setError(e?.message||"Không tải được lộ trình");});
  },[age]);

  const grouped=useMemo(()=>{
    const map:Record<string,Lesson[]>={};
    for(const lesson of lessons||[]){
      (map[lesson.subject] ||= []).push(lesson);
    }
    return map;
  },[lessons]);

  async function change(next:number){
    if(next===age || busy) return;
    setBusy(true);
    setError("");
    try { await onAgeChange(next); }
    catch(e:any){ setError(e?.message||"Không thể đổi độ tuổi"); }
    finally { setBusy(false); }
  }

  return <section className="card" style={{gridColumn:"span 12"}}>
    <div style={{display:"flex",justifyContent:"space-between",gap:16,alignItems:"flex-start",flexWrap:"wrap"}}>
      <div>
        <small style={{color:"#5f54d9",fontWeight:800}}>AGE-BASED LEARNING PATH</small>
        <h2 style={{margin:"6px 0"}}>{band ? band.stage : "Đang tải lộ trình..."}</h2>
        {band && <p style={{color:"#66708b",marginTop:4}}>Tuổi {age} • {band.sessionMinutes} phút/buổi • khoảng {band.weeklySessions} buổi/tuần • {lessons.length} lesson đang khả dụng</p>}
      </div>
      <div className="row" style={{flexWrap:"wrap"}}>
        {[3,4,5,6,7,8,9].map(a=><button key={a} className={a===age?"violetBtn":"mutedBtn"} disabled={busy} onClick={()=>change(a)}>{busy&&a===age?"Đang tải...":a+" tuổi"}</button>)}
      </div>
    </div>

    {error && <div style={{marginTop:14,padding:12,borderRadius:12,background:"#fff1f1",color:"#a33"}}>{error}</div>}

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

    <div style={{marginTop:18}}>
      <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",flexWrap:"wrap"}}>
        <div>
          <b>Giáo trình đang chạy cho tuổi {age}</b>
          <div style={{fontSize:13,color:"#66708b",marginTop:4}}>Dữ liệu lesson thật từ PostgreSQL, lọc theo tuổi, level và ngôn ngữ hiện tại.</div>
        </div>
        <span style={{fontSize:13,fontWeight:800,color:lessons.length?"#16814d":"#9a5a00"}}>{lessons.length ? lessons.length+" lesson" : busy ? "Đang đồng bộ..." : "Chưa có lesson phù hợp"}</span>
      </div>

      {lessons.length>0 && <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:12,marginTop:12}}>
        {Object.entries(grouped).map(([subject,items])=><div key={subject} style={{padding:16,border:"1px solid #e5e9f2",borderRadius:18}}>
          <b>{subject} <span style={{color:"#7a829b",fontWeight:600}}>({items.length})</span></b>
          <div style={{display:"grid",gap:8,marginTop:10}}>
            {items.slice(0,6).map(l=><div key={l.id} style={{padding:"9px 11px",background:"#f7f8fc",borderRadius:10,fontSize:13}}>
              <div style={{fontWeight:700}}>{l.title}</div>
              <div style={{color:"#7a829b",marginTop:3}}>Level {l.level}{l.skills?.length ? " • "+l.skills.slice(0,3).join(", ") : ""}</div>
            </div>)}
            {items.length>6 && <small style={{color:"#7a829b"}}>+ {items.length-6} lesson khác</small>}
          </div>
        </div>)}
      </div>}
    </div>
  </section>;
}
