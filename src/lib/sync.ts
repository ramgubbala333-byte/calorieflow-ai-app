/**
 * Backend sync layer.
 *
 * Hydrates the in-memory + localStorage cache from Supabase when a user
 * signs in, and mirrors mutations back to Supabase. When unauthenticated,
 * everything falls back to localStorage so the demo / preview still works.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Meal } from "./mock-data";
import type {
  HealthConnection,
  HealthPlatform,
  DailyActivity,
  SyncedWeight,
  Workout,
} from "./health";
import type { FavoriteFood, Goals, Profile, Template, TrashedMeal } from "./store";

let currentUserId: string | null = null;

export function getCurrentUserId(): string | null {
  return currentUserId;
}
export function isAuthed(): boolean {
  return !!currentUserId;
}

type RefreshCb = () => void;
const refreshListeners = new Set<RefreshCb>();
export function onSyncRefresh(cb: RefreshCb) {
  refreshListeners.add(cb);
  return () => refreshListeners.delete(cb);
}
function notifyRefresh() {
  refreshListeners.forEach((cb) => cb());
}

// ---------- bootstrap ----------

export type Hydrators = {
  meals:        (m: Meal[]) => void;
  goals:        (g: Goals) => void;
  profile:      (p: Profile) => void;
  favorites:    (f: FavoriteFood[]) => void;
  templates:    (t: Template[]) => void;
  trash:        (t: TrashedMeal[]) => void;
  subscription: (s: { tier: string; status: string; currentPeriodEnd: string | null } | null) => void;
  health: (data: {
    connections: HealthConnection[];
    activity:    DailyActivity[];
    workouts:    Workout[];
    weights:     SyncedWeight[];
  }) => void;
  weightLogs?:     (w: { id: string; weightKg: number; note?: string; loggedAt: number }[]) => void;
  reminders?:      (r: { id: string; type: string; title: string; scheduledTime: string; daysOfWeek: number[]; enabled: boolean }[]) => void;
  streaks?:        (s: { loggingStreak: number; workoutStreak: number; longestLogging: number; longestWorkout: number }) => void;
  privacySettings?: (p: { aiFeaturesEnabled: boolean; aiScanOnDemandOnly: boolean; dataTrainingOptOut: boolean }) => void;
};

let bootstrapped = false;
export function startSync(h: Hydrators) {
  if (bootstrapped || typeof window === "undefined") return;
  bootstrapped = true;

  const hydrate = async (userId: string | null) => {
    currentUserId = userId;
    if (!userId) {
      notifyRefresh();
      return;
    }
    try {
      const [
        mealsRes, goalsRes, profileRes, favRes, tplRes, trashRes, subRes,
        connRes, actRes, woRes, wtRes, wlRes, remRes, strRes, privRes,
      ] = await Promise.all([
        supabase.from("meals").select("*").eq("user_id", userId).order("logged_at", { ascending: true }),
        supabase.from("goals").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("favorites").select("*").eq("user_id", userId),
        supabase.from("templates").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
        supabase.from("deleted_meals").select("*").eq("user_id", userId).order("deleted_at", { ascending: false }).limit(200),
        supabase.from("subscriptions").select("*").eq("user_id", userId).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("health_connections").select("*").eq("user_id", userId),
        supabase.from("daily_activity").select("*").eq("user_id", userId).order("activity_date", { ascending: false }).limit(30),
        supabase.from("workouts").select("*").eq("user_id", userId).order("workout_start_time", { ascending: false }).limit(30),
        supabase.from("synced_weight").select("*").eq("user_id", userId).order("measured_at", { ascending: false }).limit(60),
        supabase.from("weight_logs").select("*").eq("user_id", userId).order("logged_at", { ascending: false }).limit(90),
        supabase.from("reminders").select("*").eq("user_id", userId),
        supabase.from("streaks").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("privacy_settings").select("*").eq("user_id", userId).maybeSingle(),
      ]);

      if (mealsRes.data) {
        h.meals(
          mealsRes.data.map((m) => ({
            id: m.id,
            name: m.name,
            type: m.meal_type as Meal["type"],
            time: m.time_label ?? new Date(m.logged_at).toISOString().slice(11, 16),
            calories: m.calories,
            protein: Number(m.protein),
            carbs: Number(m.carbs),
            fat: Number(m.fat),
            emoji: m.emoji ?? "🍽️",
          })),
        );
      }
      if (goalsRes.data) {
        h.goals({
          calories: goalsRes.data.calories,
          protein: goalsRes.data.protein,
          carbs: goalsRes.data.carbs,
          fat: goalsRes.data.fat,
        });
      }
      if (profileRes.data) {
        const p = profileRes.data;
        h.profile({
          name: p.display_name ?? undefined,
          email: p.email ?? undefined,
          heightCm: p.height_cm ? Number(p.height_cm) : undefined,
          weightKg: p.weight_kg ? Number(p.weight_kg) : undefined,
          age: p.age ?? undefined,
          activity: (p.activity_level as Profile["activity"]) ?? undefined,
          foodPreference: p.food_preference ?? undefined,
        });
      }
      if (favRes.data) {
        h.favorites(
          favRes.data.map((f) => ({
            name: f.name,
            serving: f.serving ?? "",
            kcal: f.calories ?? 0,
            p: Number(f.protein ?? 0),
            c: Number(f.carbs ?? 0),
            f: Number(f.fat ?? 0),
          })),
        );
      }
      if (tplRes.data) {
        h.templates(
          tplRes.data.map((t) => ({
            id: t.id,
            name: t.name,
            meals: (t.meals as unknown as Meal[]) ?? [],
            savedAt: new Date(t.created_at).getTime(),
          })),
        );
      }
      if (trashRes.data) {
        h.trash(
          trashRes.data.map((t) => ({
            ...(t.snapshot as unknown as Meal),
            id: t.original_id,
            deletedAt: new Date(t.deleted_at).getTime(),
          })),
        );
      }
      h.subscription(
        subRes.data
          ? {
              tier: subRes.data.tier,
              status: subRes.data.status,
              currentPeriodEnd: subRes.data.current_period_end,
            }
          : null,
      );
      h.health({
        connections: (connRes.data ?? []).map((c) => ({
          platform: c.platform as HealthPlatform,
          status: c.status as HealthConnection["status"],
          lastSyncedAt: c.last_synced_at ? new Date(c.last_synced_at).getTime() : null,
          scopes: c.scopes ?? [],
          errorMessage: c.error_message ?? undefined,
        })),
        activity: (actRes.data ?? []).map((a) => ({
          date: a.activity_date,
          platform: a.platform as HealthPlatform,
          steps: a.steps ?? 0,
          activeCalories: a.active_calories ?? 0,
          workoutMinutes: a.workout_minutes ?? 0,
          lastSyncedAt: a.last_synced_at ? new Date(a.last_synced_at).getTime() : Date.now(),
        })),
        workouts: (woRes.data ?? []).map((w) => ({
          id: w.id,
          platform: (w.platform ?? "apple_health") as HealthPlatform,
          workoutType: w.workout_type,
          workoutStartTime: new Date(w.workout_start_time).getTime(),
          workoutEndTime: new Date(w.workout_end_time).getTime(),
          activeCalories: w.active_calories ?? 0,
          completed: w.completed ?? false,
        })),
        weights: (wtRes.data ?? []).map((w) => ({
          id: w.id,
          platform: (w.platform ?? "apple_health") as HealthPlatform,
          weightKg: Number(w.weight_kg),
          measuredAt: new Date(w.measured_at).getTime(),
        })),
      });
      if (wlRes.data && h.weightLogs) {
        h.weightLogs(
          wlRes.data.map((w) => ({
            id: w.id,
            weightKg: Number(w.weight_kg),
            note: w.note ?? undefined,
            loggedAt: new Date(w.logged_at).getTime(),
          })),
        );
      }
      if (remRes.data && h.reminders) {
        h.reminders(
          remRes.data.map((r) => ({
            id: r.id,
            type: r.type,
            title: r.title,
            scheduledTime: r.scheduled_time,
            daysOfWeek: r.days_of_week ?? [],
            enabled: r.enabled ?? true,
          })),
        );
      }
      if (strRes.data && h.streaks) {
        h.streaks({
          loggingStreak:  strRes.data.logging_streak  ?? 0,
          workoutStreak:  strRes.data.workout_streak  ?? 0,
          longestLogging: strRes.data.longest_logging_streak ?? 0,
          longestWorkout: strRes.data.longest_workout_streak ?? 0,
        });
      }
      if (privRes.data && h.privacySettings) {
        h.privacySettings({
          aiFeaturesEnabled:   privRes.data.ai_features_enabled   ?? true,
          aiScanOnDemandOnly:  privRes.data.ai_scan_on_demand_only ?? true,
          dataTrainingOptOut:  privRes.data.data_training_opt_out  ?? true,
        });
      }
      notifyRefresh();
    } catch (e) {
      console.error("[sync] hydrate failed", e);
    }
  };

  supabase.auth.onAuthStateChange((_event, session) => {
    hydrate(session?.user?.id ?? null);
  });
  supabase.auth.getSession().then(({ data }) => hydrate(data.session?.user?.id ?? null));
}

// ---------- helpers ----------

function withUid(): string | null {
  return currentUserId;
}
const log = (label: string) => ({ error }: { error: unknown }) =>
  error && console.error(`[sync] ${label}`, error);

// ---------- meal mutations ----------

export function pushMealInsert(meal: Meal) {
  const uid = withUid(); if (!uid) return;
  supabase.from("meals").insert({
    id: meal.id, user_id: uid, name: meal.name, emoji: meal.emoji,
    meal_type: meal.type, time_label: meal.time, logged_at: new Date().toISOString(),
    calories: meal.calories, protein: meal.protein, carbs: meal.carbs, fat: meal.fat,
  }).then(log("insert meal"));
}
export function pushMealUpdate(meal: Meal) {
  const uid = withUid(); if (!uid) return;
  supabase.from("meals").update({
    name: meal.name, emoji: meal.emoji, meal_type: meal.type, time_label: meal.time,
    calories: meal.calories, protein: meal.protein, carbs: meal.carbs, fat: meal.fat,
  }).eq("id", meal.id).eq("user_id", uid).then(log("update meal"));
}
export function pushMealDelete(meal: Meal) {
  const uid = withUid(); if (!uid) return;
  supabase.from("meals").delete().eq("id", meal.id).eq("user_id", uid).then(log("delete meal"));
  supabase.from("deleted_meals").insert({
    user_id: uid, original_id: meal.id, snapshot: meal as never,
  }).then(log("trash insert"));
}
export function pushMealRestore(meal: Meal) {
  const uid = withUid(); if (!uid) return;
  supabase.from("deleted_meals").delete().eq("original_id", meal.id).eq("user_id", uid).then(log("trash delete"));
  pushMealInsert(meal);
}
export function pushTrashPurge(id?: string) {
  const uid = withUid(); if (!uid) return;
  const q = supabase.from("deleted_meals").delete().eq("user_id", uid);
  (id ? q.eq("original_id", id) : q).then(log("trash purge"));
}

// ---------- goals / profile ----------

export function pushGoals(g: Goals) {
  const uid = withUid(); if (!uid) return;
  supabase.from("goals").upsert({ user_id: uid, ...g }, { onConflict: "user_id" }).then(log("goals"));
}
export function pushProfile(p: Profile & { onboarded?: boolean; units?: string; energyUnit?: string }) {
  const uid = withUid(); if (!uid) return;
  supabase.from("profiles").upsert(
    {
      user_id: uid,
      display_name: p.name ?? null,
      email: p.email ?? null,
      height_cm: p.heightCm ?? null,
      weight_kg: p.weightKg ?? null,
      age: p.age ?? null,
      activity_level: p.activity ?? null,
      food_preference: p.foodPreference ?? null,
      ...(p.onboarded !== undefined ? { onboarded: p.onboarded } : {}),
      ...(p.units ? { units: p.units } : {}),
      ...(p.energyUnit ? { energy_unit: p.energyUnit } : {}),
    },
    { onConflict: "user_id" },
  ).then(log("profile"));
}

// ---------- favorites / templates ----------

export function pushFavoriteAdd(f: FavoriteFood) {
  const uid = withUid(); if (!uid) return;
  supabase.from("favorites").insert({
    user_id: uid, name: f.name, serving: f.serving,
    calories: f.kcal, protein: f.p, carbs: f.c, fat: f.f,
  }).then(log("favorite add"));
}
export function pushFavoriteRemove(name: string) {
  const uid = withUid(); if (!uid) return;
  supabase.from("favorites").delete().eq("user_id", uid).eq("name", name).then(log("favorite remove"));
}
export function pushTemplate(t: Template) {
  const uid = withUid(); if (!uid) return;
  supabase.from("templates").insert({
    id: t.id, user_id: uid, name: t.name,
    meals: t.meals as never,
  }).then(log("template"));
}

// ---------- subscription ----------

export async function refreshSubscription(): Promise<{ tier: string; status: string; currentPeriodEnd: string | null } | null> {
  const uid = withUid(); if (!uid) return null;
  const { data } = await supabase.from("subscriptions").select("*")
    .eq("user_id", uid).order("updated_at", { ascending: false }).limit(1).maybeSingle();
  if (!data) return null;
  return { tier: data.tier, status: data.status, currentPeriodEnd: data.current_period_end };
}

// ---------- weight logs ----------

export function pushWeightLog(weightKg: number, note?: string) {
  const uid = withUid(); if (!uid) return;
  supabase.from("weight_logs").insert({
    user_id: uid, weight_kg: weightKg, note: note ?? null,
  }).then(log("weight_log"));
  // Mirror to synced_weight for chart continuity
  supabase.from("synced_weight").insert({
    user_id: uid, platform: null as never, weight_kg: weightKg, measured_at: new Date().toISOString(),
  }).then(() => null);
}

// ---------- reminders / workout plans ----------

export function pushReminder(r: {
  type: string; title: string; message?: string;
  scheduledTime: string; daysOfWeek: number[]; enabled?: boolean;
}) {
  const uid = withUid(); if (!uid) return;
  supabase.from("reminders").insert({
    user_id: uid, type: r.type, title: r.title,
    message: r.message ?? null, scheduled_time: r.scheduledTime,
    days_of_week: r.daysOfWeek, enabled: r.enabled ?? true,
  }).then(log("reminder insert"));
}

export function pushReminderToggle(id: string, enabled: boolean) {
  const uid = withUid(); if (!uid) return;
  supabase.from("reminders").update({ enabled }).eq("id", id).eq("user_id", uid)
    .then(log("reminder toggle"));
}

export function pushReminderDelete(id: string) {
  const uid = withUid(); if (!uid) return;
  supabase.from("reminders").delete().eq("id", id).eq("user_id", uid)
    .then(log("reminder delete"));
}

// ---------- privacy settings ----------

export function pushPrivacySettings(settings: {
  aiFeaturesEnabled?: boolean;
  aiScanOnDemandOnly?: boolean;
  dataTrainingOptOut?: boolean;
  shareAnonymousStats?: boolean;
}) {
  const uid = withUid(); if (!uid) return;
  supabase.from("privacy_settings").upsert({
    user_id: uid,
    ...(settings.aiFeaturesEnabled   !== undefined ? { ai_features_enabled:    settings.aiFeaturesEnabled }   : {}),
    ...(settings.aiScanOnDemandOnly  !== undefined ? { ai_scan_on_demand_only: settings.aiScanOnDemandOnly }  : {}),
    ...(settings.dataTrainingOptOut  !== undefined ? { data_training_opt_out:  settings.dataTrainingOptOut }  : {}),
    ...(settings.shareAnonymousStats !== undefined ? { share_anonymous_stats:  settings.shareAnonymousStats } : {}),
  }, { onConflict: "user_id" }).then(log("privacy_settings"));
}

// ---------- notification tokens ----------

export function pushNotificationToken(token: string, platform: "ios" | "android" | "web") {
  const uid = withUid(); if (!uid) return;
  supabase.from("notification_tokens").upsert(
    { user_id: uid, token, platform },
    { onConflict: "token" },
  ).then(log("notification_token"));
}

// ---------- health mutations ----------

export function pushHealthConnection(c: HealthConnection) {
  const uid = withUid(); if (!uid) return;
  supabase.from("health_connections").upsert({
    user_id: uid, platform: c.platform, status: c.status,
    last_synced_at: c.lastSyncedAt ? new Date(c.lastSyncedAt).toISOString() : null,
    scopes: c.scopes, error_message: c.errorMessage ?? null,
  }, { onConflict: "user_id,platform" }).then(log("health_connection"));
}
export function pushDailyActivity(a: DailyActivity) {
  const uid = withUid(); if (!uid) return;
  supabase.from("daily_activity").upsert({
    user_id: uid, platform: a.platform, activity_date: a.date,
    steps: a.steps, active_calories: a.activeCalories, workout_minutes: a.workoutMinutes,
    last_synced_at: new Date(a.lastSyncedAt).toISOString(),
  }, { onConflict: "user_id,activity_date" }).then(log("daily_activity"));
}
export function pushWeight(w: SyncedWeight) {
  const uid = withUid(); if (!uid) return;
  supabase.from("synced_weight").insert({
    id: w.id, user_id: uid, platform: w.platform,
    weight_kg: w.weightKg, measured_at: new Date(w.measuredAt).toISOString(),
  }).then(log("weight"));
}
export function pushHealthLog(entry: {
  platform: HealthPlatform;
  syncStatus: "success" | "partial" | "failed" | "permission_denied";
  message: string;
}) {
  const uid = withUid(); if (!uid) return;
  supabase.from("health_sync_logs").insert({
    user_id: uid, platform: entry.platform,
    sync_status: entry.syncStatus, message: entry.message,
  }).then(log("health_log"));
}
