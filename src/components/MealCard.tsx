import { Pencil, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import type { Meal } from "@/lib/mock-data";

export function MealCard({ meal }: { meal: Meal }) {
  const [dx, setDx] = useState(0);
  const startX = useRef<number | null>(null);

  const onStart = (x: number) => (startX.current = x);
  const onMove = (x: number) => {
    if (startX.current == null) return;
    const d = Math.max(-120, Math.min(0, x - startX.current));
    setDx(d);
  };
  const onEnd = () => {
    setDx(dx < -60 ? -110 : 0);
    startX.current = null;
  };

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* swipe actions */}
      <div className="absolute inset-y-0 right-0 flex items-center gap-2 pr-3">
        <button className="w-12 h-12 rounded-xl glass grid place-items-center text-primary" aria-label="Edit">
          <Pencil className="w-4 h-4" />
        </button>
        <button className="w-12 h-12 rounded-xl bg-destructive/90 grid place-items-center text-destructive-foreground" aria-label="Delete">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div
        className="glass rounded-2xl p-4 flex items-center gap-3 select-none touch-pan-y"
        style={{ transform: `translateX(${dx}px)`, transition: startX.current == null ? "transform 250ms ease" : "none" }}
        onTouchStart={(e) => onStart(e.touches[0].clientX)}
        onTouchMove={(e) => onMove(e.touches[0].clientX)}
        onTouchEnd={onEnd}
        onMouseDown={(e) => onStart(e.clientX)}
        onMouseMove={(e) => e.buttons === 1 && onMove(e.clientX)}
        onMouseUp={onEnd}
        onMouseLeave={onEnd}
      >
        <div className="w-12 h-12 rounded-xl glass-strong grid place-items-center text-2xl shrink-0">
          {meal.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="font-semibold text-sm truncate">{meal.name}</h3>
            <span className="text-[11px] text-muted-foreground tabular-nums">{meal.time}</span>
          </div>
          <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
            <span><b className="text-foreground tabular-nums">{meal.calories}</b> kcal</span>
            <span className="text-primary tabular-nums">P {meal.protein}g</span>
            <span className="text-accent tabular-nums">C {meal.carbs}g</span>
            <span className="text-[var(--warning)] tabular-nums">F {meal.fat}g</span>
          </div>
        </div>
      </div>
    </div>
  );
}
