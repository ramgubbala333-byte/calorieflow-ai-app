import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { CheckCircle2, Circle, AlertCircle, Smartphone, Apple, Bot, Camera, Bell, Globe } from "lucide-react";

export const Route = createFileRoute("/platform")({
  head: () => ({ meta: [{ title: "Platform Readiness · CalorieFlow AI" }] }),
  component: Platform,
});

type Status = "ready" | "partial" | "todo";

const items: { icon: typeof Globe; title: string; status: Status; detail: string }[] = [
  { icon: Globe, title: "Responsive web / PWA", status: "ready", detail: "Mobile-first layout, manifest, theme color, installable from Chrome/Safari." },
  { icon: Bot, title: "Android native app", status: "todo", detail: "Wrap with Capacitor (`npx cap add android`) or build with React Native / Expo." },
  { icon: Apple, title: "iOS native app", status: "todo", detail: "Wrap with Capacitor (`npx cap add ios`) or build with React Native / Expo." },
  { icon: Bot, title: "Google Health Connect", status: "todo", detail: "Requires Android native build + `@kiwi-health/capacitor-health-connect`; declare READ_STEPS, READ_EXERCISE, READ_WEIGHT permissions." },
  { icon: Apple, title: "Apple HealthKit", status: "todo", detail: "Requires iOS native build + `@perfood/capacitor-healthkit`; add `NSHealthShareUsageDescription` to Info.plist." },
  { icon: Bell, title: "Push notifications", status: "partial", detail: "Web Push works via service worker; APNs/FCM require native setup for reliable delivery." },
  { icon: Camera, title: "Camera permissions", status: "partial", detail: "Browser getUserMedia works for scan/barcode. Native Capacitor Camera plugin recommended for production quality." },
  { icon: Smartphone, title: "Offline support", status: "ready", detail: "Static offline fallback page and local-first data store." },
];

const ICON: Record<Status, { I: typeof CheckCircle2; cls: string; label: string }> = {
  ready: { I: CheckCircle2, cls: "text-[var(--success)]", label: "Ready" },
  partial: { I: AlertCircle, cls: "text-[var(--warning)]", label: "Partial" },
  todo: { I: Circle, cls: "text-muted-foreground", label: "Needs native build" },
};

function Platform() {
  return (
    <AppShell>
      <PageHeader title="Platform Readiness" subtitle="What works today & what needs native" />

      <div className="px-4 pt-4 space-y-3">
        <div className="glass-strong rounded-2xl p-4">
          <p className="text-xs text-muted-foreground">Current build</p>
          <p className="font-semibold">CalorieFlow AI · Web / PWA v1.0</p>
        </div>

        {items.map(({ icon: Icon, title, status, detail }) => {
          const s = ICON[status];
          return (
            <div key={title} className="glass rounded-2xl p-4 flex gap-3">
              <div className="w-10 h-10 rounded-xl glass-strong grid place-items-center flex-shrink-0">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm">{title}</p>
                  <s.I className={`w-3.5 h-3.5 ${s.cls}`} />
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{detail}</p>
                <p className={`text-[10px] mt-1.5 font-semibold uppercase tracking-wider ${s.cls}`}>{s.label}</p>
              </div>
            </div>
          );
        })}

        <div className="glass-strong rounded-2xl p-4 mt-4">
          <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-2">Recommended next step</p>
          <p className="text-sm">
            Wrap this app with <span className="font-semibold text-primary">Capacitor</span> to ship native iOS &
            Android binaries while keeping a single codebase. Health Sync code is structured to swap mock
            functions for native bridge calls without touching UI.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
