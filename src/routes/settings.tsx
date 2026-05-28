import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import {
  User, Target, Calendar, Bell, ShieldCheck, Brain, Trash2, Crown, ChevronRight, LogOut,
  Dumbbell, Scale, Ruler, Flame, Image as ImageIcon, CloudCheck, Utensils, HeartPulse, Smartphone,
} from "lucide-react";
import { useState } from "react";
import { getHealthSettings, setHealthSettings, useHealth, getConnections, formatRelative, getLastSyncTime } from "@/lib/health";
import { useAuth } from "@/hooks/use-auth";
import { getProfile, getGoals, useStore } from "@/lib/store";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings · CalorieFlow AI" }] }),
  component: Settings,
});

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={`w-11 h-6 rounded-full p-0.5 transition-colors ${on ? "gradient-primary" : "bg-white/10"}`}
      aria-pressed={on}
    >
      <span className={`block w-5 h-5 rounded-full bg-white transition-transform ${on ? "translate-x-5" : ""}`} />
    </button>
  );
}

function Segmented<T extends string>({ value, options, onChange }: { value: T; options: T[]; onChange: (v: T) => void }) {
  return (
    <div className="flex gap-1 p-1 rounded-full glass">
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={`px-2.5 h-7 rounded-full text-[11px] font-medium ${
            value === o ? "gradient-primary text-primary-foreground" : "text-muted-foreground"
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

function Settings() {
  const { user, signOut } = useAuth();
  const profile = useStore(() => getProfile());
  const goals = useStore(() => getGoals());
  const displayName = profile.name ?? user?.email?.split("@")[0] ?? "You";
  const displayEmail = profile.email ?? user?.email ?? "";
  const avatarChar = (displayName[0] ?? "U").toUpperCase();

  const [reminders, setReminders] = useState(true);
  const [weekStart, setWeekStart] = useState<"Sun" | "Mon" | "Custom">("Mon");
  const [units, setUnits] = useState<"kg" | "lb">("kg");
  const [energy, setEnergy] = useState<"kcal" | "kJ">("kcal");
  const [calcMethod, setCalcMethod] = useState<"Mifflin" | "Harris" | "Katch">("Mifflin");

  const hs = useHealth(() => getHealthSettings());
  const connections = useHealth(() => getConnections());
  const lastSync = useHealth(() => getLastSyncTime());
  const connectedCount = connections.filter((c) => c.status === "connected").length;
  const updateHS = (patch: Partial<typeof hs>) => setHealthSettings({ ...hs, ...patch });

  return (
    <AppShell>
      <PageHeader title="Settings" subtitle="Account & preferences" />

      <div className="px-4 pt-4 space-y-4">
        {/* profile */}
        <div className="glass-strong rounded-2xl p-4 flex items-center gap-3">
          <div className="w-14 h-14 rounded-full gradient-primary grid place-items-center text-primary-foreground font-bold text-xl glow">{avatarChar}</div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{displayName}</p>
            <p className="text-xs text-muted-foreground truncate">{displayEmail}</p>
          </div>
          <Link to="/subscription" className="text-xs font-semibold px-3 py-1.5 rounded-full gradient-primary text-primary-foreground glow inline-flex items-center gap-1 shrink-0">
            <Crown className="w-3 h-3" /> Pro
          </Link>
        </div>

        {/* Cloud status */}
        <Link to="/restore" className="block">
          <div className="glass rounded-2xl p-4 flex items-center gap-3">
            <CloudCheck className="w-5 h-5 text-[var(--success)]" />
            <div className="flex-1">
              <p className="text-sm font-medium">Cloud backup is on</p>
              <p className="text-[11px] text-muted-foreground">Last synced 2 min ago · Restore deleted entries</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
        </Link>

        <Section title="Goals">
          <Row icon={Target} label="Daily calories" value={`${goals.calories.toLocaleString()} kcal`} />
          <Row icon={Target} label="Protein target" value={`${goals.protein} g`} />
          <Row icon={User} label="Body metrics" value="Edit" />
          <RowCustom icon={Flame} label="Calc method">
            <Segmented value={calcMethod} options={["Mifflin", "Harris", "Katch"]} onChange={setCalcMethod} />
          </RowCustom>
          <RowToggle icon={Dumbbell} label="Subtract exercise calories" on={hs.useExerciseCalories} onChange={(v) => updateHS({ useExerciseCalories: v })} />
        </Section>

        <Section title="Health Sync">
          <Link to="/health" className="p-4 flex items-center gap-3">
            <HeartPulse className="w-4 h-4 text-primary" />
            <div className="flex-1">
              <p className="text-sm">Connected apps</p>
              <p className="text-[11px] text-muted-foreground">
                {connectedCount} of {connections.length} · Last sync {formatRelative(lastSync)}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </Link>
          <RowToggle icon={Flame} label="Use exercise calories in goal" on={hs.useExerciseCalories} onChange={(v) => updateHS({ useExerciseCalories: v })} />
          <RowToggle icon={Flame} label="Auto-adjust remaining calories" on={hs.autoAdjustRemaining} onChange={(v) => updateHS({ autoAdjustRemaining: v })} />
          <RowToggle icon={User} label="Sync steps" on={hs.syncSteps} onChange={(v) => updateHS({ syncSteps: v })} />
          <RowToggle icon={Dumbbell} label="Sync workouts" on={hs.syncWorkouts} onChange={(v) => updateHS({ syncWorkouts: v })} />
          <RowToggle icon={Scale} label="Sync weight" on={hs.syncWeight} onChange={(v) => updateHS({ syncWeight: v })} />
          <RowToggle icon={ShieldCheck} label="Manual override" on={hs.manualOverride} onChange={(v) => updateHS({ manualOverride: v })} />
          <LinkRow icon={Smartphone} label="Platform readiness" to="/platform" />
        </Section>

        <Section title="Preferences">
          <RowCustom icon={Calendar} label="Week starts on">
            <Segmented value={weekStart} options={["Sun", "Mon", "Custom"]} onChange={setWeekStart} />
          </RowCustom>
          <RowCustom icon={Scale} label="Weight">
            <Segmented value={units} options={["kg", "lb"]} onChange={setUnits} />
          </RowCustom>
          <RowCustom icon={Ruler} label="Energy">
            <Segmented value={energy} options={["kcal", "kJ"]} onChange={setEnergy} />
          </RowCustom>
          <Row icon={Utensils} label="Custom meal names" value="Breakfast, Lunch, Snack, Dinner" />
        </Section>

        <Section title="Notifications">
          <RowToggle icon={Bell} label="Workout reminders" on={reminders} onChange={setReminders} />
          <RowToggle icon={Bell} label="Meal log nudges" on={true} onChange={() => {}} />
          <Row icon={Bell} label="Coach tone" value="Calm" />
        </Section>

        <Section title="Privacy">
          <LinkRow icon={ShieldCheck} label="Privacy & AI controls" to="/privacy" />
          <LinkRow icon={Brain} label="Manage AI history" to="/privacy" />
          <LinkRow icon={ImageIcon} label="Progress photo backup" to="/restore" />
        </Section>

        <Section title="Data">
          <LinkRow icon={Trash2} label="Restore deleted entries" to="/restore" />
          <LinkRow icon={ShieldCheck} label="Export my data" to="/privacy" />
          <Link to="/privacy" className="w-full text-left p-4 flex items-center gap-3 border-t border-border">
            <Trash2 className="w-4 h-4 text-destructive" />
            <span className="flex-1 text-sm text-destructive font-medium">Delete account & all data</span>
            <ChevronRight className="w-4 h-4 text-destructive" />
          </Link>
        </Section>

        <button
          onClick={() => signOut()}
          className="w-full h-12 rounded-2xl glass text-sm font-medium text-muted-foreground inline-flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" /> Sign out
        </button>

        <p className="text-center text-[11px] text-muted-foreground pb-2">
          CalorieFlow AI v1.0 · No intrusive ads. Ever.
        </p>
      </div>
    </AppShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground px-1 mb-2">{title}</p>
      <div className="glass-strong rounded-2xl divide-y divide-border overflow-hidden">{children}</div>
    </div>
  );
}

function Row({ icon: Icon, label, value }: { icon: typeof User; label: string; value: string }) {
  return (
    <div className="p-4 flex items-center gap-3">
      <Icon className="w-4 h-4 text-primary" />
      <span className="flex-1 text-sm">{label}</span>
      <span className="text-xs text-muted-foreground truncate max-w-[55%] text-right">{value}</span>
      <ChevronRight className="w-4 h-4 text-muted-foreground" />
    </div>
  );
}

function LinkRow({ icon: Icon, label, to }: { icon: typeof User; label: string; to: string }) {
  return (
    <Link to={to} className="p-4 flex items-center gap-3">
      <Icon className="w-4 h-4 text-primary" />
      <span className="flex-1 text-sm">{label}</span>
      <ChevronRight className="w-4 h-4 text-muted-foreground" />
    </Link>
  );
}

function RowToggle({ icon: Icon, label, on, onChange }: { icon: typeof User; label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="p-4 flex items-center gap-3">
      <Icon className="w-4 h-4 text-primary" />
      <span className="flex-1 text-sm">{label}</span>
      <Toggle on={on} onChange={onChange} />
    </div>
  );
}

function RowCustom({ icon: Icon, label, children }: { icon: typeof User; label: string; children: React.ReactNode }) {
  return (
    <div className="p-4 flex items-center gap-3">
      <Icon className="w-4 h-4 text-primary" />
      <span className="flex-1 text-sm">{label}</span>
      {children}
    </div>
  );
}
