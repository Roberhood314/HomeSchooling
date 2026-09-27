import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/server/db";

/** Server-side identity boundary. Client supplied parent/child identifiers are never trusted. */
export function authenticatedParentId(req: NextRequest): string | null {
  const id = req.cookies.get("hs_parent")?.value;
  if (id) return id;
  // Local development only: keeps the demo usable without weakening production.
  return process.env.NODE_ENV === "development" ? "demo-parent" : null;
}

export function requireParent(req: NextRequest): string | NextResponse {
  const id = authenticatedParentId(req);
  return id || NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 });
}

export async function requireOwnedChild(req: NextRequest, childId: string): Promise<{ parentId: string } | NextResponse> {
  const parentId = authenticatedParentId(req);
  if (!parentId) return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 });
  const owned = await db().query("SELECT id FROM child_profiles WHERE id=$1 AND parent_id=$2", [childId, parentId]);
  if (!owned.rows[0]) return NextResponse.json({ ok: false, error: "Child profile not found" }, { status: 404 });
  return { parentId };
}

export function isResponse(value: unknown): value is NextResponse {
  return value instanceof NextResponse;
}
