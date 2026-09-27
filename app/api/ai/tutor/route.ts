import { NextRequest, NextResponse } from "next/server";
import { localTutorFallback, validateTutorInput, type TutorInput } from "@/lib/server/guardrails";
import { runExternalTutor } from "@/lib/server/ai-providers";
import { db } from "@/lib/server/db";
import { isResponse, requireOwnedChild } from "@/lib/server/auth";

export async function POST(req: NextRequest) {
  const raw = await req.json().catch(() => ({}));
  const childId = raw.childId ? String(raw.childId) : null;
  const input: TutorInput = {
    age: Number(raw.age || 7),
    teacher: raw.teacher === "JohnPC" ? "JohnPC" : "Jenna",
    language: raw.language === "zh" ? "zh" : raw.language === "en" ? "en" : "vi",
    subject: raw.subject ? String(raw.subject) : undefined,
    lessonTitle: raw.lessonTitle ? String(raw.lessonTitle) : undefined,
    objective: raw.objective ? String(raw.objective) : undefined,
    skillFocus: Array.isArray(raw.skillFocus) ? raw.skillFocus.map(String).slice(0,12) : undefined,
    mastery: raw.mastery && typeof raw.mastery === "object" ? raw.mastery : undefined,
    message: String(raw.message || "")
  };

  if (childId) {
    const ownership = await requireOwnedChild(req, childId); if (isResponse(ownership)) return ownership;
    const [profile,progress,assessment] = await Promise.all([
      db().query("SELECT age,level,preferred_language,ai_teacher FROM child_profiles WHERE id=$1",[childId]),
      db().query("SELECT score,skill_map,completed_at FROM learning_progress WHERE child_id=$1 ORDER BY completed_at DESC LIMIT 12",[childId]),
      db().query("SELECT skill_mastery,level_label,created_at FROM assessments WHERE child_id=$1 ORDER BY created_at DESC LIMIT 3",[childId])
    ]);
    const p=profile.rows[0];
    if (p) {
      input.age=Number(p.age);
      if (p.ai_teacher==="JohnPC" || p.ai_teacher==="Jenna") input.teacher=p.ai_teacher;
      const merged:Record<string,number>={...(input.mastery||{})};
      for (const row of progress.rows) {
        const m=row.skill_map&&typeof row.skill_map==="object"?row.skill_map:{};
        for (const [k,v] of Object.entries(m)) merged[k]=Math.max(merged[k]||0,Math.min(1,(Number(v)||0)/100));
      }
      for (const row of assessment.rows) {
        const m=row.skill_mastery&&typeof row.skill_mastery==="object"?row.skill_mastery:{};
        for (const [k,v] of Object.entries(m)) merged[k]=Math.max(merged[k]||0,Math.min(1,Number(v)||0));
      }
      input.mastery=merged;
    }
  }

  if (!childId) return NextResponse.json({ ok:false, error:"childId required" }, { status:400 });

  const check = validateTutorInput(input);
  if (!check.ok) return NextResponse.json({ ok:false, blocked:true, reply:check.reason }, { status:400 });

  const external = await runExternalTutor(input);
  if (external?.reply) {
    if (childId) {
      await db().query("INSERT INTO ai_sessions(child_id,teacher,subject,provider,model,latency_ms,prompt_version,user_message,assistant_message) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)",[childId,input.teacher,input.subject||null,external.provider,external.model,external.latencyMs,"v2",input.message,external.reply]).catch(()=>{});
    }
    return NextResponse.json({ ok:true, provider:external.provider, model:external.model, latencyMs:external.latencyMs, reply:external.reply });
  }

  const fallbackReply=localTutorFallback(input);
  if (childId) {
    await db().query("INSERT INTO ai_sessions(child_id,teacher,subject,provider,model,latency_ms,prompt_version,user_message,assistant_message) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)",[childId,input.teacher,input.subject||null,"local-safe-fallback",null,0,"v2",input.message,fallbackReply]).catch(()=>{});
  }
  return NextResponse.json({
    ok:true,
    provider:"local-safe-fallback",
    reply:fallbackReply,
    note:"No external provider is currently authenticated. Configure an approved AI provider credential in deployment variables."
  });
}
