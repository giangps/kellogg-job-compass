import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import {
  MOCK_POSTINGS,
  getApplications,
  getPreferences,
  othersAppliedCount,
  type LoggedApplication,
} from "@/lib/kellogg";

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

function DashboardPage() {
  const [apps, setApps] = useState<LoggedApplication[]>([]);
  const [prefs, setPrefs] = useState<{ targetFunction: string; targetLevel: string } | null>(null);

  useEffect(() => {
    setApps(getApplications());
    setPrefs(getPreferences());
  }, []);

  const rows = apps
    .map((a) => ({ app: a, posting: MOCK_POSTINGS.find((p) => p.id === a.postingId) }))
    .filter((r) => r.posting)
    .sort((a, b) => b.app.appliedAt.localeCompare(a.app.appliedAt));

  const companies = new Set(rows.map((r) => r.posting!.company)).size;

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight text-foreground">My applications</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {prefs ? `${prefs.targetFunction} · ${prefs.targetLevel}` : "No targets set yet."}
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <Stat label="Applications logged" value={rows.length} />
        <Stat label="Companies" value={companies} />
      </div>

      {rows.length === 0 ? (
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
          {rows.map(({ app, posting }) => {
            const others = othersAppliedCount(posting!, true);
            return (
              <li key={app.postingId} className="rounded-xl border border-border bg-card p-4">
                <p className="text-sm font-medium text-foreground">{posting!.company}</p>
                <h2 className="mt-0.5 text-base font-semibold leading-snug text-foreground">
                  {posting!.title}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Logged {new Date(app.appliedAt).toLocaleDateString()} · {posting!.location}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {others} {others === 1 ? "other person" : "others"} in the network applied
                  {posting!.alumniOverlap ? " · alumni overlap exists in this function" : ""}
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
