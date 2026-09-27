import { NextResponse } from "next/server";
import { configuredProviders } from "@/lib/server/ai-providers";

export const dynamic = "force-dynamic";

export async function GET() {
  const providers = configuredProviders();
  return NextResponse.json({
    ok: true,
    mode: Object.values(providers).some(Boolean) ? "external-live" : "local-safe-fallback",
    providers,
    providerOrder: (process.env.AI_PROVIDER_ORDER || "openai,gemini,anthropic").split(","),
    timeoutMs: Number(process.env.AI_TIMEOUT_MS || 18000),
    time: new Date().toISOString()
  });
}