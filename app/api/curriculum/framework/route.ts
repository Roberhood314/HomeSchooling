import { NextRequest, NextResponse } from "next/server";
import framework from "@/data/curriculum-framework.json";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const age = Math.max(3, Math.min(9, Number(new URL(req.url).searchParams.get("age") || 3)));
  const band = framework.ages.find((x: any) => x.age === age);
  return NextResponse.json({ ok: true, version: framework.version, philosophy: framework.philosophy, band });
}
