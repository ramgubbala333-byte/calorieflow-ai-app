import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Send, Sparkles, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { chatWithCoach, type CoachChatMessage } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { getProfile, getGoals, getMeals, useStore } from "@/lib/store";

export const Route = createFileRoute("/coach")({
  head: () => ({ meta: [{ title: "AI Coach · CalorieFlow AI" }] }),
  component: Coach,
});

const quickReplies = [
  "Plan today's meals",
  "Why am I plateauing?",
  "High-protein Indian snack",
  "Hit my protein goal",
];

type ChatTurn = { role: "user" | "assistant"; text: string };

const GREETING: ChatTurn = {
  role: "assistant",
  text: "Hey! I'm your CalorieFlow coach. Ask me about meals, macros, or your progress — I can see your goals and today's log. What would you like help with?",
};

function Coach() {
  const { user } = useAuth();
  const profile = useStore(() => getProfile());
  const goals = useStore(() => getGoals());
  const meals = useStore(() => getMeals());

  const [msgs, setMsgs] = useState<ChatTurn[]>([GREETING]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, sending]);

  const buildContext = () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayMeals = meals
      .filter((m) => m.loggedDate === todayStr || !m.loggedDate)
      .map((m) => ({
        name: m.name,
        calories: m.calories,
        protein: m.protein,
        carbs: m.carbs,
        fat: m.fat,
      }));
    return {
      profile: {
        name: profile.name,
        weightKg: profile.weightKg,
        heightCm: profile.heightCm,
        age: profile.age,
        activity: profile.activity,
        foodPreference: profile.foodPreference,
      },
      goals,
      todayMeals,
    };
  };

  const send = async (t: string) => {
    const message = t.trim();
    if (!message || sending) return;
    setText("");

    const history: CoachChatMessage[] = msgs
      .filter((m) => m !== GREETING)
      .map((m) => ({ role: m.role, content: m.text }));

    setMsgs((m) => [...m, { role: "user", text: message }]);
    setSending(true);
    try {
      const { reply } = await chatWithCoach({
        message,
        history,
        coachCtx: buildContext(),
        userId: user?.id,
      });
      setMsgs((m) => [...m, { role: "assistant", text: reply }]);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "The coach is unavailable right now. Please try again.";
      setMsgs((m) => [...m, { role: "assistant", text: msg }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <AppShell>
      <header className="sticky top-0 z-30 px-4 pt-[max(env(safe-area-inset-top),0.75rem)] pb-3 bg-background/60 backdrop-blur-xl border-b border-border flex items-center gap-3">
        <div className="w-11 h-11 rounded-full gradient-primary grid place-items-center glow">
          <Sparkles className="w-5 h-5 text-primary-foreground" />
        </div>
        <div className="flex-1">
          <h1 className="text-base font-semibold leading-tight">CalorieFlow Coach</h1>
          <p className="text-[11px] text-accent flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" /> Online · private
          </p>
        </div>
      </header>

      <div ref={scrollRef} className="px-4 py-5 space-y-3 overflow-y-auto">
        {msgs.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[78%] px-4 py-3 text-sm leading-relaxed rounded-2xl whitespace-pre-wrap ${
                m.role === "user"
                  ? "gradient-primary text-primary-foreground rounded-br-md"
                  : "glass rounded-bl-md"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex justify-start">
            <div className="glass rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Thinking…
            </div>
          </div>
        )}
      </div>

      {/* quick replies */}
      <div className="px-4 pb-3 flex gap-2 overflow-x-auto no-scrollbar">
        {quickReplies.map((q) => (
          <button
            key={q}
            onClick={() => send(q)}
            disabled={sending}
            className="shrink-0 glass rounded-full px-3 h-8 text-xs text-foreground/90 disabled:opacity-50"
          >
            {q}
          </button>
        ))}
      </div>

      {/* composer */}
      <div className="sticky bottom-28 px-4">
        <div className="glass-strong rounded-2xl p-2 flex items-center gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send(text)}
            placeholder="Ask your coach…"
            disabled={sending}
            className="flex-1 bg-transparent px-3 py-2 text-sm focus:outline-none placeholder:text-muted-foreground disabled:opacity-60"
          />
          <button
            onClick={() => send(text)}
            disabled={sending || !text.trim()}
            aria-label="Send"
            className="w-10 h-10 rounded-xl gradient-primary grid place-items-center text-primary-foreground glow disabled:opacity-50"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </AppShell>
  );
}
