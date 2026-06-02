import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  Sparkles,
  Camera,
  Mic,
  Barcode,
  Dumbbell,
  ShieldCheck,
  ChevronRight,
  Flame,
  Apple,
  Drumstick,
  Wheat,
  Droplet,
  Heart,
  Activity,
  Salad,
  Cookie,
  Egg,
  Fish,
  Coffee,
  Pizza,
  Beef,
  Carrot,
  Star,
  Zap,
  Trophy,
} from "lucide-react";
import foodThali from "@/assets/food-thali.jpg";
import foodDosa from "@/assets/food-dosa.jpg";
import foodTandoori from "@/assets/food-tandoori.jpg";
import foodPoha from "@/assets/food-poha.jpg";

const FEATURED_MEALS = [
  { img: foodThali, name: "Paneer Thali", kcal: 640, sub: "Lunch · 32g protein" },
  { img: foodTandoori, name: "Tandoori Chicken", kcal: 290, sub: "Dinner · 38g protein" },
  { img: foodDosa, name: "Masala Dosa", kcal: 168, sub: "Breakfast · 4g protein" },
  { img: foodPoha, name: "Poha & Chai", kcal: 380, sub: "Breakfast · 9g protein" },
];


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
          "Premium AI calorie tracker and gym companion. Fast logging with privacy you control.",
      },
    ],
  }),
  component: Landing,
});

const FOOD_TICKER = [
  { e: "🍛", t: "Paneer butter masala · 340 kcal" },
  { e: "🫓", t: "Roti (2) · 240 kcal" },
  { e: "🍚", t: "Jeera rice · 205 kcal" },
  { e: "🥘", t: "Chicken curry · 290 kcal" },
  { e: "🍵", t: "Masala chai · 90 kcal" },
  { e: "🥞", t: "Masala dosa · 168 kcal" },
  { e: "🍲", t: "Dal tadka · 198 kcal" },
  { e: "🥗", t: "Sprouts chaat · 150 kcal" },
  { e: "🥛", t: "Lassi · 180 kcal" },
  { e: "🍌", t: "Banana · 105 kcal" },
];


const STATS_TICKER = [
  { i: Flame, t: "Log a meal in seconds" },
  { i: Activity, t: "AI photo & voice logging" },
  { i: Heart, t: "Indian & global foods" },
  { i: Zap, t: "Accurate macro breakdowns" },
  { i: Trophy, t: "Track goals & streaks" },
  { i: ShieldCheck, t: "Zero data sold. Ever." },
];

