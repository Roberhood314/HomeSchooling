import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { cache } from "@/lib/server/cache";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const age = Math.max(3, Math.min(17, Number(url.searchParams.get("age") || 7)));
  const level = Math.max(1, Math.min(10, Number(url.searchParams.get("level") || 2)));
  const language = url.searchParams.get("language") || "en";
  const subject = url.searchParams.get("subject");

  const key = `curriculum:${age}:${level}:${language}:${subject || "*"}`;
  try {
    const redis = cache();
    if (redis.status === "wait") await redis.connect();
    const cached = await redis.get(key);
    if (cached) return NextResponse.json(JSON.parse(cached));
  } catch {}

  const values: unknown[] = [age, level, language];
  let subjectSql = "";
  if (subject) {
    values.push(subject);
    subjectSql = ` AND subject = $${values.length}`;
  }

  const result = await db().query(
    `SELECT l.id,l.subject,l.title,l.min_age,l.max_age,l.level,l.language,l.version,l.content,l.skills,
            s.name AS source_name,s.license AS source_license,s.url AS source_url
       FROM lessons l
       LEFT JOIN curriculum_sources s ON s.id=l.source_id
      WHERE l.active=TRUE AND $1 BETWEEN l.min_age AND l.max_age
        AND l.level <= $2 AND l.language=$3 ${subjectSql}
      ORDER BY l.level,l.subject,l.title
      LIMIT 100`,
    values
  );

  const payload = { ok: true, lessons: result.rows, updatedAt: new Date().toISOString() };
  try {
    const redis = cache();
    if (redis.status === "wait") await redis.connect();
    await redis.set(key, JSON.stringify(payload), "EX", 300);
  } catch {}
  return NextResponse.json(payload);
}
