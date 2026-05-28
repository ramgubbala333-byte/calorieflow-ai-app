import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export type AuthState = {
  user: User | null;
  session: Session | null;
  loading: boolean;
};

let cached: AuthState = { user: null, session: null, loading: true };
const listeners = new Set<(s: AuthState) => void>();

function emit(next: AuthState) {
  cached = next;
  listeners.forEach((l) => l(next));
}

let bootstrapped = false;
function bootstrap() {
  if (bootstrapped) return;
  bootstrapped = true;

  // Subscribe first so we never miss an event.
  supabase.auth.onAuthStateChange((_event, session) => {
    emit({ user: session?.user ?? null, session, loading: false });
  });

  // Then hydrate (also processes #access_token hash on OAuth callback).
  supabase.auth.getSession().then(({ data }) => {
    emit({ user: data.session?.user ?? null, session: data.session, loading: false });
  });
}

export function useAuth(): AuthState & {
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error?: string }>;
  signInWithGoogle: () => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
} {
  const [state, setState] = useState<AuthState>(cached);

  useEffect(() => {
    bootstrap();
    listeners.add(setState);
    setState(cached);
    return () => {
      listeners.delete(setState);
    };
  }, []);

  return {
    ...state,
    signIn: async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error?.message };
    },
    signUp: async (email, password, displayName) => {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
          data: displayName ? { display_name: displayName } : undefined,
        },
      });
      return { error: error?.message };
    },
    signInWithGoogle: async () => {
      const callbackUrl = typeof window !== "undefined"
        ? window.location.origin + "/auth/callback"
        : undefined;

      // Try Lovable auth first (works when deployed on lovable.app)
      try {
        const res = await lovable.auth.signInWithOAuth("google", {
          redirect_uri: callbackUrl,
        });
        if (!res.error) return {};
        // Lovable auth returned an error — fall through to Supabase direct
      } catch {
        // Lovable auth threw — fall through to Supabase direct
      }

      // Fallback: use Supabase OAuth directly (PKCE flow — redirects to /auth/callback?code=...)
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callbackUrl,
        },
      });
      if (error) return { error: error.message };
      return {}; // browser is redirecting
    },
    signOut: async () => {
      await supabase.auth.signOut();
    },
  };
}