function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/today" });
  }, [user, loading, navigate]);

  return (
    <div className="mx-auto max-w-md min-h-screen relative overflow-x-hidden">
      {/* ambient blobs for glass depth */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-[-15%] left-[-20%] w-[60vw] h-[60vw] rounded-full bg-[var(--glow)] opacity-30 blur-3xl animate-blob-1" />
        <div className="absolute top-[20%] right-[-25%] w-[55vw] h-[55vw] rounded-full bg-[var(--glow-2)] opacity-25 blur-3xl animate-blob-2" />
        <div className="absolute bottom-[-10%] left-[10%] w-[60vw] h-[60vw] rounded-full bg-[var(--glow-3)] opacity-20 blur-3xl animate-blob-3" />
      </div>

      {/* macOS-style top bar */}
      <header className="sticky top-0 z-40 px-3 pt-[max(env(safe-area-inset-top),0.5rem)] pb-2">
        <div className="glass-mac flex items-center justify-between px-3 h-11 rounded-2xl">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 pl-0.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
            </div>
            <span className="ml-2 font-display font-semibold tracking-tight text-sm">
              CalorieFlow
            </span>
          </div>
          <Link
            to="/login"
            className="glass-chip h-7 px-3 rounded-full text-[11px] font-medium grid place-items-center"
          >
            Sign in
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="px-4 pt-6 pb-5 animate-fade-up">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass-chip text-[11px] text-muted-foreground mb-5">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          AI-powered · Privacy first · v1.0
        </div>
        <h1 className="text-[2.5rem] leading-[1.04] font-display font-bold tracking-tight">
          Calorie tracking
          <br />
          that feels like
          <br />
          <span className="gradient-text-aurora">a deep breath.</span>
        </h1>
        <p className="mt-4 text-[14px] text-muted-foreground leading-relaxed">
          Snap a photo, say what you ate, or scan a barcode. CalorieFlow logs everything in seconds.
        </p>

        <div className="mt-6 flex flex-col gap-2.5">
          <Link
            to="/onboarding"
            className="h-13 py-3.5 rounded-2xl gradient-primary text-primary-foreground font-semibold grid place-items-center glow-strong"
          >
            Start free — 1 min setup
          </Link>
          <Link
            to="/login"
            className="h-12 rounded-2xl glass-mac font-medium grid place-items-center text-foreground"
          >
            Sign in to explore
          </Link>
        </div>
      </section>

      {/* Scrolling food ticker */}
      <section className="pb-4">
        <div className="marquee-mask overflow-hidden">
          <div className="flex gap-2 w-max animate-marquee">
            {[...FOOD_TICKER, ...FOOD_TICKER].map((f, i) => (
              <div
                key={i}
                className="glass-chip h-10 px-3.5 rounded-full flex items-center gap-2 text-xs whitespace-nowrap"
              >
                <span className="text-base leading-none">{f.e}</span>
                <span className="font-medium text-foreground/85">{f.t}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* App preview window — macOS chrome */}
      <section className="px-4 pb-8">
        <div className="relative">
          <div className="absolute -inset-8 gradient-primary opacity-20 blur-3xl rounded-full" />
          <div className="relative glass-mac p-0 overflow-hidden">
            {/* window chrome */}
            <div className="flex items-center gap-2 px-4 h-9 border-b border-white/10">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
              <span className="mx-auto text-[10px] font-medium text-muted-foreground tabular-nums">
                Today · Sun, May 24
              </span>
            </div>

            <div className="p-5">
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-5xl font-bold gradient-text font-display tabular-nums leading-none">
                    330
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1.5">kcal remaining</div>
                </div>
                <div className="text-right text-[11px] text-muted-foreground space-y-0.5">
                  <div className="tabular-nums">
                    1,870 <span className="opacity-60">/ 2,200</span>
                  </div>
                  <div className="flex gap-2 justify-end mt-1">
                    <span className="flex items-center gap-0.5">
                      <Drumstick className="w-3 h-3" /> 142g
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Wheat className="w-3 h-3" /> 168g
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Droplet className="w-3 h-3" /> 62g
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 h-2 rounded-full bg-foreground/10 overflow-hidden">
                <div className="h-full gradient-primary rounded-full" style={{ width: "85%" }} />
              </div>

              <div className="mt-5 grid grid-cols-4 gap-2 text-[10px]">
                {[
                  { i: Camera, l: "Scan" },
                  { i: Mic, l: "Voice" },
                  { i: Barcode, l: "Barcode" },
                  { i: Dumbbell, l: "Gym" },
                ].map(({ i: I, l }) => (
                  <div
                    key={l}
                    className="glass-chip rounded-xl py-2.5 grid place-items-center gap-1"
                  >
                    <I className="w-4 h-4 text-primary" />
                    <span className="font-medium">{l}</span>
                  </div>
                ))}
              </div>

              <div className="mac-divider my-4" />

              <div className="space-y-1.5">
                {[
                  { e: "🥗", n: "Caesar salad", k: "320 kcal", t: "12:42 PM" },
                  { e: "🍗", n: "Grilled chicken", k: "284 kcal", t: "1:08 PM" },
                  { e: "☕", n: "Oat latte", k: "120 kcal", t: "3:20 PM" },
                ].map((m) => (
                  <div key={m.n} className="flex items-center gap-3 py-1.5">
                    <div className="w-9 h-9 rounded-xl glass-chip grid place-items-center text-base">
                      {m.e}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{m.n}</p>
                      <p className="text-[10px] text-muted-foreground">{m.t}</p>
                    </div>
                    <span className="text-[11px] font-semibold tabular-nums">{m.k}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats ticker — reverse direction */}
      <section className="pb-8">
        <div className="marquee-mask overflow-hidden">
          <div className="flex gap-2 w-max animate-marquee-reverse">
            {[...STATS_TICKER, ...STATS_TICKER].map(({ i: I, t }, i) => (
              <div
                key={i}
                className="glass-chip h-10 px-3.5 rounded-full flex items-center gap-2 text-xs whitespace-nowrap"
              >
                <I className="w-3.5 h-3.5 text-primary" />
                <span className="font-medium">{t}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Indian meals gallery */}
      <section className="px-4 pb-8">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-lg font-semibold tracking-tight">Today's picks</h2>
          <span className="text-[11px] text-muted-foreground">Indian cuisine</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {FEATURED_MEALS.map((m) => (
            <div key={m.name} className="glass-mac overflow-hidden rounded-2xl">
              <div className="aspect-square overflow-hidden">
                <img
                  src={m.img}
                  alt={m.name}
                  loading="lazy"
                  width={768}
                  height={768}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-[13px] font-semibold truncate">{m.name}</h3>
                  <span className="text-[11px] font-semibold tabular-nums text-primary">{m.kcal} kcal</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{m.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features — macOS list */}
      <section className="px-4 pb-8">

        <div className="glass-mac divide-y divide-white/10 dark:divide-white/10 overflow-hidden">
          {[
            {
              i: Camera,
              t: "AI Food Scan",
              d: "Snap your plate. Calories & macros in 2s.",
              color: "var(--glow)",
            },
            {
              i: Mic,
              t: "Voice Logging",
              d: "'2 rotis and dal' — done.",
              color: "var(--glow-2)",
            },
            {
              i: Dumbbell,
              t: "Smart Gym Reminders",
              d: "Nudges that respect your schedule.",
              color: "var(--glow-3)",
            },
            {
              i: ShieldCheck,
              t: "Privacy You Control",
              d: "Local-first. One-tap deletion.",
              color: "var(--glow-4)",
            },
          ].map(({ i: I, t, d, color }) => (
            <div
              key={t}
              className="flex items-center gap-3 p-4 hover:bg-foreground/5 transition-colors"
            >
              <div
                className="w-10 h-10 rounded-xl grid place-items-center shrink-0"
                style={{ background: `color-mix(in oklch, ${color} 22%, transparent)`, color }}
              >
                <I className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm">{t}</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{d}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          ))}
        </div>
      </section>

      {/* Emoji food rail */}
      <section className="pb-8">
        <div className="marquee-mask overflow-hidden">
          <div className="flex gap-3 w-max animate-marquee-slow">
            {[...Array(2)].flatMap((_, k) =>
              [
                "🥑",
                "🍳",
                "🥗",
                "🍗",
                "🍌",
                "🥪",
                "🍣",
                "☕",
                "🥣",
                "🍕",
                "🍎",
                "🥥",
                "🧀",
                "🥕",
                "🍇",
                "🍓",
                "🌮",
                "🍜",
              ].map((e, i) => (
                <div
                  key={`${k}-${i}`}
                  className="glass-chip w-12 h-12 rounded-2xl grid place-items-center text-2xl shrink-0"
                >
                  {e}
                </div>
              )),
            )}
          </div>
        </div>
      </section>

      {/* Pro card */}
      <section className="px-4 pb-10">
        <div className="glass-mac p-6 text-center relative overflow-hidden">
          <div className="absolute inset-0 -z-10 opacity-40">
            <div className="absolute inset-0 gradient-primary blur-2xl" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full glass-chip text-[10px] font-semibold uppercase tracking-wider mb-2">
            <Star className="w-3 h-3 text-[var(--glow-4)] fill-[var(--glow-4)]" /> Pro
          </div>
          <h3 className="font-display text-2xl font-semibold">Unlimited AI scans</h3>
          <p className="text-xs text-muted-foreground mt-1">₹399/mo · cancel anytime</p>
          <Link
            to="/subscription"
            className="mt-4 inline-flex h-11 px-6 items-center rounded-full gradient-primary text-primary-foreground text-sm font-semibold glow"
          >
            See plans
          </Link>
        </div>
      </section>

      <footer className="px-5 pb-10 text-center text-[11px] text-muted-foreground">
        © 2026 CalorieFlow AI ·{" "}
        <Link to="/settings" className="underline">
          Privacy
        </Link>
      </footer>
    </div>
  );
}
