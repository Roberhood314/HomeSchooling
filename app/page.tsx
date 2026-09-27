"use client";

import { useState } from "react";

type View = "home" | "lesson" | "assessment" | "parent" | "web3";
type Teacher = "Jenna" | "JohnPC";

export default function HomePage() {
  const [view,setView] = useState<View>("home");
  const [lang,setLang] = useState("VI");
  const [teacher,setTeacher] = useState<Teacher>("Jenna");
  const [level,setLevel] = useState(3);
  const [assessmentDone,setAssessmentDone] = useState(false);
  const [camera,setCamera] = useState(false);
  const [micro,setMicro] = useState(true);

  const nav:[View,string,string][] = [
    ["home","🏠","Trang chủ"],["lesson","📚","Bài học"],["assessment","🧩","Đánh giá"],
    ["parent","👨‍👩‍👧","Phụ huynh"],["web3","π","Web3 & Pi"]
  ];

  return <div className="shell">
    <aside className="side">
      <div className="brand"><div className="brandMark">AI</div><div>AI HomeSchool<div style={{fontSize:12,color:"#7a829b"}}>Ages 3–9</div></div></div>
      <div className="nav">{nav.map(([id,icon,label])=><button key={id} className={view===id?"active":""} onClick={()=>setView(id)}>{icon} {label}</button>)}</div>
      <div className="safe"><b>🛡 Child Safe Mode</b><br/>AI lọc theo độ tuổi. Camera/Micro do phụ huynh kiểm soát. Dữ liệu trẻ được tách theo từng hồ sơ.</div>
    </aside>

    <main className="main">
      <header className="top">
        <div><small style={{color:"#7a829b"}}>Xin chào 👋</small><h1>{title(view)}</h1></div>
        <div className="langs">{["VI","EN","中文"].map(l=><button key={l} className={lang===l?"on":""} onClick={()=>setLang(l)}>{l}</button>)}</div>
      </header>

      {view==="home" && <Home setView={setView} teacher={teacher} setTeacher={setTeacher} level={level}/>}
      {view==="lesson" && <Lesson teacher={teacher} camera={camera} micro={micro}/>}
      {view==="assessment" && <Assessment done={assessmentDone} setDone={setAssessmentDone} setLevel={setLevel} level={level}/>}
      {view==="parent" && <Parent teacher={teacher} setTeacher={setTeacher} camera={camera} setCamera={setCamera} micro={micro} setMicro={setMicro}/>}
      {view==="web3" && <Web3/>}
    </main>
  </div>
}

function title(v:View){return {home:"Hôm nay mình học gì?",lesson:"Bài học tương tác",assessment:"Đánh giá đầu vào",parent:"Bảng điều khiển phụ huynh",web3:"Blockchain, Web3 & Pi Learning Hub"}[v]}

