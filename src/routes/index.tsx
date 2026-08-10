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
type Role = "job_seeker" | "referrer";

function destinationFor(role: unknown) {
  return role === "referrer" ? "/referrer/inbox" : "/feed";
}

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signup");
  const [role, setRole] = useState<Role>("job_seeker");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        navigate({ to: destinationFor(data.session.user.user_metadata?.['role']), replace: true });
      }
    });
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (mode === "signup" && role === "job_seeker" && !isKelloggEmail(email)) {
      setError(DOMAIN_ERROR);
      return;
    }

    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error: err } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { role },
          },
        });
        if (err) throw err;
        if (!data.session) {
          setNotice("Check your inbox to confirm your account, then sign in.");
          return;
        }
        navigate({
          to: role === "referrer" ? "/referrer/profile" : "/preferences",
          replace: true,
        });
      } else {
        const { data, error: err } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (err) throw err;
        navigate({ to: destinationFor(data.user.user_metadata?.['role']), replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <header className="mx-auto flex w-full max-w-3xl items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <Network className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="font-kellogg text-sm font-bold leading-tight tracking-tight text-primary">
          Kellogg MBA
          <br />
          Network
        </span>
      </header>

      <div className="mx-auto mt-10 w-full max-w-sm">
        <p className="font-kellogg text-center text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          Kellogg cohort · private
        </p>
        <h1 className="mt-2 text-center font-kellogg text-3xl font-extrabold tracking-tight text-primary">
          Recruiting Copilot
        </h1>
        <p className="mt-3 text-center text-sm leading-relaxed text-muted-foreground">
          A platform that connects Kellogg alum to Kellogg MBAs looking for a job — Go
          WildCats!
        </p>


        {mode === "signup" && (
          <div className="mt-6 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setRole("job_seeker")}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                role === "job_seeker"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-input text-muted-foreground hover:bg-accent"
              }`}
            >
              I&apos;m job-hunting
            </button>
            <button
              type="button"
              onClick={() => setRole("referrer")}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                role === "referrer"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-input text-muted-foreground hover:bg-accent"
              }`}
            >
              I&apos;m an alum, willing to refer
            </button>
          </div>
        )}

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium text-foreground">
              {mode === "signup" && role === "referrer" ? "Personal email" : "Kellogg email"}
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={
                mode === "signup" && role === "referrer"
                  ? "you@example.com"
                  : "you@kellogg.northwestern.edu"
              }
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

        {mode === "signup" && role === "job_seeker" && (
          <p className="mt-8 text-xs leading-relaxed text-muted-foreground">
            Access is limited to{" "}
            <span className="text-foreground">@kellogg.northwestern.edu</span> addresses.
          </p>
        )}
        {mode === "signup" && role === "referrer" && (
          <p className="mt-8 text-xs leading-relaxed text-muted-foreground">
            Open to any Kellogg alum willing to field an occasional coffee chat or referral
            request — registering is a good-faith commitment, not a verified credential.
          </p>
        )}
      </div>
    </div>
  );
}
