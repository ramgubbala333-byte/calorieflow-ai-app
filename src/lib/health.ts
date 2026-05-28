/**
 * Health Sync — types, mock service, and persistence layer.
 *
 * BACKEND-READY DATA MODEL
 * ------------------------
 * The shapes below mirror the Supabase tables that should back this feature
 * once Lovable Cloud is enabled. Suggested SQL (run as a migration):
 *
 *   create type health_platform as enum (
 *     'apple_health','google_health_connect','fitbit','garmin','samsung_health'
 *   );
 *
 *   create table public.health_connections (
 *     id uuid primary key default gen_random_uuid(),
 *     user_id uuid not null references auth.users(id) on delete cascade,
 *     platform health_platform not null,
 *     status text not null check (status in ('connected','disconnected','error','pending')),
 *     last_synced_at timestamptz,
 *     scopes text[] default '{}',
 *     created_at timestamptz default now(),
 *     unique (user_id, platform)
 *   );
 *
 *   create table public.daily_activity (
 *     id uuid primary key default gen_random_uuid(),
 *     user_id uuid not null references auth.users(id) on delete cascade,
 *     platform health_platform not null,
 *     date date not null,
 *     steps int default 0,
 *     active_calories int default 0,
 *     workout_minutes int default 0,
 *     last_synced_at timestamptz default now(),
 *     unique (user_id, date)
 *   );
 *
 *   create table public.workouts (
 *     id uuid primary key default gen_random_uuid(),
 *     user_id uuid not null references auth.users(id) on delete cascade,
 *     platform health_platform not null,
 *     workout_type text not null,
 *     workout_start_time timestamptz not null,
 *     workout_end_time timestamptz not null,
 *     active_calories int default 0,
 *     last_synced_at timestamptz default now()
 *   );
 *
 *   create table public.synced_weight (
 *     id uuid primary key default gen_random_uuid(),
 *     user_id uuid not null references auth.users(id) on delete cascade,
 *     platform health_platform not null,
 *     weight numeric(5,2) not null,
 *     measured_at timestamptz not null,
 *     last_synced_at timestamptz default now()
 *   );
 *
 *   create table public.health_sync_logs (
 *     id uuid primary key default gen_random_uuid(),
 *     user_id uuid not null references auth.users(id) on delete cascade,
 *     platform health_platform not null,
 *     sync_status text not null check (sync_status in ('success','partial','failed','permission_denied')),
 *     message text,
 *     created_at timestamptz default now()
 *   );
 *
 * Remember to:
 *   GRANT SELECT, INSERT, UPDATE, DELETE on each table TO authenticated;
 *   GRANT ALL on each table TO service_role;
 *   ALTER TABLE ... ENABLE ROW LEVEL SECURITY;
 *   CREATE POLICY "own rows" ON ... USING (auth.uid() = user_id);
 *
 * NATIVE BRIDGE NOTES
 * -------------------
 *  - iOS (Apple HealthKit): wrap with Capacitor + `@perfood/capacitor-healthkit`
 *    or rebuild in React Native/Expo with `react-native-health`. Request:
 *    HKQuantityTypeIdentifierStepCount, ActiveEnergyBurned, BodyMass,
 *    HKWorkoutType. Add `NSHealthShareUsageDescription` to Info.plist.
 *  - Android (Health Connect): use `@kiwi-health/capacitor-health-connect`
 *    or `react-native-health-connect`. Permissions in AndroidManifest:
 *    `android.permission.health.READ_STEPS`, READ_ACTIVE_CALORIES_BURNED,
 *    READ_EXERCISE, READ_WEIGHT.
 *  - Fitbit / Garmin / Samsung: OAuth2 server-fn flow + REST polling.
 *    Store tokens encrypted in `health_connections`.
 *
 * All `connect*` and `sync*` functions below are mocked and should be replaced
 * with native bridge calls (mobile) or OAuth-backed `createServerFn` calls
 * (Fitbit/Garmin/Samsung) when the native shell ships.
 */
import { useSyncExternalStore } from "react";

export type HealthPlatform =
  | "apple_health"
  | "google_health_connect"
  | "fitbit"
  | "garmin"
  | "samsung_health"
  | "zepp";

export type ConnectionStatus = "connected" | "disconnected" | "error" | "pending";
export type SyncStatus = "success" | "partial" | "failed" | "permission_denied";

export type HealthConnection = {
  platform: HealthPlatform;
  status: ConnectionStatus;
  lastSyncedAt: number | null;
  scopes: string[];
  errorMessage?: string;
};

export type DailyActivity = {
  date: string; // YYYY-MM-DD
  platform: HealthPlatform;
  steps: number;
  activeCalories: number;
  workoutMinutes: number;
  lastSyncedAt: number;
};

