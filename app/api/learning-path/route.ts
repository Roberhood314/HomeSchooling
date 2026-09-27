import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { isResponse, requireOwnedChild } from "@/lib/server/auth";

export const dynamic="force-dynamic";

function stage(age:number){
  if(age<=3) return "Little Explorer";
  if(age===4) return "Young Learner";
  if(age===5) return "Kindergarten Ready";
  if(age===6) return "Primary Starter";
  if(age===7) return "Foundation Builder";
  if(age===8) return "Primary Explorer";
  return "Independent Learner";
}

export async function GET(req:NextRequest){
  const u=new URL(req.url);
  const childId=String(u.searchParams.get("childId")||"");
  if(!childId) return NextResponse.json({ok:false,error:"childId required"},{status:400});
  const ownership=await requireOwnedChild(req,childId); if(isResponse(ownership)) return ownership;
  const p=await db().query("SELECT * FROM child_profiles WHERE id=$1",[childId]);
  const profile=p.rows[0];
  if(!profile) return NextResponse.json({ok:false,error:"profile not found"},{status:404});

  const recent=await db().query(
    "SELECT lp.score,lp.skill_map,lp.completed_at,l.id,l.subject,l.title,l.level,l.skills FROM learning_progress lp JOIN lessons l ON l.id=lp.lesson_id WHERE lp.child_id=$1 ORDER BY lp.completed_at DESC LIMIT 80",
    [childId]
  );
  const assess=await db().query("SELECT * FROM assessments WHERE child_id=$1 ORDER BY created_at DESC LIMIT 10",[childId]);

  const skillStats:Record<string,{n:number,total:number}>={};
  for(const row of recent.rows){
    const m=row.skill_map&&typeof row.skill_map==="object"?row.skill_map:{};
    for(const [skill,val] of Object.entries(m)){
      const x=skillStats[skill]||{n:0,total:0};
      x.n++; x.total+=Number(val)||0; skillStats[skill]=x;
    }
  }
  for(const a of assess.rows){
    const m=a.skill_mastery&&typeof a.skill_mastery==="object"?a.skill_mastery:{};
    for(const [skill,val] of Object.entries(m)){
      const x=skillStats[skill]||{n:0,total:0};
      x.n++; x.total+=(Number(val)||0)*100; skillStats[skill]=x;
    }
  }
  const mastery=Object.entries(skillStats).map(([skill,x])=>({skill,score:Math.round(x.total/x.n)})).sort((a,b)=>a.score-b.score);
  const weakest=mastery.slice(0,5).map(x=>x.skill);
  const strongest=[...mastery].sort((a,b)=>b.score-a.score).slice(0,5).map(x=>x.skill);

  const completedIds=recent.rows.map((r:any)=>r.id);
  const vals:any[]=[profile.age,profile.preferred_language||"vi",Math.max(1,Math.min(5,profile.level||1))];
  let sql=`SELECT id,subject,title,level,skills,content,language FROM lessons WHERE active=TRUE AND $1 BETWEEN min_age AND max_age AND language=$2 AND level <= $3`;
  if(completedIds.length){vals.push(completedIds);sql+=` AND NOT (id = ANY($4::text[]))`;}
  sql+=` ORDER BY level,subject,title LIMIT 60`;
  let candidates=(await db().query(sql,vals)).rows;
  if(!candidates.length){
    candidates=(await db().query("SELECT id,subject,title,level,skills,content,language FROM lessons WHERE active=TRUE AND $1 BETWEEN min_age AND max_age AND language=$2 ORDER BY level,subject,title LIMIT 60",[profile.age,profile.preferred_language||"vi"])).rows;
  }

  const scored=candidates.map((l:any)=>{
    const skills=Array.isArray(l.skills)?l.skills:[];
    const weakHits=skills.filter((s:string)=>weakest.includes(s)).length;
    const strongHits=skills.filter((s:string)=>strongest.includes(s)).length;
    const score=weakHits*8+strongHits*2-Math.abs(Number(l.level)-Number(profile.level))*1.5;
    return {...l,recommendationScore:score};
  }).sort((a:any,b:any)=>b.recommendationScore-a.recommendationScore);

  const recommended=scored.slice(0,6);
  const id=crypto.randomUUID();
  const weeklyPlan={stage:stage(profile.age),recommendedLessons:recommended.map((x:any)=>x.id),weakestSkills:weakest,strongestSkills:strongest};
  await db().query(
    "INSERT INTO learning_paths(id,child_id,age,framework_version,weekly_plan,monthly_objectives,next_actions,status) VALUES($1,$2,$3,1,$4,$5,$6,'active')",
    [id,childId,profile.age,JSON.stringify(weeklyPlan),JSON.stringify(weakest),JSON.stringify(recommended.map((x:any)=>({lessonId:x.id,subject:x.subject,title:x.title})))]
  );
  return NextResponse.json({ok:true,childId,stage:stage(profile.age),level:profile.level,mastery,weakestSkills:weakest,strongestSkills:strongest,recommendedLessons:recommended});
}
