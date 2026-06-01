import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth-callback")({
  head: () => ({ meta: [{ title: "Signing in… · CalorieFlow AI" }] }),
  component: AuthCallback,
});

function AuthCallback() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      navigate({ to: user ? "/today" : "/login" });
    }
  }, [user, loading, navigate]);

  // Safety net: never leave the user stuck on the spinner if the code exchange
  // stalls (e.g. network hiccup). The auth bootstrap surfaces its own toast on
  // failure; this just gets them back to a usable screen.
  useEffect(() => {
    const t = setTimeout(() => {
      if (!user) navigate({ to: "/login" });
    }, 10000);
    return () => clearTimeout(t);
  }, [user, navigate]);

  return (
    <div className="min-h-screen grid place-items-center bg-background">
      <div className="text-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto" />
        <p className="mt-4 text-sm text-muted-foreground">Signing you in…</p>
      </div>
    </div>
  );
}
