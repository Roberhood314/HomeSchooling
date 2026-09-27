import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { isResponse, requireOwnedChild } from "@/lib/server/auth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const childId = String(body.childId || "");
  const lessonId = String(body.lessonId || "");
  if (!childId || !lessonId) {
    return NextResponse.json({ ok: false, error: "childId and lessonId required" }, { status: 400 });
  }
  const ownership = await requireOwnedChild(req, childId); if (isResponse(ownership)) return ownership;
  const score = Math.max(0, Math.min(100, Number(body.score || 0)));
  const duration = Math.max(0, Number(body.durationSeconds || 0));
  const skillMap = body.skillMap || {};
  const state = body.state || {};

  await db().query(
    `INSERT INTO learning_progress(child_id,lesson_id,score,duration_seconds,skill_map,state)
     VALUES($1,$2,$3,$4,$5,$6)`,
    [childId,lessonId,score,duration,JSON.stringify(skillMap),JSON.stringify(state)]
  );
  return NextResponse.json({ ok: true, next: adaptiveRecommendation(score, skillMap) });
}

export async function GET(req: NextRequest) {
  const childId = new URL(req.url).searchParams.get("childId");
  if (!childId) return NextResponse.json({ ok:false,error:"childId required" }, { status:400 });
  const ownership = await requireOwnedChild(req, childId); if (isResponse(ownership)) return ownership;
  const result = await db().query(
    `SELECT p.*,l.title,l.subject FROM learning_progress p
     JOIN lessons l ON l.id=p.lesson_id
     WHERE p.child_id=$1 ORDER BY p.completed_at DESC LIMIT 100`,
    [childId]
  );
  return NextResponse.json({ ok:true, progress:result.rows });
}

function adaptiveRecommendation(score: number, skillMap: Record<string, number>) {
  if (score >= 85) return { action: "advance", difficultyDelta: 1, message: "Ready for a slightly harder lesson." };
  if (score >= 60) return { action: "continue", difficultyDelta: 0, message: "Continue at the current level with one short review." };
  const weakest = Object.entries(skillMap).sort((a,b)=>Number(a[1])-Number(b[1]))[0]?.[0] || "core skill";
  return { action: "reinforce", difficultyDelta: -1, focus: weakest, message: `Reinforce ${weakest} before advancing.` };
}
