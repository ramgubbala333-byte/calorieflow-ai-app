// @ts-nocheck
/**
 * AI server functions — runs ONLY on the server, never bundles secrets.
 *
 * Uses Lovable AI Gateway via process.env.LOVABLE_API_KEY.
 * Model: google/gemini-2.5-flash for vision + structured extraction and the coach.
 *
 * Accuracy notes:
 *  - The system prompt forces explicit portion reasoning (count, plate size,
 *    cooking medium) because portion size is the #1 driver of calorie error.
 *  - Indian cuisine is handled first-class: common dishes, typical serving
 *    sizes, and the heavy impact of oil/ghee/cream are called out so the model
 *    does not under-count rich gravies, fried items, and sweets.
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
  kcal: z.number().nonnegative(),
  p: z.number().nonnegative(),
  c: z.number().nonnegative(),
  f: z.number().nonnegative(),
});

const ExtractSchema = z.object({
  items: z.array(FoodSchema).max(12),
  confidence: z.number().min(0).max(1).optional(),
});

const SYSTEM = `You are a precise nutrition-estimation engine for a calorie tracker used worldwide, with strong expertise in Indian cuisine.

Return STRICT JSON ONLY, matching exactly:
{"items":[{"name":string,"serving":string,"kcal":number,"p":number,"c":number,"f":number}],"confidence":number}

ESTIMATION METHOD (follow silently, output only JSON):
1. Identify every distinct food item, including rice, breads, gravies, fried items, chutneys, dressings, oils, ghee, butter, and drinks. Do not skip calorie-dense add-ons.
2. Estimate the real portion for each item. Use visual references: dinner plate ~ 27 cm, katori/bowl ~ 150 ml, tablespoon ~ 15 ml, a fist ~ 1 cup. State the portion in the "serving" field in clear units (e.g. "2 rotis", "1 katori (150 g)", "150 g", "1 cup cooked").
3. Account for cooking medium. Restaurant and home Indian gravies, fried snacks, and sweets carry large amounts of oil, ghee, or cream. Do NOT under-count them. A typical restaurant curry serving carries 10-20 g added fat.
4. Macros must be per the stated serving and physically consistent: kcal ~ 4*protein + 4*carbs + 9*fat (within ~10%). Never return null, negative, or string numbers.
5. "name" is a short, specific label (e.g. "Paneer butter masala", "Chapati", "Grilled chicken breast").
6. confidence is 0..1 reflecting overall certainty (lower it when portions are ambiguous or the image is unclear).
7. If you cannot identify any food, return {"items":[],"confidence":0}.

INDIAN FOOD REFERENCE (per typical serving, adjust to the visible portion):
- Plain cooked rice, 1 cup (~150 g): ~200 kcal, P4 C44 F0.5
- Roti / chapati, 1 piece (~40 g): ~110 kcal, P3 C18 F3
- Naan, 1 piece: ~260 kcal, P9 C45 F5
- Paratha (plain), 1: ~210 kcal, P4 C28 F9 (aloo paratha ~280 kcal)
- Dal (cooked), 1 katori (150 g): ~130 kcal, P8 C18 F3
- Rajma / chole gravy, 1 katori: ~210 kcal, P9 C28 F7
- Paneer butter masala, 1 katori (180 g): ~350 kcal, P14 C12 F28
- Palak paneer, 1 katori: ~280 kcal, P14 C10 F20
- Chicken curry (with gravy), 1 katori: ~240 kcal, P20 C6 F15
- Butter chicken, 1 katori: ~330 kcal, P22 C9 F23
- Biryani (chicken), 1 plate (~300 g): ~520 kcal, P22 C60 F22
- Veg biryani, 1 plate: ~450 kcal, P10 C66 F16
- Idli, 1 piece: ~58 kcal, P2 C12 F0.3
- Plain dosa, 1: ~135 kcal, P3 C24 F3 (masala dosa ~250 kcal)
- Medu vada, 1: ~135 kcal, P4 C18 F6
- Samosa, 1: ~260 kcal, P4 C30 F14
- Poha, 1 plate: ~250 kcal, P5 C45 F6
- Upma, 1 plate: ~250 kcal, P6 C40 F8
- Curd / dahi, 1 katori: ~90 kcal, P5 C6 F5
- Raita, 1 katori: ~100 kcal, P4 C8 F6
- Gulab jamun, 1 piece: ~150 kcal, P2 C25 F5
Treat these as anchors; scale up or down to match the visible quantity and richness.`;

async function callGateway(model: string, messages: unknown): Promise<{ items: Food[]; confidence: number }> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) {
    throw new Error("AI is unavailable. Server is missing LOVABLE_API_KEY.");
  }
  let res: Response;
  try {
    res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.2,
        response_format: { type: "json_object" },
      }),
    });
  } catch (e) {
    console.error("[ai] network error", e);
    throw new Error("Could not reach the AI service. Check your connection and try again.");
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("[ai] gateway error", res.status, text);
    if (res.status === 429) throw new Error("Rate limited. Try again in a minute.");
    if (res.status === 402) throw new Error("AI credits exhausted. Please add credits in workspace settings.");
    throw new Error("AI service is currently unavailable.");
  }
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = json.choices?.[0]?.message?.content ?? "{}";
  try {
    const parsed = ExtractSchema.parse(JSON.parse(content));
    const items = parsed.items.map(normalizeFood);
    return { items, confidence: parsed.confidence ?? 0.7 };
  } catch (e) {
    console.error("[ai] parse failed", content, e);
    return { items: [], confidence: 0 };
  }
}

/**
 * Reconcile macros vs calories so the UI never shows physically impossible
 * numbers. If kcal is missing/zero we derive it from macros (Atwater factors);
 * if it diverges a lot we blend toward the macro-implied energy.
 */
