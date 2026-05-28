/**
 * Persistent local store + sync bridge.
 *
 * When authenticated, mutations are mirrored to Supabase via `src/lib/sync.ts`.
 * When unauthenticated (demo / offline), everything stays in localStorage.
 */
import { useSyncExternalStore } from "react";
import type { Meal } from "./mock-data";
import { goals as seedGoals } from "./mock-data";
import {
  pushMealInsert,
  pushMealUpdate,
  pushMealDelete,
  pushMealRestore,
  pushTrashPurge,
  pushGoals,
  pushProfile,
  pushFavoriteAdd,
  pushFavoriteRemove,
  pushTemplate,
} from "./sync";

const KEYS = {
  meals: "cf.meals.v1",
  trash: "cf.trash.v1",
  templates: "cf.templates.v1",
  favorites: "cf.favorites.v1",
  goals: "cf.goals.v1",
  profile: "cf.profile.v1",
  onboarded: "cf.onboarded.v1",
  subscription: "cf.subscription.v1",
} as const;

const isBrowser = typeof window !== "undefined";
const parsedCache = new Map<string, { raw: string | null; value: unknown }>();

function read<T>(key: string, fallback: T): T {
  if (!isBrowser) return fallback;
  try {
    const raw = localStorage.getItem(key);
    const cached = parsedCache.get(key);
    if (cached && cached.raw === raw) return cached.value as T;
    const value = raw ? (JSON.parse(raw) as T) : fallback;
    parsedCache.set(key, { raw, value });
    return value;
  } catch {
    return fallback;
  }
}
function write<T>(key: string, value: T) {
  if (!isBrowser) return;
  try {
    const raw = JSON.stringify(value);
    localStorage.setItem(key, raw);
    parsedCache.set(key, { raw, value });
    listeners.forEach((l) => l());
    window.dispatchEvent(new StorageEvent("storage", { key }));
  } catch {
    /* quota */
  }
}

const listeners = new Set<() => void>();
function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = () => cb();
  if (isBrowser) window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    if (isBrowser) window.removeEventListener("storage", onStorage);
  };
}

// ---------- Meals ----------

export type TrashedMeal = Meal & { deletedAt: number };

function seedIfEmpty() {
  if (!isBrowser) return;
  if (localStorage.getItem(KEYS.goals) === null) write(KEYS.goals, seedGoals);
}

