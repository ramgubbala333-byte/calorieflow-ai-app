import { Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  back = true,
  right,
}: {
  title: string;
  subtitle?: string;
  back?: boolean;
  right?: ReactNode;
}) {
  const router = useRouter();
  return (
    <header className="sticky top-0 z-30 px-4 pt-[max(env(safe-area-inset-top),0.75rem)] pb-3 bg-background/60 backdrop-blur-xl border-b border-border">
      <div className="flex items-center gap-3">
        {back ? (
          <button
            onClick={() => router.history.back()}
            aria-label="Back"
            className="w-10 h-10 rounded-full glass grid place-items-center text-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        ) : (
          <Link to="/today" aria-label="Home" className="w-10 h-10 rounded-full gradient-primary grid place-items-center text-primary-foreground font-bold">
            C
          </Link>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold leading-tight truncate">{title}</h1>
          {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
        </div>
        {right}
      </div>
    </header>
  );
}
