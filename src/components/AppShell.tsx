import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";

export function AppShell({ children, hideNav = false }: { children: ReactNode; hideNav?: boolean }) {
  return (
    <div className="min-h-screen mx-auto max-w-md relative">
      <main className={hideNav ? "pb-8" : "pb-32"}>{children}</main>
      {!hideNav && <BottomNav />}
    </div>
  );
}