export function getMeals(): Meal[] {
  return read<Meal[]>(KEYS.meals, []);
}
export function setMeals(meals: Meal[]) {
  write(KEYS.meals, meals);
}
export function addMeal(m: Omit<Meal, "id"> & { id?: string }) {
  const meal: Meal = {
    ...m,
    id: m.id ?? `m-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    loggedDate: m.loggedDate ?? new Date().toISOString().slice(0, 10),
  };
  setMeals([...getMeals(), meal]);
  pushMealInsert(meal);
  return meal;
}
export function updateMeal(id: string, patch: Partial<Meal>) {
  const next = getMeals().map((m) => (m.id === id ? { ...m, ...patch } : m));
  setMeals(next);
  const updated = next.find((m) => m.id === id);
  if (updated) pushMealUpdate(updated);
}
export function deleteMeal(id: string) {
  const meals = getMeals();
  const m = meals.find((x) => x.id === id);
  if (!m) return null;
  setMeals(meals.filter((x) => x.id !== id));
  const trash = read<TrashedMeal[]>(KEYS.trash, []);
  write(KEYS.trash, [{ ...m, deletedAt: Date.now() }, ...trash].slice(0, 200));
  pushMealDelete(m);
  return m;
}
export function restoreMeal(id: string) {
  const trash = read<TrashedMeal[]>(KEYS.trash, []);
  const t = trash.find((x) => x.id === id);
  if (!t) return;
  write(
    KEYS.trash,
    trash.filter((x) => x.id !== id),
  );
  const { deletedAt: _, ...meal } = t;
  setMeals([...getMeals(), meal]);
  pushMealRestore(meal);
}
export function purgeTrash(id?: string) {
  const trash = read<TrashedMeal[]>(KEYS.trash, []);
  write(KEYS.trash, id ? trash.filter((x) => x.id !== id) : []);
  pushTrashPurge(id);
}
export function getTrash(): TrashedMeal[] {
  return read<TrashedMeal[]>(KEYS.trash, []);
}

// ---------- Templates / Favorites ----------

export type Template = { id: string; name: string; meals: Meal[]; savedAt: number };

export function getTemplates(): Template[] {
  return read<Template[]>(KEYS.templates, []);
}
export function saveTemplate(name: string, meals: Meal[]) {
  const t: Template = { id: `t-${Date.now()}`, name, meals, savedAt: Date.now() };
  write(KEYS.templates, [t, ...getTemplates()]);
  pushTemplate(t);
  return t;
}

export type FavoriteFood = { name: string; serving: string; kcal: number; p: number; c: number; f: number };
export function getFavorites(): FavoriteFood[] {
  return read<FavoriteFood[]>(KEYS.favorites, []);
}
export function toggleFavorite(f: FavoriteFood) {
  const cur = getFavorites();
  const exists = cur.find((x) => x.name === f.name);
  write(KEYS.favorites, exists ? cur.filter((x) => x.name !== f.name) : [f, ...cur]);
  if (exists) pushFavoriteRemove(f.name);
  else pushFavoriteAdd(f);
  return !exists;
}

// ---------- Goals / Profile ----------

export type Goals = { calories: number; protein: number; carbs: number; fat: number };
export function getGoals(): Goals {
  return read<Goals>(KEYS.goals, seedGoals);
}
export function setGoals(g: Goals) {
  write(KEYS.goals, g);
  pushGoals(g);
}

export type Profile = {
  name?: string;
  email?: string;
  heightCm?: number;
  weightKg?: number;
  age?: number;
  activity?: "sedentary" | "light" | "moderate" | "active" | "athlete";
  proteinGoal?: number;
  foodPreference?: string;
};
export function getProfile(): Profile {
  return read<Profile>(KEYS.profile, {});
}
export function setProfile(p: Profile) {
  write(KEYS.profile, p);
  pushProfile(p);
}

export function isOnboarded(): boolean {
  return read<boolean>(KEYS.onboarded, false);
}
export function setOnboarded(v: boolean) {
  write(KEYS.onboarded, v);
  pushProfile({ ...getProfile(), onboarded: v } as Profile & { onboarded: boolean });
}

// ---------- Subscription ----------

export type SubscriptionState = { tier: string; status: string; currentPeriodEnd: string | null } | null;
export function getSubscription(): SubscriptionState {
  return read<SubscriptionState>(KEYS.subscription, null);
}
export function setSubscription(s: SubscriptionState) {
  write(KEYS.subscription, s);
}
export function isPremium(): boolean {
  const s = getSubscription();
  return !!s && s.tier !== "free" && s.status === "active";
}

// ---------- Account ops ----------

export function exportAllData(): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      meals: getMeals(),
      trash: getTrash(),
      templates: getTemplates(),
      favorites: getFavorites(),
      goals: getGoals(),
      profile: getProfile(),
    },
    null,
    2,
  );
}
export function downloadExport() {
  const blob = new Blob([exportAllData()], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `calorieflow-export-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
export function deleteAllData() {
  if (!isBrowser) return;
  Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
  parsedCache.clear();
  listeners.forEach((l) => l());
}

// ---------- React hook ----------

// Seed once at module load so the hook itself has a stable hook count.
if (isBrowser) seedIfEmpty();

export function useStore<T>(selector: () => T): T {
  return useSyncExternalStore(subscribe, selector, selector);
}

export const storeKeys = KEYS;

// ---------- Backend hydration hooks (called by sync layer) ----------
export function hydrateMeals(meals: Meal[]) {
  write(KEYS.meals, meals);
}
export function hydrateGoals(g: Goals) {
  write(KEYS.goals, g);
}
export function hydrateProfile(p: Profile) {
  write(KEYS.profile, p);
}
export function hydrateFavorites(f: FavoriteFood[]) {
  write(KEYS.favorites, f);
}
export function hydrateTemplates(t: Template[]) {
  write(KEYS.templates, t);
}
export function hydrateTrash(t: TrashedMeal[]) {
  write(KEYS.trash, t);
}
export function hydrateSubscription(s: SubscriptionState) {
  write(KEYS.subscription, s);
}
