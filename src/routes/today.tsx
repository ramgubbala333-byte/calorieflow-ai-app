import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { RingProgress, MacroBar } from "@/components/Progress";
import { streaks, workouts } from "@/lib/mock-data";
import { getGoals, getMeals, useStore } from "@/lib/store";
import { EmptyState } from "@/components/EmptyState";
import {
  Camera, Mic, Barcode, Plus, Flame, Dumbbell, Bell, Settings as SettingsIcon, Utensils,
  Footprints, Activity, Scale, HeartPulse,
} from "lucide-react";
import {
  getTodayActivity, getLatestWeight, getLastSyncTime, formatRelative, useHealth,
} from "@/lib/health";

export const Route = createFileRoute("/today")({
  head: () => ({ meta: [{ title: "Today · CalorieFlow AI" }] }),
  component: Today,
});

function Today() {
  const meals = useStore(() => getMeals());
  const goals = useStore(() => getGoals());
  const activity = useHealth(() => getTodayActivity());
  const weight = useHealth(() => getLatestWeight());
  const lastSync = useHealth(() => getLastSyncTime());
  const totals = meals.reduce(
    (a, m) => ({
      calories: a.calories + m.calories,
      protein: a.protein + m.protein,
      carbs: a.carbs + m.carbs,
      fat: a.fat + m.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
  const remaining = Math.max(0, goals.calories - totals.calories);
  const nextWorkout = workouts.find((w) => !w.done);
  const workoutDone = workouts.filter((w) => w.done).length;


  return (
    <AppShell>
      <header className="px-5 pt-[max(env(safe-area-inset-top),1rem)] pb-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Sunday, May 24</p>
          <h1 className="text-2xl font-display font-semibold leading-tight">Hey, Ram 👋</h1>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button aria-label="Notifications" className="w-10 h-10 rounded-full glass grid place-items-center">
            <Bell className="w-4 h-4" />
          </button>
          <Link to="/settings" aria-label="Settings" className="w-10 h-10 rounded-full glass grid place-items-center">
            <SettingsIcon className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* hero ring */}
      <section className="px-5">
        <div className="glass-strong rounded-3xl p-6">
          <div className="flex items-center gap-6">
            <RingProgress
              value={totals.calories}
              max={goals.calories}
              label={`${remaining}`}
              sub="kcal left"
            />
            <div className="flex-1 space-y-3">
              <div>
                <div className="text-xs text-muted-foreground">Eaten</div>
                <div className="text-xl font-semibold tabular-nums">{totals.calories.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Goal</div>
                <div className="text-xl font-semibold tabular-nums">{goals.calories.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Burned</div>
                <div className="text-xl font-semibold tabular-nums text-accent">410</div>
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-4">
            <MacroBar label="Protein" value={totals.protein} goal={goals.protein} />
            <MacroBar label="Carbs" value={totals.carbs} goal={goals.carbs} color="accent" />
            <MacroBar label="Fat" value={totals.fat} goal={goals.fat} color="warning" />
          </div>
        </div>
      </section>

      {/* quick actions */}
      <section className="px-5 mt-5">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Quick log</h2>
        <div className="grid grid-cols-4 gap-3">
          {[
            { i: Camera, l: "Scan", to: "/scan" },
            { i: Mic, l: "Voice", to: "/voice" },
            { i: Barcode, l: "Barcode", to: "/barcode" },
            { i: Plus, l: "Manual", to: "/add-food" },
          ].map(({ i: I, l, to }) => (
            <Link
              key={l}
              to={to}
              className="glass rounded-2xl py-4 flex flex-col items-center gap-2 hover:border-primary/40"
            >
              <span className="w-10 h-10 rounded-xl gradient-primary grid place-items-center text-primary-foreground glow">
                <I className="w-4 h-4" />
              </span>
              <span className="text-[11px] font-medium">{l}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* streaks */}
      <section className="px-5 mt-5 grid grid-cols-3 gap-3">
        {[
          { i: Flame, label: "Logging", val: streaks.logging, unit: "day streak" },
          { i: Dumbbell, label: "Workouts", val: streaks.workouts, unit: "this week" },
          { i: Flame, label: "Protein", val: streaks.protein, unit: "day streak" },
        ].map(({ i: I, label, val, unit }) => (
          <div key={label} className="glass rounded-2xl p-3">
            <I className="w-4 h-4 text-primary mb-2" />
            <div className="text-xl font-bold tabular-nums">{val}</div>
            <div className="text-[10px] text-muted-foreground leading-tight">{label} · {unit}</div>
          </div>
        ))}
      </section>

      {/* health sync */}
      <section className="px-5 mt-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Health Sync</h2>
          <Link to="/health" className="text-xs text-primary font-medium">Manage</Link>
        </div>
        <Link to="/health" className="block glass-strong rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <HeartPulse className="w-4 h-4 text-primary" />
            <p className="text-[11px] text-muted-foreground flex-1" suppressHydrationWarning>Last sync · {formatRelative(lastSync)}</p>
          </div>
          <div className="grid grid-cols-4 gap-2">
            <HealthTile icon={Footprints} value={activity?.steps?.toLocaleString() ?? "—"} label="Steps" />
            <HealthTile icon={Flame} value={activity?.activeCalories?.toString() ?? "—"} label="Active" />
            <HealthTile icon={Activity} value={`${activity?.workoutMinutes ?? 0}m`} label="Workout" />
            <HealthTile icon={Scale} value={weight ? `${weight.weightKg}` : "—"} label="Weight kg" />
          </div>
          <p className="text-[10px] text-muted-foreground mt-3">
            {workoutDone} of {workouts.length} workouts completed today
          </p>
        </Link>
      </section>



      {/* workout reminder */}
      {nextWorkout && (
        <section className="px-5 mt-5">
          <Link to="/workout" className="block glass-strong rounded-2xl p-4 relative overflow-hidden">
            <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full gradient-primary opacity-20 blur-2xl" />
            <div className="flex items-center gap-3 relative">
              <div className="w-12 h-12 rounded-xl gradient-primary grid place-items-center glow">
                <Dumbbell className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-primary font-medium">Up next · {nextWorkout.time}</p>
                <h3 className="font-semibold text-sm truncate">{nextWorkout.title}</h3>
                <p className="text-[11px] text-muted-foreground">{nextWorkout.duration}</p>
              </div>
              <button className="text-[11px] font-semibold px-3 py-1.5 rounded-full glass">Start</button>
            </div>
          </Link>
        </section>
      )}

      {/* recent meals */}
      <section className="px-5 mt-6 pb-32">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recent meals</h2>
          <Link to="/diary" className="text-xs text-primary font-medium">Open diary</Link>
        </div>
        {meals.length === 0 ? (
          <EmptyState
            icon={Utensils}
            title="No meals logged yet"
            description="Your day is a blank slate. Snap your next meal to get started."
            ctaLabel="Log a meal"
            ctaTo="/add-food"
          />
        ) : (
          <div className="space-y-2.5">
            {meals.slice(-3).reverse().map((m) => (
              <Link to="/diary" key={m.id} className="glass rounded-2xl p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl glass-strong grid place-items-center text-xl">{m.emoji}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{m.name}</p>
                  <p className="text-[11px] text-muted-foreground">{m.type} · {m.time}</p>
                </div>
                <span className="text-sm font-semibold tabular-nums">{m.calories}</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}

function HealthTile({ icon: Icon, value, label }: { icon: typeof Footprints; value: string; label: string }) {
  return (
    <div className="glass rounded-xl p-2 text-center">
      <Icon className="w-3.5 h-3.5 text-primary mx-auto mb-1" />
      <div className="text-sm font-bold tabular-nums leading-tight">{value}</div>
      <div className="text-[9px] text-muted-foreground">{label}</div>
    </div>
  );
}

