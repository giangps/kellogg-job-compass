import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { daysSince } from "@/lib/kellogg";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "My Applications — Kellogg Recruiting Copilot" },
      {
        name: "description",
        content:
          "Track the roles you have logged, plus how many others in the Kellogg network applied to each.",
      },
      { property: "og:title", content: "My Applications" },
      {
        property: "og:description",
        content: "Track the roles you logged and aggregate cohort activity.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DashboardPage,
});

type AppliedRow = {
  postingId: string;
  dateApplied: string;
  title: string;
  location: string | null;
  datePosted: string | null;
  company: string;
  overlapCount: number;
  othersApplied: number;
};

function DashboardPage() {
  const profileQuery = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return null;
      const { data, error } = await supabase
        .from("users")
        .select("id, target_function, target_level")
        .eq("id", auth.user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const profile = profileQuery.data;
  const hasPrefs = Boolean(profile?.target_function && profile?.target_level);

  const appsQuery = useQuery({
    queryKey: ["my-applications", profile?.id],
    enabled: Boolean(profile?.id),
    queryFn: async (): Promise<AppliedRow[]> => {
      const { data: rows, error } = await supabase
        .from("applications")
        .select(
          "posting_id, date_applied, postings(id, title, location, date_posted, companies(name), posting_alumni_overlap(overlap_count))",
        )
        .eq("user_id", profile!.id)
        .order("date_applied", { ascending: false });
      if (error) throw error;

      const postingIds = (rows ?? [])
        .map((r) => r.posting_id)
        .filter((id): id is string => Boolean(id));
      if (postingIds.length === 0) return [];

      const { data: counts, error: countsError } = await supabase
        .from("posting_application_counts")
        .select("posting_id, applied_count")
        .in("posting_id", postingIds);
      if (countsError) throw countsError;

      const countByPosting = new Map(
        (counts ?? []).map((c) => [c.posting_id as string, c.applied_count ?? 0]),
      );

      return (rows ?? [])
        .map((r) => {
          const posting = Array.isArray(r.postings) ? r.postings[0] : r.postings;
          if (!posting) return null;
          const company = Array.isArray(posting.companies)
            ? posting.companies[0]
            : posting.companies;
          const overlap = Array.isArray(posting.posting_alumni_overlap)
            ? posting.posting_alumni_overlap[0]
            : posting.posting_alumni_overlap;
          const raw = countByPosting.get(posting.id) ?? 0;
          return {
            postingId: posting.id,
            dateApplied: r.date_applied,
            title: posting.title,
            location: posting.location,
            datePosted: posting.date_posted,
            company: company?.name ?? "—",
            overlapCount: overlap?.overlap_count ?? 0,
            // This user applied to every row here, so the shared count always excludes them.
            othersApplied: Math.max(0, raw - 1),
          };
        })
        .filter((r): r is AppliedRow => r !== null);
    },
  });

  const rows = appsQuery.data ?? [];
  const companies = new Set(rows.map((r) => r.company)).size;

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight text-foreground">My applications</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {hasPrefs
          ? `${profile!.target_function} · ${profile!.target_level}`
          : "No targets set yet."}
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <Stat label="Applications logged" value={rows.length} />
        <Stat label="Companies" value={companies} />
      </div>

      {profileQuery.isLoading || appsQuery.isLoading ? (
        <p className="mt-6 text-sm text-muted-foreground">Loading…</p>
      ) : appsQuery.error ? (
        <p className="mt-6 text-sm text-destructive">
          Could not load your applications. Try again shortly.
        </p>
      ) : rows.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-border p-6 text-center">
          <p className="text-sm text-muted-foreground">Nothing logged yet.</p>
          <Link
            to="/feed"
            className="mt-3 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Browse the feed
          </Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {rows.map((row) => {
            const days = daysSince(row.datePosted);
            return (
              <li key={row.postingId} className="rounded-xl border border-border bg-card p-4">
                <p className="text-sm font-medium text-foreground">{row.company}</p>
                <h2 className="mt-0.5 text-base font-semibold leading-snug text-foreground">
                  {row.title}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Logged {new Date(row.dateApplied).toLocaleDateString()}
                  {[row.location, days === null ? null : `posted ${days}d ago`]
                    .filter(Boolean)
                    .map((s) => ` · ${s}`)
                    .join("")}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {row.othersApplied} {row.othersApplied === 1 ? "other person" : "others"} in the
                  network applied
                  {row.overlapCount > 0 ? " · alumni overlap exists in this function" : ""}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-2xl font-semibold tracking-tight text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
