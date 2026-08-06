import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { getPreferences, savePreferences } from "@/lib/kellogg";

export const Route = createFileRoute("/_authenticated/preferences")({
  head: () => ({
    meta: [
      { title: "Your Recruiting Targets — Kellogg Recruiting Copilot" },
      {
        name: "description",
        content: "Set the target function and level that shape your Kellogg cohort job feed.",
      },
      { property: "og:title", content: "Your Recruiting Targets" },
      {
        property: "og:description",
        content: "Set the target function and level that shape your cohort job feed.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PreferencesPage,
});

function PreferencesPage() {
  const navigate = useNavigate();
  const [targetFunction, setTargetFunction] = useState("");
  const [targetLevel, setTargetLevel] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const prefs = getPreferences();
    if (prefs) {
      setTargetFunction(prefs.targetFunction);
      setTargetLevel(prefs.targetLevel);
    }
  }, []);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    savePreferences({ targetFunction, targetLevel });
    setSaved(true);
    setTimeout(() => navigate({ to: "/feed" }), 500);
  }

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight text-foreground">Your targets</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Free text — used to rank the feed and to detect alumni overlap in your function.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-xl border border-border bg-card p-4">
        <div className="space-y-1.5">
          <label htmlFor="fn" className="text-sm font-medium text-foreground">
            Target function
          </label>
          <input
            id="fn"
            required
            value={targetFunction}
            onChange={(e) => setTargetFunction(e.target.value)}
            placeholder="e.g. Product Management"
            className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="lvl" className="text-sm font-medium text-foreground">
            Target level
          </label>
          <input
            id="lvl"
            required
            value={targetLevel}
            onChange={(e) => setTargetLevel(e.target.value)}
            placeholder="e.g. Senior Manager / Post-MBA Associate"
            className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {saved ? "Saved" : "Save and view feed"}
        </button>
        <p className="text-xs text-muted-foreground">
          Stored locally for now — moves to your account once the database schema lands.
        </p>
      </form>
    </div>
  );
}
