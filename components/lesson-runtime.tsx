"use client";

import { useMemo, useState } from "react";

export function LessonRuntime({ lesson, lang, onSpeak }: { lesson:any; lang:string; onSpeak:(text:string)=>void }) {
  const steps=useMemo(()=>Array.isArray(lesson?.content?.steps)?lesson.content.steps:[],[lesson]);
  const [answers,setAnswers]=useState<Record<number,number>>({});
  const [feedback,setFeedback]=useState<Record<number,string>>({});

  function choose(step:any,index:number,option:number){
    setAnswers(x=>({...x,[index]:option}));
    if(typeof step.answer==="number"){
      setFeedback(x=>({...x,[index]:option===step.answer?"✅ Chính xác!":"↻ Chưa đúng. Thử lại một lần nữa nhé."}));
    } else {
      setFeedback(x=>({...x,[index]:"✓ Đã ghi nhận câu trả lời."}));
    }
  }

  if(lesson?.content?.story?.pages?.length){
    return <div style={{display:"grid",gap:12}}>
      <div style={{padding:16,borderRadius:18,background:"#f7f8fd"}}>
        <b>Mục tiêu:</b> {lesson.content.objective}
      </div>
      {lesson.content.story.pages.map((p:string,i:number)=><div key={i} style={{padding:18,border:"1px solid #e5e9f2",borderRadius:18,background:"#fff"}}>
        <small>Trang {i+1}</small>
        <p style={{fontSize:18,lineHeight:1.7}}>{p}</p>
        <button className="mutedBtn" onClick={()=>onSpeak(p)}>🔊 Nghe</button>
      </div>)}
      <small style={{color:"#7a829b"}}>{lesson.content.story.metadata?.license || lesson.source_license || ""}</small>
    </div>;
  }

  return <div style={{display:"grid",gap:12}}>
    {steps.map((step:any,i:number)=>{
      if(step.type==="choice") return <div key={i} style={{padding:16,border:"1px solid #e6eaf2",borderRadius:18}}>
        <b>{step.prompt}</b>
        <div style={{display:"grid",gap:8,marginTop:12}}>
          {(step.options||[]).map((o:string,j:number)=><button key={j} className={answers[i]===j?"violetBtn":"mutedBtn"} onClick={()=>choose(step,i,j)}>{o}</button>)}
        </div>
        {feedback[i]&&<p>{feedback[i]}</p>}
      </div>;

      if(step.type==="listen" || step.type==="speak") return <div key={i} style={{padding:16,border:"1px solid #e6eaf2",borderRadius:18,background:"#fafbff"}}>
        <b>{step.type==="listen"?"Nghe":"Luyện nói"}</b>
        <p>{step.text || step.prompt}</p>
        <button className="violetBtn" onClick={()=>onSpeak(step.text || step.prompt || "")}>🔊 Phát âm mẫu</button>
      </div>;

      return <div key={i} style={{padding:16,border:"1px solid #e6eaf2",borderRadius:18}}>
        <small style={{textTransform:"uppercase",color:"#6d5dfc",fontWeight:800}}>{step.type}</small>
        <p style={{lineHeight:1.7}}>{step.text || step.prompt || step.successCriteria || "Hoạt động học tập"}</p>
        {step.minutes&&<small style={{color:"#7a829b"}}>Khoảng {step.minutes} phút</small>}
      </div>;
    })}
  </div>;
}
