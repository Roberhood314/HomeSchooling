import fs from "node:fs/promises";
import pg from "pg";
const { Pool } = pg;

const framework = JSON.parse(await fs.readFile(new URL("../data/curriculum-framework.json", import.meta.url), "utf8"));
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required");
const pool = new Pool({ connectionString:url, ssl:false });

const subjectMap = {
  Language:"Language", Mathematics:"Mathematics", Science:"Science", STEM:"STEM", Logic:"Logic",
  "Life Skills":"Life Skills", Creativity:"Creativity", Movement:"Movement"
};

function languageForSubject(subject){ return subject==="Language" ? ["vi","en","zh"] : ["vi"]; }
function activityType(subject, age){
  if(subject==="Movement") return "movement";
  if(subject==="Creativity") return "create";
  if(subject==="STEM") return "build";
  if(subject==="Science") return "observe";
  if(subject==="Language") return age<=5 ? "speak-and-point" : "read-and-respond";
  if(subject==="Mathematics") return age<=5 ? "manipulative" : "solve";
  if(subject==="Logic") return "puzzle";
  return "practice";
}
function teacherHint(subject){
  if(["Mathematics","Science","STEM","Logic"].includes(subject)) return "JohnPC";
  return "Jenna";
}
function ageMode(age){
  if(age<=4) return {style:"play-based",assessment:"observation + one simple response",parent:"Adult nearby; use real objects and movement."};
  if(age===5) return {style:"guided-play",assessment:"2–3 short responses",parent:"Adult may prompt but should not give answers."};
  if(age<=7) return {style:"guided-mastery",assessment:"3–5 checks + one application",parent:"Independent attempt first, then help."};
  return {style:"project-mastery",assessment:"short quiz + explanation/project evidence",parent:"Child leads; parent reviews progress."};
}
function buildLesson(age, stage, subject, unit, outcome, index, language){
  const mode=ageMode(age);
  const id=["core",age,subject.toLowerCase().replace(/[^a-z0-9]+/g,"-"),index,language].join("-");
  const title=unit + (language==="en"?"":language==="zh"?"（中文路径）":"");
  const duration=age<=4?10:age===5?15:age<=7?20:30;
  const steps=[
    {type:"welcome",teacher:teacherHint(subject),text:`Welcome to ${unit}. Today we will learn through ${mode.style}.`},
    {type:"warmup",minutes:2,prompt:subject==="Movement"?"Stand in a safe open space and get ready to move.":"Recall one thing you already know about this topic."},
    {type:"explain",minutes:Math.max(2,Math.round(duration*0.2)),text:`Core idea: ${outcome || unit}. The teacher uses concrete examples suitable for age ${age}.`},
    {type:activityType(subject,age),minutes:Math.max(4,Math.round(duration*0.4)),prompt:`Do the ${unit} activity using age-appropriate objects, pictures, words or movement.`,successCriteria:outcome || `Complete the ${unit} task with understanding.`},
    {type:"check",minutes:Math.max(2,Math.round(duration*0.2)),prompt:`Show or explain what you learned about ${unit}.`,assessment:mode.assessment},
    {type:"reflection",minutes:1,prompt:"What felt easy? What would you like to try again?"}
  ];
  return {id,subject,title,minAge:age,maxAge:age,level:age-2,language,sourceId:"core-internal",version:1,skills:[subject.toLowerCase().replace(/\s+/g,"-"),"age-"+age,"unit-"+(index+1)],content:{stage,unit,objective:outcome || `Build understanding of ${unit}.`,durationMinutes:duration,teachingMode:mode.style,recommendedTeacher:teacherHint(subject),parentGuidance:mode.parent,steps}};
}

let total=0;
for(const band of framework.ages){
  const age=band.age;
  for(const [subject,def] of Object.entries(band.subjects)){
    const units=def.units || []; const outcomes=def.outcomes || [];
    for(let i=0;i<units.length;i++){
      const outcome=outcomes[i % Math.max(1,outcomes.length)] || units[i];
      for(const language of languageForSubject(subject)){
        const lesson=buildLesson(age,band.stage,subjectMap[subject]||subject,units[i],outcome,i,language);
        await pool.query(
          `INSERT INTO lessons(id,subject,title,min_age,max_age,level,language,source_id,version,content,skills,active,updated_at)
           VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,TRUE,NOW())
           ON CONFLICT(id) DO UPDATE SET subject=EXCLUDED.subject,title=EXCLUDED.title,min_age=EXCLUDED.min_age,max_age=EXCLUDED.max_age,level=EXCLUDED.level,language=EXCLUDED.language,source_id=EXCLUDED.source_id,version=EXCLUDED.version,content=EXCLUDED.content,skills=EXCLUDED.skills,active=TRUE,updated_at=NOW()`,
          [lesson.id,lesson.subject,lesson.title,lesson.minAge,lesson.maxAge,lesson.level,lesson.language,lesson.sourceId,lesson.version,JSON.stringify(lesson.content),JSON.stringify(lesson.skills)]
        );
        total++;
      }
    }
  }
}
console.log(JSON.stringify({seeded:total,frameworkVersion:framework.version,time:new Date().toISOString()}));
await pool.end();