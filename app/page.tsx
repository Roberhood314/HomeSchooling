"use client";

import { useEffect, useRef, useState } from "react";
import { CurriculumRoadmap } from "@/components/curriculum-roadmap";
import { LessonRuntime } from "@/components/lesson-runtime";
import { AssessmentEngine } from "@/components/assessment-engine";
import { ParentDashboard } from "@/components/parent-dashboard";

type View = "home" | "lesson" | "assessment" | "parent" | "web3";
type Teacher = "Jenna" | "JohnPC";
type Lesson = { id:string; subject:string; title:string; content:any; skills:string[]; source_name?:string; source_license?:string; version:number; };
type Profile = { id:string; name:string; age:number; level:number; preferred_language:string; ai_teacher:string };

declare global {
  interface Window { Pi?: any; webkitSpeechRecognition?: any; SpeechRecognition?: any; }
}

export default function HomePage() {
  const [view,setView] = useState<View>("home");
  const [lang,setLang] = useState<"VI"|"EN"|"中文">("VI");
  const [teacher,setTeacher] = useState<Teacher>("Jenna");
  const [level,setLevel] = useState(3);
  const [assessmentDone,setAssessmentDone] = useState(false);
  const [camera,setCamera] = useState(false);
  const [micro,setMicro] = useState(true);
  const [profile,setProfile] = useState<Profile|null>(null);
  const [lessons,setLessons] = useState<Lesson[]>([]);
  const [system,setSystem] = useState("Connecting...");
  const [piUser,setPiUser] = useState<string|null>(null);

  useEffect(()=>{
    if("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(()=>{});
    bootstrap().catch(()=>setSystem("Cloud Degraded"));
    const online=()=>flushOfflineQueue(profile?.id || null);
    window.addEventListener("online",online);
    return ()=>window.removeEventListener("online",online);
  },[]);

  useEffect(()=>{ if(profile) loadCurriculum(profile).catch(()=>{}); },[profile,lang]);

  async function bootstrap(){
    const health = await fetch("/api/health",{cache:"no-store"}).then(r=>r.json()).catch(()=>({ok:false}));
    setSystem(health.ok ? "Cloud Online" : "Cloud Degraded");
    const p = await fetch("/api/profiles",{cache:"no-store"}).then(r=>r.json());
    let first = p.profiles?.[0];
    if(!first){
      const created = await fetch("/api/profiles",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({name:"Bé Minh",age:7,preferredLanguage:"vi",level:3,aiTeacher:"Jenna",goals:["language","math","science"]})
      }).then(r=>r.json());
      first=created.profile;
    }
    if(first){ setProfile(first); setLevel(first.level||3); setTeacher(first.ai_teacher==="JohnPC"?"JohnPC":"Jenna"); }
  }

  async function loadCurriculum(p:Profile){
    const language = lang==="EN" ? "en" : lang==="中文" ? "zh" : "vi";
    const url="/api/curriculum?age="+p.age+"&level="+p.level+"&language="+language;
    const data = await fetch(url,{cache:"no-store"}).then(r=>r.json());
    setLessons(data.lessons||[]);
  }

  async function changeChildAge(nextAge:number){
    if(!profile) return;
    const updated=await fetch("/api/profiles",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:profile.id,age:nextAge,level:Math.max(1,nextAge-2)})}).then(r=>r.json());
    if(updated.ok){
      setProfile(updated.profile);
      setLevel(updated.profile.level);
    }
  }

  async function loginPi(){
    try{
      if(!window.Pi) throw new Error("Pi SDK chưa sẵn sàng");
      window.Pi.init({version:"2.0",sandbox:false});
      const auth=await window.Pi.authenticate(["username"],()=>{});
      const verified=await fetch("/api/auth/pi/verify",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({accessToken:auth.accessToken})}).then(r=>r.json());
      if(!verified.ok) throw new Error(verified.error||"Pi verification failed");
      setPiUser(verified.user?.username||"Pi User");
      await bootstrap();
    }catch(e:any){ alert(e?.message||"Pi login failed"); }
  }

  const nav:[View,string,string][] = [
    ["home","🏠","Trang chủ"],["lesson","📚","Bài học"],["assessment","🧩","Đánh giá"],
    ["parent","👨‍👩‍👧","Phụ huynh"],["web3","π","Web3 & Pi"]
  ];

  return <div className="shell">
    <aside className="side">
      <div className="brand"><div className="brandMark">AI</div><div>AI HomeSchool<div style={{fontSize:12,color:"#7a829b"}}>International Learning Studio</div></div></div>
      <div className="nav">{nav.map(([id,icon,label])=><button key={id} className={view===id?"active":""} onClick={()=>setView(id)}>{icon} {label}</button>)}</div>
      <div className="safe"><b>🛡 Child Safe Mode</b><br/>Age guardrails • Parent consent • Cloud sync<br/><br/><b>Status:</b> {system}</div>
    </aside>

    <main className="main">
      <header className="top">
        <div><small style={{color:"#7a829b"}}>{piUser ? "Pi: "+piUser : "AI HomeSchool Pro"}</small><h1>{title(view)}</h1></div>
        <div className="langs">{["VI","EN","中文"].map(l=><button key={l} className={lang===l?"on":""} onClick={()=>setLang(l as any)}>{l}</button>)}</div>
      </header>

      {view==="home" && <Home setView={setView} teacher={teacher} setTeacher={setTeacher} level={level} profile={profile} lessons={lessons} onAgeChange={changeChildAge}/>}
      {view==="lesson" && <LessonStudio teacher={teacher} cameraAllowed={camera} microAllowed={micro} profile={profile} lessons={lessons} lang={lang}/>}
      {view==="assessment" && <AssessmentEngine profile={profile} onLevel={setLevel}/>}
      {view==="parent" && <ParentDashboard teacher={teacher} setTeacher={setTeacher} camera={camera} setCamera={setCamera} micro={micro} setMicro={setMicro} profile={profile} loginPi={loginPi} piUser={piUser}/>}
      {view==="web3" && <Web3/>}
    </main>
  </div>
}

