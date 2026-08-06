import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { DOMAIN_ERROR, isKelloggEmail } from "@/lib/kellogg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Kellogg Recruiting Copilot — Cohort Job Search" },
      {
        name: "description",
        content:
          "A private job-search feed for Kellogg MBA graduates: shared priority signals, network application counts, and personal tracking.",
      },
      { property: "og:title", content: "Kellogg Recruiting Copilot" },
      {
        property: "og:description",
        content:
          "A private job-search feed for Kellogg MBA graduates recruiting together.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

type Mode = "signup" | "login";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/feed", replace: true });
    });
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (!isKelloggEmail(email)) {
      setError(DOMAIN_ERROR);
      return;
    }

    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error: err } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (err) throw err;
        if (!data.session) {
          setNotice("Check your Kellogg inbox to confirm your account, then sign in.");
          return;
        }
        navigate({ to: "/preferences", replace: true });
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (err) throw err;
        navigate({ to: "/feed", replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          Kellogg cohort · private
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
          Recruiting Copilot
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          One shared feed for ~30 Kellogg MBA grads job-hunting together. Signals are
          aggregate only — never names.
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium text-foreground">
              Kellogg email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@u.northwestern.edu"
              className="w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm text-foreground outline-none transition-shadow placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium text-foreground">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm text-foreground outline-none transition-shadow focus:ring-2 focus:ring-ring"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          {notice && (
            <p className="rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary">{notice}</p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            {busy ? "Working…" : mode === "signup" ? "Create account" : "Sign in"}
          </button>
        </form>

        <button
          onClick={() => {
            setMode(mode === "signup" ? "login" : "signup");
            setError(null);
            setNotice(null);
          }}
          className="mt-4 w-full text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          {mode === "signup" ? "Already have an account? Sign in" : "Need an account? Sign up"}
        </button>

        <p className="mt-8 text-xs leading-relaxed text-muted-foreground">
          Access is limited to <span className="text-foreground">@u.northwestern.edu</span> and{" "}
          <span className="text-foreground">@kelloggalumni.northwestern.edu</span> addresses.
        </p>
      </div>
    </div>
  );
}
