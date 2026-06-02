/**
 * Streaks & Awards — localStorage-backed gamification layer.
 *
 * Tracks daily goal completion (steps + active minutes + calories) and awards
 * badges for milestones. Badges can be pinned to the user's profile.
 */
import { useSyncExternalStore } from "react";

export type DailyGoals = {
  steps: number;
  activeMinutes: number;
  activityCalories: number;
};

export type DayProgress = {
  date: string; // YYYY-MM-DD
  steps: number;
  activeMinutes: number;
  activityCalories: number;
  completed: boolean;
};

export type Badge = {
  id: string;
  name: string;
  description: string;
  emoji: string;
  tier: "bronze" | "silver" | "gold" | "platinum";
  threshold: number; // streak days OR steps OR sessions
  category: "streak" | "steps" | "workout" | "calorie";
};

export const BADGES: Badge[] = [
  { id: "streak-3",   name: "Spark",         description: "3-day streak",        emoji: "🔥", tier: "bronze",   threshold: 3,   category: "streak" },
  { id: "streak-7",   name: "Blaze",         description: "7-day streak",        emoji: "🔥", tier: "silver",   threshold: 7,   category: "streak" },
  { id: "streak-30",  name: "Inferno",       description: "30-day streak",       emoji: "🌋", tier: "gold",     threshold: 30,  category: "streak" },
  { id: "streak-100", name: "Phoenix",       description: "100-day streak",      emoji: "🦅", tier: "platinum", threshold: 100, category: "streak" },
  { id: "steps-10k",  name: "Step Master",   description: "10k steps in a day",  emoji: "👟", tier: "bronze",   threshold: 10000, category: "steps" },
  { id: "steps-15k",  name: "Trailblazer",   description: "15k steps in a day",  emoji: "🥾", tier: "silver",   threshold: 15000, category: "steps" },
  { id: "steps-20k",  name: "Marathoner",    description: "20k steps in a day",  emoji: "🏃", tier: "gold",     threshold: 20000, category: "steps" },
  { id: "workout-5",  name: "Iron Will",     description: "5 workouts logged",   emoji: "💪", tier: "bronze",   threshold: 5,   category: "workout" },
  { id: "workout-25", name: "Powerhouse",    description: "25 workouts logged",  emoji: "🏋️", tier: "silver",   threshold: 25,  category: "workout" },
  { id: "workout-100",name: "Legend",        description: "100 workouts logged", emoji: "🏆", tier: "gold",     threshold: 100, category: "workout" },
  { id: "cal-500",    name: "Burner",        description: "500 active cal/day",  emoji: "🔥", tier: "silver",   threshold: 500, category: "calorie" },
  { id: "cal-1000",   name: "Furnace",       description: "1000 active cal/day", emoji: "⚡", tier: "gold",     threshold: 1000, category: "calorie" },
];

const KEYS = {
  goals: "cf.streak.goals.v1",
  history: "cf.streak.history.v1",
  earned: "cf.streak.earned.v1",
  pinned: "cf.streak.pinned.v1",
  workouts: "cf.streak.workouts.v1",
} as const;

const defaultGoals: DailyGoals = { steps: 8000, activeMinutes: 30, activityCalories: 400 };

const isBrowser = typeof window !== "undefined";
const listeners = new Set<() => void>();
const parsedCache = new Map<string, { raw: string | null; value: unknown }>();
const derivedCache = new Map<string, { deps: unknown; value: unknown }>();

function read<T>(key: string, fallback: T): T {
  if (!isBrowser) return fallback;
  try {
    const raw = localStorage.getItem(key);
    const cached = parsedCache.get(key);
    if (cached && cached.raw === raw) return cached.value as T;
    const value = raw ? (JSON.parse(raw) as T) : fallback;
    parsedCache.set(key, { raw, value });
    return value;
  } catch { return fallback; }
}
function write<T>(key: string, value: T) {
  if (!isBrowser) return;
  const raw = JSON.stringify(value);
  localStorage.setItem(key, raw);
  parsedCache.set(key, { raw, value });
  derivedCache.clear();
  listeners.forEach((l) => l());
}
function subscribe(cb: () => void) { listeners.add(cb); return () => listeners.delete(cb); }

// Memoize derived selectors so useSyncExternalStore sees stable references.
function memo<T>(key: string, deps: unknown, compute: () => T): T {
  const cached = derivedCache.get(key);
  if (cached && JSON.stringify(cached.deps) === JSON.stringify(deps)) return cached.value as T;
  const value = compute();
  derivedCache.set(key, { deps, value });
  return value;
}

function todayStr() { return new Date().toISOString().slice(0, 10); }
function daysBetween(a: string, b: string) {
  return Math.round((+new Date(b) - +new Date(a)) / 86400000);
}

