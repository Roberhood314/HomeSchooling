import fs from "node:fs";
const f=JSON.parse(fs.readFileSync("data/curriculum-framework.json","utf8"));
const expected=[3,4,5,6,7,8,9];
const ages=f.ages.map((x)=>x.age);
for(const age of expected){if(!ages.includes(age)) throw new Error("Missing curriculum age "+age);}
for(const band of f.ages){
  if(!band.stage||!band.sessionMinutes||!band.weeklySessions) throw new Error("Incomplete band "+band.age);
  const subjects=Object.keys(band.subjects||{});
  if(subjects.length<6) throw new Error("Too few subjects for age "+band.age);
  for(const [subject,def] of Object.entries(band.subjects)){
    if(!Array.isArray(def.units)||def.units.length<3) throw new Error("Too few units "+band.age+" "+subject);
    if(!Array.isArray(def.outcomes)||def.outcomes.length<1) throw new Error("Missing outcomes "+band.age+" "+subject);
  }
}
console.log(JSON.stringify({ok:true,ages,frameworkVersion:f.version,bands:f.ages.length}));