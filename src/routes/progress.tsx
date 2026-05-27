import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { weeklyCalories, weightTrend, proteinWeek, streaks } from "@/lib/mock-data";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Flame, Dumbbell, TrendingDown } from "lucide-react";

export const Route = createFileRoute("/progress")({
  head: () => ({ meta: [{ title: "Progress · CalorieFlow AI" }] }),
  component: Progress,
});

const tooltip = {
  contentStyle: {
    background: "oklch(0.21 0.03 250 / 0.95)",
    border: "1px solid oklch(1 0 0 / 0.1)",
    borderRadius: 12,
    color: "white",
    fontSize: 12,
  },
  labelStyle: { color: "oklch(0.7 0.02 240)" },
};

function Progress() {
  const weightDelta = (weightTrend[0].kg - weightTrend.at(-1)!.kg).toFixed(1);

  return (
    <AppShell>
      <PageHeader back={false} title="Progress" subtitle="Last 7 weeks" />

      <div className="px-4 pt-4 space-y-5">
        {/* KPI row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { i: TrendingDown, label: "Weight", val: `-${weightDelta} kg`, sub: "vs 7 wks ago" },
            { i: Flame, label: "Avg kcal", val: "2,170", sub: "this week" },
            { i: Dumbbell, label: "Workouts", val: streaks.workouts, sub: "this week" },
          ].map(({ i: I, label, val, sub }) => (
            <div key={label} className="glass rounded-2xl p-3">
              <I className="w-4 h-4 text-primary mb-2" />
              <div className="text-lg font-bold gradient-text font-display">{val}</div>
              <div className="text-[10px] text-muted-foreground leading-tight">{label} · {sub}</div>
            </div>
          ))}
        </div>

        {/* calories */}
        <div className="glass-strong rounded-2xl p-4">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-semibold">Calories</h2>
            <span className="text-[11px] text-muted-foreground">Goal 2,200</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={weeklyCalories} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="kcal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.78 0.18 200)" />
                  <stop offset="100%" stopColor="oklch(0.74 0.18 155)" />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="oklch(1 0 0 / 0.05)" vertical={false} />
              <XAxis dataKey="day" stroke="oklch(0.7 0.02 240)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="oklch(0.7 0.02 240)" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip {...tooltip} cursor={{ fill: "oklch(1 0 0 / 0.04)" }} />
              <Bar dataKey="kcal" fill="url(#kcal)" radius={[8, 8, 4, 4]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* weight */}
        <div className="glass-strong rounded-2xl p-4">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-semibold">Weight trend</h2>
            <span className="text-[11px] text-accent">▼ 3.2 kg</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={weightTrend} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="weight" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.78 0.18 200)" stopOpacity={0.55} />
                  <stop offset="100%" stopColor="oklch(0.78 0.18 200)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="oklch(1 0 0 / 0.05)" vertical={false} />
              <XAxis dataKey="week" stroke="oklch(0.7 0.02 240)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis domain={["dataMin - 1", "dataMax + 1"]} stroke="oklch(0.7 0.02 240)" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip {...tooltip} />
              <Area type="monotone" dataKey="kg" stroke="oklch(0.78 0.18 200)" strokeWidth={2.5} fill="url(#weight)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* protein */}
        <div className="glass-strong rounded-2xl p-4">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-semibold">Protein (g/day)</h2>
            <span className="text-[11px] text-muted-foreground">Goal 165</span>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={proteinWeek} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="oklch(1 0 0 / 0.05)" vertical={false} />
              <XAxis dataKey="day" stroke="oklch(0.7 0.02 240)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="oklch(0.7 0.02 240)" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip {...tooltip} cursor={{ fill: "oklch(1 0 0 / 0.04)" }} />
              <Bar dataKey="g" fill="oklch(0.74 0.18 155)" radius={[8, 8, 4, 4]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* streaks */}
        <div className="glass rounded-2xl p-4 grid grid-cols-3 text-center divide-x divide-border">
          <div>
            <div className="text-xl font-bold gradient-text font-display">{streaks.logging}</div>
            <div className="text-[10px] text-muted-foreground">Logging streak</div>
          </div>
          <div>
            <div className="text-xl font-bold gradient-text font-display">{streaks.protein}</div>
            <div className="text-[10px] text-muted-foreground">Protein streak</div>
          </div>
          <div>
            <div className="text-xl font-bold gradient-text font-display">{streaks.workouts}</div>
            <div className="text-[10px] text-muted-foreground">Workouts/wk</div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
