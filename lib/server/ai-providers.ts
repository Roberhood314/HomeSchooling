import type { TutorInput } from "@/lib/server/guardrails";
import { teacherSystemPrompt } from "@/lib/server/guardrails";

type ProviderResult = { provider: string; model: string; reply: string; latencyMs: number };
const TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS || 18000);

function extractOpenAIText(data: any): string | null {
  if (typeof data?.output_text === "string" && data.output_text.trim()) return data.output_text.trim();
  const output = Array.isArray(data?.output) ? data.output : [];
  for (const item of output) {
    for (const c of item?.content || []) {
      if (typeof c?.text === "string" && c.text.trim()) return c.text.trim();
    }
  }
  return null;
}

async function callOpenAI(input: TutorInput): Promise<ProviderResult | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  const model = process.env.OPENAI_MODEL || "gpt-5.6";
  const started = Date.now();
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
    body: JSON.stringify({
      model,
      instructions: teacherSystemPrompt(input),
      input: input.message,
      max_output_tokens: 700
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS)
  });
  if (!res.ok) throw new Error("OpenAI HTTP " + res.status);
  const data = await res.json();
  const reply = extractOpenAIText(data);
  return reply ? { provider: "openai", model, reply, latencyMs: Date.now() - started } : null;
}

async function callGemini(input: TutorInput): Promise<ProviderResult | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const started = Date.now();
  const url = "https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(model) + ":generateContent";
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: teacherSystemPrompt(input) }] },
      contents: [{ role: "user", parts: [{ text: input.message }] }],
      generationConfig: { temperature: 0.35, maxOutputTokens: 700 }
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS)
  });
  if (!res.ok) throw new Error("Gemini HTTP " + res.status);
  const data = await res.json();
  const reply = data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text || "").join("").trim();
  return reply ? { provider: "gemini", model, reply, latencyMs: Date.now() - started } : null;
}

async function callAnthropic(input: TutorInput): Promise<ProviderResult | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";
  const started = Date.now();
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model,
      system: teacherSystemPrompt(input),
      max_tokens: 700,
      temperature: 0.35,
      messages: [{ role: "user", content: input.message }]
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS)
  });
  if (!res.ok) throw new Error("Anthropic HTTP " + res.status);
  const data = await res.json();
  const reply = data?.content?.map((p: any) => p?.text || "").join("").trim();
  return reply ? { provider: "anthropic", model, reply, latencyMs: Date.now() - started } : null;
}

export function configuredProviders() {
  return {
    openai: Boolean(process.env.OPENAI_API_KEY),
    gemini: Boolean(process.env.GEMINI_API_KEY),
    anthropic: Boolean(process.env.ANTHROPIC_API_KEY)
  };
}

export async function runExternalTutor(input: TutorInput): Promise<ProviderResult | null> {
  const order = (process.env.AI_PROVIDER_ORDER || "openai,gemini,anthropic").split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
  const runners: Record<string, (i: TutorInput) => Promise<ProviderResult | null>> = { openai: callOpenAI, gemini: callGemini, anthropic: callAnthropic };
  const errors: string[] = [];
  for (const name of order) {
    const runner = runners[name];
    if (!runner) continue;
    try {
      const result = await runner(input);
      if (result?.reply) return result;
    } catch (error) {
      errors.push(name + ":" + String(error));
    }
  }
  if (errors.length) console.error("[AI router] " + errors.join(" | "));
  return null;
}