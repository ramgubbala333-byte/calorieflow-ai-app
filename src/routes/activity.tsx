import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { ChevronLeft, ChevronRight, Calendar, Flame, Footprints, Clock, Dumbbell, Trophy, Pin, PinOff, Plus, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  BADGES, TIER_STYLES,
  useStreaks, getToday, getGoals, getHistory, getEarned, getPinned, getCurrentStreak, getLongestStreak, getWorkoutCount,
  togglePin, addProgress, logWorkout,
} from "@/lib/streaks";

export const Route = createFileRoute("/activity")({
  head: () => ({ meta: [{ title: "Activity & Streaks · CalorieFlow AI" }] }),
  component: ActivityPage,
});

type Tab = "overview" | "streaks" | "awards";

function ActivityPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const today = useStreaks(() => getToday());
  const goals = useStreaks(() => getGoals());
  const history = useStreaks(() => getHistory());
  const earned = useStreaks(() => getEarned());
  const pinned = useStreaks(() => getPinned());
  const streak = useStreaks(() => getCurrentStreak());
  const longest = useStreaks(() => getLongestStreak());
  const workouts = useStreaks(() => getWorkoutCount());

  const stepPct = Math.min(1, today.steps / goals.steps);
  const minPct = Math.min(1, today.activeMinutes / goals.activeMinutes);
  const calPct = Math.min(1, today.activityCalories / goals.activityCalories);

  return (
    <AppShell>
      <PageHeader title="Activity" subtitle="Your daily rings & streak" />

      <div className="px-4 pt-2">
        {/* date strip */}
        <div className="flex items-center justify-between mb-3">
          <button className="w-9 h-9 rounded-full glass grid place-items-center"><ChevronLeft className="w-4 h-4" /></button>
          <div className="glass-strong rounded-full px-4 h-9 flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-semibold tracking-wider uppercase" suppressHydrationWarning>
              {new Date(today.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
            </span>

          </div>
          <button className="w-9 h-9 rounded-full glass grid place-items-center"><ChevronRight className="w-4 h-4" /></button>
        </div>

        {/* tabs */}
        <div className="glass-strong rounded-full p-1 grid grid-cols-3 text-xs font-semibold mb-4">
          {(["overview", "streaks", "awards"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`h-9 rounded-full transition uppercase tracking-wider ${tab === t ? "bg-foreground text-background" : "text-muted-foreground"}`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <>
            {/* Triple ring */}
            <div className="glass-strong rounded-3xl p-5 relative overflow-hidden">
              <div className="absolute -top-12 -right-10 w-44 h-44 rounded-full gradient-primary opacity-20 blur-3xl" />
              <div className="flex justify-center">
                <TripleRing steps={stepPct} minutes={minPct} calories={calPct} centerValue={today.steps.toLocaleString()} />
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                <RingStat label="Steps"   value={today.steps.toLocaleString()}     goal={`/${goals.steps.toLocaleString()}`} color="text-sky-400"     icon={<Footprints className="w-3.5 h-3.5" />} />
                <RingStat label="Active"  value={`${today.activeMinutes}`}          goal={`/${goals.activeMinutes} min`}     color="text-emerald-400" icon={<Clock className="w-3.5 h-3.5" />} />
                <RingStat label="Calories" value={`${today.activityCalories}`}     goal={`/${goals.activityCalories} cal`}   color="text-rose-400"    icon={<Flame className="w-3.5 h-3.5" />} />
              </div>
            </div>

            {/* Streak banner */}
            <Link to="/activity" onClick={() => setTab("streaks")} className="mt-4 block glass rounded-2xl p-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl grid place-items-center bg-gradient-to-br from-orange-500 to-rose-500 glow text-2xl">🔥</div>
              <div className="flex-1">
                <p className="text-sm font-semibold">{streak}-day streak</p>
                <p className="text-[11px] text-muted-foreground">{today.completed ? "Today complete — keep it alive!" : "Close your rings to extend it"}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </Link>

            {/* Activities */}
            <div className="mt-6 flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Activities</h2>
              <button
                onClick={() => { logWorkout(); toast.success("Workout logged"); }}
                className="text-[11px] font-semibold text-primary inline-flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Log
              </button>
            </div>
            <div className="space-y-2.5">
              <ActivityRow icon="🏃" iconBg="bg-orange-500/20 text-orange-400" title="Treadmill" sub="41:08" right="1.11 km" />
              <ActivityRow icon="💪" iconBg="bg-emerald-500/20 text-emerald-400" title="Strength Training" sub="39:30 · 105 BPM" right="1 group" />
              <ActivityRow icon="🧘" iconBg="bg-sky-500/20 text-sky-400" title="Yoga Flow" sub="18:00" right="120 cal" />
            </div>

            {/* Demo controls */}
            <div className="mt-6 glass rounded-2xl p-4">
              <p className="text-xs font-semibold mb-2">Quick add (demo)</p>
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => { addProgress({ steps: 1000 }); toast.success("+1,000 steps"); }} className="h-9 rounded-xl glass text-xs font-semibold">+1k steps</button>
                <button onClick={() => { addProgress({ activeMinutes: 10 }); toast.success("+10 min"); }} className="h-9 rounded-xl glass text-xs font-semibold">+10 min</button>
                <button onClick={() => { addProgress({ activityCalories: 100 }); toast.success("+100 cal"); }} className="h-9 rounded-xl glass text-xs font-semibold">+100 cal</button>
              </div>
            </div>
          </>
        )}

        {tab === "streaks" && (
          <>
            <div className="glass-strong rounded-3xl p-6 relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-orange-500/30 blur-3xl" />
              <div className="relative text-center">
                <div className="mx-auto w-20 h-20 rounded-3xl grid place-items-center bg-gradient-to-br from-orange-500 to-rose-500 text-4xl glow">🔥</div>
                <p className="mt-3 font-display text-5xl font-bold tabular-nums">{streak}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">day streak</p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="glass rounded-xl py-2">
                    <p className="text-base font-semibold tabular-nums">{longest}</p>
                    <p className="text-[10px] text-muted-foreground">Longest</p>
                  </div>
                  <div className="glass rounded-xl py-2">
                    <p className="text-base font-semibold tabular-nums">{history.filter((d) => d.completed).length}</p>
                    <p className="text-[10px] text-muted-foreground">Total complete</p>
                  </div>
                </div>
              </div>
            </div>

            {/* History row */}
            <div className="mt-4 glass-strong rounded-2xl p-4">
              <p className="text-xs font-semibold mb-3 uppercase tracking-wider text-muted-foreground">Last 14 days</p>
              <div className="grid grid-cols-7 gap-1.5">
                {history.slice(-14).map((d) => {
                  const day = new Date(d.date).getDate();
                  return (
                    <div key={d.date} className="flex flex-col items-center gap-1">
                      <div className={`w-9 h-9 rounded-xl grid place-items-center text-[11px] font-semibold ${
                        d.completed
                          ? "bg-gradient-to-br from-orange-500 to-rose-500 text-white glow"
                          : "glass text-muted-foreground"
                      }`}>{d.completed ? "🔥" : day}</div>
                      <span className="text-[9px] text-muted-foreground">{day}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 glass rounded-2xl p-4">
              <p className="text-xs font-semibold mb-1">Next milestone</p>
              <NextMilestone streak={streak} />
            </div>
          </>
        )}

        {tab === "awards" && (
          <>
            <div className="glass-strong rounded-2xl p-4 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <Trophy className="w-4 h-4 text-primary" />
                <p className="text-xs font-semibold uppercase tracking-wider">Pinned to profile</p>
              </div>
              {pinned.length === 0 ? (
                <p className="text-[11px] text-muted-foreground">Tap any badge below to pin it to your profile.</p>
              ) : (
                <div className="flex gap-2 flex-wrap">
                  {pinned.map((id) => {
                    const b = BADGES.find((x) => x.id === id);
                    if (!b) return null;
                    return (
                      <div key={id} className={`w-14 h-14 rounded-2xl grid place-items-center text-2xl bg-gradient-to-br ${TIER_STYLES[b.tier]} glow`}>
                        {b.emoji}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">All awards · {earned.length}/{BADGES.length}</p>
            <div className="grid grid-cols-2 gap-2.5">
              {BADGES.map((b) => {
                const isEarned = earned.includes(b.id);
                const isPinned = pinned.includes(b.id);
                return (
                  <button
                    key={b.id}
                    onClick={() => {
                      if (!isEarned) { toast.info(`Locked — ${b.description}`); return; }
                      togglePin(b.id);
                      toast.success(isPinned ? "Unpinned" : "Pinned to profile");
                    }}
                    className={`relative glass rounded-2xl p-3 text-left transition ${!isEarned ? "opacity-40" : ""}`}
                  >
                    {isPinned && (
                      <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary text-primary-foreground grid place-items-center">
                        <Pin className="w-2.5 h-2.5" />
                      </span>
                    )}
                    <div className={`w-12 h-12 rounded-2xl grid place-items-center text-2xl bg-gradient-to-br ${TIER_STYLES[b.tier]} ${isEarned ? "glow" : "grayscale"}`}>
                      {b.emoji}
                    </div>
                    <p className="mt-2 text-sm font-semibold">{b.name}</p>
                    <p className="text-[10px] text-muted-foreground">{b.description}</p>
                    <p className={`mt-1 text-[10px] uppercase tracking-wider font-bold bg-gradient-to-r ${TIER_STYLES[b.tier]} bg-clip-text text-transparent`}>
                      {b.tier}
                    </p>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

function RingStat({ label, value, goal, color, icon }: { label: string; value: string; goal: string; color: string; icon: React.ReactNode }) {
  return (
    <div className="glass rounded-xl py-2.5 px-2">
      <div className={`flex items-center justify-center gap-1 ${color}`}>{icon}<span className="text-[10px] uppercase tracking-wider font-bold">{label}</span></div>
      <p className="mt-1 text-lg font-semibold tabular-nums leading-none">{value}</p>
      <p className="text-[10px] text-muted-foreground">{goal}</p>
    </div>
  );
}

function ActivityRow({ icon, iconBg, title, sub, right }: { icon: string; iconBg: string; title: string; sub: string; right: string }) {
  return (
    <div className="glass rounded-2xl p-3.5 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl grid place-items-center text-lg ${iconBg}`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold uppercase tracking-wide">{title}</p>
        <p className="text-[11px] text-muted-foreground">{sub}</p>
      </div>
      <p className="text-base font-semibold tabular-nums">{right}</p>
    </div>
  );
}

function NextMilestone({ streak }: { streak: number }) {
  const next = [3, 7, 14, 30, 60, 100, 365].find((n) => n > streak) ?? 365;
  const prev = [0, 3, 7, 14, 30, 60, 100].reverse().find((n) => n <= streak) ?? 0;
  const pct = Math.max(0.04, (streak - prev) / (next - prev));
  return (
    <>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1.5">
        <span>{streak} days</span>
        <span className="inline-flex items-center gap-1"><Sparkles className="w-3 h-3 text-primary" />{next}-day badge</span>
      </div>
      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
        <div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-rose-500" style={{ width: `${pct * 100}%` }} />
      </div>
    </>
  );
}

function TripleRing({ steps, minutes, calories, centerValue }: { steps: number; minutes: number; calories: number; centerValue: string }) {
  const size = 240;
  const cx = size / 2, cy = size / 2;
  const rings = [
    { r: 100, w: 14, pct: steps,    color: "#38bdf8" },  // sky
    { r: 82,  w: 14, pct: minutes,  color: "#34d399" },  // emerald
    { r: 64,  w: 14, pct: calories, color: "#fb7185" },  // rose
  ];
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        {rings.map((r, i) => (
          <linearGradient key={i} id={`g${i}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={r.color} stopOpacity="0.9" />
            <stop offset="100%" stopColor={r.color} stopOpacity="0.6" />
          </linearGradient>
        ))}
      </defs>
      {rings.map((r, i) => {
        const c = 2 * Math.PI * r.r;
        return (
          <g key={i} transform={`rotate(-90 ${cx} ${cy})`}>
            <circle cx={cx} cy={cy} r={r.r} fill="none" stroke={r.color} strokeOpacity="0.12" strokeWidth={r.w} />
            <circle
              cx={cx} cy={cy} r={r.r}
              fill="none" stroke={`url(#g${i})`} strokeWidth={r.w} strokeLinecap="round"
              strokeDasharray={`${c * r.pct} ${c}`}
              style={{ filter: `drop-shadow(0 0 8px ${r.color}aa)`, transition: "stroke-dasharray 600ms ease" }}
            />
          </g>
        );
      })}
      <text x={cx} y={cy - 4} textAnchor="middle" fill="#38bdf8" fontSize="34" fontWeight="700" fontFamily="Space Grotesk">{centerValue}</text>
      <text x={cx} y={cy + 18} textAnchor="middle" fill="#94a3b8" fontSize="11" letterSpacing="2" fontWeight="600">STEPS</text>
    </svg>
  );
}
