import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { TARGET_FUNCTIONS, TARGET_LEVELS } from "@/lib/kellogg";

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

const selectClass =
  "w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring";

function PreferencesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [targetFunction, setTargetFunction] = useState("");
  const [targetLevel, setTargetLevel] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return null;
      const { data, error: err } = await supabase
        .from("users")
        .select("id, target_function, target_level")
        .eq("id", auth.user.id)
        .maybeSingle();
      if (err) throw err;
      return data;
    },
  });

  useEffect(() => {
    if (!profile) return;
    setTargetFunction(profile.target_function ?? "");
    setTargetLevel(profile.target_level ?? "");
  }, [profile]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setError(null);
    const { error: err } = await supabase
      .from("users")
      .update({ target_function: targetFunction, target_level: targetLevel })
      .eq("id", profile.id);
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    await queryClient.invalidateQueries();
    navigate({ to: "/feed" });
  }

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight text-foreground">Your targets</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Your feed shows only postings tagged with this function and level.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-xl border border-border bg-card p-4">
        <div className="space-y-1.5">
          <label htmlFor="fn" className="text-sm font-medium text-foreground">
            Target function
          </label>
          <select
            id="fn"
            required
            value={targetFunction}
            onChange={(e) => setTargetFunction(e.target.value)}
            className={selectClass}
          >
            <option value="" disabled>
              Select a function
            </option>
            {TARGET_FUNCTIONS.map((fn) => (
              <option key={fn} value={fn}>
                {fn}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="lvl" className="text-sm font-medium text-foreground">
            Target level
          </label>
          <select
            id="lvl"
            required
            value={targetLevel}
            onChange={(e) => setTargetLevel(e.target.value)}
            className={selectClass}
          >
            <option value="" disabled>
              Select a level
            </option>
            {TARGET_LEVELS.map((lvl) => (
              <option key={lvl} value={lvl}>
                {lvl}
              </option>
            ))}
          </select>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save and view feed"}
        </button>
      </form>
    </div>
  );
}
