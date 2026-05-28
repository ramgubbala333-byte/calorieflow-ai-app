import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { MiniRing } from "@/components/Progress";
import { getGoals, getMeals, getProfile, useStore } from "@/lib/store";
import { useAuth } from "@/hooks/use-auth";
import { EmptyState } from "@/components/EmptyState";
import {
  Camera, Mic, Barcode, Plus, Flame, Bell, Settings as SettingsIcon, Utensils,
  Drumstick, Wheat, Droplet, Loader2,
} from "lucide-react";
import {
  getTodayActivity, getLatestWeight, useHealth,
} from "@/lib/health";
import { ThemeToggle } from "@/components/ThemeToggle";

export const Route = createFileRoute("/today")({
  head: () => ({ meta: [{ title: "Today · CalorieFlow AI" }] }),
  component: Today,
});

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function Today() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const meals = useStore(() => getMeals());
  const goals = useStore(() => getGoals());
  const profile = useStore(() => getProfile());
  const firstName = profile.name?.split(" ")[0] ?? user?.email?.split("@")[0] ?? "there";
  const activity = useHealth(() => getTodayActivity());
  const weight = useHealth(() => getLatestWeight());
  const totals = meals.reduce(
    (a, m) => ({
      calories: a.calories + m.calories,
      protein: a.protein + m.protein,
      carbs: a.carbs + m.carbs,
      fat: a.fat + m.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

  const now = new Date();
  const todayIdx = now.getDay();
  const todayDate = now.getDate();
  const weekStart = todayDate - todayIdx;

  const caloriePct = Math.min(1, totals.calories / (goals.calories || 1));
  const calorieCircum = 2 * Math.PI * 70;

  return (
    <AppShell>
      <header className="px-5 pt-[max(env(safe-area-inset-top),1rem)] pb-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="w-9 h-9 rounded-2xl gradient-primary grid place-items-center text-primary-foreground glow">
            <Flame className="w-4 h-4" />
          </span>
          <h1 className="text-xl font-display font-semibold tracking-tight">Hey, {firstName} 👋</h1>
        </Link>
        <div className="flex items-center gap-1.5">
          <span className="flex items-center gap-1 px-2.5 h-8 rounded-full glass text-xs font-semibold">
            <Flame className="w-3.5 h-3.5 text-[var(--warning)]" /> {meals.length > 0 ? 1 : 0}
          </span>
          <ThemeToggle />
          <button aria-label="Notifications" className="w-9 h-9 rounded-full glass grid place-items-center">
            <Bell className="w-4 h-4" />
          </button>
          <Link to="/settings" aria-label="Settings" className="w-9 h-9 rounded-full glass grid place-items-center">
            <SettingsIcon className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* week strip */}
      <section className="px-3 mt-1">
        <div className="flex justify-between gap-1">
          {DAYS.map((d, i) => {
            const date = weekStart + i;
            const isToday = i === todayIdx;
            const isPast = i < todayIdx;
            return (
              <div key={d} className="flex-1 flex flex-col items-center gap-1.5">
                <span className={`text-[10px] font-medium ${isToday ? "text-foreground" : "text-muted-foreground"}`}>{d}</span>
                <div
                  className={`w-10 h-10 rounded-full grid place-items-center text-sm font-semibold border-2 transition-colors
                    ${isToday
                      ? "border-primary bg-primary/10 text-foreground"
                      : isPast
                        ? "border-success/60 text-foreground"
                        : "border-dashed border-foreground/15 text-muted-foreground"}`}
                >
                  {date > 0 ? date : ""}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* hero calorie card */}
      <section className="px-5 mt-5">
        <div className="glass-strong rounded-3xl p-5 flex items-center justify-between gap-4">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold font-display tabular-nums leading-none">
                {totals.calories.toLocaleString()}
              </span>
              <span className="text-base text-muted-foreground font-medium">
                /{goals.calories.toLocaleString()}
              </span>
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">Calories eaten</p>
          </div>

          {/* circular progress with flame */}
          <div className="relative" style={{ width: 88, height: 88 }}>
            <svg width={88} height={88} className="-rotate-90">
              <circle
                cx={44} cy={44} r={36}
                fill="none"
                stroke="color-mix(in oklch, var(--foreground) 10%, transparent)"
                strokeWidth={8}
              />
              <circle
                cx={44} cy={44} r={36}
                fill="none"
                stroke="url(#calGrad)"
                strokeWidth={8}
                strokeLinecap="round"
                strokeDasharray={calorieCircum}
                strokeDashoffset={calorieCircum * (1 - caloriePct)}
                style={{ transition: "stroke-dashoffset 700ms ease" }}
              />
              <defs>
                <linearGradient id="calGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="var(--glow-3)" />
                  <stop offset="100%" stopColor="var(--glow-4)" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 grid place-items-center">
              <Flame className="w-6 h-6 text-[var(--glow-3)]" />
            </div>
          </div>
        </div>
      </section>

      {/* macro cards — Cal AI style mini rings */}
      <section className="px-5 mt-3 grid grid-cols-3 gap-3">
        <MacroCard
          value={Math.round(totals.protein)}
          goal={goals.protein}
          label="Protein eaten"
          icon={Drumstick}
          color="oklch(0.66 0.18 25)"
        />
        <MacroCard
          value={Math.round(totals.carbs)}
          goal={goals.carbs}
          label="Carbs eaten"
          icon={Wheat}
          color="oklch(0.74 0.16 75)"
        />
        <MacroCard
          value={Math.round(totals.fat)}
          goal={goals.fat}
          label="Fat eaten"
          icon={Droplet}
          color="oklch(0.65 0.16 240)"
        />
      </section>

      {/* quick actions */}
      <section className="px-5 mt-6">
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
              className="glass rounded-2xl py-3 flex flex-col items-center gap-2 hover:border-primary/40 transition-colors"
            >
              <span className="w-10 h-10 rounded-xl gradient-primary grid place-items-center text-primary-foreground glow">
                <I className="w-4 h-4" />
              </span>
              <span className="text-[11px] font-medium">{l}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* health snapshot */}
      <section className="px-5 mt-5">
        <Link to="/health" className="block glass rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Health</h2>
            <span className="text-xs text-primary font-medium">Manage</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Steps" value={activity?.steps?.toLocaleString() ?? "—"} />
            <Stat label="Active kcal" value={activity?.activeCalories?.toString() ?? "—"} />
            <Stat label="Weight" value={weight ? `${weight.weightKg} kg` : "—"} />
          </div>
        </Link>
      </section>


      {/* recently uploaded */}
      <section className="px-5 mt-6 pb-32">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">Recently uploaded</h2>
          <Link to="/diary" className="text-xs text-primary font-medium">Open diary</Link>
        </div>
        {meals.length === 0 ? (
          <EmptyState
            icon={Utensils}
            title="No meals logged yet"
            description="Snap your next meal to get started."
            ctaLabel="Log a meal"
            ctaTo="/add-food"
          />
        ) : (
          <div className="space-y-2.5">
            {meals.slice(-4).reverse().map((m) => (
              <Link
                to="/diary"
                key={m.id}
                className="glass rounded-2xl p-3 flex items-center gap-3 hover:border-primary/30 transition-colors"
              >
                <div className="w-14 h-14 rounded-2xl bg-foreground/5 grid place-items-center text-2xl shrink-0">
                  {m.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-sm truncate">{m.name}</p>
                    <span className="text-[10px] text-muted-foreground shrink-0">{m.time}</span>
                  </div>
                  <p className="text-xs text-foreground/80 mt-0.5">
                    <Flame className="inline w-3 h-3 text-[var(--glow-3)] -mt-0.5" /> {m.calories} Calories
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1"><Drumstick className="w-3 h-3" style={{ color: "oklch(0.66 0.18 25)" }}/> {m.protein}g</span>
                    <span className="flex items-center gap-1"><Wheat className="w-3 h-3" style={{ color: "oklch(0.74 0.16 75)" }}/> {m.carbs}g</span>
                    <span className="flex items-center gap-1"><Droplet className="w-3 h-3" style={{ color: "oklch(0.65 0.16 240)" }}/> {m.fat}g</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}

function MacroCard({
  value, goal, label, icon, color,
}: {
  value: number; goal: number; label: string;
  icon: typeof Drumstick; color: string;
}) {
  return (
    <div className="glass rounded-2xl p-3 flex flex-col items-start gap-2">
      <div className="text-sm font-bold tabular-nums">
        <span>{value}</span>
        <span className="text-muted-foreground text-xs font-medium">/{goal}g</span>
      </div>
      <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
      <div className="self-center mt-1">
        <MiniRing value={value} max={goal} color={color} icon={icon} size={56} stroke={5} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="text-base font-bold tabular-nums">{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}
