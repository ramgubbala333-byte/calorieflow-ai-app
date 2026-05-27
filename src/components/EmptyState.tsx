import type { LucideIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function EmptyState({
  icon: Icon,
  title,
  description,
  ctaLabel,
  ctaTo,
  onCta,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  ctaLabel?: string;
  ctaTo?: string;
  onCta?: () => void;
}) {
  return (
    <div className="glass rounded-2xl p-8 text-center flex flex-col items-center gap-3">
      <div className="w-14 h-14 rounded-2xl gradient-primary grid place-items-center glow">
        <Icon className="w-6 h-6 text-primary-foreground" />
      </div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="text-xs text-muted-foreground max-w-[24ch] leading-relaxed">{description}</p>
      {ctaLabel && ctaTo ? (
        <Link
          to={ctaTo}
          className="mt-1 inline-flex items-center justify-center h-10 px-4 rounded-full gradient-primary text-primary-foreground text-xs font-semibold glow"
        >
          {ctaLabel}
        </Link>
      ) : ctaLabel && onCta ? (
        <button
          onClick={onCta}
          className="mt-1 inline-flex items-center justify-center h-10 px-4 rounded-full gradient-primary text-primary-foreground text-xs font-semibold glow"
        >
          {ctaLabel}
        </button>
      ) : null}
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="glass rounded-2xl p-3.5 flex items-center gap-3 animate-pulse">
      <div className="w-11 h-11 rounded-xl bg-white/5" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-white/10 rounded w-2/3" />
        <div className="h-2.5 bg-white/5 rounded w-1/2" />
      </div>
    </div>
  );
}

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="space-y-2.5" aria-busy="true" aria-label={label}>
      <SkeletonRow />
      <SkeletonRow />
      <SkeletonRow />
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  description = "Please check your connection and try again.",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="glass rounded-2xl p-6 text-center space-y-3">
      <p className="text-sm font-semibold">{title}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center justify-center h-10 px-4 rounded-full glass text-xs font-semibold"
        >
          Retry
        </button>
      )}
    </div>
  );
}
