import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Sparkles, Camera, Mic, Barcode, Dumbbell, ShieldCheck, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CalorieFlow AI — Effortless calorie & gym tracking" },
      {
        name: "description",
        content:
          "Scan, speak, or snap to log meals in seconds. AI calorie tracking, workout reminders, and a real coach in your pocket.",
      },
      { property: "og:title", content: "CalorieFlow AI" },
      {
        property: "og:description",
        content:
          "Premium AI calorie tracker and gym companion. Faster than MyFitnessPal, with privacy you control.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Redirect authenticated users (e.g. after Google OAuth callback lands on root)
  useEffect(() => {
    if (!loading && user) navigate({ to: "/today" });
  }, [user, loading, navigate]);

  return (
    <div className="mx-auto max-w-md min-h-screen relative">
      {/* nav */}
      <header className="px-5 pt-[max(env(safe-area-inset-top),1rem)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-9 h-9 rounded-xl gradient-primary grid place-items-center text-primary-foreground font-bold glow">C</span>
          <span className="font-display font-semibold tracking-tight">CalorieFlow</span>
        </div>
        <Link
          to="/login"
          className="text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          Sign in
        </Link>
      </header>

      {/* hero */}
      <section className="px-5 pt-10 pb-8 animate-fade-up">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-xs text-muted-foreground mb-5">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          AI-powered • Privacy first
        </div>
        <h1 className="text-[2.75rem] leading-[1.02] font-display font-bold tracking-tight uppercase">
          We build <br />
          <span className="gradient-text-aurora">AI-driven</span> <br />
          calorie tracking <br />
          people <span className="italic font-display font-medium normal-case text-muted-foreground">care about.</span>
        </h1>

        <p className="mt-4 text-[15px] text-muted-foreground leading-relaxed">
          Snap a photo, say what you ate, or scan a barcode.
          CalorieFlow AI logs everything in seconds — and nudges you to the gym.
        </p>

        <div className="mt-7 flex flex-col gap-3">
          <Link
            to="/onboarding"
            className="h-14 rounded-2xl gradient-primary text-primary-foreground font-semibold grid place-items-center glow-strong"
          >
            Start free — 1 minute setup
          </Link>
          <Link
            to="/login"
            className="h-12 rounded-2xl glass font-medium grid place-items-center text-foreground"
          >
            Sign in to explore
          </Link>
        </div>

        <div className="mt-6 flex items-center gap-2 text-[11px] text-muted-foreground">
          <ShieldCheck className="w-4 h-4 text-accent" />
          No ads. No selling data. Delete anytime.
        </div>
      </section>

      {/* feature mock */}
      <section className="px-5 pb-10">
        <div className="relative animate-float">
          <div className="absolute -inset-6 gradient-primary opacity-25 blur-3xl rounded-full" />
          <div className="relative glass-strong rounded-3xl p-5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Today</span>
              <span className="tabular-nums">Sun, May 24</span>
            </div>
            <div className="mt-3 flex items-end justify-between">
              <div>
                <div className="text-5xl font-bold gradient-text font-display">330</div>
                <div className="text-xs text-muted-foreground mt-1">kcal remaining</div>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <div>1,870 <span className="opacity-60">/ 2,200</span></div>
                <div className="text-accent mt-1">P 142g · C 168g · F 62g</div>
              </div>
            </div>
            <div className="mt-4 h-2 rounded-full bg-white/5 overflow-hidden">
              <div className="h-full gradient-primary rounded-full" style={{ width: "85%" }} />
            </div>
            <div className="mt-5 grid grid-cols-4 gap-2 text-[11px]">
              {[
                { i: Camera, l: "Scan" },
                { i: Mic, l: "Voice" },
                { i: Barcode, l: "Barcode" },
                { i: Dumbbell, l: "Gym" },
              ].map(({ i: I, l }) => (
                <div key={l} className="glass rounded-xl py-3 grid place-items-center gap-1">
                  <I className="w-4 h-4 text-primary" />
                  <span>{l}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* features */}
      <section className="px-5 pb-10 space-y-3">
        {[
          { i: Camera, t: "AI Food Scan", d: "Snap your plate. We estimate calories and macros in 2 seconds." },
          { i: Mic, t: "Voice Logging", d: "Say 'two scrambled eggs and toast' — done." },
          { i: Dumbbell, t: "Smart Gym Reminders", d: "Personal nudges that respect your schedule, not spam." },
          { i: ShieldCheck, t: "Privacy You Control", d: "Local-first by default. One-tap data deletion." },
        ].map(({ i: I, t, d }) => (
          <div key={t} className="glass rounded-2xl p-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary/20 grid place-items-center text-primary shrink-0">
              <I className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">{t}</h3>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{d}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground mt-2" />
          </div>
        ))}
      </section>

      <section className="px-5 pb-12">
        <div className="glass-strong rounded-3xl p-6 text-center">
          <p className="text-xs text-muted-foreground">Pro plan</p>
          <h3 className="font-display text-2xl font-semibold mt-1">Unlimited AI scans</h3>
          <p className="text-xs text-muted-foreground mt-1">$4.99/mo · cancel anytime</p>
          <Link
            to="/subscription"
            className="mt-4 inline-flex h-11 px-6 items-center rounded-full gradient-primary text-primary-foreground text-sm font-semibold glow"
          >
            See plans
          </Link>
        </div>
      </section>

      <footer className="px-5 pb-10 text-center text-[11px] text-muted-foreground">
        © 2026 CalorieFlow AI · <Link to="/settings" className="underline">Privacy</Link>
      </footer>
    </div>
  );
}
