import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { coachMessages } from "@/lib/mock-data";
import { Send, Sparkles, MoreHorizontal } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/coach")({
  head: () => ({ meta: [{ title: "AI Coach · CalorieFlow AI" }] }),
  component: Coach,
});

const quickReplies = [
  "Plan today's meals",
  "Why am I plateauing?",
  "Pre-workout snack idea",
  "Hit 165g protein",
];

function Coach() {
  const [msgs, setMsgs] = useState(coachMessages);
  const [text, setText] = useState("");

  const send = (t: string) => {
    if (!t.trim()) return;
    setMsgs((m) => [
      ...m,
      { role: "user", text: t },
      {
        role: "coach",
        text:
          "Got it. Based on your last 7 days, I'd add a Greek yogurt snack at 3pm and shift dinner protein to 45g.",
      },
    ]);
    setText("");
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
        <button className="w-9 h-9 rounded-full glass grid place-items-center">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </header>

      <div className="px-4 py-5 space-y-3">
        {msgs.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[78%] px-4 py-3 text-sm leading-relaxed rounded-2xl ${
                m.role === "user"
                  ? "gradient-primary text-primary-foreground rounded-br-md"
                  : "glass rounded-bl-md"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}

        {/* suggestion card from coach */}
        <div className="glass-strong rounded-2xl p-4 mt-2">
          <p className="text-[11px] text-primary font-semibold mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" /> Suggested meal
          </p>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl glass grid place-items-center text-2xl">🍣</div>
            <div className="flex-1">
              <p className="text-sm font-semibold">Salmon, jasmine rice, bok choy</p>
              <p className="text-[11px] text-muted-foreground">640 kcal · 42g protein · 10 min</p>
            </div>
            <button className="text-xs font-semibold px-3 py-1.5 rounded-full gradient-primary text-primary-foreground glow">
              Log
            </button>
          </div>
        </div>
      </div>

      {/* quick replies */}
      <div className="px-4 pb-3 flex gap-2 overflow-x-auto no-scrollbar">
        {quickReplies.map((q) => (
          <button
            key={q}
            onClick={() => send(q)}
            className="shrink-0 glass rounded-full px-3 h-8 text-xs text-foreground/90"
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
            className="flex-1 bg-transparent px-3 py-2 text-sm focus:outline-none placeholder:text-muted-foreground"
          />
          <button
            onClick={() => send(text)}
            aria-label="Send"
            className="w-10 h-10 rounded-xl gradient-primary grid place-items-center text-primary-foreground glow"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </AppShell>
  );
}