// ---- Seed demo data ----
function seed() {
  if (!isBrowser) return;
  if (localStorage.getItem(KEYS.goals) === null) write(KEYS.goals, defaultGoals);
  if (localStorage.getItem(KEYS.history) === null) {
    const today = new Date();
    const hist: DayProgress[] = [];
    // 9 days of demo, last 6 completed → 6-day streak
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      const date = d.toISOString().slice(0, 10);
      const completed = i <= 5 || (i >= 8 && i <= 10);
      hist.push({
        date,
        steps: completed ? 8400 + Math.floor(Math.random() * 4000) : 3200 + Math.floor(Math.random() * 2500),
        activeMinutes: completed ? 34 + Math.floor(Math.random() * 22) : 12 + Math.floor(Math.random() * 14),
        activityCalories: completed ? 420 + Math.floor(Math.random() * 220) : 160 + Math.floor(Math.random() * 120),
        completed,
      });
    }
    write(KEYS.history, hist);
  }
  if (localStorage.getItem(KEYS.workouts) === null) write(KEYS.workouts, 7);
  if (localStorage.getItem(KEYS.earned) === null) write(KEYS.earned, ["streak-3", "steps-10k", "workout-5"]);
  if (localStorage.getItem(KEYS.pinned) === null) write(KEYS.pinned, ["streak-3", "steps-10k"]);
}
if (isBrowser) seed();

// ---- Getters ----
export const getGoals = (): DailyGoals => read(KEYS.goals, defaultGoals);
export const setGoals = (g: DailyGoals) => write(KEYS.goals, g);
export const getHistory = (): DayProgress[] => read(KEYS.history, []);
export const getEarned = (): string[] => read(KEYS.earned, []);
export const getPinned = (): string[] => read(KEYS.pinned, []);
export const getWorkoutCount = (): number => read(KEYS.workouts, 0);

export function getToday(): DayProgress {
  const t = todayStr();
  const found = getHistory().find((d) => d.date === t);
  return found ?? { date: t, steps: 0, activeMinutes: 0, activityCalories: 0, completed: false };
}

export function getCurrentStreak(): number {
  const hist = [...getHistory()].sort((a, b) => (a.date < b.date ? 1 : -1));
  let streak = 0;
  const today = todayStr();
  let cursor = today;
  for (const day of hist) {
    if (day.date === cursor && day.completed) {
      streak++;
      const d = new Date(cursor); d.setDate(d.getDate() - 1);
      cursor = d.toISOString().slice(0, 10);
    } else if (day.date === cursor && !day.completed) {
      break;
    } else if (day.date < cursor) {
      break;
    }
  }
  return streak;
}

export function getLongestStreak(): number {
  const hist = [...getHistory()].sort((a, b) => (a.date < b.date ? -1 : 1));
  let best = 0, run = 0, prev: string | null = null;
  for (const d of hist) {
    if (!d.completed) { run = 0; prev = d.date; continue; }
    if (prev && daysBetween(prev, d.date) === 1) run++; else run = 1;
    best = Math.max(best, run);
    prev = d.date;
  }
  return best;
}

// ---- Mutations ----
export function togglePin(badgeId: string) {
  const pinned = getPinned();
  const next = pinned.includes(badgeId)
    ? pinned.filter((b) => b !== badgeId)
    : [...pinned, badgeId].slice(-6); // max 6 pinned
  write(KEYS.pinned, next);
}

export function logWorkout() {
  write(KEYS.workouts, getWorkoutCount() + 1);
  recomputeEarned();
}

export function addProgress(p: Partial<Pick<DayProgress, "steps" | "activeMinutes" | "activityCalories">>) {
  const hist = getHistory();
  const t = todayStr();
  const idx = hist.findIndex((d) => d.date === t);
  const goals = getGoals();
  const base = idx >= 0 ? hist[idx] : { date: t, steps: 0, activeMinutes: 0, activityCalories: 0, completed: false };
  const next: DayProgress = {
    ...base,
    steps: base.steps + (p.steps ?? 0),
    activeMinutes: base.activeMinutes + (p.activeMinutes ?? 0),
    activityCalories: base.activityCalories + (p.activityCalories ?? 0),
  };
  next.completed = next.steps >= goals.steps && next.activeMinutes >= goals.activeMinutes && next.activityCalories >= goals.activityCalories;
  const out = idx >= 0 ? hist.map((d, i) => (i === idx ? next : d)) : [...hist, next];
  write(KEYS.history, out);
  recomputeEarned();
}

function recomputeEarned() {
  const earned = new Set(getEarned());
  const streak = getCurrentStreak();
  const hist = getHistory();
  const bestSteps = Math.max(0, ...hist.map((h) => h.steps));
  const bestCal = Math.max(0, ...hist.map((h) => h.activityCalories));
  const workouts = getWorkoutCount();

  for (const b of BADGES) {
    const val =
      b.category === "streak" ? streak :
      b.category === "steps" ? bestSteps :
      b.category === "workout" ? workouts :
      bestCal;
    if (val >= b.threshold) earned.add(b.id);
  }
  write(KEYS.earned, [...earned]);
}

// ---- React hook ----
export function useStreaks<T>(selector: () => T): T {
  return useSyncExternalStore(subscribe, selector, selector);
}

export const TIER_STYLES: Record<Badge["tier"], string> = {
  bronze:   "from-amber-600 to-amber-800",
  silver:   "from-slate-300 to-slate-500",
  gold:     "from-yellow-300 to-amber-500",
  platinum: "from-cyan-200 to-indigo-400",
};
