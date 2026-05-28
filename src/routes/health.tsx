import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import {
  Activity, RefreshCw, Link2, Unlink, ShieldAlert, CheckCircle2,
  Footprints, Flame, Dumbbell, Scale, Clock,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  PLATFORM_META,
  useHealth,
  getConnections,
  getTodayActivity,
  getLatestWeight,
  getLastSyncTime,
  formatRelative,
  connectAppleHealth,
  connectGoogleHealthConnect,
  connectFitbit,
  connectGarmin,
  connectSamsungHealth,
  connectZepp,
  disconnectHealthProvider,
  syncDailyActivity,
  syncWorkouts,
  syncWeight,
  type HealthPlatform,
  type HealthConnection,
} from "@/lib/health";

export const Route = createFileRoute("/health")({
  head: () => ({ meta: [{ title: "Health Sync · CalorieFlow AI" }] }),
  component: HealthPage,
});

const connectMap: Record<HealthPlatform, () => Promise<unknown>> = {
  apple_health: connectAppleHealth,
  google_health_connect: connectGoogleHealthConnect,
  fitbit: connectFitbit,
  garmin: connectGarmin,
  samsung_health: connectSamsungHealth,
  zepp: connectZepp,
};

function HealthPage() {
  const connections = useHealth(() => getConnections());
  const activity = useHealth(() => getTodayActivity());
  const weight = useHealth(() => getLatestWeight());
  const lastSync = useHealth(() => getLastSyncTime());

  return (
    <AppShell>
      <PageHeader title="Health Sync" subtitle="Connect your wearables & health apps" />

      <div className="px-4 pt-4 space-y-4">
        {/* summary */}
        <div className="glass-strong rounded-3xl p-5 relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full gradient-primary opacity-20 blur-3xl" />
          <div className="flex items-center gap-3 mb-4 relative">
            <div className="w-10 h-10 rounded-xl gradient-primary grid place-items-center glow">
              <Activity className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Last sync</p>
              <p className="text-sm font-semibold">{formatRelative(lastSync)}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 relative">
            <Stat icon={Footprints} label="Steps" value={activity?.steps?.toLocaleString() ?? "—"} />
            <Stat icon={Flame} label="Active kcal" value={activity?.activeCalories?.toString() ?? "—"} />
            <Stat icon={Dumbbell} label="Workout min" value={activity?.workoutMinutes?.toString() ?? "—"} />
            <Stat icon={Scale} label="Weight" value={weight ? `${weight.weightKg} kg` : "—"} />
          </div>
        </div>

        {/* providers */}
        <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground px-1">Providers</p>
        <div className="space-y-3">
          {connections.map((c) => (
            <ProviderCard key={c.platform} connection={c} />
          ))}
        </div>

        <div className="glass rounded-2xl p-4 flex gap-3">
          <ShieldAlert className="w-4 h-4 text-[var(--warning)] flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Demo data shown. Real Apple Health & Google Health Connect require a native
            iOS/Android build (Capacitor or React Native). Fitbit, Garmin, and Samsung
            Health will use OAuth via our server when enabled.
          </p>
        </div>
      </div>
    </AppShell>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Activity; label: string; value: string }) {
  return (
    <div className="glass rounded-2xl p-3">
      <Icon className="w-4 h-4 text-primary mb-1.5" />
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-bold tabular-nums">{value}</div>
    </div>
  );
}

function ProviderCard({ connection }: { connection: HealthConnection }) {
  const meta = PLATFORM_META[connection.platform];
  const [busy, setBusy] = useState(false);

  const handleConnect = async () => {
    setBusy(true);
    try {
      await connectMap[connection.platform]();
      toast.success(`${meta.label} connected`);
    } catch (e) {
      const msg = e instanceof Error && e.message === "permission_denied"
        ? "Permission denied. Check device settings."
        : "Connection failed. Try again.";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const handleDisconnect = async () => {
    setBusy(true);
    await disconnectHealthProvider(connection.platform);
    toast.success(`${meta.label} disconnected`);
    setBusy(false);
  };

  const handleSync = async () => {
    setBusy(true);
    try {
      await Promise.all([
        syncDailyActivity(connection.platform),
        syncWorkouts(connection.platform),
        syncWeight(connection.platform),
      ]);
      toast.success(`${meta.label} synced`);
    } catch {
      toast.error("Sync failed. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const connected = connection.status === "connected";
  const errored = connection.status === "error";
  const pending = connection.status === "pending" || busy;

  return (
    <div className="glass-strong rounded-2xl p-4">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl glass grid place-items-center text-xl">{meta.emoji}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-sm truncate">{meta.label}</p>
            {connected && <CheckCircle2 className="w-3.5 h-3.5 text-[var(--success)]" />}
          </div>
          <p className="text-[11px] text-muted-foreground truncate">
            {connected
              ? `Synced ${formatRelative(connection.lastSyncedAt)}`
              : errored
                ? connection.errorMessage ?? "Connection error"
                : meta.vendor}
          </p>
        </div>
        {pending ? (
          <div className="px-3 py-1.5 rounded-full glass text-[11px] text-muted-foreground inline-flex items-center gap-1.5">
            <RefreshCw className="w-3 h-3 animate-spin" /> Working…
          </div>
        ) : connected ? (
          <div className="flex gap-1.5">
            <button
              onClick={handleSync}
              className="w-9 h-9 rounded-full glass grid place-items-center"
              aria-label="Sync now"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleDisconnect}
              className="w-9 h-9 rounded-full glass grid place-items-center text-destructive"
              aria-label="Disconnect"
            >
              <Unlink className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={handleConnect}
            className="px-3 py-1.5 rounded-full gradient-primary text-primary-foreground text-[11px] font-semibold inline-flex items-center gap-1 glow"
          >
            <Link2 className="w-3 h-3" /> Connect
          </button>
        )}
      </div>

      {connected && connection.scopes.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {connection.scopes.map((s) => (
            <span key={s} className="text-[10px] px-2 py-0.5 rounded-full glass text-muted-foreground">
              <Clock className="inline w-2.5 h-2.5 mr-1" />
              {s.replace(/_/g, " ")}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