function title(v:View){return {home:"Executive Learning Overview",lesson:"Live Lesson Studio",assessment:"Entry Assessment",parent:"Parent Intelligence Hub",web3:"Blockchain, Web3 & Pi Learning Hub"}[v]}

function Home({setView,teacher,setTeacher,level,profile,lessons,onAgeChange}:{setView:(v:View)=>void;teacher:Teacher;setTeacher:(t:Teacher)=>void;level:number;profile:Profile|null;lessons:Lesson[];onAgeChange:(age:number)=>Promise<void>}){
  const subjects=[["🔤","Ngôn ngữ","Nghe • Nói • Đọc • Viết"],["➗","Toán","Số học • Logic"],["🔬","Khoa học","Khám phá • Thí nghiệm"],["🤖","STEM","Công nghệ • Sáng tạo"],["🧠","Tư duy","Logic • Puzzle"],["🌱","Kỹ năng sống","Tự lập • Cảm xúc"]];
  const width=Math.min(100,35+lessons.length*15)+"%";
  return <div className="grid">
    <section className="card hero"><small>AI Adaptive Learning • Production Core</small><h2>Học cùng Jenna & JohnPC</h2><p>Giáo trình có version, nguồn, cloud database, cache và lộ trình cá nhân hóa. AI Tutor có age guardrails và kết nối live AI provider khi cấu hình khóa dịch vụ.</p><button className="cta" onClick={()=>setView("lesson")}>Mở bài học thật</button></section>
    <section className="card profile"><div className="kid"><div className="avatar">🧒</div><div><b>{profile?.name||"Đang tải..."}</b><div style={{fontSize:13,color:"#7a829b"}}>{profile?.age||7} tuổi • Level {level}</div></div></div><p><b>Curriculum loaded</b></p><div className="bar"><i style={{width}}/></div><small>{lessons.length} lesson(s) phù hợp hiện tại</small></section>
    {subjects.map(([e,t,s])=><section className="card subject" key={t}><div className="emoji">{e}</div><b>{t}</b><div style={{fontSize:12,color:"#7a829b",marginTop:4}}>{s}</div></section>)}
    <button className={"card teacher "+(teacher==="Jenna"?"selected":"")} onClick={()=>setTeacher("Jenna")}><div className="face">👩‍🏫</div><div style={{textAlign:"left"}}><h3>Jenna AI</h3><p>Ngôn ngữ • phát âm • kể chuyện • hướng dẫn nhẹ nhàng.</p></div></button>
    <button className={"card teacher "+(teacher==="JohnPC"?"selected":"")} onClick={()=>setTeacher("JohnPC")}><div className="face">👨‍💻</div><div style={{textAlign:"left"}}><h3>JohnPC AI</h3><p>Toán • khoa học • STEM • logic • công nghệ.</p></div></button>
    <CurriculumRoadmap age={profile?.age||7} onAgeChange={onAgeChange}/>
    <section className="card web3"><small style={{color:"#73f2ff"}}>EXPLORER / PARENT</small><h2>π Blockchain • Web3 • Pi Learning Hub</h2><p>Khu học công nghệ riêng, child-safe, không có dự đoán giá hoặc lời khuyên đầu tư.</p><div className="tags">{["Blockchain Basics","Web3","Pi Network","Digital Economy"].map(x=><span className="tag" key={x}>{x}</span>)}</div></section>
  </div>
}

