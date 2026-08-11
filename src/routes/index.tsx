import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Linkedin, Network } from "lucide-react";
import { useEffect, useState } from "react";

import founderPhoto from "@/assets/gianfranco-photo.asset.json";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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

      <section className="mx-auto mt-14 w-full max-w-2xl pb-12">
        <h2 className="font-kellogg text-center text-lg font-bold tracking-tight text-primary">
          About
        </h2>
        <Accordion type="single" collapsible className="mt-4">
          <AccordionItem value="team">
            <AccordionTrigger className="font-kellogg text-sm font-semibold">
              About the team
            </AccordionTrigger>
            <AccordionContent>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <img
                  src={founderPhoto.url}
                  alt="Gianfranco Senaja, Kellogg MBA '26"
                  loading="lazy"
                  width={512}
                  height={512}
                  className="h-24 w-24 shrink-0 rounded-2xl object-cover"
                />
                <div className="space-y-2">
                  <p className="font-kellogg text-sm font-semibold text-foreground">
                    Gianfranco Senaja — Kellogg MBA &apos;26
                  </p>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Gianfranco is a Kellogg MBA graduate (Class of 2026) who built this tool
                    while recruiting alongside his own classmates. His background is in
                    commercial and product marketing roles across hardware and CPG, including
                    Samsung, Epson, and a PepsiCo bottler in Latin America. He built Career
                    Compass because he kept seeing the same problem in his own search: a strong
                    alumni network with no easy way to see where it actually mattered. His
                    focus is turning that network into a repeatable advantage for job seekers,
                    instead of a pile of cold outreach.
                  </p>
                  <a
                    href="https://www.linkedin.com/in/gianfranco-senaja/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
                  >
                    <Linkedin className="h-4 w-4" aria-hidden="true" />
                    Connect on LinkedIn
                  </a>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="platform">
            <AccordionTrigger className="font-kellogg text-sm font-semibold">
              About the platform
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
                <p className="font-kellogg text-sm font-semibold text-foreground">
                  About Kellogg Recruiting Copilot
                </p>
                <p>
                  Built by and for Kellogg MBAs, this turns the alumni network into a shared
                  job feed — surfacing the postings where your cohort already has a foothold,
                  without turning your search into a public spectacle.
                </p>
                <ol className="list-decimal space-y-2 pl-5">
                  <li>
                    <span className="text-foreground">Set your target.</span> Tell us the
                    function and level you&apos;re going after — that&apos;s the filter for
                    everything you see.
                  </li>
                  <li>
                    <span className="text-foreground">Get a feed built for you.</span> Fresh
                    postings show company, title, location, and days open, ranked by a
                    priority score.
                  </li>
                  <li>
                    <span className="text-foreground">Read the network signal.</span> Each
                    posting shows how many people in the cohort have applied and whether
                    alumni overlap exists at that company, in your function. Counts only —
                    never names.
                  </li>
                  <li>
                    <span className="text-foreground">Log as you go.</span> Tap &ldquo;I
                    applied&rdquo; to track your own pipeline and add your data point to the
                    cohort&apos;s picture.
                  </li>
                  <li>
                    <span className="text-foreground">See it all in one place.</span> Your
                    dashboard tracks everything you&apos;ve applied to and how your search is
                    moving.
                  </li>
                </ol>
                <p>
                  Access is limited to verified Kellogg emails
                  (@kellogg.northwestern.edu) — every signal you see comes from your own
                  cohort, not the open internet.
                </p>
                <p>
                  Privacy by default: your individual activity is never visible to anyone
                  else. Everyone sees the same aggregate counts. No names, no leaderboard, no
                  exposure.
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>
    </div>
  );
}
