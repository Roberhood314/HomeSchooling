import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { isResponse, requireOwnedChild } from "@/lib/server/auth";
export async function GET(req:NextRequest){
  const childId=new URL(req.url).searchParams.get("childId");
  if(!childId) return NextResponse.json({ok:false,error:"childId required"},{status:400});
  const ownership=await requireOwnedChild(req,childId); if(isResponse(ownership)) return ownership;
  const r=await db().query("SELECT permission,allowed,updated_at FROM consent_log WHERE parent_id=$1 AND child_id=$2",[ownership.parentId,childId]);
  return NextResponse.json({ok:true,consents:r.rows});
}
export async function POST(req:NextRequest){
  const body=await req.json().catch(()=>({}));
  const childId=String(body.childId||""); const permission=String(body.permission||""); const allowed=Boolean(body.allowed);
  if(!childId||!permission) return NextResponse.json({ok:false,error:"childId and permission required"},{status:400});
  const ownership=await requireOwnedChild(req,childId); if(isResponse(ownership)) return ownership;
  await db().query("INSERT INTO consent_log(parent_id,child_id,permission,allowed,updated_at) VALUES($1,$2,$3,$4,NOW()) ON CONFLICT(parent_id,child_id,permission) DO UPDATE SET allowed=EXCLUDED.allowed,updated_at=NOW()",[ownership.parentId,childId,permission,allowed]);
  return NextResponse.json({ok:true});
}
