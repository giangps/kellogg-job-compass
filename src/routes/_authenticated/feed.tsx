import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Users, GraduationCap } from "lucide-react";
import { useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { daysSince } from "@/lib/kellogg";

export const Route = createFileRoute("/_authenticated/feed")({
  head: () => ({
    meta: [
      { title: "Cohort Job Feed — Kellogg Recruiting Copilot" },
      {
        name: "description",
        content:
          "Prioritized job postings for the Kellogg cohort with aggregate network application counts and alumni overlap signals.",
      },
      { property: "og:title", content: "Cohort Job Feed" },
      {
        property: "og:description",
        content: "Prioritized postings with aggregate network signals — counts only, never names.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FeedPage,
});

type FeedRow = {
  id: string;
  title: string;
  location: string | null;
  datePosted: string | null;
  priorityScore: number;
  company: string;
  sourceUrl: string;
  overlapCount: number;
  appliedCount: number;
  viewerApplied: boolean;
};

function FeedPage() {
  const queryClient = useQueryClient();
  const [pendingId, setPendingId] = useState<string | null>(null);

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
  const targetFunction = profile?.target_function ?? null;
  const targetLevel = profile?.target_level ?? null;
  const hasPrefs = Boolean(targetFunction && targetLevel);

  const feedQuery = useQuery({
    queryKey: ["feed", targetFunction, targetLevel],
    enabled: hasPrefs && Boolean(profile?.id),
    queryFn: async (): Promise<FeedRow[]> => {
      const { data: postings, error } = await supabase
        .from("postings")
        .select(
          "id, title, location, date_posted, priority_score, source_url, companies(name), posting_alumni_overlap(overlap_count)",
        )
        .eq("function_tag", targetFunction!)
        .eq("level_tag", targetLevel!)
        .order("priority_score", { ascending: false });
      if (error) throw error;

      const ids = (postings ?? []).map((p) => p.id);
      if (ids.length === 0) return [];

      const [countsRes, mineRes] = await Promise.all([
        supabase
          .from("posting_application_counts")
          .select("posting_id, applied_count")
          .in("posting_id", ids),
        supabase
          .from("applications")
          .select("posting_id")
          .eq("user_id", profile!.id)
          .in("posting_id", ids),
      ]);
      if (countsRes.error) throw countsRes.error;
      if (mineRes.error) throw mineRes.error;

      const counts = new Map(
        (countsRes.data ?? []).map((c) => [c.posting_id as string, c.applied_count ?? 0]),
      );
      const mine = new Set((mineRes.data ?? []).map((a) => a.posting_id));

      return (postings ?? []).map((p) => {
        const overlap = Array.isArray(p.posting_alumni_overlap)
          ? p.posting_alumni_overlap[0]
          : p.posting_alumni_overlap;
        const company = Array.isArray(p.companies) ? p.companies[0] : p.companies;
        const viewerApplied = mine.has(p.id);
        const raw = counts.get(p.id) ?? 0;
        return {
          id: p.id,
          title: p.title,
          location: p.location,
          datePosted: p.date_posted,
          priorityScore: Number(p.priority_score),
          company: company?.name ?? "—",
          sourceUrl: p.source_url,
          overlapCount: overlap?.overlap_count ?? 0,
          appliedCount: Math.max(0, raw - (viewerApplied ? 1 : 0)),
          viewerApplied,
        };
      });
    },
  });

  async function apply(postingId: string) {
    if (!profile?.id) return;
    setPendingId(postingId);
    await supabase.from("applications").insert({ user_id: profile.id, posting_id: postingId });
    await queryClient.invalidateQueries({ queryKey: ["feed"] });
    setPendingId(null);
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Feed</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {hasPrefs ? (
              <>
                Ranked for {targetFunction} · {targetLevel}
              </>
            ) : (
              <>Set your targets to see matching postings.</>
            )}
          </p>
        </div>
      </div>

      {profileQuery.isLoading ? (
        <p className="mt-6 text-sm text-muted-foreground">Loading…</p>
      ) : !hasPrefs ? (
        <div className="mt-6 rounded-xl border border-dashed border-border p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Choose a target function and level first — the feed is filtered to your targets.
          </p>
          <Link
            to="/preferences"
            className="mt-3 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Set preferences
          </Link>
        </div>
      ) : feedQuery.isLoading ? (
        <p className="mt-6 text-sm text-muted-foreground">Loading postings…</p>
      ) : feedQuery.error ? (
        <p className="mt-6 text-sm text-destructive">Could not load postings. Try again shortly.</p>
      ) : (feedQuery.data ?? []).length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-border p-6 text-center">
          <p className="text-sm text-muted-foreground">
            No postings match your targets yet. New roles appear as they are found and classified.
          </p>
        </div>
      ) : (
        <ul className="mt-5 space-y-3">
          {(feedQuery.data ?? []).map((row) => (
            <PostingCard
              key={row.id}
              row={row}
              pending={pendingId === row.id}
              onApply={() => apply(row.id)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function PostingCard({
  row,
  pending,
  onApply,
}: {
  row: FeedRow;
  pending: boolean;
  onApply: () => void;
}) {
  const days = daysSince(row.datePosted);

  return (
    <li className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{row.company}</p>
          <h2 className="mt-0.5 text-base font-semibold leading-snug text-foreground">
            <a
              href={row.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              {row.title}
            </a>
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {[row.location, days === null ? null : `${days}d ago`].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div className="shrink-0 rounded-lg bg-primary/10 px-2.5 py-1.5 text-center">
          <p className="text-sm font-semibold leading-none text-primary">{row.priorityScore}</p>
          <p className="mt-1 text-[10px] uppercase tracking-wide text-primary/80">Priority</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
          <Users className="size-3.5" aria-hidden />
          {row.appliedCount} {row.appliedCount === 1 ? "person" : "people"} in the network have
          applied
        </span>
        {row.overlapCount > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
            <GraduationCap className="size-3.5" aria-hidden />
            Alumni overlap exists in this function
          </span>
        )}
      </div>

      <button
        onClick={onApply}
        disabled={row.viewerApplied || pending}
        className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-primary px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10 disabled:border-border disabled:text-muted-foreground disabled:hover:bg-transparent sm:w-auto"
      >
        {row.viewerApplied ? (
          <>
            <Check className="size-4" aria-hidden />
            Applied
          </>
        ) : pending ? (
          "Logging…"
        ) : (
          "I applied"
        )}
      </button>
    </li>
  );
}
