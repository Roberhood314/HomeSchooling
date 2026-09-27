import pg from "pg";
const { Pool } = pg;

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required");
const pool = new Pool({ connectionString: url, ssl: false });

function safeFeedList() {
  try {
    const raw = process.env.CONTENT_FEEDS_JSON || "[]";
    const feeds = JSON.parse(raw);
    return Array.isArray(feeds) ? feeds : [];
  } catch {
    return [];
  }
}

async function importFeed(feed) {
  if (!feed?.id || !feed?.url || !feed?.license) return { id: feed?.id || "unknown", imported: 0, skipped: true };
  const res = await fetch(feed.url, { headers: { "user-agent": "AI-HomeSchool-Curriculum-Sync/1.0" } });
  if (!res.ok) throw new Error(`Feed ${feed.id} HTTP ${res.status}`);
  const data = await res.json();
  const lessons = Array.isArray(data.lessons) ? data.lessons : [];
  let imported = 0;

  await pool.query(
    `INSERT INTO curriculum_sources(id,name,url,license,source_type,last_sync_at)
     VALUES($1,$2,$3,$4,'licensed-feed',NOW())
     ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,url=EXCLUDED.url,license=EXCLUDED.license,last_sync_at=NOW(),updated_at=NOW()`,
    [feed.id, feed.name || feed.id, feed.url, feed.license]
  );

  for (const lesson of lessons) {
    if (!lesson.id || !lesson.subject || !lesson.title || !lesson.content) continue;
    await pool.query(
      `INSERT INTO lessons(id,subject,title,min_age,max_age,level,language,source_id,version,content,skills,active,updated_at)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,TRUE,NOW())
       ON CONFLICT(id) DO UPDATE SET
         subject=EXCLUDED.subject,title=EXCLUDED.title,min_age=EXCLUDED.min_age,max_age=EXCLUDED.max_age,
         level=EXCLUDED.level,language=EXCLUDED.language,source_id=EXCLUDED.source_id,version=EXCLUDED.version,
         content=EXCLUDED.content,skills=EXCLUDED.skills,active=TRUE,updated_at=NOW()`,
      [
        lesson.id, lesson.subject, lesson.title, lesson.minAge || 3, lesson.maxAge || 9,
        lesson.level || 1, lesson.language || "en", feed.id, lesson.version || 1,
        lesson.content, JSON.stringify(lesson.skills || [])
      ]
    );
    imported++;
  }
  return { id: feed.id, imported };
}

const results = [];
for (const feed of safeFeedList()) {
  try { results.push(await importFeed(feed)); }
  catch (error) { results.push({ id: feed?.id || "unknown", error: String(error) }); }
}
console.log(JSON.stringify({ syncedAt: new Date().toISOString(), results }));
await pool.end();
