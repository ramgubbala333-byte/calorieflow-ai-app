// @ts-nocheck
/**
 * CalorieFlow AI — Server Functions
 *
 * All functions run server-side (Cloudflare Worker) via TanStack Start's
 * createServerFn. They use requireSupabaseAuth middleware, which injects
 * a user-scoped Supabase client + userId into context. For privileged admin
 * operations (deleteUserAccount) supabaseAdmin is used instead.
 *
 * Rate limiting uses a per-user daily counter stored in Supabase so it
 * works across Cloudflare's stateless Workers.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

type SupabaseContext = {
  supabase: ReturnType<typeof import("@supabase/supabase-js").createClient>;
  userId: string;
};

function nowIso() { return new Date().toISOString(); }
function todayIso() { return new Date().toISOString().slice(0, 10); }

function yesterdayIso(timezoneOffset = 0) {
  const d = new Date(Date.now() - timezoneOffset * 60_000);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

async function auditLog(
  userId: string,
  action: string,
  details: Record<string, unknown> = {},
) {
  await supabaseAdmin.from("audit_logs").insert({ user_id: userId, action, details });
}

// ---------------------------------------------------------------------------
// 1. copyYesterday
//    Copies all meals from the previous calendar day into today.
// ---------------------------------------------------------------------------
export const copyYesterday = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { timezoneOffset?: number }) =>
    z.object({ timezoneOffset: z.number().optional() }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context as unknown as SupabaseContext;
    const yesterday = yesterdayIso(data.timezoneOffset ?? 0);
    const today = todayIso();

    const { data: meals, error } = await supabase
      .from("meals")
      .select("*")
      .eq("user_id", userId)
      .gte("logged_at", `${yesterday}T00:00:00Z`)
      .lt("logged_at", `${yesterday}T23:59:59Z`);

    if (error) throw new Error(error.message);
    if (!meals?.length) return { copied: 0, meals: [] };

    const copies = meals.map(({ id: _id, created_at: _ca, logged_at: _la, ...rest }) => ({
      ...rest,
      logged_at: `${today}T${nowIso().slice(11)}`,
    }));

    const { data: inserted, error: insErr } = await supabase
      .from("meals")
      .insert(copies)
      .select();

    if (insErr) throw new Error(insErr.message);
    return { copied: inserted?.length ?? 0, meals: inserted ?? [] };
  });

// ---------------------------------------------------------------------------
// 2. copyWholeDay
//    Copies all meals from any source date into a target date.
// ---------------------------------------------------------------------------
export const copyWholeDay = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { fromDate: string; toDate: string }) =>
    z.object({
      fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      toDate:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context as unknown as SupabaseContext;

    const { data: meals, error } = await supabase
      .from("meals")
      .select("*")
      .eq("user_id", userId)
      .gte("logged_at", `${data.fromDate}T00:00:00Z`)
      .lte("logged_at", `${data.fromDate}T23:59:59Z`);

    if (error) throw new Error(error.message);
    if (!meals?.length) return { copied: 0, meals: [] };

    const copies = meals.map(({ id: _id, created_at: _ca, logged_at, ...rest }) => ({
      ...rest,
      logged_at: logged_at.replace(data.fromDate, data.toDate),
    }));

    const { data: inserted, error: insErr } = await supabase
      .from("meals")
      .insert(copies)
      .select();

    if (insErr) throw new Error(insErr.message);
    return { copied: inserted?.length ?? 0, meals: inserted ?? [] };
  });

// ---------------------------------------------------------------------------
// 3. addWeightLog
//    Saves a manual weight entry; also upserts synced_weight for chart data.
// ---------------------------------------------------------------------------
export const addWeightLog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { weightKg: number; note?: string; loggedAt?: string }) =>
    z.object({
      weightKg:  z.number().min(1).max(700),
      note:      z.string().max(500).optional(),
      loggedAt:  z.string().optional(),
    }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context as unknown as SupabaseContext;
    const ts = data.loggedAt ?? nowIso();

    const { data: log, error } = await supabase
      .from("weight_logs")
      .insert({ user_id: userId, weight_kg: data.weightKg, note: data.note, logged_at: ts })
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Mirror to synced_weight so progress charts pick it up
    await supabase.from("synced_weight").insert({
      user_id:     userId,
      platform:    null,
      weight_kg:   data.weightKg,
      measured_at: ts,
    }).then(() => null);

    // Update profile current weight
    await supabase.from("profiles")
      .update({ weight_kg: data.weightKg })
      .eq("user_id", userId);

    // Refresh streak
    await supabaseAdmin.rpc("refresh_streaks", { p_user_id: userId, p_type: "log" });

    return log;
  });

// ---------------------------------------------------------------------------
// 4. uploadProgressPhoto
//    Receives a base64 data-URL, uploads to Supabase Storage, saves metadata.
//    Storage bucket: 'progress-photos'  (must be created in Supabase Dashboard)
// ---------------------------------------------------------------------------
export const uploadProgressPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { imageDataUrl: string; note?: string; weightKg?: number; takenAt?: string }) =>
    z.object({
      imageDataUrl: z.string().min(10).max(10_000_000),
      note:         z.string().max(500).optional(),
      weightKg:     z.number().min(1).max(700).optional(),
      takenAt:      z.string().optional(),
    }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const { userId } = context as unknown as SupabaseContext;
    const ts = data.takenAt ?? nowIso();
    const fileName = `${userId}/${ts.replace(/[:.]/g, "-")}.jpg`;

    // Strip data: prefix and decode
    const base64 = data.imageDataUrl.replace(/^data:image\/[a-z]+;base64,/, "");
    const buffer = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

    const { error: uploadErr } = await supabaseAdmin.storage
      .from("progress-photos")
      .upload(fileName, buffer, { contentType: "image/jpeg", upsert: false });

    if (uploadErr) throw new Error(`Upload failed: ${uploadErr.message}`);

    const { data: record, error: dbErr } = await supabaseAdmin
      .from("progress_photos")
      .insert({
        user_id:      userId,
        storage_path: fileName,
        note:         data.note,
        weight_kg:    data.weightKg,
        taken_at:     ts,
      })
      .select()
      .single();

    if (dbErr) throw new Error(dbErr.message);

    await auditLog(userId, "data_export", { type: "progress_photo_upload", path: fileName });
    return record;
  });

// ---------------------------------------------------------------------------
// 5. createWorkoutReminder
//    Creates or updates a recurring workout reminder + plan.
// ---------------------------------------------------------------------------
const WorkoutReminderSchema = z.object({
  name:          z.string().min(1).max(100),
  daysOfWeek:    z.array(z.number().min(0).max(6)).min(1).max(7),
  workoutType:   z.string().max(50).optional(),
  reminderTime:  z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM format"),
  planId:        z.string().uuid().optional(),  // if updating existing
});

export const createWorkoutReminder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => WorkoutReminderSchema.parse(input))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context as unknown as SupabaseContext;

    const planPayload = {
      user_id:       userId,
      name:          data.name,
      days_of_week:  data.daysOfWeek,
      workout_type:  data.workoutType ?? "gym",
      reminder_time: data.reminderTime,
    };

    let plan;
    if (data.planId) {
      const { data: updated, error } = await supabase
        .from("workout_plans")
        .update(planPayload)
        .eq("id", data.planId)
        .eq("user_id", userId)
        .select()
        .single();
      if (error) throw new Error(error.message);
      plan = updated;
    } else {
      const { data: created, error } = await supabase
        .from("workout_plans")
        .insert(planPayload)
        .select()
        .single();
      if (error) throw new Error(error.message);
      plan = created;
    }

    // Create matching reminder entry
    await supabase.from("reminders").upsert(
      {
        user_id:        userId,
        type:           "workout",
        title:          data.name,
        message:        `Time for your ${data.workoutType ?? "workout"}!`,
        scheduled_time: data.reminderTime,
        days_of_week:   data.daysOfWeek,
      },
      { onConflict: "user_id,type,scheduled_time" },
    );

    return plan;
  });

// ---------------------------------------------------------------------------
// 6. logWorkout
//    Manually logs a completed workout session.
// ---------------------------------------------------------------------------
const WorkoutLogSchema = z.object({
  workoutType:    z.string().min(1).max(100),
  startTime:      z.string(),
  endTime:        z.string(),
  activeCalories: z.number().min(0).max(5000).optional(),
  notes:          z.string().max(500).optional(),
});

export const logWorkout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => WorkoutLogSchema.parse(input))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context as unknown as SupabaseContext;

    const { data: workout, error } = await supabase
      .from("workouts")
      .insert({
        user_id:             userId,
        platform:            null,
        workout_type:        data.workoutType,
        workout_start_time:  data.startTime,
        workout_end_time:    data.endTime,
        active_calories:     data.activeCalories ?? 0,
        completed:           true,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Refresh workout streak
    await supabaseAdmin.rpc("refresh_streaks", { p_user_id: userId, p_type: "workout" });

    // Update daily summary
    const date = data.startTime.slice(0, 10);
    const mins = Math.round(
      (new Date(data.endTime).getTime() - new Date(data.startTime).getTime()) / 60_000,
    );
    await supabase.from("daily_summaries").upsert(
      { user_id: userId, summary_date: date, workout_minutes: mins },
      { onConflict: "user_id,summary_date", ignoreDuplicates: false },
    );

    return workout;
  });

// ---------------------------------------------------------------------------
// 7. lookupBarcode
//    Checks local cache first; falls back to Open Food Facts API.
// ---------------------------------------------------------------------------
export const lookupBarcode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { barcode: string }) =>
    z.object({ barcode: z.string().min(1).max(30) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { barcode } = data;

    // Check cache (shared across all users)
    const { data: cached } = await supabaseAdmin
      .from("barcode_cache")
      .select("*")
      .eq("barcode", barcode)
      .maybeSingle();

    // Cache hit: serve if younger than 30 days
    if (cached) {
      const age = Date.now() - new Date(cached.cached_at).getTime();
      if (age < 30 * 24 * 60 * 60 * 1000) return normalizeCache(cached);
    }

    // Fetch from Open Food Facts
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=product_name,brands,nutriments,serving_size,image_url`,
      { headers: { "User-Agent": "CalorieFlowAI/1.0 (contact@calorieflow.app)" } },
    );

    if (!res.ok) throw new Error(`OpenFoodFacts error: ${res.status}`);
    const json = (await res.json()) as { status: number; product?: Record<string, unknown> };
    if (json.status !== 1 || !json.product) throw new Error("Product not found");

    const p = json.product as Record<string, unknown>;
    const n = (p.nutriments ?? {}) as Record<string, number>;

    const row = {
      barcode,
      product_name:         String(p.product_name ?? "Unknown"),
      brand:                p.brands ? String(p.brands).split(",")[0].trim() : null,
      serving_size:         parseFloat(String(p.serving_size ?? "100")) || 100,
      serving_unit:         "g",
      calories_per_serving: Math.round(n["energy-kcal_serving"] ?? n["energy-kcal_100g"] ?? 0),
      protein:              parseFloat(String(n["proteins_serving"] ?? n["proteins_100g"] ?? "0")),
      carbs:                parseFloat(String(n["carbohydrates_serving"] ?? n["carbohydrates_100g"] ?? "0")),
      fat:                  parseFloat(String(n["fat_serving"] ?? n["fat_100g"] ?? "0")),
      fiber:                parseFloat(String(n["fiber_serving"] ?? n["fiber_100g"] ?? "0")),
      sugar:                parseFloat(String(n["sugars_serving"] ?? n["sugars_100g"] ?? "0")),
      sodium:               parseFloat(String(n["sodium_serving"] ?? n["sodium_100g"] ?? "0")),
      image_url:            p.image_url ? String(p.image_url) : null,
    };

    // Upsert cache (fire and forget)
    supabaseAdmin.from("barcode_cache").upsert(row, { onConflict: "barcode" }).then(() => null);

    return normalizeCache(row);
  });

function normalizeCache(r: Record<string, unknown>) {
  return {
    name:        r.product_name as string,
    brand:       (r.brand as string | null) ?? undefined,
    barcode:     r.barcode as string,
    serving:     `${r.serving_size ?? 100} ${r.serving_unit ?? "g"}`,
    kcal:        Number(r.calories_per_serving ?? 0),
    p:           Number(r.protein ?? 0),
    c:           Number(r.carbs ?? 0),
    f:           Number(r.fat ?? 0),
    fiber:       Number(r.fiber ?? 0),
    sugar:       Number(r.sugar ?? 0),
    sodium:      Number(r.sodium ?? 0),
    imageUrl:    (r.image_url as string | null) ?? undefined,
  };
}

// ---------------------------------------------------------------------------
// 8. checkSubscription
//    Returns the user's current subscription tier and feature limits.
// ---------------------------------------------------------------------------
export const checkSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as unknown as SupabaseContext;

    const { data } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const tier   = data?.tier   ?? "free";
    const status = data?.status ?? "active";
    const isPrem = tier !== "free" && status === "active";

    return {
      tier,
      status,
      currentPeriodEnd: data?.current_period_end ?? null,
      isPremium: isPrem,
      limits: {
        aiScansPerDay:        isPrem ? Infinity : 3,
        voiceLogsPerDay:      isPrem ? Infinity : 0,
        barcodeLookups:       Infinity,
        aiCoach:              isPrem,
        advancedInsights:     isPrem,
        progressPhotos:       isPrem,
        exportData:           true,
        unlimitedReminders:   isPrem,
      },
    };
  });

// ---------------------------------------------------------------------------
// 9. exportUserData
//    Bundles all user data from every table into a single JSON export.
// ---------------------------------------------------------------------------
export const exportUserData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context as unknown as SupabaseContext;

    const [
      profile, goals, meals, foodEntries, favorites, templates,
      deletedMeals, weightLogs, progressPhotos, workouts, reminders,
      workoutPlans, chatHistory, privacySettings, subscriptions,
    ] = await Promise.all([
      supabaseAdmin.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
      supabaseAdmin.from("goals").select("*").eq("user_id", userId).maybeSingle(),
      supabaseAdmin.from("meals").select("*").eq("user_id", userId),
      supabaseAdmin.from("food_entries").select("*").eq("user_id", userId),
      supabaseAdmin.from("favorites").select("*").eq("user_id", userId),
      supabaseAdmin.from("templates").select("*").eq("user_id", userId),
      supabaseAdmin.from("deleted_meals").select("*").eq("user_id", userId),
      supabaseAdmin.from("weight_logs").select("*").eq("user_id", userId),
      supabaseAdmin.from("progress_photos").select("*").eq("user_id", userId),
      supabaseAdmin.from("workouts").select("*").eq("user_id", userId),
      supabaseAdmin.from("reminders").select("*").eq("user_id", userId),
      supabaseAdmin.from("workout_plans").select("*").eq("user_id", userId),
      supabaseAdmin.from("ai_chat_history").select("*").eq("user_id", userId),
      supabaseAdmin.from("privacy_settings").select("*").eq("user_id", userId).maybeSingle(),
      supabaseAdmin.from("subscriptions").select("*").eq("user_id", userId),
    ]);

    await auditLog(userId, "data_export", { tables: 15, exportedAt: nowIso() });

    return {
      exportedAt:      nowIso(),
      userId,
      profile:         profile.data,
      goals:           goals.data,
      meals:           meals.data ?? [],
      foodEntries:     foodEntries.data ?? [],
      favorites:       favorites.data ?? [],
      templates:       templates.data ?? [],
      trash:           deletedMeals.data ?? [],
      weightLogs:      weightLogs.data ?? [],
      progressPhotos:  progressPhotos.data ?? [],
      workouts:        workouts.data ?? [],
      reminders:       reminders.data ?? [],
      workoutPlans:    workoutPlans.data ?? [],
      chatHistory:     chatHistory.data ?? [],
      privacySettings: privacySettings.data,
      subscriptions:   subscriptions.data ?? [],
    };
  });

// ---------------------------------------------------------------------------
// 10. deleteUserAccount
//     Permanently removes all user data + the auth user. Irreversible.
// ---------------------------------------------------------------------------
export const deleteUserAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { confirmEmail: string }) =>
    z.object({ confirmEmail: z.string().email() }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const { userId } = context as unknown as SupabaseContext;

    // Verify email matches as a second factor
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("user_id", userId)
      .maybeSingle();

    if (!profile?.email || profile.email.toLowerCase() !== data.confirmEmail.toLowerCase()) {
      throw new Error("Email confirmation does not match.");
    }

    // Log before deletion so there's a record
    await auditLog(userId, "account_delete", { email: profile.email, deletedAt: nowIso() });

    // Delete all progress photos from storage
    const { data: photos } = await supabaseAdmin
      .from("progress_photos")
      .select("storage_path")
      .eq("user_id", userId);

    if (photos?.length) {
      const paths = photos.map((p) => p.storage_path);
      await supabaseAdmin.storage.from("progress-photos").remove(paths);
    }

    // Delete food scan images
    const { data: scanFiles } = await supabaseAdmin.storage
      .from("food-scans")
      .list(userId);

    if (scanFiles?.length) {
      const paths = scanFiles.map((f) => `${userId}/${f.name}`);
      await supabaseAdmin.storage.from("food-scans").remove(paths);
    }

    // Delete the auth user — cascades to all tables via FK ON DELETE CASCADE
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw new Error(`Failed to delete account: ${error.message}`);

    return { deleted: true };
  });

// ---------------------------------------------------------------------------
// 11. registerNotificationToken
//     Saves a device push token (FCM/APNs/Web Push).
// ---------------------------------------------------------------------------
export const registerNotificationToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { token: string; platform: string }) =>
    z.object({
      token:    z.string().min(10).max(500),
      platform: z.enum(["ios", "android", "web"]),
    }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context as unknown as SupabaseContext;

    await supabase.from("notification_tokens").upsert(
      { user_id: userId, token: data.token, platform: data.platform },
      { onConflict: "token" },
    );

    return { registered: true };
  });

// ---------------------------------------------------------------------------
// 12. updatePrivacySettings
// ---------------------------------------------------------------------------
export const updatePrivacySettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    aiFeaturesEnabled?: boolean;
    aiScanOnDemandOnly?: boolean;
    dataTrainingOptOut?: boolean;
    shareAnonymousStats?: boolean;
  }) =>
    z.object({
      aiFeaturesEnabled:    z.boolean().optional(),
      aiScanOnDemandOnly:   z.boolean().optional(),
      dataTrainingOptOut:   z.boolean().optional(),
      shareAnonymousStats:  z.boolean().optional(),
    }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context as unknown as SupabaseContext;

    const patch: Record<string, boolean> = {};
    if (data.aiFeaturesEnabled   !== undefined) patch.ai_features_enabled    = data.aiFeaturesEnabled;
    if (data.aiScanOnDemandOnly  !== undefined) patch.ai_scan_on_demand_only = data.aiScanOnDemandOnly;
    if (data.dataTrainingOptOut  !== undefined) patch.data_training_opt_out  = data.dataTrainingOptOut;
    if (data.shareAnonymousStats !== undefined) patch.share_anonymous_stats  = data.shareAnonymousStats;

    const { data: updated, error } = await supabase
      .from("privacy_settings")
      .upsert({ user_id: userId, ...patch }, { onConflict: "user_id" })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return updated;
  });

// ---------------------------------------------------------------------------
// 13. clearAiHistory
// ---------------------------------------------------------------------------
export const clearAiHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as unknown as SupabaseContext;

    const { error } = await supabase
      .from("ai_chat_history")
      .delete()
      .eq("user_id", userId);

    if (error) throw new Error(error.message);
    await auditLog(userId, "ai_history_clear", { clearedAt: nowIso() });
    return { cleared: true };
  });

// ---------------------------------------------------------------------------
// 14. getStreaks
// ---------------------------------------------------------------------------
export const getStreaks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as unknown as SupabaseContext;

    const { data, error } = await supabase
      .from("streaks")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data ?? { logging_streak: 0, workout_streak: 0, longest_logging_streak: 0, longest_workout_streak: 0 };
  });
