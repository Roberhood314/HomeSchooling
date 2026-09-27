import { NextResponse } from "next/server";
import { dbHealth } from "@/lib/server/db";
import { cacheHealth } from "@/lib/server/cache";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, unknown> = {};
  try { checks.database = { ok: true, ...(await dbHealth()) }; }
  catch (error) { checks.database = { ok: false, error: String(error) }; }
  try { checks.cache = { ok: (await cacheHealth()) === "PONG" }; }
  catch (error) { checks.cache = { ok: false, error: String(error) }; }

  const ok = Boolean((checks.database as any)?.ok && (checks.cache as any)?.ok);
  return NextResponse.json({
    ok,
    app: "AI HomeSchool",
    time: new Date().toISOString(),
    checks
  }, { status: ok ? 200 : 503 });
}
