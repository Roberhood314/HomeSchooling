import pg from "pg";
const { Pool } = pg;

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required");
const pool = new Pool({ connectionString: url, ssl: false });
const UA = "AI-HomeSchool-Curriculum-Sync/2.0";

function safeFeedList() {
  try {
    const raw = process.env.CONTENT_FEEDS_JSON || "[]";
    const feeds = JSON.parse(raw);
    return Array.isArray(feeds) ? feeds : [];
  } catch { return []; }
}

async function upsertSource(id,name,url,license,sourceType) {
  await pool.query(
    "INSERT INTO curriculum_sources(id,name,url,license,source_type,last_sync_at) VALUES($1,$2,$3,$4,$5,NOW()) ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,url=EXCLUDED.url,license=EXCLUDED.license,source_type=EXCLUDED.source_type,last_sync_at=NOW(),updated_at=NOW()",
    [id,name,url,license,sourceType]
  );
}

async function upsertLesson(lesson) {
  await pool.query(
    "INSERT INTO lessons(id,subject,title,min_age,max_age,level,language,source_id,version,content,skills,active,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,TRUE,NOW()) ON CONFLICT(id) DO UPDATE SET subject=EXCLUDED.subject,title=EXCLUDED.title,min_age=EXCLUDED.min_age,max_age=EXCLUDED.max_age,level=EXCLUDED.level,language=EXCLUDED.language,source_id=EXCLUDED.source_id,version=EXCLUDED.version,content=EXCLUDED.content,skills=EXCLUDED.skills,active=TRUE,updated_at=NOW()",
    [lesson.id,lesson.subject,lesson.title,lesson.minAge,lesson.maxAge,lesson.level,lesson.language,lesson.sourceId,lesson.version,JSON.stringify(lesson.content),JSON.stringify(lesson.skills||[])]
  );
}

async function importFeed(feed) {
  if (!feed?.id || !feed?.url || !feed?.license) return { id: feed?.id || "unknown", imported: 0, skipped: true };
  const res = await fetch(feed.url, { headers: { "user-agent": UA } });
  if (!res.ok) throw new Error("Feed " + feed.id + " HTTP " + res.status);
  const data = await res.json();
  const lessons = Array.isArray(data.lessons) ? data.lessons : [];
  await upsertSource(feed.id,feed.name||feed.id,feed.url,feed.license,"licensed-feed");
  let imported=0;
  for (const lesson of lessons) {
    if (!lesson.id || !lesson.subject || !lesson.title || !lesson.content) continue;
    await upsertLesson({
      id:lesson.id,subject:lesson.subject,title:lesson.title,minAge:lesson.minAge||3,maxAge:lesson.maxAge||9,
      level:lesson.level||1,language:lesson.language||"en",sourceId:feed.id,version:lesson.version||1,
      content:lesson.content,skills:lesson.skills||[]
    });
    imported++;
  }
  return { id:feed.id, imported };
}

function parseIndex(text) {
  const rows=[];
  for (const line of text.split("\n")) {
    const m=line.match(/^(\d{4})\s*\|\s*(.*?)\s*\|.*?\|\s*\[?(CC[- ]?BY(?:-NC)?[^\]]*)/i);
    if (!m) continue;
    const id=m[1];
    const title=m[2].replace(/\[(.*?)\]\(.*?\)/g,"$1").trim();
    const license=m[3].toUpperCase().replace(/\s+/g,"-");
    if (license.includes("NC")) continue;
    if (!license.includes("CC-BY")) continue;
    rows.push({id,title,license:"CC-BY"});
  }
  return rows;
}

