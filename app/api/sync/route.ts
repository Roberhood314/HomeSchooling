import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/server/db";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const clientId = String(body.clientId || "");
  const events = Array.isArray(body.events) ? body.events.slice(0, 200) : [];
  if (!clientId) return NextResponse.json({ ok:false,error:"clientId required" }, { status:400 });

  for (const event of events) {
    await db().query(
      `INSERT INTO sync_events(client_id,child_id,event_type,payload)
       VALUES($1,$2,$3,$4)`,
      [clientId,event.childId || null,String(event.type || "unknown"),JSON.stringify(event.payload || {})]
    );
  }
  return NextResponse.json({ ok:true, accepted:events.length, serverTime:new Date().toISOString() });
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const clientId = url.searchParams.get("clientId");
  const after = Number(url.searchParams.get("after") || 0);
  if (!clientId) return NextResponse.json({ ok:false,error:"clientId required" }, { status:400 });
  const result = await db().query(
    `SELECT id,child_id,event_type,payload,created_at FROM sync_events
     WHERE client_id=$1 AND id>$2 ORDER BY id ASC LIMIT 500`,
    [clientId,after]
  );
  return NextResponse.json({ ok:true, events:result.rows });
}
