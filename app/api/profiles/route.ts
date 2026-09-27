import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/server/db";

function parentId(req: NextRequest) {
  return req.cookies.get("hs_parent")?.value || req.headers.get("x-parent-id") || "demo-parent";
}

async function ensureParent(id: string) {
  await db().query("INSERT INTO parents(id,username) VALUES($1,$2) ON CONFLICT(id) DO NOTHING", [id, id === "demo-parent" ? "Demo Parent" : null]);
}

export async function GET(req: NextRequest) {
  const pid = parentId(req);
  await ensureParent(pid);
  const result = await db().query(
    "SELECT * FROM child_profiles WHERE parent_id=$1 ORDER BY created_at",
    [pid]
  );
  return NextResponse.json({ ok: true, parentId: pid, profiles: result.rows });
}

export async function POST(req: NextRequest) {
  const pid = parentId(req);
  await ensureParent(pid);
  const body = await req.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  const age = Number(body.age);
  if (!name || !Number.isInteger(age) || age < 3 || age > 17) {
    return NextResponse.json({ ok: false, error: "Invalid name or age" }, { status: 400 });
  }
  const id = crypto.randomUUID();
  const language = ["vi","en","zh"].includes(body.preferredLanguage) ? body.preferredLanguage : "vi";
  const level = Math.max(1, Math.min(10, Number(body.level || 1)));
  const teacher = body.aiTeacher === "JohnPC" ? "JohnPC" : "Jenna";
  const result = await db().query(
    `INSERT INTO child_profiles(id,parent_id,name,age,preferred_language,level,ai_teacher,goals)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING *`,
    [id,pid,name,age,language,level,teacher,JSON.stringify(body.goals || [])]
  );
  return NextResponse.json({ ok: true, profile: result.rows[0] }, { status: 201 });
}