function Home({setView,teacher,setTeacher,level}:{setView:(v:View)=>void;teacher:Teacher;setTeacher:(t:Teacher)=>void;level:number}){
  const subjects=[["🔤","Ngôn ngữ","Anh • Việt • Trung"],["➗","Toán","Số học • Logic"],["🔬","Khoa học","Khám phá • Thí nghiệm"],["🤖","STEM","Công nghệ • Sáng tạo"],["🧠","Tư duy","Logic • Puzzle"],["🌱","Kỹ năng sống","Tự lập • Cảm xúc"]];
  return <div className="grid">
    <section className="card hero"><small>AI Adaptive Learning</small><h2>Học cùng Jenna & JohnPC</h2><p>Lộ trình cá nhân hóa theo tuổi, trình độ và tiến độ. Trẻ học theo giáo án có cấu trúc và có thể hỏi AI bất cứ lúc nào.</p><button className="cta" onClick={()=>setView("lesson")}>Bắt đầu bài học</button></section>
    <section className="card profile"><div className="kid"><div className="avatar">🧒</div><div><b>Bé Minh</b><div style={{fontSize:13,color:"#7a829b"}}>7 tuổi • Level {level}</div></div></div><p><b>Tiến độ tuần này</b></p><div className="bar"><i/></div><small>68% mục tiêu tuần</small></section>
    {subjects.map(([e,t,s])=><section className="card subject" key={t}><div className="emoji">{e}</div><b>{t}</b><div style={{fontSize:12,color:"#7a829b",marginTop:4}}>{s}</div></section>)}
    <button className={"card teacher "+(teacher==="Jenna"?"selected":"")} onClick={()=>setTeacher("Jenna")}><div className="face">👩‍🏫</div><div style={{textAlign:"left"}}><h3>Jenna AI</h3><p>Ấm áp, thân thiện, kể chuyện và luyện ngôn ngữ.</p></div></button>
    <button className={"card teacher "+(teacher==="JohnPC"?"selected":"")} onClick={()=>setTeacher("JohnPC")}><div className="face">👨‍💻</div><div style={{textAlign:"left"}}><h3>JohnPC AI</h3><p>Toán, khoa học, STEM, logic và công nghệ.</p></div></button>
    <section className="card web3"><small style={{color:"#73f2ff"}}>EXPLORER / PARENT</small><h2>π Blockchain • Web3 • Pi Learning Hub</h2><p>Trẻ nhỏ học bằng mô phỏng và khái niệm cơ bản. Nội dung nâng cao dành cho Parent/Explorer. Không có lời khuyên đầu tư.</p><div className="tags">{["Blockchain Basics","Web3","Pi Network","Digital Economy"].map(x=><span className="tag" key={x}>{x}</span>)}</div><button className="darkBtn" style={{marginTop:16,background:"#6d5dfc"}} onClick={()=>setView("web3")}>Mở Learning Hub</button></section>
  </div>
}

function Lesson({teacher,camera,micro}:{teacher:Teacher;camera:boolean;micro:boolean}){
  return <div className="lesson">
    <section className="card"><small style={{color:"#5f54d9",fontWeight:800}}>English • Level 2 • Adaptive</small><h2>🎨 Find the red object</h2><p>{teacher}: “Can you find something red?”</p>
      <div className="choice correct">🍎 <b>Red Apple</b></div><div className="choice">🫐 Blue Berry</div><div className="choice">🍌 Yellow Banana</div>
      <hr style={{border:0,borderTop:"1px solid #edf0f5",margin:"22px 0"}}/>
      <h3>🎙 Nghe – Nói – Đọc – Viết</h3><p>Nói: <b>“This is a red apple.”</b></p>
      <div className="row"><button className="violetBtn" disabled={!micro} style={{opacity:micro?1:.4}}>🎤 Micro</button><button className="darkBtn" disabled={!camera} style={{opacity:camera?1:.4}}>📷 Camera</button></div>
      <small style={{color:"#8a91a8"}}>Camera/Micro chỉ hoạt động sau khi phụ huynh cấp quyền.</small>
    </section>
    <aside className="card"><div className="kid"><div className="face">{teacher==="Jenna"?"👩‍🏫":"👨‍💻"}</div><div><b>{teacher} AI</b><div style={{fontSize:12,color:"#7a829b"}}>AI Tutor • Child Safe Mode</div></div></div>
      <div className="chat"><div className="msg ai">Chào Minh! Hôm nay mình học màu sắc nhé 🌈</div><div className="msg me">Con chưa nhớ màu red.</div><div className="msg ai">Không sao. “Red” là màu đỏ. Con thử tìm quả táo màu đỏ nhé 🍎</div></div>
      <div className="row" style={{marginTop:10}}><input placeholder={"Hỏi "+teacher+"..."} style={{flex:1,minWidth:0,border:"1px solid #dfe3ec",borderRadius:12,padding:10}}/><button className="violetBtn">Gửi</button></div>
    </aside>
  </div>
}

function Assessment({done,setDone,setLevel,level}:{done:boolean;setDone:(v:boolean)=>void;setLevel:(v:number)=>void;level:number}){
  if(done) return <section className="card"><div style={{fontSize:44}}>✅</div><h2>Đã xác định Level {level}</h2><p>AI sẽ dùng kết quả này làm điểm khởi đầu cho lộ trình cá nhân hóa và tự điều chỉnh sau mỗi bài học.</p><button className="mutedBtn" onClick={()=>setDone(false)}>Làm lại</button></section>;
  return <section className="card"><small style={{color:"#5f54d9",fontWeight:800}}>ENTRY ASSESSMENT</small><h2>Bài đánh giá ngắn</h2><p>Demo: Chọn đáp án đúng cho 3 + 2.</p><div className="assessmentChoices">{[4,5,6].map(n=><button key={n} onClick={()=>{setLevel(n===5?3:2);setDone(true)}}>{n}</button>)}</div></section>
}

