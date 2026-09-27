import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/server/db";

function levelLabel(score:number){
  if(score>=85) return "Mastered";
  if(score>=70) return "Proficient";
  if(score>=45) return "Developing";
  return "Beginning";
}

export async function POST(req:NextRequest){
  const body=await req.json().catch(()=>({}));
  const childId=String(body.childId||"");
  const age=Number(body.age);
  const subject=body.subject?String(body.subject):null;
  const type=String(body.assessmentType||"lesson");
  const observations=Array.isArray(body.observations)?body.observations:[];
  const accuracy=Math.max(0,Math.min(100,Number(body.accuracy||0)));
  const repetitions=Math.max(0,Number(body.repetitions||0));
  const speed=Math.max(0,Number(body.speedScore||0));
  const masteryInput=body.skillMastery&&typeof body.skillMastery==="object"?body.skillMastery:{};
  if(!childId||!Number.isInteger(age)||age<3||age>9){
    return NextResponse.json({ok:false,error:"Invalid childId or age"},{status:400});
  }
  const composite=Math.max(0,Math.min(100,accuracy*0.6+Math.min(100,speed)*0.15+Math.max(0,100-repetitions*12)*0.15+Math.min(100,observations.length*10)*0.10));
  const mastery:Record<string,number>={};
  for(const [k,v] of Object.entries(masteryInput)) mastery[k]=Math.max(0,Math.min(1,Number(v)||0));
  const label=levelLabel(composite);
  const id=crypto.randomUUID();
  const result={accuracy,repetitions,speedScore:speed,observations,composite,level:label};
  await db().query("INSERT INTO assessments(id,child_id,assessment_type,subject,age,result,skill_mastery,level_label) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",[id,childId,type,subject,age,JSON.stringify(result),JSON.stringify(mastery),label]);
  const recommendation=label==="Mastered"?"Advance or enrich with a project.":label==="Proficient"?"Continue and add spaced review.":label==="Developing"?"Keep the level and reinforce weak skills.":"Reduce task size, use concrete examples, and review prerequisites.";
  return NextResponse.json({ok:true,assessment:{id,...result,skillMastery:mastery},recommendation});
}

export async function GET(req:NextRequest){
  const childId=new URL(req.url).searchParams.get("childId");
  if(!childId) return NextResponse.json({ok:false,error:"childId required"},{status:400});
  const r=await db().query("SELECT * FROM assessments WHERE child_id=$1 ORDER BY created_at DESC LIMIT 100",[childId]);
  return NextResponse.json({ok:true,assessments:r.rows});
}