export type Workout = {
  id: string;
  platform: HealthPlatform;
  workoutType: string;
  workoutStartTime: number;
  workoutEndTime: number;
  activeCalories: number;
  completed: boolean;
};

export type SyncedWeight = {
  id: string;
  platform: HealthPlatform;
  weightKg: number;
  measuredAt: number;
};

export type HealthSyncLog = {
  id: string;
  platform: HealthPlatform;
  syncStatus: SyncStatus;
  message: string;
  createdAt: number;
};

export type HealthSettings = {
  useExerciseCalories: boolean;
  autoAdjustRemaining: boolean;
  syncSteps: boolean;
  syncWorkouts: boolean;
  syncWeight: boolean;
  manualOverride: boolean;
};

const defaultSettings: HealthSettings = {
  useExerciseCalories: true,
  autoAdjustRemaining: true,
  syncSteps: true,
  syncWorkouts: true,
  syncWeight: true,
  manualOverride: false,
};

export const PLATFORM_META: Record<
  HealthPlatform,
  { label: string; emoji: string; vendor: string; native: "ios" | "android" | "oauth" }
> = {
  apple_health: { label: "Apple Health", emoji: "", vendor: "Apple HealthKit", native: "ios" },
  google_health_connect: { label: "Health Connect", emoji: "🤖", vendor: "Google Health Connect", native: "android" },
  fitbit: { label: "Fitbit", emoji: "⌚", vendor: "Fitbit Web API", native: "oauth" },
  garmin: { label: "Garmin", emoji: "🏃", vendor: "Garmin Connect API", native: "oauth" },
  samsung_health: { label: "Samsung Health", emoji: "📱", vendor: "Samsung Health SDK", native: "android" },
  zepp: { label: "Zepp / Amazfit", emoji: "⌚", vendor: "Zepp Health API", native: "oauth" },
};

// ---------- Persistence ----------

const KEYS = {
  connections: "cf.health.connections.v1",
  activity: "cf.health.activity.v1",
  workouts: "cf.health.workouts.v1",
  weights: "cf.health.weights.v1",
  logs: "cf.health.logs.v1",
  settings: "cf.health.settings.v1",
} as const;

const isBrowser = typeof window !== "undefined";
const listeners = new Set<() => void>();
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
  } catch {
    /* ignore quota */
  }
}
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

// ---------- Seeds (demo data) ----------

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

const defaultConnections: HealthConnection[] = [
  { platform: "apple_health", status: "disconnected", lastSyncedAt: null, scopes: [] },
  { platform: "google_health_connect", status: "disconnected", lastSyncedAt: null, scopes: [] },
  { platform: "fitbit", status: "disconnected", lastSyncedAt: null, scopes: [] },
  { platform: "garmin", status: "disconnected", lastSyncedAt: null, scopes: [] },
  { platform: "samsung_health", status: "disconnected", lastSyncedAt: null, scopes: [] },
  { platform: "zepp", status: "disconnected", lastSyncedAt: null, scopes: [] },
];

function seedIfEmpty() {
  if (!isBrowser) return;
  if (localStorage.getItem(KEYS.connections) === null) write(KEYS.connections, defaultConnections);
  if (localStorage.getItem(KEYS.settings) === null) write(KEYS.settings, defaultSettings);
}

// ---------- Getters ----------

export const getConnections = (): HealthConnection[] => read(KEYS.connections, defaultConnections);
export const getActivity = (): DailyActivity[] => read(KEYS.activity, []);
export const getTodayActivity = (): DailyActivity | undefined =>
  getActivity().find((a) => a.date === todayStr());
export const getWorkouts = (): Workout[] => read(KEYS.workouts, []);
export const getWeights = (): SyncedWeight[] => read(KEYS.weights, []);
export const getLogs = (): HealthSyncLog[] => read(KEYS.logs, []);
export const getHealthSettings = (): HealthSettings => read(KEYS.settings, defaultSettings);
export const setHealthSettings = (s: HealthSettings) => write(KEYS.settings, s);

export function getLastSyncTime(): number | null {
  const conns = getConnections().filter((c) => c.status === "connected" && c.lastSyncedAt);
  if (conns.length === 0) return null;
  return Math.max(...conns.map((c) => c.lastSyncedAt!));
}

export function getLatestWeight(): SyncedWeight | undefined {
  const w = getWeights();
  return w.sort((a, b) => b.measuredAt - a.measuredAt)[0];
}

// ---------- Logging ----------

function log(platform: HealthPlatform, syncStatus: SyncStatus, message: string) {
  const entry: HealthSyncLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    platform,
    syncStatus,
    message,
    createdAt: Date.now(),
  };
  write(KEYS.logs, [entry, ...getLogs()].slice(0, 100));
}

