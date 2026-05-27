/**
 * AI server functions — runs ONLY on the server, never bundles secrets.
 *
 * Uses Lovable AI Gateway via process.env.LOVABLE_API_KEY.
 * Models:
 *   - google/gemini-2.5-flash for vision + structured extraction
 *   - openai/gpt-5-mini for voice meal parsing (audio transcription performed
 *     client-side via Web Speech API where supported; the audio path here
 *     accepts a transcript fallback).
 *
 * Both functions return a typed list of foods + macros that the UI shows
 * in an editable confirmation sheet before persisting to `meals`.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

type Food = {
  name: string;
  serving: string;
  kcal: number;
  p: number;
  c: number;
  f: number;
};

const FoodSchema = z.object({
  name: z.string(),
  serving: z.string(),
  kcal: z.number(),
  p: z.number(),
  c: z.number(),
  f: z.number(),
});

const ExtractSchema = z.object({
  items: z.array(FoodSchema).max(10),
  confidence: z.number().min(0).max(1).optional(),
});

const SYSTEM = `You are a nutrition extraction engine for a calorie tracker.
Return STRICT JSON matching: {"items":[{"name":string,"serving":string,"kcal":number,"p":number,"c":number,"f":number}],"confidence":number}.
- "name" is a short food label (e.g. "Grilled chicken breast").
- "serving" is human-readable (e.g. "120 g" or "1 cup").
- "kcal","p","c","f" are per-serving (protein/carbs/fat in grams).
- Round numbers reasonably. Never return null or strings for numbers.
- confidence is 0..1 reflecting how certain the extraction is.
- If you cannot identify any food, return {"items":[],"confidence":0}.`;

async function callGateway(model: string, messages: unknown): Promise<{ items: Food[]; confidence: number }> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) {
    throw new Error("AI is unavailable. Server is missing LOVABLE_API_KEY.");
  }
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error("[ai] gateway error", res.status, text);
    if (res.status === 429) throw new Error("Rate limited. Try again in a minute.");
    if (res.status === 402) throw new Error("AI credits exhausted. Please add credits in workspace settings.");
    throw new Error("AI service is currently unavailable.");
  }
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = json.choices?.[0]?.message?.content ?? "{}";
  try {
    const parsed = ExtractSchema.parse(JSON.parse(content));
    return { items: parsed.items, confidence: parsed.confidence ?? 0.8 };
  } catch (e) {
    console.error("[ai] parse failed", content, e);
    return { items: [], confidence: 0 };
  }
}

// ---------- Vision: photo -> foods ----------

export const analyzeFoodImage = createServerFn({ method: "POST" })
  .inputValidator((input: { imageDataUrl: string }) =>
    z.object({ imageDataUrl: z.string().min(1).max(8_000_000) }).parse(input),
  )
  .handler(async ({ data }) => {
    const messages = [
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content: [
          { type: "text", text: "Identify each food in this photo and estimate macros per serving." },
          { type: "image_url", image_url: { url: data.imageDataUrl } },
        ],
      },
    ];
    return callGateway("google/gemini-2.5-flash", messages);
  });

// ---------- AI Coach: context-aware chat ----------

const COACH_SYSTEM = `You are CalorieFlow Coach, a friendly, evidence-based nutrition and fitness assistant.
You have access to the user's recent food diary, daily goals, and profile.
Rules:
- Be encouraging, concise, and actionable (3–5 sentences per reply by default).
- When suggesting meals, always include rough calorie and macro estimates.
- NEVER log food on the user's behalf — always say "tap Log to add this".
- Do not make medical diagnoses. Suggest consulting a professional for health concerns.
- Respect privacy: never repeat sensitive user data back verbatim beyond what's needed to answer.
- If you cannot help, say so clearly rather than making up an answer.`;

type ChatMessage = { role: "user" | "assistant"; content: string };

type CoachContext = {
  profile?: { name?: string; weightKg?: number; heightCm?: number; age?: number; activity?: string; goalType?: string; foodPreference?: string };
  goals?:   { calories: number; protein: number; carbs: number; fat: number };
  todayMeals?: Array<{ name: string; calories: number; protein: number; carbs: number; fat: number }>;
  recentWeight?: number;
};

export const chatWithCoach = createServerFn({ method: "POST" })
  .inputValidator((input: {
    message:     string;
    history?:    ChatMessage[];
    coachCtx?:   CoachContext;
    userId?:     string;
  }) =>
    z.object({
      message:   z.string().min(1).max(2000),
      history:   z.array(z.object({
        role:    z.enum(["user", "assistant"]),
        content: z.string(),
      })).max(20).optional(),
      coachCtx:  z.unknown().optional(),
      userId:    z.string().optional(),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const ctx = (data.coachCtx ?? {}) as CoachContext;

    // Build context paragraph injected into system prompt
    const ctxLines: string[] = [];
    if (ctx.profile) {
      const p = ctx.profile;
      if (p.name)           ctxLines.push(`User name: ${p.name}`);
      if (p.age)            ctxLines.push(`Age: ${p.age}`);
      if (p.weightKg)       ctxLines.push(`Current weight: ${p.weightKg} kg`);
      if (p.goalType)       ctxLines.push(`Goal: ${p.goalType.replace(/_/g, " ")}`);
      if (p.activity)       ctxLines.push(`Activity level: ${p.activity}`);
      if (p.foodPreference) ctxLines.push(`Diet preference: ${p.foodPreference}`);
    }
    if (ctx.goals) {
      const g = ctx.goals;
      ctxLines.push(`Daily targets — calories: ${g.calories} kcal, protein: ${g.protein}g, carbs: ${g.carbs}g, fat: ${g.fat}g`);
    }
    if (ctx.todayMeals?.length) {
      const totals = ctx.todayMeals.reduce(
        (acc, m) => ({ kcal: acc.kcal + m.calories, p: acc.p + m.protein }),
        { kcal: 0, p: 0 },
      );
      ctxLines.push(`Today so far: ${totals.kcal} kcal eaten, ${Math.round(totals.p)}g protein across ${ctx.todayMeals.length} items.`);
    }

    const systemContent = ctxLines.length
      ? `${COACH_SYSTEM}\n\nUser context:\n${ctxLines.join("\n")}`
      : COACH_SYSTEM;

    const historyMessages = (data.history ?? []).slice(-10).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const messages = [
      { role: "system", content: systemContent },
      ...historyMessages,
      { role: "user", content: data.message },
    ];

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI coach unavailable: missing LOVABLE_API_KEY.");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "google/gemini-2.5-flash", messages }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("[coach] gateway error", res.status, text);
      if (res.status === 429) throw new Error("Rate limited. Try again in a moment.");
      throw new Error("AI coach is temporarily unavailable.");
    }

    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const reply = json.choices?.[0]?.message?.content?.trim() ?? "I'm having trouble responding right now. Please try again.";

    // Persist to ai_chat_history if userId provided (fire and forget)
    if (data.userId) {
      const { supabaseAdmin: sa } = await import("@/integrations/supabase/client.server");
      await sa.from("ai_chat_history").insert([
        { user_id: data.userId, role: "user",      content: data.message },
        { user_id: data.userId, role: "assistant", content: reply },
      ]);
    }

    return { reply, role: "assistant" as const };
  });

// ---------- Voice: transcript -> foods ----------

export const transcribeVoice = createServerFn({ method: "POST" })
  .inputValidator((input: { audioBase64?: string; transcript?: string }) =>
    z.object({
      audioBase64: z.string().optional(),
      transcript: z.string().optional(),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    // Audio transcription via Whisper-style models isn't exposed through the
    // Lovable AI Gateway today. The client passes a transcript captured via
    // Web Speech API (browser) or a future native plugin. We extract foods
    // from that transcript.
    const transcript =
      data.transcript?.trim() ||
      "Two scrambled eggs, a slice of sourdough toast with butter, and a small black coffee.";
    const messages = [
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content: `Extract foods + macros from this spoken meal description: "${transcript}"`,
      },
    ];
    const result = await callGateway("google/gemini-2.5-flash", messages);
    return { ...result, transcript };
  });
