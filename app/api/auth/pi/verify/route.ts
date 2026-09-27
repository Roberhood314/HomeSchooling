import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/server/db";

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type,Authorization",
    },
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const accessToken = body?.accessToken;
  if (!accessToken || typeof accessToken !== "string") {
    return NextResponse.json({ ok: false, error: "Missing accessToken" }, { status: 400 });
  }

  const res = await fetch("https://api.minepi.com/v2/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (!res.ok) {
    return NextResponse.json({ ok: false, error: "Invalid Pi access token" }, { status: 401 });
  }

  const payload = await res.json();
  const user = payload?.user ?? payload;
  const uid = user?.uid;
  const username = user?.username || null;
  if (!uid) return NextResponse.json({ ok: false, error: "Pi response missing uid" }, { status: 502 });

  const parentId = `pi:${uid}`;
  await db().query(
    `INSERT INTO parents(id,pi_uid,username) VALUES($1,$2,$3)
     ON CONFLICT(id) DO UPDATE SET username=EXCLUDED.username`,
    [parentId, uid, username]
  );

  const response = NextResponse.json({ ok: true, parentId, user: { uid, username } });
  response.cookies.set("hs_parent", parentId, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  return response;
}
