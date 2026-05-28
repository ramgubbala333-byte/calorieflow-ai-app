import type { LucideIcon } from "lucide-react";

export function RingProgress({
  value,
  max,
  size = 180,
  stroke = 14,
  label,
  sub,
}: {
  value: number;
  max: number;
  size?: number;
  stroke?: number;
  label?: string;
  sub?: string;
}) {
  const pct = Math.min(1, Math.max(0, value / max));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--glow)" />
            <stop offset="100%" stopColor="var(--glow-2)" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="color-mix(in oklch, var(--foreground) 10%, transparent)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#ringGrad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 700ms ease" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="text-4xl font-bold leading-none font-display tabular-nums">{label}</div>
          {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
        </div>
      </div>
    </div>
  );
}

/**
 * Compact macro ring — colored arc with icon center, used in the Today macro cards
 * (Cal AI / Cronometer style).
 */
export function MiniRing({
  value,
  max,
  color,
  icon: Icon,
  size = 60,
  stroke = 6,
}: {
  value: number;
  max: number;
  color: string; // CSS color expression
  icon: LucideIcon;
  size?: number;
  stroke?: number;
}) {
  const pct = Math.min(1, Math.max(0, value / max));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="color-mix(in oklch, var(--foreground) 8%, transparent)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 700ms ease" }}
        />
      </svg>
      <div
        className="absolute inset-0 grid place-items-center"
        style={{ color }}
      >
        <Icon className="w-4 h-4" />
      </div>
    </div>
  );
}

export function MacroBar({
  label,
  value,
  goal,
  color = "primary",
}: {
  label: string;
  value: number;
  goal: number;
  color?: "primary" | "accent" | "warning";
}) {
  const pct = Math.min(100, Math.round((value / goal) * 100));
  const bg =
    color === "accent"
      ? "bg-accent"
      : color === "warning"
        ? "bg-[var(--warning)]"
        : "bg-primary";
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className="text-xs tabular-nums text-foreground/80">
          {Math.round(value)}<span className="text-muted-foreground">/{goal}g</span>
        </span>
      </div>
      <div className="h-2 rounded-full bg-foreground/5 overflow-hidden">
        <div className={`h-full ${bg} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
