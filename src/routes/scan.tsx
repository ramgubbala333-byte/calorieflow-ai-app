import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { Camera, ImageIcon, Sparkles, Zap, Check, Loader2, Pencil } from "lucide-react";
import { useState } from "react";
import { analyzeFoodImage, type SearchFood } from "@/lib/api";
import { addMeal } from "@/lib/store";
import { toast } from "sonner";

export const Route = createFileRoute("/scan")({
  head: () => ({ meta: [{ title: "AI Food Scan · CalorieFlow AI" }] }),
  component: Scan,
});

function emojiFor(n: string) {
  const s = n.toLowerCase();
  if (s.includes("chicken")) return "🍗";
  if (s.includes("rice")) return "🍚";
  if (s.includes("broccoli") || s.includes("greens")) return "🥦";
  return "🍽️";
}

function Scan() {
  const nav = useNavigate();
  const [phase, setPhase] = useState<"idle" | "scanning" | "results" | "error">("idle");
  const [items, setItems] = useState<SearchFood[]>([]);
  const [confidence, setConfidence] = useState(0);
  const [editing, setEditing] = useState<number | null>(null);

  const capture = async () => {
    setPhase("scanning");
    try {
      const r = await analyzeFoodImage();
      setItems(r.items);
      setConfidence(r.confidence);
      setPhase("results");
    } catch {
      setPhase("error");
    }
  };

  const total = items.reduce((a, i) => ({ k: a.k + i.kcal, p: a.p + i.p, c: a.c + i.c, f: a.f + i.f }), { k: 0, p: 0, c: 0, f: 0 });

  const logAll = () => {
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
    items.forEach((i) =>
      addMeal({ name: i.name, type: "Lunch", time, calories: i.kcal, protein: i.p, carbs: i.c, fat: i.f, emoji: emojiFor(i.name) }),
    );
    toast.success("Scan logged", { description: `${items.length} items added` });
    nav({ to: "/diary" });
  };

  return (
    <AppShell>
      <PageHeader title="AI Food Scan" subtitle="Point your camera at the plate" />

      <div className="px-4 pt-4 pb-32">
        {/* viewfinder */}
        <div className="relative aspect-[3/4] rounded-3xl overflow-hidden glass-strong">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(circle at 35% 40%, oklch(0.74 0.18 155 / 0.25), transparent 55%), radial-gradient(circle at 70% 70%, oklch(0.78 0.18 200 / 0.3), transparent 55%)",
            }}
          />
          {["top-6 left-6 border-t-2 border-l-2 rounded-tl-2xl", "top-6 right-6 border-t-2 border-r-2 rounded-tr-2xl", "bottom-6 left-6 border-b-2 border-l-2 rounded-bl-2xl", "bottom-6 right-6 border-b-2 border-r-2 rounded-br-2xl"].map((c) => (
            <div key={c} className={`absolute w-12 h-12 border-primary/80 ${c}`} />
          ))}
          {phase === "scanning" && (
            <div className="absolute inset-x-10 top-1/2 h-px gradient-primary glow animate-pulse" />
          )}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[11px] text-muted-foreground bg-background/40 backdrop-blur px-3 py-1.5 rounded-full">
            {phase === "scanning" ? "Analyzing…" : phase === "results" ? "Scan complete" : "Center the plate"}
          </div>
        </div>

        {/* States */}
        {phase === "scanning" && (
          <div className="mt-5 glass-strong rounded-2xl p-6 flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
            <p className="text-sm font-semibold">Analyzing your plate</p>
            <p className="text-xs text-muted-foreground">Detecting foods, estimating portions…</p>
          </div>
        )}

        {phase === "error" && (
          <div className="mt-5 glass-strong rounded-2xl p-6 text-center space-y-3">
            <p className="text-sm font-semibold">Scan failed</p>
            <p className="text-xs text-muted-foreground">Try better lighting or move closer to the plate.</p>
            <button onClick={capture} className="h-10 px-4 rounded-full glass text-xs font-semibold">Try again</button>
          </div>
        )}

        {phase === "results" && (
          <div className="mt-5 glass-strong rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-primary" />
              <p className="text-xs font-semibold">AI detected · {Math.round(confidence * 100)}% confidence</p>
            </div>
            <div className="space-y-2">
              {items.map((d, i) => (
                <div key={d.name} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg gradient-primary grid place-items-center text-primary-foreground">
                    <Check className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {editing === i ? (
                      <input
                        autoFocus
                        defaultValue={d.name}
                        onBlur={(e) => {
                          setItems((arr) => arr.map((x, idx) => (idx === i ? { ...x, name: e.target.value } : x)));
                          setEditing(null);
                        }}
                        className="w-full bg-transparent text-sm font-medium border-b border-primary/50 focus:outline-none"
                      />
                    ) : (
                      <p className="text-sm font-medium truncate">{d.name}</p>
                    )}
                    <p className="text-[11px] text-muted-foreground">{d.kcal} kcal · P{d.p} C{d.c} F{d.f}</p>
                  </div>
                  <button onClick={() => setEditing(i)} className="text-xs font-medium text-primary inline-flex items-center gap-1">
                    <Pencil className="w-3 h-3" /> Edit
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Total estimate</span>
              <span className="font-bold tabular-nums">{total.k} kcal · {total.p}P {total.c}C {total.f}F</span>
            </div>
            <button onClick={logAll} className="mt-3 w-full h-12 rounded-xl gradient-primary text-primary-foreground font-semibold glow">
              Log this meal
            </button>
          </div>
        )}

        {/* controls */}
        <div className="mt-5 flex items-center justify-around">
          <button onClick={() => toast("Gallery not available in preview")} className="flex flex-col items-center gap-1.5 text-xs text-muted-foreground">
            <span className="w-12 h-12 rounded-full glass grid place-items-center"><ImageIcon className="w-5 h-5" /></span>
            Gallery
          </button>
          <button
            onClick={capture}
            disabled={phase === "scanning"}
            aria-label="Capture"
            className="w-20 h-20 rounded-full gradient-primary grid place-items-center animate-pulse-glow ring-2 ring-background disabled:opacity-60"
          >
            {phase === "scanning" ? <Loader2 className="w-8 h-8 text-primary-foreground animate-spin" /> : <Camera className="w-8 h-8 text-primary-foreground" />}
          </button>
          <button onClick={() => toast("Flash toggled")} className="flex flex-col items-center gap-1.5 text-xs text-muted-foreground">
            <span className="w-12 h-12 rounded-full glass grid place-items-center"><Zap className="w-5 h-5" /></span>
            Flash
          </button>
        </div>
      </div>
    </AppShell>
  );
}