function LessonStudio({teacher,cameraAllowed,microAllowed,profile,lessons,lang}:{teacher:Teacher;cameraAllowed:boolean;microAllowed:boolean;profile:Profile|null;lessons:Lesson[];lang:string}){
  const [messages,setMessages]=useState<{role:"ai"|"me";text:string}[]>([{role:"ai",text:"Chào con! Hôm nay mình sẽ học từng bước thật dễ hiểu nhé."}]);
  const [input,setInput]=useState("");
  const [busy,setBusy]=useState(false);
  const [transcript,setTranscript]=useState("");
  const [videoOn,setVideoOn]=useState(false);
  const videoRef=useRef<HTMLVideoElement|null>(null);
  const streamRef=useRef<MediaStream|null>(null);
  const lesson:Lesson=lessons[0] || {id:"en-colors-1",subject:"Language",title:"Colors & Objects",content:{objective:"Recognize colors"},skills:["vocabulary"],version:1};

  useEffect(()=>()=>{streamRef.current?.getTracks().forEach(t=>t.stop())},[]);

  function speak(text:string){
    if(!("speechSynthesis" in window)) return alert("Thiết bị chưa hỗ trợ TTS.");
    speechSynthesis.cancel();
    const u=new SpeechSynthesisUtterance(text);
    u.lang=lang==="中文"?"zh-CN":lang==="EN"?"en-US":"vi-VN";
    u.rate=0.92;
    speechSynthesis.speak(u);
  }

  function startSTT(){
    if(!microAllowed) return alert("Phụ huynh chưa cấp quyền micro.");
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR) return alert("Trình duyệt này chưa hỗ trợ Speech Recognition.");
    const r=new SR();
    r.lang=lang==="中文"?"zh-CN":lang==="EN"?"en-US":"vi-VN";
    r.interimResults=false;
    r.onresult=(e:any)=>{const t=e.results[0][0].transcript;setTranscript(t);setInput(t)};
    r.onerror=(e:any)=>alert("STT: "+e.error);
    r.start();
  }

  async function toggleCamera(){
    if(videoOn){streamRef.current?.getTracks().forEach(t=>t.stop());streamRef.current=null;setVideoOn(false);return}
    if(!cameraAllowed) return alert("Phụ huynh chưa cấp quyền camera.");
    try{
      const stream=await navigator.mediaDevices.getUserMedia({video:true,audio:false});
      streamRef.current=stream;setVideoOn(true);
      setTimeout(()=>{if(videoRef.current) videoRef.current.srcObject=stream},0);
    }catch(e:any){alert("Camera: "+(e?.message||"Không truy cập được"))}
  }

  async function send(){
    const text=input.trim(); if(!text||busy) return;
    setMessages(m=>[...m,{role:"me",text}]);setInput("");setBusy(true);
    try{
      const language=lang==="中文"?"zh":lang==="EN"?"en":"vi";
      const data=await fetch("/api/ai/tutor",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({age:profile?.age||7,teacher,language,subject:lesson.subject,lessonTitle:lesson.title,objective:lesson.content?.objective,skillFocus:lesson.skills||[],message:text})}).then(r=>r.json());
      const reply=data.reply||"Thầy/cô chưa trả lời được câu này.";
      setMessages(m=>[...m,{role:"ai",text:reply}]);
      speak(reply);
    }finally{setBusy(false)}
  }

  async function completeLesson(score:number){
    if(!profile) return alert("Hồ sơ bé chưa sẵn sàng.");
    const skillMap=Object.fromEntries((lesson.skills||[]).map((s:string)=>[s,score]));
    const payload={childId:profile.id,lessonId:lesson.id,score,durationSeconds:300,skillMap,state:{completed:true,version:lesson.version}};
    try{
      const data=await fetch("/api/progress",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)}).then(r=>r.json());
      alert("Đã lưu kết quả. Adaptive Learning: "+(data.next?.message||"updated"));
    }catch{
      queueOffline({type:"progress",childId:profile.id,payload});
      alert("Đang offline. Kết quả đã vào hàng đợi và sẽ đồng bộ khi có mạng.");
    }
  }

  return <div className="lesson">
    <section className="card"><small style={{color:"#5f54d9",fontWeight:800}}>{lesson.subject} • v{lesson.version} • Adaptive</small><h2>📘 {lesson.title}</h2><p>{lesson.content?.objective||"Interactive learning session"}</p>
      <LessonRuntime lesson={lesson} lang={lang} onSpeak={speak}/>
      <hr style={{border:0,borderTop:"1px solid #edf0f5",margin:"22px 0"}}/>
      <h3>🎙 Voice & Camera Lab</h3>
      <div className="row"><button className="violetBtn" onClick={()=>speak("This is a red apple.")}>🔊 TTS</button><button className="violetBtn" onClick={startSTT}>🎤 STT</button><button className="darkBtn" onClick={toggleCamera}>{videoOn?"⏹ Tắt camera":"📷 Mở camera"}</button></div>
      {transcript&&<p><b>Speech:</b> {transcript}</p>}
      {videoOn&&<video ref={videoRef} autoPlay playsInline muted style={{width:"100%",maxWidth:520,borderRadius:18,marginTop:14,background:"#111"}}/>}
      <div className="row" style={{marginTop:16}}><button className="mutedBtn" onClick={()=>completeLesson(65)}>Hoàn thành 65%</button><button className="violetBtn" onClick={()=>completeLesson(90)}>Hoàn thành 90%</button></div>
    </section>
    <aside className="card"><div className="kid"><div className="face">{teacher==="Jenna"?"👩‍🏫":"👨‍💻"}</div><div><b>{teacher} AI</b><div style={{fontSize:12,color:"#7a829b"}}>Age Guardrails • Live API</div></div></div>
      <div className="chat">{messages.map((m,i)=><div key={i} className={"msg "+(m.role==="ai"?"ai":"me")}>{m.text}</div>)}</div>
      <div className="row" style={{marginTop:10}}><input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder={"Hỏi "+teacher+"..."} style={{flex:1,minWidth:0,border:"1px solid #dfe3ec",borderRadius:12,padding:10}}/><button className="violetBtn" onClick={send} disabled={busy}>{busy?"...":"Gửi"}</button></div>
    </aside>
  </div>
}

