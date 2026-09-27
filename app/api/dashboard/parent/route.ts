import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/server/db";
export const dynamic="force-dynamic";
export async function GET(req:NextRequest){
  const childId=new URL(req.url).searchParams.get("childId");
  if(!childId) return NextResponse.json({ok:false,error:"childId required"},{status:400});
  const [profile,progress,assess,consents,achievements]=await Promise.all([
    db().query("SELECT * FROM child_profiles WHERE id=$1",[childId]),
    db().query("SELECT p.*,l.title,l.subject FROM learning_progress p JOIN lessons l ON l.id=p.lesson_id WHERE p.child_id=$1 ORDER BY p.completed_at DESC LIMIT 100",[childId]),
    db().query("SELECT * FROM assessments WHERE child_id=$1 ORDER BY created_at DESC LIMIT 20",[childId]),
    db().query("SELECT permission,allowed,updated_at FROM consent_log WHERE child_id=$1",[childId]),
    db().query("SELECT * FROM achievements WHERE child_id=$1 ORDER BY awarded_at DESC LIMIT 20",[childId])
  ]);
  const rows=progress.rows;
  const totalSeconds=rows.reduce((s:number,r:any)=>s+Number(r.duration_seconds||0),0);
  const avgScore=rows.length?rows.reduce((s:number,r:any)=>s+Number(r.score||0),0)/rows.length:0;
  const bySubject:Record<string,{count:number,score:number}>={};
  for(const r of rows){const x=bySubject[r.subject]||{count:0,score:0};x.count++;x.score+=Number(r.score||0);bySubject[r.subject]=x;}
  const subjectSummary=Object.entries(bySubject).map(([subject,v])=>({subject,count:v.count,averageScore:Math.round(v.score/v.count)}));
  const difficult=subjectSummary.filter(x=>x.averageScore<70).sort((a,b)=>a.averageScore-b.averageScore);
  const aiRecommendation=difficult.length ? "Ưu tiên ôn "+difficult[0].subject+" bằng bài ngắn và ví dụ cụ thể." : "Tiếp tục lộ trình hiện tại và thêm một hoạt động mở rộng.";
  return NextResponse.json({
    ok:true,profile:profile.rows[0]||null,
    today:{studyMinutes:Math.round(totalSeconds/60),completedLessons:rows.length},
    performance:{averageScore:Math.round(avgScore),subjects:subjectSummary,difficultSubjects:difficult},
    latestAssessment:assess.rows[0]||null,consents:consents.rows,achievements:achievements.rows,aiRecommendation
  });
}