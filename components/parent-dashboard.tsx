"use client";
import { useEffect, useState } from "react";

type Profile={id:string;name:string;age:number;level:number};

export function ParentDashboard({profile,teacher,setTeacher,camera,setCamera,micro,setMicro,loginPi,piUser}:{profile:Profile|null;teacher:"Jenna"|"JohnPC";setTeacher:(t:"Jenna"|"JohnPC")=>void;camera:boolean;setCamera:(v:boolean)=>void;micro:boolean;setMicro:(v:boolean)=>void;loginPi:()=>void;piUser:string|null}){
  const [data,setData]=useState<any>(null);
  useEffect(()=>{if(profile) fetch("/api/dashboard/parent?childId="+profile.id,{cache:"no-store"}).then(r=>r.json()).then(setData).catch(()=>setData(null))},[profile]);

  async function consent(permission:string,allowed:boolean){
    if(!profile)return;
    await fetch("/api/consent",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({childId:profile.id,permission,allowed})});
    if(permission==="camera")setCamera(allowed);
    if(permission==="microphone")setMicro(allowed);
  }

  return <div style={{display:"grid",gap:16}}>
    <div className="kpis">
      <section className="card kpi"><b>{data?.today?.studyMinutes??0}</b><small>Phút học</small></section>
      <section className="card kpi"><b>{data?.today?.completedLessons??0}</b><small>Bài hoàn thành</small></section>
      <section className="card kpi"><b>{data?.performance?.averageScore??0}%</b><small>Điểm trung bình</small></section>
      <section className="card kpi"><b>{data?.latestAssessment?.level_label||"—"}</b><small>Năng lực gần nhất</small></section>
    </div>

    <section className="card">
      <h3>Hồ sơ học viên</h3>
      <p>{profile?profile.name+" • "+profile.age+" tuổi • Level "+profile.level:"Đang tải..."}</p>
      <button className="darkBtn" onClick={loginPi}>{piUser?"✓ Pi: "+piUser:"Đăng nhập Pi & xác minh server-side"}</button>
    </section>

    <div className="grid">
      <section className="card" style={{gridColumn:"span 4"}}>
        <h3>AI mặc định</h3>
        <div className="row">
          <button className={teacher==="Jenna"?"violetBtn":"mutedBtn"} onClick={()=>setTeacher("Jenna")}>Jenna</button>
          <button className={teacher==="JohnPC"?"violetBtn":"mutedBtn"} onClick={()=>setTeacher("JohnPC")}>JohnPC</button>
        </div>
        <p style={{color:"#66708b"}}>{data?.aiRecommendation||"Đang phân tích tiến độ..."}</p>
      </section>

      <section className="card" style={{gridColumn:"span 4"}}>
        <h3>Parental Consent Log</h3>
        <Toggle label="Camera" on={camera} setOn={(v)=>consent("camera",v)}/>
        <Toggle label="Microphone" on={micro} setOn={(v)=>consent("microphone",v)}/>
        <Toggle label="Notifications" on={Boolean(data?.consents?.find((x:any)=>x.permission==="notifications")?.allowed)} setOn={(v)=>consent("notifications",v)}/>
      </section>

      <section className="card" style={{gridColumn:"span 4"}}>
        <h3>Learning Passport</h3>
        <p>Dashboard này đọc dữ liệu thật từ progress, assessment và achievements.</p>
        <div style={{background:"#eafaf2",color:"#16814d",padding:12,borderRadius:12,fontWeight:800}}>Progress Recovery Enabled</div>
      </section>
    </div>

    <section className="card">
      <h3>Tiến độ theo môn</h3>
      <div style={{display:"grid",gap:10}}>
        {(data?.performance?.subjects||[]).map((x:any)=><div key={x.subject} className="skill"><b>{x.subject}</b><span>{x.averageScore}%</span><span>{x.count} bài</span></div>)}
        {!data?.performance?.subjects?.length&&<p style={{color:"#7a829b"}}>Chưa có đủ dữ liệu. Hoàn thành bài học để tạo báo cáo.</p>}
      </div>
    </section>
  </div>
}

function Toggle({label,on,setOn}:{label:string;on:boolean;setOn:(v:boolean)=>void}){return <div className="toggle"><span>{label}</span><button className={"switch "+(on?"on":"")} onClick={()=>setOn(!on)}><span/></button></div>}
