import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { Mic, Sparkles, Check, Loader2, Square, Keyboard } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { transcribeVoice, type SearchFood } from "@/lib/api";
import { addMeal } from "@/lib/store";
import { toast } from "sonner";

export const Route = createFileRoute("/voice")({
  head: () => ({ meta: [{ title: "Voice Logging · CalorieFlow AI" }] }),
  component: Voice,
});

const bars = Array.from({ length: 28 });

// Check for Web Speech API support
const hasSpeechAPI = typeof window !== "undefined" &&
  ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

type SpeechRecognitionType = typeof window extends { SpeechRecognition: infer T } ? T : never;

function Voice() {
  const nav = useNavigate();
  const [phase, setPhase] = useState<"idle" | "listening" | "processing" | "ready" | "error">("idle");
  const [transcript, setTranscript] = useState("");
  const [items, setItems] = useState<SearchFood[]>([]);
  const [textMode, setTextMode] = useState(!hasSpeechAPI);
  const [textInput, setTextInput] = useState("");
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
    };
  }, []);

  const processTranscript = async (text: string) => {
    setTranscript(text);
    setPhase("processing");
    try {
      const r = await transcribeVoice({ transcript: text });
      setTranscript(r.transcript || text);
      setItems(r.items);
      setPhase("ready");
    } catch {
      setPhase("error");
      toast.error("Couldn't parse that. Try again.");
    }
  };

  const startListening = () => {
    if (!hasSpeechAPI) {
      setTextMode(true);
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    const recognition = new SR() as InstanceType<SpeechRecognitionType>;
    recognitionRef.current = recognition;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (recognition as any).lang = "en-US";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (recognition as any).interimResults = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (recognition as any).maxAlternatives = 1;
    setPhase("listening");
    setItems([]);
    setTranscript("");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (recognition as any).onresult = (event: any) => {
      const text = event.results[0][0].transcript as string;
      processTranscript(text);
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (recognition as any).onerror = (event: any) => {
      if (event.error === "no-speech") {
        toast.error("No speech detected. Try again.");
      } else if (event.error === "not-allowed") {
        toast.error("Microphone permission denied.");
        setTextMode(true);
      } else {
        toast.error("Microphone error. Try text input instead.");
      }
      setPhase("idle");
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (recognition as any).onend = () => {
      if (phase === "listening") setPhase("idle");
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (recognition as any).start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setPhase("idle");
  };

  const submitText = () => {
    const text = textInput.trim();
    if (!text) return;
    setTextInput("");
    processTranscript(text);
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

  const reset = () => {
    setPhase("idle");
    setTranscript("");
    setItems([]);
  };

  const status =
    phase === "listening" ? "Listening… tap to stop" :
    phase === "processing" ? "Analysing…" :
    phase === "ready" ? "Done — review below" :
    phase === "error" ? "Couldn't process that" :
    textMode ? "Type what you ate" : "Tap the mic to start";

  return (
    <AppShell>
      <PageHeader title="Voice Logging" subtitle="Just say what you ate" />

      <div className="px-4 pt-6 pb-32 text-center">
        {/* mode toggle */}
        <div className="flex justify-center mb-6">
          <div className="glass rounded-full p-1 flex gap-1">
            <button
              onClick={() => { setTextMode(false); reset(); }}
              className={`flex items-center gap-1.5 px-3 h-8 rounded-full text-xs font-medium transition-colors ${!textMode ? "gradient-primary text-primary-foreground" : "text-muted-foreground"}`}
            >
              <Mic className="w-3 h-3" /> Voice
            </button>
            <button
              onClick={() => { setTextMode(true); reset(); }}
              className={`flex items-center gap-1.5 px-3 h-8 rounded-full text-xs font-medium transition-colors ${textMode ? "gradient-primary text-primary-foreground" : "text-muted-foreground"}`}
            >
              <Keyboard className="w-3 h-3" /> Text
            </button>
          </div>
        </div>

        {!textMode ? (
          <>
            <div className="relative mx-auto w-44 h-44 grid place-items-center">
              <div className={`absolute inset-0 rounded-full gradient-primary opacity-25 blur-2xl ${phase === "listening" ? "animate-pulse-glow" : ""}`} />
              <button
                onClick={phase === "listening" ? stopListening : phase === "idle" || phase === "error" || phase === "ready" ? startListening : undefined}
                aria-label={phase === "listening" ? "Stop recording" : "Start recording"}
                className="relative w-32 h-32 rounded-full gradient-primary grid place-items-center glow-strong"
              >
                {phase === "processing" ? <Loader2 className="w-12 h-12 text-primary-foreground animate-spin" />
                  : phase === "listening" ? <Square className="w-10 h-10 text-primary-foreground" />
                  : <Mic className="w-12 h-12 text-primary-foreground" />}
              </button>
            </div>

            <p className={`mt-6 text-sm font-medium ${phase === "error" ? "text-destructive" : "text-primary"}`}>{status}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {phase === "listening" ? "Speak clearly, then tap to stop" : "We process audio only when you tap"}
            </p>

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
          </>
        ) : (
          <div className="space-y-3">
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitText(); } }}
              placeholder="e.g. Two eggs, toast with butter, black coffee…"
              rows={4}
              className="w-full rounded-2xl glass p-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none text-left"
            />
            <button
              onClick={submitText}
              disabled={!textInput.trim() || phase === "processing"}
              className="w-full h-12 rounded-xl gradient-primary text-primary-foreground font-semibold glow disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {phase === "processing" ? <><Loader2 className="w-4 h-4 animate-spin" /> Analysing…</> : "Analyse food"}
            </button>
            <p className="text-xs text-muted-foreground">Describe exactly what you ate including portions when possible.</p>
          </div>
        )}

        {transcript && (
          <div className="mt-6 glass rounded-2xl px-4 py-3 text-left text-sm">
            <p className="text-[11px] text-muted-foreground mb-1">Understood as</p>
            <p className="leading-relaxed">"{transcript}"</p>
          </div>
        )}

        {phase === "error" && (
          <div className="mt-4 glass-strong rounded-2xl p-4 text-center">
            <p className="text-xs text-muted-foreground">Try describing the meal more simply.</p>
            <button onClick={reset} className="mt-2 h-10 px-4 rounded-full glass text-xs font-semibold">Retry</button>
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
