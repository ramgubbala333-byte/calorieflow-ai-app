import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { addMeal, getFavorites, getMeals, getTemplates, toggleFavorite, useStore } from "@/lib/store";
import { searchFoods, type SearchFood } from "@/lib/api";
import { EmptyState, LoadingState } from "@/components/EmptyState";
import { Search, Plus, Bookmark, Mic, Barcode, Camera, Star, Clock, Utensils, Wand2, X, Inbox } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/add-food")({
  head: () => ({ meta: [{ title: "Add Food · CalorieFlow AI" }] }),
  component: AddFood,
});

type Tab = "Results" | "Recent" | "Favorites" | "My Meals";

function emojiFor(name: string) {
  const n = name.toLowerCase();
  if (n.includes("chicken")) return "🍗";
  if (n.includes("rice")) return "🍚";
  if (n.includes("salad")) return "🥗";
  if (n.includes("egg")) return "🥚";
  if (n.includes("coffee") || n.includes("latte")) return "☕";
  if (n.includes("milk")) return "🥛";
  if (n.includes("yogurt")) return "🥣";
  if (n.includes("banana")) return "🍌";
  if (n.includes("salmon") || n.includes("fish")) return "🐟";
  if (n.includes("smoothie")) return "🥤";
  if (n.includes("oats") || n.includes("oat")) return "🥣";
  return "🍽️";
}

