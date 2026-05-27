import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { Check, Sparkles, Crown, Zap, ShieldCheck, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/subscription")({
  head: () => ({ meta: [{ title: "Subscription · CalorieFlow AI" }] }),
  component: Subscription,
});

const plans = [
  {
    id: "monthly",
    name: "Monthly",
    price: "$4.99",
    sub: "/month",
    note: "Cancel anytime",
  },
  {
    id: "yearly",
    name: "Yearly",
    price: "$39",
    sub: "/year",
    note: "Save 34% · best value",
    best: true,
  },
];

const features = [
  { i: Sparkles, t: "Unlimited AI food scans" },
  { i: Zap, t: "Voice & barcode logging" },
  { i: Crown, t: "Personalized AI coach" },
  { i: ShieldCheck, t: "Local-first privacy mode" },
];

function Subscription() {
  const nav = useNavigate();
  const [picked, setPicked] = useState("yearly");
  const [starting, setStarting] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const startTrial = async () => {
    setStarting(true);
    await new Promise((r) => setTimeout(r, 700));
    setStarting(false);
    toast.success("Trial started", { description: `7 days of Pro on the ${picked} plan` });
    nav({ to: "/today" });
  };

  const restore = async () => {
    setRestoring(true);
    await new Promise((r) => setTimeout(r, 600));
    setRestoring(false);
    toast.success("Purchases restored");
  };

  return (
    <AppShell hideNav>
      <PageHeader title="Go Pro" subtitle="Unlock the full CalorieFlow" />

      <div className="px-4 pt-4">
        <div className="relative glass-strong rounded-3xl p-6 overflow-hidden text-center">
          <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full gradient-primary opacity-25 blur-3xl" />
          <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-accent opacity-20 blur-3xl" />
          <Crown className="w-10 h-10 mx-auto text-primary mb-3" />
          <h2 className="text-3xl font-display font-semibold">Track smarter <span className="gradient-text">in seconds</span></h2>
          <p className="text-xs text-muted-foreground mt-2 max-w-xs mx-auto">
            7-day free trial. No ads. Cancel anytime.
          </p>
        </div>

        <div className="mt-5 space-y-3">
          {plans.map((p) => {
            const active = picked === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setPicked(p.id)}
                className={`w-full text-left p-4 rounded-2xl flex items-center gap-3 transition-all ${
                  active ? "glass-strong ring-glow" : "glass"
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full grid place-items-center border ${
                    active ? "gradient-primary border-transparent" : "border-border"
                  }`}
                >
                  {active && <Check className="w-3 h-3 text-primary-foreground" />}
                </span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{p.name}</p>
                    {p.best && (
                      <span className="text-[10px] uppercase tracking-wider font-bold gradient-primary text-primary-foreground px-2 py-0.5 rounded-full">
                        Best
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">{p.note}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold tabular-nums">{p.price}</p>
                  <p className="text-[10px] text-muted-foreground">{p.sub}</p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-5 glass rounded-2xl p-4 space-y-3">
          {features.map(({ i: I, t }) => (
            <div key={t} className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg gradient-primary grid place-items-center text-primary-foreground">
                <I className="w-4 h-4" />
              </span>
              <span className="text-sm">{t}</span>
            </div>
          ))}
        </div>

        <button
          onClick={startTrial}
          disabled={starting}
          className="mt-6 w-full h-14 rounded-2xl gradient-primary text-primary-foreground font-semibold glow-strong inline-flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {starting && <Loader2 className="w-4 h-4 animate-spin" />}
          Start 7-day free trial
        </button>

        <p className="mt-3 text-center text-[11px] text-muted-foreground">
          Then $39/year. Auto-renews. Manage anytime in Settings.
        </p>

        <div className="mt-5 flex items-center justify-center gap-4 text-[11px] text-muted-foreground pb-8">
          <button onClick={restore} disabled={restoring} className="inline-flex items-center gap-1">
            {restoring && <Loader2 className="w-3 h-3 animate-spin" />}
            Restore purchase
          </button>
          <span>·</span>
          <Link to="/terms">Terms</Link>
          <span>·</span>
          <Link to="/privacy-policy">Privacy</Link>
        </div>
      </div>
    </AppShell>
  );
}
