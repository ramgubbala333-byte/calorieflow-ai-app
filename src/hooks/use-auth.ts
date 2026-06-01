import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { mergeIdentity } from "@/lib/store";

export type AuthState = {
  user: User | null;
  session: Session | null;
  loading: boolean;
};

/**
 * Pull display name / email / avatar out of the Supabase user object. Google,
 * email-password, and other providers store these under different metadata
 * keys, so we check all the common ones.
 */
function captureIdentity(user: User | null) {
  if (!user) return;
  const m = (user.user_metadata ?? {}) as Record<string, unknown>;
  const name =
    (m.full_name as string) ?? (m.name as string) ?? (m.display_name as string) ?? undefined;
  const avatarUrl = (m.avatar_url as string) ?? (m.picture as string) ?? undefined;
  const email = user.email ?? (m.email as string) ?? undefined;
  try {
    mergeIdentity({ name, email, avatarUrl });
  } catch {
    /* localStorage unavailable */
  }
}

let cached: AuthState = { user: null, session: null, loading: true };
const listeners = new Set<(s: AuthState) => void>();

function emit(next: AuthState) {
  cached = next;
  listeners.forEach((l) => l(next));
}

function clearStaleAuthStorage() {
  if (typeof localStorage === "undefined") return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith("sb-") || k.startsWith("supabase."))) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* localStorage unavailable */
  }
}

let bootstrapped = false;
function bootstrap() {
  if (bootstrapped) return;
  bootstrapped = true;

  try {
    supabase.auth.onAuthStateChange((_event, session) => {
      try {
        captureIdentity(session?.user ?? null);
        emit({ user: session?.user ?? null, session, loading: false });
      } catch (e) {
        console.error("[auth] onAuthStateChange emit failed", e);
        emit({ user: null, session: null, loading: false });
      }
    });
  } catch (e) {
    console.error("[auth] subscribe failed", e);
  }

  try {
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) {
          console.warn("[auth] getSession returned error, clearing stale storage", error);
          clearStaleAuthStorage();
          emit({ user: null, session: null, loading: false });
          return;
        }
        captureIdentity(data.session?.user ?? null);
        emit({ user: data.session?.user ?? null, session: data.session, loading: false });
      })
      .catch((e) => {
        console.error("[auth] getSession threw, clearing stale storage", e);
        clearStaleAuthStorage();
        emit({ user: null, session: null, loading: false });
      });
  } catch (e) {
    console.error("[auth] getSession sync threw", e);
    emit({ user: null, session: null, loading: false });
  }
}

export function useAuth(): AuthState & {
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error?: string }>;
  signInWithGoogle: () => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
} {
  const [state, setState] = useState<AuthState>(cached);

  useEffect(() => {
    try {
      bootstrap();
    } catch (e) {
      console.error("[auth] bootstrap threw", e);
      emit({ user: null, session: null, loading: false });
    }
    listeners.add(setState);
    setState(cached);
    return () => {
      listeners.delete(setState);
    };
  }, []);

  return {
    ...state,
    signIn: async (email, password) => {
      try {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error: error?.message };
      } catch (e) {
        return { error: e instanceof Error ? e.message : "Sign in failed" };
      }
    },
    signUp: async (email, password, displayName) => {
      try {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
            data: displayName ? { display_name: displayName } : undefined,
          },
        });
        return { error: error?.message };
      } catch (e) {
        return { error: e instanceof Error ? e.message : "Sign up failed" };
      }
    },
    signInWithGoogle: async () => {
      try {
        const { lovable } = await import("@/integrations/lovable/index");
        const result = await lovable.auth.signInWithOAuth("google", {
          redirect_uri: typeof window !== "undefined" ? window.location.origin : undefined,
        });
        if (result.error) {
          const msg = result.error instanceof Error ? result.error.message : String(result.error);
          return { error: msg };
        }
        // Either redirected to Google or tokens received & session set.
        return {};
      } catch (e) {
        return { error: e instanceof Error ? e.message : "Google sign in failed" };
      }
    },

    signOut: async () => {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.error("[auth] signOut failed", e);
        clearStaleAuthStorage();
      }
    },
  };
}
