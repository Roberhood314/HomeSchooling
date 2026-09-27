import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { isResponse, requireParent } from "@/lib/server/auth";


async function ensureParent(id: string) {
  await db().query("INSERT INTO parents(id,username) VALUES($1,$2) ON CONFLICT(id) DO NOTHING", [id, id === "demo-parent" ? "Demo Parent" : null]);
}

export async function GET(req: NextRequest) {
  const pid = requireParent(req); if (isResponse(pid)) return pid;
  await ensureParent(pid);
  const result = await db().query(
    "SELECT * FROM child_profiles WHERE parent_id=$1 ORDER BY created_at",
    [pid]
  );
  return NextResponse.json({ ok: true, parentId: pid, profiles: result.rows });
}

export async function POST(req: NextRequest) {
  const pid = requireParent(req); if (isResponse(pid)) return pid;
  await ensureParent(pid);
  const body = await req.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  const age = Number(body.age);
  if (!name || !Number.isInteger(age) || age < 3 || age > 9) {
    return NextResponse.json({ ok: false, error: "Invalid name or age" }, { status: 400 });
  }
  const id = crypto.randomUUID();
  const language = ["vi","en","zh"].includes(body.preferredLanguage) ? body.preferredLanguage : "vi";
  const defaultLevel = age <= 4 ? 1 : age === 5 ? 2 : age <= 7 ? 3 : age === 8 ? 4 : 5;
  const level = Math.max(1, Math.min(5, Number(body.level || defaultLevel)));
  const teacher = body.aiTeacher === "JohnPC" ? "JohnPC" : "Jenna";
  const result = await db().query(
    `INSERT INTO child_profiles(id,parent_id,name,age,preferred_language,level,ai_teacher,goals)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING *`,
    [id,pid,name,age,language,level,teacher,JSON.stringify(body.goals || [])]
  );
  return NextResponse.json({ ok: true, profile: result.rows[0] }, { status: 201 });
}


export async function PATCH(req: NextRequest) {
  const pid = requireParent(req); if (isResponse(pid)) return pid;
  await ensureParent(pid);
  const body = await req.json().catch(() => ({}));
  const id = String(body.id || "");
  if (!id) return NextResponse.json({ ok:false, error:"profile id required" }, { status:400 });

  const existing = await db().query(
    "SELECT * FROM child_profiles WHERE id=$1 AND parent_id=$2",
    [id,pid]
  );
  if (!existing.rows[0]) return NextResponse.json({ ok:false, error:"profile not found" }, { status:404 });

  const prev = existing.rows[0];
  const age = body.age === undefined ? prev.age : Number(body.age);
  if (!Number.isInteger(age) || age < 3 || age > 9) {
    return NextResponse.json({ ok:false, error:"age must be 3-9" }, { status:400 });
  }
  const level = body.level === undefined ? prev.level : Math.max(1, Math.min(5, Number(body.level)));
  const teacher = body.aiTeacher === undefined ? prev.ai_teacher : body.aiTeacher === "JohnPC" ? "JohnPC" : "Jenna";
  const language = body.preferredLanguage === undefined ? prev.preferred_language : ["vi","en","zh"].includes(body.preferredLanguage) ? body.preferredLanguage : prev.preferred_language;

  const result = await db().query(
    `UPDATE child_profiles
       SET age=$1, level=$2, ai_teacher=$3, preferred_language=$4, updated_at=NOW()
     WHERE id=$5 AND parent_id=$6
     RETURNING *`,
    [age, level, teacher, language, id, pid]
  );
  return NextResponse.json({ ok:true, profile:result.rows[0] });
}
