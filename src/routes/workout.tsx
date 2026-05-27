import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { workouts } from "@/lib/mock-data";
import { Dumbbell, Bell, Clock, Plus, Check } from "lucide-react";

export const Route = createFileRoute("/workout")({
  head: () => ({ meta: [{ title: "Workout · CalorieFlow AI" }] }),
  component: Workout,
});

function Workout() {
  return (
    <AppShell>
      <PageHeader title="Workouts & Reminders" subtitle="Your week at a glance" />

      <div className="px-4 pt-4">
        {/* hero */}
        <div className="glass-strong rounded-3xl p-5 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full gradient-primary opacity-25 blur-3xl" />
          <div className="relative">
            <p className="text-[11px] text-primary font-semibold mb-1">Today · 18:00</p>
            <h2 className="font-display text-2xl font-semibold">Push Day</h2>
            <p className="text-xs text-muted-foreground mt-1">Chest, shoulders, triceps · 55 min</p>

            <div className="mt-5 grid grid-cols-3 gap-2 text-center">
              {[
                { l: "Exercises", v: "8" },
                { l: "Avg RPE", v: "7.5" },
                { l: "Volume", v: "12.4k" },
              ].map((x) => (
                <div key={x.l} className="glass rounded-xl py-2">
                  <div className="text-base font-semibold tabular-nums">{x.v}</div>
                  <div className="text-[10px] text-muted-foreground">{x.l}</div>
                </div>
              ))}
            </div>

            <button className="mt-5 w-full h-12 rounded-xl gradient-primary text-primary-foreground font-semibold glow">
              Start workout
            </button>
          </div>
        </div>

        {/* nudge */}
        <div className="mt-4 glass rounded-2xl p-4 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary grid place-items-center text-primary-foreground glow shrink-0">
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <p className="text-sm font-medium">You're 1 session from a 5-week streak.</p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Want a 10-min mobility flow tonight if Push Day gets skipped?
            </p>
          </div>
        </div>

        {/* upcoming */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Upcoming</h2>
            <button className="text-xs text-primary font-semibold inline-flex items-center gap-1">
              <Plus className="w-3 h-3" /> Add
            </button>
          </div>
          <div className="space-y-2.5">
            {workouts.map((w) => (
              <div key={w.id} className="glass rounded-2xl p-3.5 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl grid place-items-center ${w.done ? "bg-accent/20 text-accent" : "gradient-primary text-primary-foreground glow"}`}>
                  {w.done ? <Check className="w-4 h-4" /> : <Dumbbell className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{w.title}</p>
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                    <Clock className="w-3 h-3" /> {w.time} · {w.duration}
                  </p>
                </div>
                {!w.done && (
                  <button className="text-[11px] font-semibold px-3 py-1.5 rounded-full glass">Edit</button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* reminder settings */}
        <div className="mt-6 glass-strong rounded-2xl p-4">
          <p className="text-xs font-semibold mb-3">Reminder settings</p>
          {[
            { l: "Pre-workout nudge", s: "30 min before" },
            { l: "Missed session", s: "Suggest reschedule" },
            { l: "Motivation style", s: "Calm coach" },
          ].map((r) => (
            <div key={r.l} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
              <div>
                <p className="text-sm">{r.l}</p>
                <p className="text-[11px] text-muted-foreground">{r.s}</p>
              </div>
              <button className="text-xs text-primary font-semibold">Change</button>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