function stripMarkdownStory(md) {
  const lines=md.split("\n");
  const title=(lines.find(x=>x.startsWith("# "))||"# Story").replace(/^#\s+/,"").trim();
  const meta={};
  const body=[];
  for (const line of lines) {
    const mm=line.match(/^\*\s*(License|Text|Illustration|Translation|Language):\s*(.*)$/i);
    if (mm) { meta[mm[1].toLowerCase()]=mm[2].trim(); continue; }
    if (line.startsWith("# ")) continue;
    if (line.trim()==="##") { body.push("\n"); continue; }
    if (!line.trim().startsWith("* License:")) body.push(line);
  }
  const pages=body.join("\n").split(/\n\s*\n+/).map(x=>x.trim()).filter(Boolean);
  const plain=pages.join(" ");
  return {title,pages,plain,meta};
}

function levelFor(text) {
  const words=text.trim().split(/\s+/).filter(Boolean).length;
  if (words<=80) return 1;
  if (words<=180) return 2;
  if (words<=320) return 3;
  return 4;
}

async function fetchJson(url) {
  const res=await fetch(url,{headers:{"user-agent":UA,"accept":"application/vnd.github+json"}});
  if(!res.ok) throw new Error("HTTP "+res.status+" for "+url);
  return res.json();
}

async function fetchText(url) {
  const res=await fetch(url,{headers:{"user-agent":UA}});
  if(!res.ok) throw new Error("HTTP "+res.status+" for "+url);
  return res.text();
}

async function syncGlobalASP() {
  if ((process.env.ENABLE_GLOBAL_ASP || "1") !== "1") return {id:"global-asp",skipped:true,imported:0};
  const sourceId="global-asp";
  await upsertSource(sourceId,"Global African Storybook Project","https://github.com/global-asp/global-asp","CC-BY items only; non-commercial items excluded","open-oer");
  const languages=(process.env.GLOBAL_ASP_LANGUAGES || "vi,en,zh").split(",").map(x=>x.trim()).filter(Boolean);
  const perLanguage=Math.max(1,Math.min(100,Number(process.env.GLOBAL_ASP_LIMIT_PER_LANGUAGE || 30)));
  let imported=0;
  const details=[];
  for (const lang of languages) {
    try {
      const readmeUrl="https://raw.githubusercontent.com/global-asp/global-asp/master/"+encodeURIComponent(lang)+"/README.md";
      const index=parseIndex(await fetchText(readmeUrl));
      const dirUrl="https://api.github.com/repos/global-asp/global-asp/contents/"+encodeURIComponent(lang)+"?ref=master";
      const files=await fetchJson(dirUrl);
      const fileById=new Map();
      for (const f of (Array.isArray(files)?files:[])) {
        if (f?.type==="file" && typeof f.name==="string" && f.name.endsWith(".md")) {
          const m=f.name.match(/^(\d{4})_/);
          if(m) fileById.set(m[1],f);
        }
      }
      let langImported=0;
      for (const row of index.slice(0,perLanguage)) {
        const f=fileById.get(row.id);
        if(!f?.download_url) continue;
        const parsed=stripMarkdownStory(await fetchText(f.download_url));
        const content={
          objective:"Read, listen, discuss and retell an age-appropriate open story.",
          story:{pages:parsed.pages,text:parsed.plain,metadata:parsed.meta},
          attribution:{source:"Global African Storybook Project",originalId:row.id,license:row.license,sourceUrl:f.html_url}
        };
        await upsertLesson({
          id:"gasp-"+lang+"-"+row.id,subject:"Language",title:parsed.title||row.title,minAge:5,maxAge:9,
          level:levelFor(parsed.plain),language:lang,sourceId,version:1,content,
          skills:["reading","listening","comprehension","storytelling"]
        });
        imported++; langImported++;
      }
      details.push({language:lang,imported:langImported,available:index.length});
    } catch(error) {
      details.push({language:lang,error:String(error)});
    }
  }
  return {id:"global-asp",imported,details};
}

const results=[];
try { results.push(await syncGlobalASP()); } catch(error) { results.push({id:"global-asp",error:String(error)}); }
for (const feed of safeFeedList()) {
  try { results.push(await importFeed(feed)); }
  catch (error) { results.push({id:feed?.id||"unknown",error:String(error)}); }
}
console.log(JSON.stringify({syncedAt:new Date().toISOString(),results}));
await pool.end();