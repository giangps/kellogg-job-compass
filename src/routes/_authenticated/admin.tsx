import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) throw redirect({ to: "/" });
    const { data: profile } = await supabase
      .from("users")
      .select("is_admin")
      .eq("id", auth.user.id)
      .maybeSingle();
    // is_admin isn't in the generated types yet -- see apply_admin_flag.sql.
    if (!(profile as { is_admin: boolean } | null)?.is_admin) throw redirect({ to: "/feed" });
  },
  head: () => ({
    meta: [
      { title: "Admin — Kellogg Recruiting Copilot" },
      { name: "description", content: "Founder-only KPI dashboard." },
    ],
  }),
  component: AdminPage,
});

type Metrics = {
  generatedAt: string;
  signups: {
    totalJobSeekers: number;
    totalReferrers: number;
    jobSeekersWithPrefs: number;
    jobSeekersWithProfile: number;
    referrersWithProfile: number;
    newJobSeekers7d: number;
    newReferrers7d: number;
  };
  postings: {
    totalPostings: number;
    classifiedPostings: number;
    postingsWithDescription: number;
    postingsIngested24h: number;
    postingsIngested7d: number;
    perCompany: { name: string; active: boolean; postings: number }[];
  };
  applications: {
    totalApplications: number;
    applications7d: number;
    distinctApplicants: number;
    pctJobSeekersWhoApplied: number | null;
    networkAssistedApplications: number;
    pctNetworkAssisted: number | null;
  };
  referrers: {
    totalConnectionRequests: number;
    pending: number;
    accepted: number;
    declined: number;
    acceptanceRate: number | null;
    postingsWithOverlap: number;
    pctPostingsWithOverlap: number | null;
  };
};

function pct(n: number | null): string {
  if (n === null) return "—";
  return `${Math.round(n * 100)}%`;
}

type SeedResult = {
  password: string;
  created: number;
  skipped: number;
  errors: { email: string; status: string; detail?: string }[];
  overlapPairsRecomputed: number;
};

type BackfillResult = {
  attempted: number;
  updated: number;
  skippedNoJobId: number;
  errors: { id: string; status: string; detail?: string }[];
  remaining: number;
};

type RescoreResult = {
  rescored: number;
};

