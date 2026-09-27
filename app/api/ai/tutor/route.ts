import { NextRequest, NextResponse } from "next/server";
import { localTutorFallback, teacherSystemPrompt, validateTutorInput, type TutorInput } from "@/lib/server/guardrails";

export async function POST(req: NextRequest) {
  const raw = await req.json().catch(() => ({}));
  const input: TutorInput = {
    age: Number(raw.age || 7),
    teacher: raw.teacher === "JohnPC" ? "JohnPC" : "Jenna",
    language: raw.language === "zh" ? "zh" : raw.language === "en" ? "en" : "vi",
    subject: raw.subject ? String(raw.subject) : undefined,
    message: String(raw.message || ""),
  };

  const check = validateTutorInput(input);
  if (!check.ok) {
    return NextResponse.json({ ok:false, blocked:true, reply:check.reason }, { status:400 });
  }

  const baseUrl = process.env.AI_BASE_URL;
  const apiKey = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL;

  if (baseUrl && apiKey && model) {
    try {
      const res = await fetch(baseUrl.replace(/\/$/,"") + "/chat/completions", {
        method:"POST",
        headers:{ "Content-Type":"application/json", Authorization:`Bearer ${apiKey}` },
        body:JSON.stringify({
          model,
          temperature:0.4,
          messages:[
            { role:"system", content:teacherSystemPrompt(input) },
            { role:"user", content:input.message }
          ]
        }),
        cache:"no-store"
      });
      if (res.ok) {
        const data = await res.json();
        const reply = data?.choices?.[0]?.message?.content;
        if (reply) return NextResponse.json({ ok:true, provider:"configured-ai", reply });
      }
    } catch {}
  }

  return NextResponse.json({
    ok:true,
    provider:"local-safe-fallback",
    reply:localTutorFallback(input),
    note:"Set AI_BASE_URL, AI_API_KEY and AI_MODEL to enable the configured live AI provider."
  });
}
