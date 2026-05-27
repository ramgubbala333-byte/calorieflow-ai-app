import { Link, useLocation } from "@tanstack/react-router";
import { Home, BookOpen, Scan, TrendingUp, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  to: "/today" | "/diary" | "/scan" | "/progress" | "/coach";
  label: string;
  icon: typeof Home;
  center?: boolean;
};

const items: NavItem[] = [
  { to: "/today", label: "Today", icon: Home },
  { to: "/diary", label: "Diary", icon: BookOpen },
  { to: "/scan", label: "Scan", icon: Scan, center: true },
  { to: "/progress", label: "Progress", icon: TrendingUp },
  { to: "/coach", label: "Coach", icon: MessageCircle },
];

export function BottomNav() {
  const { pathname } = useLocation();
  return (
    <nav
      aria-label="Primary"
      className="fixed bottom-0 inset-x-0 z-40 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 px-3"
    >
      <div className="mx-auto max-w-md glass-strong rounded-3xl px-2 py-2 flex items-end justify-between relative">
        {items.map(({ to, label, icon: Icon, center }) => {
          const active = pathname === to || (to === "/today" && pathname === "/");
          if (center) {
            return (
              <Link
                key={to}
                to={to}
                aria-label={label}
                className="-mt-8 flex flex-col items-center justify-center"
              >
                <span className="relative w-16 h-16 rounded-full gradient-primary grid place-items-center animate-pulse-glow ring-2 ring-background">
                  <Icon className="w-7 h-7 text-primary-foreground" strokeWidth={2.4} />
                </span>
                <span className="mt-1 text-[10px] font-medium text-muted-foreground">{label}</span>
              </Link>
            );
          }
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex-1 flex flex-col items-center gap-1 py-2 rounded-2xl transition-colors",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="w-5 h-5" strokeWidth={active ? 2.4 : 2} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