function AdminPage() {
  const queryClient = useQueryClient();
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<SeedResult | null>(null);
  const [seedError, setSeedError] = useState<string | null>(null);
  const [backfilling, setBackfilling] = useState(false);
  const [backfillResult, setBackfillResult] = useState<BackfillResult | null>(null);
  const [backfillError, setBackfillError] = useState<string | null>(null);
  const [rescoring, setRescoring] = useState(false);
  const [rescoreResult, setRescoreResult] = useState<RescoreResult | null>(null);
  const [rescoreError, setRescoreError] = useState<string | null>(null);

  const metricsQuery = useQuery({
    queryKey: ["admin-metrics"],
    queryFn: async (): Promise<Metrics> => {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      if (!token) throw new Error("Not signed in");
      const res = await fetch("/api/admin/metrics", {
        headers: { authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Metrics request failed (${res.status})`);
      return res.json();
    },
  });

  async function seedReferrers() {
    setSeeding(true);
    setSeedError(null);
    setSeedResult(null);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      if (!token) throw new Error("Not signed in");
      const res = await fetch("/api/admin/seed-referrers", {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const data: SeedResult = await res.json();
      setSeedResult(data);
      await queryClient.invalidateQueries({ queryKey: ["admin-metrics"] });
    } catch (err) {
      setSeedError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSeeding(false);
    }
  }

  async function backfillDescriptions() {
    setBackfilling(true);
    setBackfillError(null);
    setBackfillResult(null);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      if (!token) throw new Error("Not signed in");
      const res = await fetch("/api/admin/backfill-descriptions", {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const data: BackfillResult = await res.json();
      setBackfillResult(data);
    } catch (err) {
      setBackfillError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBackfilling(false);
    }
  }

  async function rescoreAll() {
    setRescoring(true);
    setRescoreError(null);
    setRescoreResult(null);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      if (!token) throw new Error("Not signed in");
      const res = await fetch("/api/admin/rescore-all", {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const data: RescoreResult = await res.json();
      setRescoreResult(data);
      await queryClient.invalidateQueries({ queryKey: ["admin-metrics"] });
    } catch (err) {
      setRescoreError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setRescoring(false);
    }
  }

  const m = metricsQuery.data;

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight text-foreground">Admin</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Core KPIs across the whole cohort, refreshed on load.
      </p>

      <div className="mt-5 rounded-xl border border-border bg-card p-4">
        <p className="text-sm font-medium text-foreground">Seed test referrers</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Creates ~40 fake referrer accounts (2 per active Greenhouse company, @example.com
          emails) with alum_profiles + alumni_contacts filled in, then recomputes alumni
          overlap counts across all postings. Safe to re-run — existing accounts are skipped.
        </p>
        <button
          type="button"
          onClick={seedReferrers}
          disabled={seeding}
          className="mt-3 inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          {seeding ? "Seeding…" : "Seed test referrers"}
        </button>

        {seedError && <p className="mt-3 text-sm text-destructive">{seedError}</p>}

        {seedResult && (
          <div className="mt-3 rounded-lg bg-primary/10 px-3 py-2 text-xs text-foreground">
            <p>
              Created {seedResult.created}, skipped {seedResult.skipped} (already existed),{" "}
              {seedResult.errors.length} error(s). Recomputed overlap for{" "}
              {seedResult.overlapPairsRecomputed} company/function pairs.
            </p>
            <p className="mt-1">
              Shared password for any seeded account:{" "}
              <span className="font-mono">{seedResult.password}</span>
            </p>
            {seedResult.errors.length > 0 && (
              <ul className="mt-1 list-disc space-y-0.5 pl-4">
                {seedResult.errors.map((e) => (
                  <li key={e.email}>
                    {e.email}: {e.detail}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="mt-3 rounded-xl border border-border bg-card p-4">
        <p className="text-sm font-medium text-foreground">Backfill descriptions</p>
        <p className="mt-1 text-xs text-muted-foreground">
          One-time cleanup for postings classified before the n8n content-fetch branch existed —
          those permanently lack a description otherwise. Processes up to 150 at a time; click
          again if any remain.
        </p>
        <button
          type="button"
          onClick={backfillDescriptions}
          disabled={backfilling}
          className="mt-3 inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          {backfilling ? "Backfilling…" : "Backfill descriptions"}
        </button>

        {backfillError && <p className="mt-3 text-sm text-destructive">{backfillError}</p>}

        {backfillResult && (
          <div className="mt-3 rounded-lg bg-primary/10 px-3 py-2 text-xs text-foreground">
            <p>
              Attempted {backfillResult.attempted}, updated {backfillResult.updated}, skipped{" "}
              {backfillResult.skippedNoJobId} (couldn't parse a job id), {backfillResult.errors.length}{" "}
              error(s).{" "}
              {backfillResult.remaining > 0
                ? `${backfillResult.remaining} still missing a description — click again.`
                : "None remaining."}
            </p>
            {backfillResult.errors.length > 0 && (
              <ul className="mt-1 list-disc space-y-0.5 pl-4">
                {backfillResult.errors.slice(0, 10).map((e) => (
                  <li key={e.id}>
                    {e.id}: {e.detail}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="mt-3 rounded-xl border border-border bg-card p-4">
        <p className="text-sm font-medium text-foreground">Rescore all</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Postings only get a priority score when n8n's rescore step completes for the run that
          classified them — anything classified in a crashed or skipped run stays stuck at 0
          forever otherwise. This sweeps every classified posting and recomputes its score
          directly. Safe to re-run any time.
        </p>
        <button
          type="button"
          onClick={rescoreAll}
          disabled={rescoring}
          className="mt-3 inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          {rescoring ? "Rescoring…" : "Rescore all"}
        </button>

        {rescoreError && <p className="mt-3 text-sm text-destructive">{rescoreError}</p>}

        {rescoreResult && (
          <p className="mt-3 rounded-lg bg-primary/10 px-3 py-2 text-xs text-foreground">
            Rescored {rescoreResult.rescored} classified postings.
          </p>
        )}
      </div>

      {metricsQuery.isLoading ? (
        <p className="mt-6 text-sm text-muted-foreground">Loading…</p>
      ) : metricsQuery.error || !m ? (
        <p className="mt-6 text-sm text-destructive">Could not load metrics. Try again shortly.</p>
      ) : (
        <div className="mt-6 space-y-8">
          <Section title="Signups & activation">
            <StatGrid>
              <Stat label="Job seekers" value={m.signups.totalJobSeekers} />
              <Stat label="Referrers (alumni)" value={m.signups.totalReferrers} />
              <Stat
                label="Job seekers with prefs set"
                value={m.signups.jobSeekersWithPrefs}
                sub={`of ${m.signups.totalJobSeekers}`}
              />
              <Stat
                label="Job seekers w/ profile"
                value={m.signups.jobSeekersWithProfile}
                sub={`of ${m.signups.totalJobSeekers}`}
              />
              <Stat
                label="Referrers w/ profile"
                value={m.signups.referrersWithProfile}
                sub={`of ${m.signups.totalReferrers}`}
              />
              <Stat label="New job seekers (7d)" value={m.signups.newJobSeekers7d} />
              <Stat label="New referrers (7d)" value={m.signups.newReferrers7d} />
            </StatGrid>
          </Section>

          <Section title="Posting pipeline health">
            <StatGrid>
              <Stat label="Total postings" value={m.postings.totalPostings} />
              <Stat
                label="Classified"
                value={m.postings.classifiedPostings}
                sub={`of ${m.postings.totalPostings}`}
              />
              <Stat
                label="With description"
                value={m.postings.postingsWithDescription}
                sub={`of ${m.postings.totalPostings}`}
              />
              <Stat label="Ingested last 24h" value={m.postings.postingsIngested24h} />
              <Stat label="Ingested last 7d" value={m.postings.postingsIngested7d} />
            </StatGrid>

            <p className="mt-5 text-xs font-medium text-muted-foreground">By company</p>
            <ul className="mt-2 space-y-1">
              {m.postings.perCompany.map((c) => (
                <li
                  key={c.name}
                  className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-1.5 text-sm"
                >
                  <span className={c.active ? "text-foreground" : "text-muted-foreground"}>
                    {c.name}
                    {!c.active && <span className="ml-1.5 text-xs">(inactive)</span>}
                  </span>
                  <span className="font-medium text-foreground">{c.postings}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Applications logged">
            <StatGrid>
              <Stat label="Total applications" value={m.applications.totalApplications} />
              <Stat label="Last 7d" value={m.applications.applications7d} />
              <Stat
                label="Job seekers who applied"
                value={m.applications.distinctApplicants}
                sub={pct(m.applications.pctJobSeekersWhoApplied)}
              />
              <Stat
                label="Network-assisted"
                value={m.applications.networkAssistedApplications}
                sub={`${pct(m.applications.pctNetworkAssisted)} of applications`}
              />
            </StatGrid>
          </Section>

          <Section title="Referrer engagement">
            <StatGrid>
              <Stat label="Connection requests" value={m.referrers.totalConnectionRequests} />
              <Stat label="Pending" value={m.referrers.pending} />
              <Stat label="Accepted" value={m.referrers.accepted} />
              <Stat label="Declined" value={m.referrers.declined} />
              <Stat
                label="Acceptance rate"
                value={pct(m.referrers.acceptanceRate)}
                sub="of responded requests"
              />
              <Stat
                label="Postings with overlap"
                value={m.referrers.postingsWithOverlap}
                sub={pct(m.referrers.pctPostingsWithOverlap)}
              />
            </StatGrid>
          </Section>

          <p className="text-xs text-muted-foreground">
            Generated {new Date(m.generatedAt).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function StatGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{children}</div>;
}

function Stat({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-2xl font-semibold tracking-tight text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
      {sub && <p className="mt-0.5 text-[11px] text-muted-foreground/70">{sub}</p>}
    </div>
  );
}
