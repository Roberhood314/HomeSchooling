import { NextRequest, NextResponse } from "next/server";
import { localTutorFallback, validateTutorInput, type TutorInput } from "@/lib/server/guardrails";
import { runExternalTutor } from "@/lib/server/ai-providers";

export async function POST(req: NextRequest) {
  const raw = await req.json().catch(() => ({}));
  const input: TutorInput = {
    age: Number(raw.age || 7),
    teacher: raw.teacher === "JohnPC" ? "JohnPC" : "Jenna",
    language: raw.language === "zh" ? "zh" : raw.language === "en" ? "en" : "vi",
    subject: raw.subject ? String(raw.subject) : undefined,
    message: String(raw.message || "")
  };

  const check = validateTutorInput(input);
  if (!check.ok) {
    return NextResponse.json({ ok:false, blocked:true, reply:check.reason }, { status:400 });
  }

  const external = await runExternalTutor(input);
  if (external?.reply) {
    return NextResponse.json({ ok:true, provider:external.provider, model:external.model, latencyMs:external.latencyMs, reply:external.reply });
  }

  return NextResponse.json({
    ok:true,
    provider:"local-safe-fallback",
    reply:localTutorFallback(input),
    note:"No external provider is currently authenticated. Configure OPENAI_API_KEY, GEMINI_API_KEY or ANTHROPIC_API_KEY on Railway."
  });
}