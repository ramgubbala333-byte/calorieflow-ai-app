import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { Mic, Sparkles, Check, Loader2, Square } from "lucide-react";
import { useState } from "react";
import { transcribeVoice, type SearchFood } from "@/lib/api";
import { addMeal } from "@/lib/store";
import { toast } from "sonner";

export const Route = createFileRoute("/voice")({
  head: () => ({ meta: [{ title: "Voice Logging · CalorieFlow AI" }] }),
  component: Voice,
});

const bars = Array.from({ length: 28 });

function Voice() {
  const nav = useNavigate();
  const [phase, setPhase] = useState<"idle" | "listening" | "processing" | "ready" | "error">("idle");
  const [transcript, setTranscript] = useState("");
  const [items, setItems] = useState<SearchFood[]>([]);

  const start = async () => {
    setPhase("listening");
    // Simulate recording window.
    await new Promise((r) => setTimeout(r, 1200));
    setPhase("processing");
    try {
      const r = await transcribeVoice();
      setTranscript(r.transcript);
      setItems(r.items);
      setPhase("ready");
    } catch {
      setPhase("error");
    }
  };

  const total = items.reduce((a, i) => a + i.kcal, 0);

  const logAll = () => {
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
    items.forEach((i) =>
      addMeal({ name: i.name, type: "Breakfast", time, calories: i.kcal, protein: i.p, carbs: i.c, fat: i.f, emoji: "🍽️" }),
    );
    toast.success("Voice log saved", { description: `${items.length} items added` });
    nav({ to: "/diary" });
  };

  const status =
    phase === "listening" ? "Listening…" :
    phase === "processing" ? "Transcribing…" :
    phase === "ready" ? "Done — review below" :
    phase === "error" ? "Couldn't process audio" : "Tap the mic to start";

  return (
    <AppShell>
      <PageHeader title="Voice Logging" subtitle="Just say what you ate" />

      <div className="px-4 pt-6 pb-32 text-center">
        <div className="relative mx-auto w-44 h-44 grid place-items-center">
          <div className={`absolute inset-0 rounded-full gradient-primary opacity-25 blur-2xl ${phase === "listening" ? "animate-pulse-glow" : ""}`} />
          <button
            onClick={phase === "idle" || phase === "error" || phase === "ready" ? start : undefined}
            aria-label="Recording"
            className="relative w-32 h-32 rounded-full gradient-primary grid place-items-center glow-strong"
          >
            {phase === "processing" ? <Loader2 className="w-12 h-12 text-primary-foreground animate-spin" />
              : phase === "listening" ? <Square className="w-10 h-10 text-primary-foreground" />
              : <Mic className="w-12 h-12 text-primary-foreground" />}
          </button>
        </div>

        <p className={`mt-6 text-sm font-medium ${phase === "error" ? "text-destructive" : "text-primary"}`}>{status}</p>
        <p className="text-xs text-muted-foreground">{phase === "listening" ? "Tap to stop" : "We process audio only when you tap"}</p>

        {/* waveform */}
        <div className="mt-6 h-16 flex items-center justify-center gap-1">
          {bars.map((_, i) => {
            const h = 20 + Math.abs(Math.sin(i * 0.6) * 36);
            return (
              <span
                key={i}
                className="w-1 rounded-full gradient-primary"
                style={{
                  height: `${h}px`,
                  opacity: phase === "listening" ? 0.4 + (i % 5) * 0.12 : 0.2,
                  animation: phase === "listening" ? `pulse-glow 1.4s ${i * 0.05}s infinite` : undefined,
                }}
              />
            );
          })}
        </div>

        {transcript && (
          <div className="mt-6 glass rounded-2xl px-4 py-3 text-left text-sm">
            <p className="text-[11px] text-muted-foreground mb-1">Transcript</p>
            <p className="leading-relaxed">"{transcript}"</p>
          </div>
        )}

        {phase === "error" && (
          <div className="mt-4 glass-strong rounded-2xl p-4 text-center">
            <p className="text-xs text-muted-foreground">Try again in a quieter spot.</p>
            <button onClick={start} className="mt-2 h-10 px-4 rounded-full glass text-xs font-semibold">Retry</button>
          </div>
        )}

        {phase === "ready" && items.length > 0 && (
          <div className="mt-4 glass-strong rounded-2xl p-4 text-left">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-primary" />
              <p className="text-xs font-semibold">CalorieFlow understood</p>
            </div>
            {items.map((x) => (
              <div key={x.name} className="flex items-center gap-3 py-2">
                <div className="w-7 h-7 rounded-md gradient-primary grid place-items-center text-primary-foreground">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <span className="flex-1 text-sm">{x.name}</span>
                <span className="text-xs tabular-nums text-muted-foreground">{x.kcal} kcal</span>
              </div>
            ))}
            <button onClick={logAll} className="mt-3 w-full h-12 rounded-xl gradient-primary text-primary-foreground font-semibold glow">
              Log all ({total} kcal)
            </button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
