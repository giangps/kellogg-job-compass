import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Users, GraduationCap } from "lucide-react";
import { useEffect, useState } from "react";

import {
  MOCK_POSTINGS,
  getApplications,
  getPreferences,
  logApplication,
  othersAppliedCount,
  type Posting,
} from "@/lib/kellogg";

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
        content:
          "Prioritized postings with aggregate network signals — counts only, never names.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FeedPage,
});

function FeedPage() {
  const [appliedIds, setAppliedIds] = useState<string[]>([]);
  const [prefsLabel, setPrefsLabel] = useState<string | null>(null);

  useEffect(() => {
    setAppliedIds(getApplications().map((a) => a.postingId));
    const prefs = getPreferences();
    setPrefsLabel(prefs ? `${prefs.targetFunction} · ${prefs.targetLevel}` : null);
  }, []);

  function apply(id: string) {
    setAppliedIds(logApplication(id).map((a) => a.postingId));
  }

  const postings = [...MOCK_POSTINGS].sort((a, b) => b.priorityScore - a.priorityScore);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Feed</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {prefsLabel ? (
              <>Ranked for {prefsLabel}</>
            ) : (
              <>
                <Link to="/preferences" className="text-primary underline underline-offset-4">
                  Set your targets
                </Link>{" "}
                to personalize ranking.
              </>
            )}
          </p>
        </div>
        <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
          Placeholder data
        </span>
      </div>

      <ul className="mt-5 space-y-3">
        {postings.map((posting) => (
          <PostingCard
            key={posting.id}
            posting={posting}
            applied={appliedIds.includes(posting.id)}
            onApply={() => apply(posting.id)}
          />
        ))}
      </ul>
    </div>
  );
}

function PostingCard({
  posting,
  applied,
  onApply,
}: {
  posting: Posting;
  applied: boolean;
  onApply: () => void;
}) {
  const others = othersAppliedCount(posting, applied);

  return (
    <li className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{posting.company}</p>
          <h2 className="mt-0.5 text-base font-semibold leading-snug text-foreground">
            {posting.title}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {posting.location} · {posting.postedDaysAgo}d ago
          </p>
        </div>
        <div className="shrink-0 rounded-lg bg-primary/10 px-2.5 py-1.5 text-center">
          <p className="text-sm font-semibold leading-none text-primary">
            {posting.priorityScore}
          </p>
          <p className="mt-1 text-[10px] uppercase tracking-wide text-primary/80">Priority</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
          <Users className="size-3.5" aria-hidden />
          {others} {others === 1 ? "person" : "people"} in the network have applied
        </span>
        {posting.alumniOverlap && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
            <GraduationCap className="size-3.5" aria-hidden />
            Alumni overlap exists in this function
          </span>
        )}
      </div>

      <button
        onClick={onApply}
        disabled={applied}
        className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-primary px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10 disabled:border-border disabled:text-muted-foreground disabled:hover:bg-transparent sm:w-auto"
      >
        {applied ? (
          <>
            <Check className="size-4" aria-hidden />
            Applied
          </>
        ) : (
          "I applied"
        )}
      </button>
    </li>
  );
}