function normalizeFood(f: Food): Food {
  const p = Math.max(0, Math.round(f.p));
  const c = Math.max(0, Math.round(f.c));
  const fat = Math.max(0, Math.round(f.f));
  const macroKcal = p * 4 + c * 4 + fat * 9;
  let kcal = Math.max(0, Math.round(f.kcal));
  if (kcal === 0 && macroKcal > 0) {
    kcal = Math.round(macroKcal);
  } else if (macroKcal > 0 && Math.abs(kcal - macroKcal) / macroKcal > 0.15) {
    kcal = Math.round((kcal + macroKcal) / 2);
  }
  return {
    name: f.name.trim() || "Food item",
    serving: f.serving?.trim() || "1 serving",
    kcal,
    p,
    c,
    f: fat,
  };
}

// ---------- Vision: photo -> foods ----------

export const analyzeFoodImage = createServerFn({ method: "POST" })
  .inputValidator((input: { imageDataUrl: string }) =>
    z.object({ imageDataUrl: z.string().max(8_000_000) }).parse(input),
  )
  .handler(async ({ data }) => {
    if (!data.imageDataUrl) return { items: [], confidence: 0 };
    const messages = [
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              "Identify every food in this photo. Estimate the portion you can actually see (count items, judge size against the plate/bowl/utensils), account for oil/ghee/cream, and return macros per the stated serving. If it is an Indian dish, name it specifically and use realistic Indian serving sizes.",
          },
          { type: "image_url", image_url: { url: data.imageDataUrl } },
        ],
      },
    ];
    return callGateway("google/gemini-2.5-flash", messages);
  });

// ---------- AI Coach: context-aware chat ----------

const COACH_SYSTEM = `You are CalorieFlow Coach, a friendly, evidence-based nutrition and fitness assistant with strong knowledge of Indian diets and cooking.
You have access to the user's recent food diary, daily goals, and profile.
Rules:
- Be encouraging, concise, and actionable (3-5 sentences per reply by default).
- When suggesting meals, always include rough calorie and macro estimates, and offer Indian options when relevant (e.g. dal, paneer, roti, curd, poha).
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

    let res: Response;
    try {
      res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "google/gemini-2.5-flash", messages }),
      });
    } catch (e) {
      console.error("[coach] network error", e);
      throw new Error("Could not reach the AI coach. Check your connection and try again.");
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[coach] gateway error", res.status, text);
      if (res.status === 429) throw new Error("Rate limited. Try again in a moment.");
      throw new Error("AI coach is temporarily unavailable.");
    }

    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const reply = json.choices?.[0]?.message?.content?.trim() ?? "I'm having trouble responding right now. Please try again.";

    if (data.userId) {
      try {
        const { supabaseAdmin: sa } = await import("@/integrations/supabase/client.server");
        await sa.from("ai_chat_history").insert([
          { user_id: data.userId, role: "user",      content: data.message },
          { user_id: data.userId, role: "assistant", content: reply },
        ]);
      } catch (e) {
        console.error("[coach] failed to persist chat history", e);
      }
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
    // The client passes a transcript captured via the Web Speech API (browser).
    // We extract foods from that transcript.
    const transcript = data.transcript?.trim();

    // No transcript means the browser captured nothing — return empty so the UI
    // can prompt the user to try again, rather than inventing a fake meal.
    if (!transcript) {
      return { items: [], confidence: 0, transcript: "" };
    }

    const messages = [
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content:
          `Extract every food + macros from this spoken meal description. Infer realistic portions from any quantities mentioned (e.g. "two rotis", "a bowl of dal"); if Indian dishes are named, use realistic Indian serving sizes. Description: "${transcript}"`,
      },
    ];
    const result = await callGateway("google/gemini-2.5-flash", messages);
    return { ...result, transcript };
  });
