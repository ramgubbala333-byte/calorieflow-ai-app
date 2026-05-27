import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { Barcode as BarcodeIcon, Check, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { lookupBarcode } from "@/lib/api";
import { addMeal } from "@/lib/store";
import { toast } from "sonner";

export const Route = createFileRoute("/barcode")({
  head: () => ({ meta: [{ title: "Barcode Scan · CalorieFlow AI" }] }),
  component: Barcode,
});

type Product = { name: string; brand?: string; serving: string; kcal: number; p: number; c: number; f: number };

function Barcode() {
  const nav = useNavigate();
  const [phase, setPhase] = useState<"scanning" | "match" | "miss">("scanning");
  const [product, setProduct] = useState<Product | null>(null);
  const [servings, setServings] = useState(1);

  const run = async () => {
    setPhase("scanning");
    try {
      const p = await lookupBarcode("0123456789012");
      setProduct(p);
      setPhase("match");
    } catch {
      setPhase("miss");
    }
  };

  useEffect(() => {
    run();
  }, []);

  const log = () => {
    if (!product) return;
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
    addMeal({
      name: product.name,
      type: "Snack",
      time,
      calories: Math.round(product.kcal * servings),
      protein: Math.round(product.p * servings),
      carbs: Math.round(product.c * servings),
      fat: Math.round(product.f * servings),
      emoji: "🥛",
    });
    toast.success("Added to diary", { description: `${servings} × ${product.name}` });
    nav({ to: "/diary" });
  };

  return (
    <AppShell>
      <PageHeader title="Barcode Scan" subtitle="Align the code in the box" />

      <div className="px-4 pt-4 pb-32">
        <div className="relative aspect-square rounded-3xl glass-strong overflow-hidden grid place-items-center">
          <div
            className="absolute inset-0 opacity-60"
            style={{
              backgroundImage: "linear-gradient(135deg, oklch(0.22 0.03 250) 25%, transparent 25%, transparent 50%, oklch(0.22 0.03 250) 50%, oklch(0.22 0.03 250) 75%, transparent 75%)",
              backgroundSize: "12px 12px",
            }}
          />
          <div className="relative w-64 h-40 rounded-2xl border-2 border-primary/80 glow-strong">
            {phase === "scanning" && <div className="absolute inset-x-0 top-1/2 h-0.5 gradient-primary glow animate-pulse" />}
            <BarcodeIcon className="absolute inset-0 m-auto w-20 h-20 text-primary/30" />
          </div>
          <p className="absolute bottom-6 inset-x-0 text-center text-[11px] text-muted-foreground">
            {phase === "scanning" ? "Looking for barcode…" : phase === "match" ? "Match found ✓" : "No match"}
          </p>
        </div>

        {phase === "scanning" && (
          <div className="mt-5 glass-strong rounded-2xl p-5 flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
            <p className="text-sm">Searching product database…</p>
          </div>
        )}

        {phase === "miss" && (
          <div className="mt-5 glass-strong rounded-2xl p-5 text-center space-y-3">
            <p className="text-sm font-semibold">Product not found</p>
            <p className="text-xs text-muted-foreground">Add it manually or try scanning again.</p>
            <div className="flex gap-2 justify-center">
              <button onClick={run} className="h-10 px-4 rounded-full glass text-xs font-semibold">Retry</button>
              <button onClick={() => nav({ to: "/add-food" })} className="h-10 px-4 rounded-full gradient-primary text-primary-foreground text-xs font-semibold glow">
                Add manually
              </button>
            </div>
          </div>
        )}

        {phase === "match" && product && (
          <div className="mt-5 glass-strong rounded-2xl p-4">
            <p className="text-[11px] text-primary font-semibold mb-2 flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" /> Match found
            </p>
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl glass grid place-items-center text-3xl">🥛</div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm">{product.name}</h3>
                <p className="text-[11px] text-muted-foreground">{product.brand} · {product.serving}</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-4 gap-2 text-center">
              {[
                { l: "kcal", v: Math.round(product.kcal * servings) },
                { l: "Protein", v: `${Math.round(product.p * servings)}g` },
                { l: "Carbs", v: `${Math.round(product.c * servings)}g` },
                { l: "Fat", v: `${Math.round(product.f * servings)}g` },
              ].map((x) => (
                <div key={x.l} className="glass rounded-xl py-2">
                  <div className="text-sm font-semibold tabular-nums">{x.v}</div>
                  <div className="text-[10px] text-muted-foreground">{x.l}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between glass rounded-xl px-3 py-2">
              <span className="text-xs text-muted-foreground">Servings</span>
              <div className="flex items-center gap-3">
                <button onClick={() => setServings((s) => Math.max(1, s - 1))} className="w-7 h-7 rounded-full glass grid place-items-center">−</button>
                <span className="text-sm font-semibold tabular-nums w-6 text-center">{servings}</span>
                <button onClick={() => setServings((s) => s + 1)} className="w-7 h-7 rounded-full glass grid place-items-center">+</button>
              </div>
            </div>
            <button onClick={log} className="mt-3 w-full h-12 rounded-xl gradient-primary text-primary-foreground font-semibold glow">
              Add to diary
            </button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
