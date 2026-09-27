import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/server/db";

async function applyEvent(client:any,event:any){
  const eventUuid=String(event.eventUuid||event.id||crypto.randomUUID());
  const childId=event.childId||null;
  const type=String(event.type||"unknown");
  const payload=event.payload||{};
  const inserted=await client.query(
    "INSERT INTO sync_events(event_uuid,client_id,child_id,event_type,payload) VALUES($1,$2,$3,$4,$5) ON CONFLICT(event_uuid) DO NOTHING RETURNING id",
    [eventUuid,event.clientId,childId,type,JSON.stringify(payload)]
  );
  if(!inserted.rows[0]) return {eventUuid,status:"duplicate"};
  const rowId=inserted.rows[0].id;
  try{
    if(type==="progress"){
      const p=payload;
      if(!p.childId||!p.lessonId) throw new Error("progress event missing childId/lessonId");
      await client.query(
        "INSERT INTO learning_progress(child_id,lesson_id,score,duration_seconds,skill_map,state) VALUES($1,$2,$3,$4,$5,$6)",
        [p.childId,p.lessonId,Math.max(0,Math.min(100,Number(p.score||0))),Math.max(0,Number(p.durationSeconds||0)),JSON.stringify(p.skillMap||{}),JSON.stringify(p.state||{})]
      );
    }
    await client.query("UPDATE sync_events SET applied=TRUE,applied_at=NOW(),apply_error=NULL WHERE id=$1",[rowId]);
    return {eventUuid,status:"applied"};
  }catch(error){
    await client.query("UPDATE sync_events SET apply_error=$1 WHERE id=$2",[String(error),rowId]);
    return {eventUuid,status:"failed",error:String(error)};
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const clientId = String(body.clientId || "");
  const events = Array.isArray(body.events) ? body.events.slice(0, 200) : [];
  if (!clientId) return NextResponse.json({ ok:false,error:"clientId required" }, { status:400 });

  const client=await db().connect();
  const results=[];
  try{
    await client.query("BEGIN");
    for(const raw of events){
      results.push(await applyEvent(client,{...raw,clientId}));
    }
    await client.query("COMMIT");
  }catch(error){
    await client.query("ROLLBACK");
    return NextResponse.json({ok:false,error:String(error)},{status:500});
  }finally{client.release();}
  const failed=results.filter((x:any)=>x.status==="failed").length;
  return NextResponse.json({ ok:failed===0, accepted:events.length, failed, results, serverTime:new Date().toISOString() },{status:failed?207:200});
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const clientId = url.searchParams.get("clientId");
  const after = Number(url.searchParams.get("after") || 0);
  if (!clientId) return NextResponse.json({ ok:false,error:"clientId required" }, { status:400 });
  const result = await db().query(
    "SELECT id,event_uuid,child_id,event_type,payload,applied,apply_error,created_at,applied_at FROM sync_events WHERE client_id=$1 AND id>$2 ORDER BY id ASC LIMIT 500",
    [clientId,after]
  );
  return NextResponse.json({ ok:true, events:result.rows });
}