function Parent({teacher,setTeacher,camera,setCamera,micro,setMicro}:{teacher:Teacher;setTeacher:(t:Teacher)=>void;camera:boolean;setCamera:(v:boolean)=>void;micro:boolean;setMicro:(v:boolean)=>void}){
  return <div style={{display:"grid",gap:16}}>
    <div className="kpis">{[["12","Bài hoàn thành"],["4h 20m","Thời gian tuần"],["82%","Mức hoàn thành"],["+9%","Tăng kỹ năng"]].map(([a,b])=><section className="card kpi" key={b}><b>{a}</b><small>{b}</small></section>)}</div>
    <section className="card"><h3>Tiến độ kỹ năng — Bé Minh</h3>{[["English Speaking","78%","Luyện 10 phút/ngày"],["Reading","66%","Đọc truyện Level 2"],["Math","88%","Có thể tăng độ khó"],["Logic","74%","Thêm puzzle & chess"]].map(r=><div className="skill" key={r[0]}><b>{r[0]}</b><span>{r[1]}</span><span style={{color:"#7a829b"}}>{r[2]}</span></div>)}</section>
    <div className="grid">
      <section className="card" style={{gridColumn:"span 4"}}><h3>AI mặc định</h3><div className="row"><button className={teacher==="Jenna"?"violetBtn":"mutedBtn"} onClick={()=>setTeacher("Jenna")}>Jenna</button><button className={teacher==="JohnPC"?"violetBtn":"mutedBtn"} onClick={()=>setTeacher("JohnPC")}>JohnPC</button></div></section>
      <section className="card" style={{gridColumn:"span 4"}}><h3>Parental Consent Log</h3><Toggle label="Camera" on={camera} setOn={setCamera}/><Toggle label="Micro" on={micro} setOn={setMicro}/><Toggle label="Notifications" on={true} setOn={()=>{}}/></section>
      <section className="card" style={{gridColumn:"span 4"}}><h3>Learning Passport</h3><p>24 bài • 3 dự án • 6 huy hiệu</p><div style={{background:"#eafaf2",color:"#16814d",padding:12,borderRadius:12,fontWeight:800}}>Ready for next level</div></section>
    </div>
  </div>
}

function Toggle({label,on,setOn}:{label:string;on:boolean;setOn:(v:boolean)=>void}){return <div className="toggle"><span>{label}</span><button className={"switch "+(on?"on":"")} onClick={()=>setOn(!on)}><span/></button></div>}

function Web3(){
  return <div style={{display:"grid",gap:16}}>
    <section className="card web3"><small style={{color:"#73f2ff"}}>EDUCATION ONLY</small><h2>Khám phá nền kinh tế số</h2><p>Học blockchain, ví số, giao dịch mô phỏng, Web3 và Pi Network theo hướng giáo dục. Không dự đoán giá và không khuyến nghị đầu tư.</p></section>
    <div className="grid">{[["🧱","Build a Block","Kéo thả giao dịch vào block"],["👛","Wallet Demo","Ví mô phỏng, không dùng tiền thật"],["🌐","Web3 Basics","Web2 vs Web3"],["π","Pi Network","Pi Browser • Apps • Ecosystem"]].map(([e,t,s])=><section className="card" style={{gridColumn:"span 3"}} key={t}><div style={{fontSize:32}}>{e}</div><h3>{t}</h3><small style={{color:"#7a829b"}}>{s}</small></section>)}</div>
    <section className="card"><h3>📴 Offline-ready learning</h3><p>Một phần bài học và game mô phỏng có thể tải trước để dùng khi mất mạng; tiến độ được đồng bộ lại khi có kết nối.</p></section>
  </div>
}
