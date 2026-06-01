import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { toast } from "sonner";
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

/**
 * Read the result of an OAuth redirect out of the current URL.
 *
 * The Lovable Cloud auth library has two flows: inside an iframe it uses a
 * popup + postMessage and calls `setSession` directly, but in a normal browser
 * tab it does a full-page redirect to the broker. On the way back the broker
 * hands the Supabase tokens to us in the URL (hash for the implicit response,
 * query string as a fallback) — and unlike the popup path, nothing reads them
 * back. We parse them here so the redirect flow can finish signing in.
 */
type UrlOAuthResult =
  | { kind: "tokens"; access_token: string; refresh_token: string }
  | { kind: "error"; message: string }
  | null;

function readOAuthFromUrl(): UrlOAuthResult {
  if (typeof window === "undefined") return null;
  try {
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const queryParams = new URLSearchParams(window.location.search);
    const pick = (key: string) => hashParams.get(key) ?? queryParams.get(key);

    const errorDescription = pick("error_description") ?? pick("error");
    if (errorDescription) return { kind: "error", message: decodeURIComponent(errorDescription) };

    const access_token = pick("access_token");
    const refresh_token = pick("refresh_token");
    if (access_token && refresh_token) return { kind: "tokens", access_token, refresh_token };
  } catch (e) {
    console.warn("[auth] failed to parse OAuth params from URL", e);
  }
  return null;
}

/** Strip OAuth tokens/errors from the URL so they aren't left in history or re-read. */
function cleanOAuthFromUrl() {
  if (typeof window === "undefined") return;
  try {
    const url = new URL(window.location.href);
    url.hash = "";
    [
      "access_token", "refresh_token", "expires_in", "expires_at", "token_type",
      "provider_token", "provider_refresh_token", "code", "state",
      "error", "error_description", "error_code",
    ].forEach((k) => url.searchParams.delete(k));
    window.history.replaceState(window.history.state, "", url.pathname + url.search);
  } catch (e) {
    console.warn("[auth] failed to clean OAuth params from URL", e);
  }
}

let bootstrapped = false;
function bootstrap() {
  if (bootstrapped) return;
  bootstrapped = true;

  // Read this BEFORE touching the supabase client: instantiating it can trigger
  // detectSessionInUrl, which may wipe the hash before we capture the tokens.
  const urlOAuth = readOAuthFromUrl();

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

  // Just came back from the OAuth provider with an error — surface it and stop.
  if (urlOAuth?.kind === "error") {
    console.warn("[auth] OAuth redirect returned an error", urlOAuth.message);
    cleanOAuthFromUrl();
    try {
      toast.error(urlOAuth.message || "Google sign-in was cancelled or failed. Please try again.");
    } catch {
      /* toaster not mounted */
    }
    emit({ user: null, session: null, loading: false });
    return;
  }

  // Came back with tokens — finish the sign-in the same way the popup flow does.
  if (urlOAuth?.kind === "tokens") {
    supabase.auth
      .setSession({ access_token: urlOAuth.access_token, refresh_token: urlOAuth.refresh_token })
      .then(({ data, error }) => {
        cleanOAuthFromUrl();
        if (error) {
          console.error("[auth] setSession from OAuth redirect failed", error);
          try {
            toast.error("Couldn't complete Google sign-in. Please try again.");
          } catch {
            /* toaster not mounted */
          }
          emit({ user: null, session: null, loading: false });
          return;
        }
        captureIdentity(data.session?.user ?? null);
        emit({ user: data.session?.user ?? null, session: data.session, loading: false });
      })
      .catch((e) => {
        cleanOAuthFromUrl();
        console.error("[auth] setSession from OAuth redirect threw", e);
        try {
          toast.error("Couldn't complete Google sign-in. Please try again.");
        } catch {
          /* toaster not mounted */
        }
        emit({ user: null, session: null, loading: false });
      });
    // setSession populates state (and fires onAuthStateChange); skip getSession
    // below to avoid racing it against the token exchange.
    return;
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
      }
      // Force-clear state and storage regardless of network result so the UI
      // reflects the sign-out even if onAuthStateChange didn't fire.
      clearStaleAuthStorage();
      emit({ user: null, session: null, loading: false });
      if (typeof window !== "undefined") {
        window.location.replace("/");
      }
    },
  };
}
