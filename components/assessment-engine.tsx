"use client";
import { useMemo, useState } from "react";

type Profile={id:string;age:number;level:number;name:string};

function questionsForAge(age:number){
  if(age===3) return [
    {q:"Chọn hình tròn",opts:["⚪","🔺","⬛"],a:0,skill:"shapes"},
    {q:"Có mấy quả táo? 🍎🍎",opts:["1","2","3"],a:1,skill:"counting"},
    {q:"Màu nào là đỏ?",opts:["🔴","🔵","🟢"],a:0,skill:"colors"}
  ];
  if(age===4) return [
    {q:"Số nào đến sau 4?",opts:["3","5","6"],a:1,skill:"counting"},
    {q:"Mẫu: 🔴🔵🔴🔵 ...",opts:["🔴","🟢","🟡"],a:0,skill:"patterns"},
    {q:"Chữ nào là A?",opts:["A","B","C"],a:0,skill:"letters"}
  ];
  if(age===5) return [
    {q:"3 + 2 = ?",opts:["4","5","6"],a:1,skill:"addition"},
    {q:"Âm đầu của 'mèo' là?",opts:["m","b","t"],a:0,skill:"phonics"},
    {q:"Hình nào có 4 cạnh bằng nhau?",opts:["Tam giác","Hình vuông","Hình tròn"],a:1,skill:"geometry"}
  ];
  if(age===6) return [
    {q:"12 - 5 = ?",opts:["6","7","8"],a:1,skill:"subtraction"},
    {q:"Từ nào là động từ?",opts:["chạy","đỏ","bàn"],a:0,skill:"grammar"},
    {q:"Cây cần gì để sống?",opts:["Ánh sáng và nước","Đá","Nhựa"],a:0,skill:"science"}
  ];
  if(age===7) return [
    {q:"4 nhóm, mỗi nhóm 3 vật. Có tất cả?",opts:["7","12","16"],a:1,skill:"multiplication"},
    {q:"Ý chính của một đoạn văn là gì?",opts:["Ý quan trọng nhất","Từ dài nhất","Câu cuối cùng"],a:0,skill:"reading"},
    {q:"Mạch điện kín giúp bóng đèn...",opts:["sáng","biến mất","lạnh đi"],a:0,skill:"science"}
  ];
  if(age===8) return [
    {q:"6 × 7 = ?",opts:["36","42","48"],a:1,skill:"multiplication"},
    {q:"Perimeter là gì?",opts:["Chu vi","Diện tích","Thể tích"],a:0,skill:"geometry"},
    {q:"Kết luận từ dữ liệu cần dựa vào...",opts:["bằng chứng","đoán mò","sở thích"],a:0,skill:"reasoning"}
  ];
  return [
    {q:"3/4 tương đương phân số nào?",opts:["6/8","4/6","5/8"],a:0,skill:"fractions"},
    {q:"Một nguồn tin đáng tin cần...",opts:["bằng chứng và nguồn","nhiều emoji","tiêu đề giật gân"],a:0,skill:"media-literacy"},
    {q:"Trong thuật toán, điều kiện 'nếu/thì' dùng để...",opts:["ra quyết định","tắt máy","đếm chữ"],a:0,skill:"coding"}
  ];
}

export function AssessmentEngine({profile,onLevel}:{profile:Profile|null;onLevel?:(n:number)=>void}){
  const age=profile?.age||7;
  const qs=useMemo(()=>questionsForAge(age),[age]);
  const [answers,setAnswers]=useState<Record<number,number>>({});
  const [result,setResult]=useState<any>(null);
  const [busy,setBusy]=useState(false);

  async function submit(){
    if(!profile||Object.keys(answers).length<qs.length) return;
    setBusy(true);
    try{
      const correct=qs.filter((q,i)=>answers[i]===q.a).length;
      const accuracy=Math.round(correct/qs.length*100);
      const mastery=Object.fromEntries(qs.map((q,i)=>[q.skill,answers[i]===q.a?1:0.35]));
      const data=await fetch("/api/assessment",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
        childId:profile.id,age,subject:"Baseline",assessmentType:"baseline",accuracy,repetitions:0,speedScore:80,skillMastery:mastery,
        observations:["Completed age-based baseline assessment"]
      })}).then(r=>r.json());
      setResult(data);
      if(data?.assessment?.level){
        const next=data.assessment.level==="Mastered"?Math.min(7,profile.level+1):data.assessment.level==="Beginning"?Math.max(1,profile.level-1):profile.level;
        onLevel?.(next);
      }
    }finally{setBusy(false)}
  }

  if(result?.ok) return <section className="card">
    <small style={{color:"#5f54d9",fontWeight:800}}>BASELINE ASSESSMENT • AGE {age}</small>
    <h2>{result.assessment.level}</h2>
    <p>Điểm tổng hợp: <b>{Math.round(result.assessment.composite)}%</b></p>
    <p>{result.recommendation}</p>
    <button className="mutedBtn" onClick={()=>{setAnswers({});setResult(null)}}>Đánh giá lại</button>
  </section>;

  return <section className="card">
    <small style={{color:"#5f54d9",fontWeight:800}}>BASELINE ASSESSMENT • AGE {age}</small>
    <h2>Đánh giá đầu vào phù hợp độ tuổi</h2>
    <p>Không chỉ dùng một câu hỏi. Kết quả được lưu vào hồ sơ năng lực và dùng cho Adaptive Learning.</p>
    <div style={{display:"grid",gap:16}}>
      {qs.map((q,i)=><div key={i} style={{padding:16,border:"1px solid #e5e9f2",borderRadius:18}}>
        <b>{i+1}. {q.q}</b>
        <div className="assessmentChoices">
          {q.opts.map((o,j)=><button key={j} className={answers[i]===j?"violetBtn":""} onClick={()=>setAnswers(x=>({...x,[i]:j}))}>{o}</button>)}
        </div>
      </div>)}
    </div>
    <button className="violetBtn" disabled={busy||Object.keys(answers).length<qs.length} onClick={submit} style={{marginTop:16}}>{busy?"Đang đánh giá...":"Hoàn tất đánh giá"}</button>
  </section>
}