function updateConnection(platform: HealthPlatform, patch: Partial<HealthConnection>) {
  const conns = getConnections();
  const next = conns.some((c) => c.platform === platform)
    ? conns.map((c) => (c.platform === platform ? { ...c, ...patch } : c))
    : [...conns, { platform, status: "disconnected" as ConnectionStatus, lastSyncedAt: null, scopes: [], ...patch }];
  write(KEYS.connections, next);
}

// ---------- Mock service layer ----------
// TODO(native): Replace each implementation below with the appropriate
// Capacitor/RN bridge call when the native shell ships. See top-of-file notes.

async function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function mockConnect(
  platform: HealthPlatform,
  opts?: { failPermission?: boolean },
): Promise<HealthConnection> {
  updateConnection(platform, { status: "pending" });
  await delay(900);

  // Simulate permission denial 1 in 10 unless explicitly forced.
  const denied = opts?.failPermission ?? Math.random() < 0.08;
  if (denied) {
    updateConnection(platform, {
      status: "error",
      errorMessage: "Permission denied. Open device settings to allow health data access.",
    });
    log(platform, "permission_denied", "User declined health data permissions.");
    throw new Error("permission_denied");
  }

  const scopes = ["steps", "active_calories", "workouts", "weight"];
  updateConnection(platform, {
    status: "connected",
    lastSyncedAt: Date.now(),
    scopes,
    errorMessage: undefined,
  });
  log(platform, "success", `Connected to ${PLATFORM_META[platform].label}.`);
  return { platform, status: "connected", lastSyncedAt: Date.now(), scopes };
}

export const connectAppleHealth = () => mockConnect("apple_health");
export const connectGoogleHealthConnect = () => mockConnect("google_health_connect");
export const connectFitbit = () => mockConnect("fitbit");
export const connectGarmin = () => mockConnect("garmin");
export const connectSamsungHealth = () => mockConnect("samsung_health");
export const connectZepp = () => mockConnect("zepp");

export async function disconnectHealthProvider(platform: HealthPlatform) {
  await delay(400);
  updateConnection(platform, { status: "disconnected", lastSyncedAt: null, scopes: [] });
  log(platform, "success", `Disconnected from ${PLATFORM_META[platform].label}.`);
}

export async function syncDailyActivity(platform: HealthPlatform): Promise<DailyActivity> {
  await delay(700);
  if (Math.random() < 0.05) {
    log(platform, "failed", "Network timeout while fetching daily activity.");
    throw new Error("sync_failed");
  }
  const current = getTodayActivity();
  const next: DailyActivity = {
    date: todayStr(),
    platform,
    steps: (current?.steps ?? 0) + Math.floor(Math.random() * 800),
    activeCalories: (current?.activeCalories ?? 0) + Math.floor(Math.random() * 60),
    workoutMinutes: current?.workoutMinutes ?? 48,
    lastSyncedAt: Date.now(),
  };
  const others = getActivity().filter((a) => a.date !== next.date);
  write(KEYS.activity, [next, ...others]);
  updateConnection(platform, { lastSyncedAt: Date.now() });
  log(platform, "success", "Daily activity synced.");
  return next;
}

export async function syncWorkouts(platform: HealthPlatform): Promise<Workout[]> {
  await delay(800);
  const workouts = getWorkouts();
  updateConnection(platform, { lastSyncedAt: Date.now() });
  log(platform, "success", `${workouts.length} workouts synced.`);
  return workouts;
}

export async function syncWeight(platform: HealthPlatform): Promise<SyncedWeight> {
  await delay(500);
  const last = getLatestWeight();
  const w: SyncedWeight = {
    id: `wt-${Date.now()}`,
    platform,
    weightKg: last ? +(last.weightKg + (Math.random() - 0.5) * 0.3).toFixed(1) : 74,
    measuredAt: Date.now(),
  };
  write(KEYS.weights, [w, ...getWeights()].slice(0, 60));
  updateConnection(platform, { lastSyncedAt: Date.now() });
  log(platform, "success", "Latest weight synced.");
  return w;
}

// ---------- React hook ----------

export function useHealth<T>(selector: () => T): T {
  useEffect(() => {
    seedIfEmpty();
  }, []);
  return useSyncExternalStore(subscribe, selector, selector);
}

export function formatRelative(ts: number | null | undefined): string {
  if (!ts) return "Never";
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr ago`;
  return `${Math.floor(h / 24)} d ago`;
}

// ---------- Backend hydration hook (called by sync layer) ----------
export function hydrateHealth(data: {
  connections: HealthConnection[];
  activity: DailyActivity[];
  workouts: Workout[];
  weights: SyncedWeight[];
}) {
  // Always write — even empty arrays clear stale mock data
  write(KEYS.connections, data.connections.length ? data.connections : defaultConnections);
  write(KEYS.activity, data.activity);
  write(KEYS.workouts, data.workouts);
  write(KEYS.weights, data.weights);
}