function Assessment({done,setDone,setLevel,level}:{done:boolean;setDone:(v:boolean)=>void;setLevel:(v:number)=>void;level:number}){
  if(done) return <section className="card"><div style={{fontSize:44}}>✅</div><h2>Đã xác định Level {level}</h2><p>Adaptive Learning sẽ dùng mức này làm điểm khởi đầu và điều chỉnh theo kết quả thật.</p><button className="mutedBtn" onClick={()=>setDone(false)}>Làm lại</button></section>;
  return <section className="card"><small style={{color:"#5f54d9",fontWeight:800}}>ENTRY ASSESSMENT</small><h2>Bài đánh giá ngắn</h2><p>Chọn đáp án đúng cho 3 + 2.</p><div className="assessmentChoices">{[4,5,6].map(n=><button key={n} onClick={()=>{setLevel(n===5?3:2);setDone(true)}}>{n}</button>)}</div></section>
}

function Parent({teacher,setTeacher,camera,setCamera,micro,setMicro,profile,loginPi,piUser}:{teacher:Teacher;setTeacher:(t:Teacher)=>void;camera:boolean;setCamera:(v:boolean)=>void;micro:boolean;setMicro:(v:boolean)=>void;profile:Profile|null;loginPi:()=>void;piUser:string|null}){
  return <div style={{display:"grid",gap:16}}>
    <div className="kpis">{[["PostgreSQL","Durable data"],["Redis","Live cache"],["Offline Queue","Recovery"],["24/7","Sync-ready"]].map(([a,b])=><section className="card kpi" key={b}><b>{a}</b><small>{b}</small></section>)}</div>
    <section className="card"><h3>Hồ sơ học viên</h3><p>{profile ? profile.name+" • "+profile.age+" tuổi • Level "+profile.level : "Đang tải..."}</p><button className="darkBtn" onClick={loginPi}>{piUser ? "✓ Pi: "+piUser : "Đăng nhập Pi & xác minh server-side"}</button></section>
    <div className="grid">
      <section className="card" style={{gridColumn:"span 4"}}><h3>AI mặc định</h3><div className="row"><button className={teacher==="Jenna"?"violetBtn":"mutedBtn"} onClick={()=>setTeacher("Jenna")}>Jenna</button><button className={teacher==="JohnPC"?"violetBtn":"mutedBtn"} onClick={()=>setTeacher("JohnPC")}>JohnPC</button></div></section>
      <section className="card" style={{gridColumn:"span 4"}}><h3>Parental Consent Log</h3><Toggle label="Camera" on={camera} setOn={setCamera}/><Toggle label="Micro" on={micro} setOn={setMicro}/><Toggle label="Notifications" on={true} setOn={()=>{}}/></section>
      <section className="card" style={{gridColumn:"span 4"}}><h3>Learning Passport</h3><p>Kết quả thật được ghi vào PostgreSQL; Adaptive Learning trả đề xuất sau mỗi bài.</p><div style={{background:"#eafaf2",color:"#16814d",padding:12,borderRadius:12,fontWeight:800}}>Progress Recovery Enabled</div></section>
    </div>
  </div>
}

