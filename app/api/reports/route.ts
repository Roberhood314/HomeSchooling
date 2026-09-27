import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/server/db";

function isoDate(d:Date){return d.toISOString().slice(0,10)}

export async function POST(req:NextRequest){
  const body=await req.json().catch(()=>({}));
  const childId=String(body.childId||"");
  const periodType=body.periodType==="monthly"?"monthly":"weekly";
  if(!childId) return NextResponse.json({ok:false,error:"childId required"},{status:400});
  const end=new Date(); const start=new Date(end); start.setDate(end.getDate()-(periodType==="weekly"?7:30));
  const [p,a]=await Promise.all([
    db().query("SELECT p.*,l.subject,l.title FROM learning_progress p JOIN lessons l ON l.id=p.lesson_id WHERE p.child_id=$1 AND p.completed_at BETWEEN $2 AND $3 ORDER BY p.completed_at",[childId,start,end]),
    db().query("SELECT * FROM assessments WHERE child_id=$1 AND created_at BETWEEN $2 AND $3 ORDER BY created_at DESC",[childId,start,end])
  ]);
  const rows=p.rows; const totalMinutes=Math.round(rows.reduce((s:number,r:any)=>s+Number(r.duration_seconds||0),0)/60);
  const avg=rows.length?Math.round(rows.reduce((s:number,r:any)=>s+Number(r.score||0),0)/rows.length):0;
  const subjects:Record<string,{count:number,total:number}>={};
  for(const r of rows){const x=subjects[r.subject]||{count:0,total:0};x.count++;x.total+=Number(r.score||0);subjects[r.subject]=x;}
  const subjectSummary=Object.entries(subjects).map(([subject,x])=>({subject,lessons:x.count,averageScore:Math.round(x.total/x.count)}));
  const weak=subjectSummary.filter(x=>x.averageScore<70).sort((a,b)=>a.averageScore-b.averageScore);
  const report={periodType,start:isoDate(start),end:isoDate(end),totalMinutes,completedLessons:rows.length,averageScore:avg,subjects:subjectSummary,latestAssessment:a.rows[0]||null,recommendation:weak.length?"Ôn "+weak[0].subject+" bằng bài ngắn, spaced review và ví dụ cụ thể.":"Giữ nhịp hiện tại và thêm một hoạt động mở rộng."};
  const id=crypto.randomUUID();
  await db().query("INSERT INTO parent_reports(id,child_id,period_type,period_start,period_end,report) VALUES($1,$2,$3,$4,$5,$6)",[id,childId,periodType,isoDate(start),isoDate(end),JSON.stringify(report)]);
  return NextResponse.json({ok:true,id,report});
}

export async function GET(req:NextRequest){
  const u=new URL(req.url); const childId=u.searchParams.get("childId");
  if(!childId) return NextResponse.json({ok:false,error:"childId required"},{status:400});
  const r=await db().query("SELECT * FROM parent_reports WHERE child_id=$1 ORDER BY period_start DESC LIMIT 24",[childId]);
  return NextResponse.json({ok:true,reports:r.rows});
}