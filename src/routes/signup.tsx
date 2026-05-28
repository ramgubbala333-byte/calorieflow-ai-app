import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, Mail } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Create account · CalorieFlow AI" }] }),
  component: Signup,
});

function Signup() {
  const { user, loading, signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    // If auth resolves with a user (email confirmation disabled, or returning from email link)
    if (!loading && user) navigate({ to: "/onboarding" });
  }, [user, loading, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return toast.error("Password must be at least 6 characters.");
    setBusy(true);
    const { error } = await signUp(email, password, name);
    setBusy(false);
    if (error) {
      toast.error(error.includes("already") ? "An account with this email already exists." : error);
    } else {
      setConfirmed(true);
    }
  };

  const google = async () => {
    setGoogleBusy(true);
    const { error } = await signInWithGoogle();
    if (error) {
      setGoogleBusy(false);
      toast.error(error);
    }
    // if no error, browser redirects
  };

  if (confirmed) {
    return (
      <div className="min-h-screen grid place-items-center px-5 bg-background">
        <div className="w-full max-w-sm glass-strong rounded-3xl p-8 text-center">
          <div className="w-16 h-16 rounded-2xl gradient-primary grid place-items-center text-primary-foreground glow mx-auto">
            <Mail className="w-8 h-8" />
          </div>
          <h1 className="mt-5 text-2xl font-display font-semibold">Check your inbox</h1>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            We sent a confirmation link to <strong>{email}</strong>.<br />
            Click it to activate your account, then come back to sign in.
          </p>
          <Link
            to="/login"
            className="mt-6 block h-12 rounded-xl gradient-primary text-primary-foreground font-semibold grid place-items-center text-sm glow"
          >
            Go to sign in
          </Link>
          <button
            onClick={() => setConfirmed(false)}
            className="mt-3 text-xs text-muted-foreground underline"
          >
            Wrong email? Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid place-items-center px-5 bg-background">
      <div className="w-full max-w-sm glass-strong rounded-3xl p-6">
        <div className="w-14 h-14 rounded-2xl gradient-primary grid place-items-center text-primary-foreground font-bold text-lg glow mx-auto">CF</div>
        <h1 className="mt-4 text-2xl font-display font-semibold text-center">Create your account</h1>
        <p className="text-xs text-muted-foreground text-center mb-6">Snap, speak, scan — log meals in seconds.</p>

        <form onSubmit={submit} className="space-y-3">
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full h-11 px-4 rounded-xl glass text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full h-11 px-4 rounded-xl glass text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            type="password"
            required
            minLength={6}
            placeholder="Password (6+ chars)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full h-11 px-4 rounded-xl glass text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="submit"
            disabled={busy || googleBusy}
            className="w-full h-11 rounded-xl gradient-primary text-primary-foreground font-semibold text-sm glow inline-flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />} Create account
          </button>
        </form>

        <div className="my-4 flex items-center gap-3 text-[10px] text-muted-foreground">
          <div className="flex-1 h-px bg-border" /> OR <div className="flex-1 h-px bg-border" />
        </div>

        <button
          onClick={google}
          disabled={busy || googleBusy}
          className="w-full h-11 rounded-xl glass text-sm font-medium inline-flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {googleBusy
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <svg viewBox="0 0 24 24" className="w-4 h-4"><path fill="currentColor" d="M21.35 11.1H12v3.2h5.35c-.23 1.43-1.7 4.2-5.35 4.2-3.22 0-5.85-2.66-5.85-5.95s2.63-5.95 5.85-5.95c1.84 0 3.07.78 3.78 1.46l2.58-2.49C16.83 4.04 14.66 3 12 3 6.99 3 3 7 3 12s3.99 9 9 9c5.2 0 8.65-3.66 8.65-8.8 0-.6-.07-1.04-.15-1.5z"/></svg>}
          {googleBusy ? "Redirecting to Google…" : "Continue with Google"}
        </button>

        <p className="mt-5 text-center text-xs text-muted-foreground">
          Already have an account? <Link to="/login" className="text-primary font-medium">Sign in</Link>
        </p>
        <p className="mt-3 text-center text-[10px] text-muted-foreground">
          By continuing you agree to the <Link to="/terms" className="underline">Terms</Link> & <Link to="/privacy-policy" className="underline">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}