function Toggle({label,on,setOn}:{label:string;on:boolean;setOn:(v:boolean)=>void}){return <div className="toggle"><span>{label}</span><button className={"switch "+(on?"on":"")} onClick={()=>setOn(!on)}><span/></button></div>}

function Web3(){
  return <div style={{display:"grid",gap:16}}>
    <section className="card web3"><small style={{color:"#73f2ff"}}>EDUCATION ONLY</small><h2>Blockchain, Web3 & Pi Learning Hub</h2><p>Học blockchain, ví số, giao dịch mô phỏng, Web3 và Pi Network theo hướng giáo dục. Không dự đoán giá và không khuyến nghị đầu tư.</p></section>
    <div className="grid">{[["🧱","Build a Block","Kéo thả giao dịch vào block"],["👛","Wallet Demo","Ví mô phỏng, không dùng tiền thật"],["🌐","Web3 Basics","Web2 vs Web3"],["π","Pi Network","Pi Browser • Apps • Ecosystem"]].map(([e,t,s])=><section className="card" style={{gridColumn:"span 3"}} key={t}><div style={{fontSize:32}}>{e}</div><h3>{t}</h3><small style={{color:"#7a829b"}}>{s}</small></section>)}</div>
  </div>
}

function queueOffline(event:any){
  const key="hs_offline_queue";
  const q=JSON.parse(localStorage.getItem(key)||"[]");
  q.push(event);
  localStorage.setItem(key,JSON.stringify(q.slice(-200)));
}

async function flushOfflineQueue(childId:string|null){
  if(!navigator.onLine) return;
  const key="hs_offline_queue";
  const q=JSON.parse(localStorage.getItem(key)||"[]");
  if(!q.length) return;
  const clientId=localStorage.getItem("hs_client_id")||crypto.randomUUID();
  localStorage.setItem("hs_client_id",clientId);
  try{
    await fetch("/api/sync",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({clientId,events:q.map((x:any)=>({childId:x.childId||childId,type:x.type,payload:x.payload}))})});
    localStorage.removeItem(key);
  }catch{}
}
