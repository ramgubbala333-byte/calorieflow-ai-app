import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowRight, Check, ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Get started · CalorieFlow AI" }] }),
  component: Onboarding,
});

type Step =
  | { kind: "choice"; key: string; q: string; sub?: string; opts: string[] }
  | { kind: "number"; key: string; q: string; sub?: string; unit: string; placeholder: string };

const steps: Step[] = [
  { kind: "choice", key: "goal", q: "What's your goal?", sub: "We'll tune your daily targets.", opts: ["Lose fat", "Build muscle", "Maintain", "Eat healthier"] },
  { kind: "number", key: "age", q: "How old are you?", unit: "years", placeholder: "28" },
  { kind: "number", key: "height", q: "What's your height?", unit: "cm", placeholder: "178" },
  { kind: "number", key: "weight", q: "Current weight?", unit: "kg", placeholder: "78" },
  { kind: "choice", key: "activity", q: "Daily activity level", opts: ["Sedentary", "Lightly active", "Active", "Very active"] },
  { kind: "number", key: "protein", q: "Protein goal", sub: "Most lifters: 1.6–2.2 g per kg.", unit: "g / day", placeholder: "165" },
  { kind: "choice", key: "gym", q: "Gym schedule", opts: ["1–2× / week", "3–4× / week", "5–6× / week", "Daily"] },
  { kind: "choice", key: "food", q: "Food preference", opts: ["Omnivore", "Vegetarian", "Vegan", "Pescatarian"] },
];

function Onboarding() {
  const total = steps.length;
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const done = step >= total;

  const current = !done ? steps[step] : null;

  const canAdvance = useMemo(() => {
    if (!current) return false;
    const v = answers[current.key];
    return Boolean(v && v.trim().length > 0);
  }, [current, answers]);

  const setVal = (k: string, v: string) => setAnswers((a) => ({ ...a, [k]: v }));
  const next = () => setStep((s) => s + 1);
  const back = () => setStep((s) => Math.max(0, s - 1));

  const selectChoice = (k: string, v: string) => {
    setVal(k, v);
    setTimeout(next, 200);
  };

  return (
    <div className="mx-auto max-w-md min-h-screen px-5 pt-[max(env(safe-area-inset-top),1.5rem)] pb-[max(env(safe-area-inset-bottom),1rem)] flex flex-col">
      {/* progress */}
      <div className="flex items-center gap-3 mb-6">
        {step > 0 && !done && (
          <button onClick={back} aria-label="Back" className="w-9 h-9 grid place-items-center rounded-full glass">
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
        <div className="flex-1 flex gap-1.5">
          {Array.from({ length: total }).map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full ${i <= Math.min(step, total - 1) ? "gradient-primary" : "bg-white/8"}`} />
          ))}
        </div>
      </div>

      {!done && current ? (
        <div className="flex-1 animate-fade-up" key={step}>
          <p className="text-xs text-muted-foreground">Step {step + 1} of {total}</p>
          <h1 className="mt-2 text-3xl font-display font-semibold leading-tight">{current.q}</h1>
          {current.sub && <p className="mt-2 text-sm text-muted-foreground">{current.sub}</p>}

          {current.kind === "choice" ? (
            <div className="mt-8 space-y-3">
              {current.opts.map((opt) => {
                const active = answers[current.key] === opt;
                return (
                  <button
                    key={opt}
                    onClick={() => selectChoice(current.key, opt)}
                    className={`w-full text-left px-5 h-16 rounded-2xl flex items-center justify-between font-medium transition-all ${
                      active ? "ring-glow gradient-primary text-primary-foreground" : "glass hover:border-primary/40"
                    }`}
                  >
                    <span>{opt}</span>
                    {active && <Check className="w-5 h-5" />}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="mt-8">
              <div className="glass-strong rounded-2xl p-5 flex items-baseline gap-3">
                <input
                  autoFocus
                  inputMode="decimal"
                  placeholder={current.placeholder}
                  value={answers[current.key] ?? ""}
                  onChange={(e) => setVal(current.key, e.target.value.replace(/[^0-9.]/g, ""))}
                  className="flex-1 bg-transparent text-5xl font-display font-semibold tabular-nums focus:outline-none placeholder:text-muted-foreground/40"
                />
                <span className="text-sm text-muted-foreground">{current.unit}</span>
              </div>
              <button
                disabled={!canAdvance}
                onClick={next}
                className={`mt-6 w-full h-14 rounded-2xl font-semibold inline-flex items-center justify-center gap-2 ${
                  canAdvance ? "gradient-primary text-primary-foreground glow" : "glass text-muted-foreground"
                }`}
              >
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 grid place-items-center text-center animate-fade-up">
          <div>
            <div className="w-20 h-20 mx-auto rounded-full gradient-primary grid place-items-center glow-strong">
              <Check className="w-10 h-10 text-primary-foreground" />
            </div>
            <h2 className="mt-6 text-3xl font-display font-semibold">You're all set</h2>
            <p className="mt-3 text-sm text-muted-foreground max-w-xs mx-auto">
              We tuned your daily target to <b className="text-foreground">2,200 kcal</b> and{" "}
              <b className="text-foreground">{answers.protein || 165}g protein</b>.
            </p>
            <Link
              to="/today"
              className="mt-8 inline-flex items-center gap-2 h-14 px-8 rounded-2xl gradient-primary text-primary-foreground font-semibold glow-strong"
            >
              Open dashboard <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