function AddFood() {
  const navigate = useNavigate();
  const favorites = useStore(() => getFavorites());
  const templates = useStore(() => getTemplates());
  const allMeals = useStore(() => getMeals());
  const [tab, setTab] = useState<Tab>("Results");
  const [q, setQ] = useState("");
  const [meal, setMeal] = useState<"Breakfast" | "Lunch" | "Dinner" | "Snack">("Lunch");
  const [creating, setCreating] = useState(false);
  const [results, setResults] = useState<SearchFood[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounced search
  useEffect(() => {
    if (tab !== "Results") return;
    let alive = true;
    setLoading(true);
    setError(null);
    const t = setTimeout(() => {
      searchFoods(q)
        .then((r) => {
          if (alive) setResults(r);
        })
        .catch(() => alive && setError("Couldn't load results. Check your connection."))
        .finally(() => alive && setLoading(false));
    }, 200);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [q, tab]);

  const recents: SearchFood[] = useMemo(() =>
    [...allMeals].reverse().slice(0, 8).map((m) => ({
      name: m.name,
      serving: "1 serving",
      kcal: m.calories,
      p: m.protein,
      c: m.carbs,
      f: m.fat,
    })),
    [allMeals],
  );

  const list: SearchFood[] = useMemo(() => {
    if (tab === "Recent") return recents;
    if (tab === "Favorites") return favorites;
    if (tab === "My Meals")
      return templates.flatMap((t) =>
        t.meals.map((m) => ({ name: m.name, serving: "1 serving", kcal: m.calories, p: m.protein, c: m.carbs, f: m.fat })),
      );
    return results;
  }, [tab, results, favorites, templates, recents]);

  const logFood = (f: SearchFood) => {
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
    addMeal({ name: f.name, type: meal, time, calories: f.kcal, protein: f.p, carbs: f.c, fat: f.f, emoji: emojiFor(f.name) });
    toast.success("Added", {
      description: `${f.name} → ${meal}`,
      action: { label: "Open diary", onClick: () => navigate({ to: "/diary" }) },
    });
  };

  // Custom food form state
  const [custom, setCustom] = useState({ name: "", serving: "", kcal: "", p: "", c: "", f: "" });

  const saveCustom = (alsoLog: boolean) => {
    if (!custom.name.trim() || !custom.kcal) {
      toast.error("Name and calories are required");
      return;
    }
    const food: SearchFood = {
      name: custom.name.trim(),
      serving: custom.serving || "1 serving",
      kcal: Number(custom.kcal) || 0,
      p: Number(custom.p) || 0,
      c: Number(custom.c) || 0,
      f: Number(custom.f) || 0,
    };
    toggleFavorite(food);
    if (alsoLog) logFood(food);
    else toast.success("Saved to favorites");
    setCustom({ name: "", serving: "", kcal: "", p: "", c: "", f: "" });
    setCreating(false);
  };

  return (
    <AppShell>
      <PageHeader title="Add Food" subtitle="Always free, always fast" />

      <div className="px-4 pt-4 pb-32">
        {/* Meal selector */}
        <div className="flex items-center gap-2 mb-3 text-xs">
          <span className="text-muted-foreground">Logging to</span>
          <div className="flex gap-1 ml-auto">
            {(["Breakfast", "Lunch", "Snack", "Dinner"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMeal(m)}
                className={`px-2.5 h-7 rounded-full text-[11px] font-medium ${
                  meal === m ? "gradient-primary text-primary-foreground" : "glass text-muted-foreground"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <label className="relative block">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search foods, brands, recipes…"
            className="w-full h-14 pl-11 pr-11 rounded-2xl glass text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {q && (
            <button onClick={() => setQ("")} className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 grid place-items-center rounded-full glass" aria-label="Clear">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </label>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <button onClick={() => navigate({ to: "/scan" })} className="glass rounded-2xl py-3 flex flex-col items-center gap-1.5 text-xs">
            <Camera className="w-4 h-4 text-primary" /> AI Scan
          </button>
          <button onClick={() => navigate({ to: "/voice" })} className="glass rounded-2xl py-3 flex flex-col items-center gap-1.5 text-xs">
            <Mic className="w-4 h-4 text-primary" /> Voice
          </button>
          <button onClick={() => navigate({ to: "/barcode" })} className="glass rounded-2xl py-3 flex flex-col items-center gap-1.5 text-xs">
            <Barcode className="w-4 h-4 text-primary" /> Barcode
          </button>
        </div>

        {/* tabs */}
        <div className="mt-5 flex gap-2 text-xs font-medium overflow-x-auto no-scrollbar">
          {(["Results", "Recent", "Favorites", "My Meals"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`shrink-0 px-3 h-8 inline-flex items-center gap-1.5 rounded-full ${
                tab === t ? "gradient-primary text-primary-foreground" : "glass text-muted-foreground"
              }`}
            >
              {t === "Recent" && <Clock className="w-3 h-3" />}
              {t === "Favorites" && <Star className="w-3 h-3" />}
              {t === "My Meals" && <Utensils className="w-3 h-3" />}
              {t === "Results" && <Wand2 className="w-3 h-3" />}
              {t}
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-2">
          {tab === "Results" && loading ? (
            <LoadingState label="Searching foods…" />
          ) : tab === "Results" && error ? (
            <div className="glass rounded-2xl p-6 text-center space-y-3">
              <p className="text-sm font-semibold text-destructive">{error}</p>
              <button onClick={() => setQ((s) => s)} className="h-10 px-4 rounded-full glass text-xs font-semibold">
                Retry
              </button>
            </div>
          ) : list.length === 0 ? (
            <EmptyState
              icon={tab === "Favorites" ? Star : tab === "My Meals" ? Utensils : Inbox}
              title={
                tab === "Favorites"
                  ? "No favorites yet"
                  : tab === "My Meals"
                    ? "No saved recipes yet"
                    : "No matches"
              }
              description={
                tab === "Favorites"
                  ? "Tap the bookmark icon on any food to save it for one-tap logging."
                  : tab === "My Meals"
                    ? "Save any meal as a template from the diary to build your library."
                    : "Try a different search or create a custom food below."
              }
            />
          ) : (
            list.map((f) => (
              <div key={f.name} className="glass rounded-2xl p-3.5 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{f.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {f.serving} · <span className="tabular-nums">{f.kcal}</span> kcal · P{f.p} C{f.c} F{f.f}
                  </p>
                </div>
                <button
                  onClick={() => {
                    const added = toggleFavorite(f);
                    toast.success(added ? "Saved to favorites" : "Removed from favorites");
                  }}
                  aria-label="Favorite"
                  className="w-9 h-9 grid place-items-center rounded-full glass"
                >
                  <Bookmark className={`w-4 h-4 ${favorites.some((x) => x.name === f.name) ? "text-primary fill-primary" : "text-muted-foreground"}`} />
                </button>
                <button
                  onClick={() => logFood(f)}
                  aria-label="Add"
                  className="w-9 h-9 grid place-items-center rounded-full gradient-primary text-primary-foreground glow"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Create custom */}
        <button
          onClick={() => setCreating((v) => !v)}
          className="mt-5 w-full h-12 rounded-2xl glass text-sm font-medium inline-flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4 text-primary" /> {creating ? "Hide custom food" : "Create custom food"}
        </button>

        {creating && (
          <div className="mt-3 glass-strong rounded-2xl p-4 animate-fade-up">
            <p className="text-xs font-semibold mb-3">New custom food</p>
            <div className="grid grid-cols-2 gap-2">
              <input value={custom.name} onChange={(e) => setCustom({ ...custom, name: e.target.value })} placeholder="Name" className="h-11 px-3 rounded-xl glass text-sm focus:outline-none focus:ring-2 focus:ring-ring col-span-2" />
              <input value={custom.serving} onChange={(e) => setCustom({ ...custom, serving: e.target.value })} placeholder="Serving (e.g. 100g)" className="h-11 px-3 rounded-xl glass text-sm focus:outline-none focus:ring-2 focus:ring-ring col-span-2" />
              <input value={custom.kcal} onChange={(e) => setCustom({ ...custom, kcal: e.target.value })} placeholder="Calories" inputMode="numeric" className="h-11 px-3 rounded-xl glass text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              <input value={custom.p} onChange={(e) => setCustom({ ...custom, p: e.target.value })} placeholder="Protein g" inputMode="numeric" className="h-11 px-3 rounded-xl glass text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              <input value={custom.c} onChange={(e) => setCustom({ ...custom, c: e.target.value })} placeholder="Carbs g" inputMode="numeric" className="h-11 px-3 rounded-xl glass text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              <input value={custom.f} onChange={(e) => setCustom({ ...custom, f: e.target.value })} placeholder="Fat g" inputMode="numeric" className="h-11 px-3 rounded-xl glass text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={() => saveCustom(false)} className="flex-1 h-12 rounded-xl glass text-sm font-medium">Save only</button>
              <button onClick={() => saveCustom(true)} className="flex-1 h-12 rounded-xl gradient-primary text-primary-foreground font-semibold glow">Save & log</button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
