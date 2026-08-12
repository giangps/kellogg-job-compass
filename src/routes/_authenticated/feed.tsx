import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Users, GraduationCap, ExternalLink, X, SlidersHorizontal } from "lucide-react";
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { daysSince, TARGET_FUNCTIONS, TARGET_LEVELS } from "@/lib/kellogg";
import { CompanyLogo } from "@/components/CompanyLogo";

const POSTED_WITHIN_OPTIONS = [
  { value: "1", label: "Last 24 hours" },
  { value: "7", label: "Last 7 days" },
  { value: "14", label: "Last 14 days" },
] as const;

function cutoffDateISO(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
}

function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

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
  logoUrl: string | null;
  description: string | null;
  sourceUrl: string;
  overlapCount: number;
  appliedCount: number;
  viewerApplied: boolean;
};

function FeedPage() {
  const queryClient = useQueryClient();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [applyError, setApplyError] = useState<{ postingId: string; message: string } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [prefsInitialized, setPrefsInitialized] = useState(false);
  const [functionFilter, setFunctionFilter] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");
  const [postedWithin, setPostedWithin] = useState("14");
  const [sortBy, setSortBy] = useState<"priority" | "recent">("priority");
  const debouncedKeyword = useDebounced(keyword, 300);
  const debouncedLocation = useDebounced(location, 300);

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

  // Default the filter bar to the saved preferences the first time they load,
  // without stomping on filters the user has already started changing.
  useEffect(() => {
    if (prefsInitialized || !profileQuery.isFetched) return;
    setFunctionFilter(targetFunction ?? "");
    setLevelFilter(targetLevel ?? "");
    setPrefsInitialized(true);
  }, [prefsInitialized, profileQuery.isFetched, targetFunction, targetLevel]);

  const usingCustomFilters =
    functionFilter !== (targetFunction ?? "") ||
    levelFilter !== (targetLevel ?? "") ||
    companyFilter !== "" ||
    debouncedKeyword.trim() !== "" ||
    debouncedLocation.trim() !== "";

  function resetToPreferences() {
    setFunctionFilter(targetFunction ?? "");
    setLevelFilter(targetLevel ?? "");
    setCompanyFilter("");
    setKeyword("");
    setLocation("");
  }

  const companiesQuery = useQuery({
    queryKey: ["active-companies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("id, name")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const feedQuery = useQuery({
    queryKey: [
      "feed",
      functionFilter,
      levelFilter,
      companyFilter,
      debouncedKeyword,
      debouncedLocation,
      postedWithin,
      sortBy,
    ],
    enabled: Boolean(profile?.id) && prefsInitialized,
    queryFn: async (): Promise<FeedRow[]> => {
      let query = supabase
        .from("postings")
        .select(
          "id, title, location, date_posted, priority_score, function_tag, level_tag, source_url, description, companies(name, logo_url), posting_alumni_overlap(overlap_count)",
        )
        .gte("date_posted", cutoffDateISO(Number(postedWithin)));

      if (functionFilter) query = query.eq("function_tag", functionFilter);
      if (levelFilter) query = query.eq("level_tag", levelFilter);
      if (companyFilter) query = query.eq("company_id", companyFilter);
      if (debouncedKeyword.trim()) query = query.ilike("title", `%${debouncedKeyword.trim()}%`);
      if (debouncedLocation.trim()) query = query.ilike("location", `%${debouncedLocation.trim()}%`);

      const { data: postings, error } = await query;
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

      const rows = (postings ?? []).map((p) => {
        const overlap = Array.isArray(p.posting_alumni_overlap)
          ? p.posting_alumni_overlap[0]
          : p.posting_alumni_overlap;
        const company = Array.isArray(p.companies) ? p.companies[0] : p.companies;
        const viewerApplied = mine.has(p.id);
        const raw = counts.get(p.id) ?? 0;

        // priority_score in the DB is a shared, network-wide signal (recency
        // + alumni overlap) -- identical for every viewer. Add a per-viewer
        // bonus on top, computed here rather than stored, since a personal
        // match to *your* saved target isn't something a single shared
        // column can represent.
        let score = Number(p.priority_score);
        if (targetFunction && p.function_tag === targetFunction) score += 20;
        if (targetLevel && p.level_tag === targetLevel) score += 10;

        return {
          id: p.id,
          title: p.title,
          location: p.location,
          datePosted: p.date_posted,
          priorityScore: score,
          company: company?.name ?? "—",
          logoUrl: company?.logo_url ?? null,
          description: p.description ?? null,
          sourceUrl: p.source_url,
          overlapCount: overlap?.overlap_count ?? 0,
          appliedCount: Math.max(0, raw - (viewerApplied ? 1 : 0)),
          viewerApplied,
        };
      });

      rows.sort((a, b) =>
        sortBy === "recent"
          ? (b.datePosted ?? "").localeCompare(a.datePosted ?? "")
          : b.priorityScore - a.priorityScore,
      );

      return rows;
    },
  });

  const selected = (feedQuery.data ?? []).find((r) => r.id === selectedId) ?? null;

  async function apply(postingId: string) {
    if (!profile?.id) return;
    setPendingId(postingId);
    setApplyError(null);
    try {
      const { error } = await supabase
        .from("applications")
        .insert({ user_id: profile.id, posting_id: postingId });
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["feed"] });
    } catch (err) {
      console.error("[feed] apply failed", err);
      setApplyError({ postingId, message: "Could not log this application. Try again." });
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Feed</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {usingCustomFilters ? (
              <>Custom search — clear filters to return to your ranked feed.</>
            ) : hasPrefs ? (
              <>
                Ranked for {targetFunction} · {targetLevel}
              </>
            ) : (
              <>
                Showing all postings.{" "}
                <Link to="/preferences" className="text-primary hover:underline">
                  Set your targets
                </Link>{" "}
                for a ranked feed.
              </>
            )}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-border bg-card p-3">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <SlidersHorizontal className="size-3.5" aria-hidden />
          Search &amp; filter
        </div>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Search title…"
            aria-label="Search title"
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition-shadow focus:ring-2 focus:ring-ring"
          />
          <select
            value={functionFilter}
            onChange={(e) => setFunctionFilter(e.target.value)}
            aria-label="Function"
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition-shadow focus:ring-2 focus:ring-ring"
          >
            <option value="">All functions</option>
            {TARGET_FUNCTIONS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            aria-label="Level"
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition-shadow focus:ring-2 focus:ring-ring"
          >
            <option value="">All levels</option>
            {TARGET_LEVELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
          <select
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
            aria-label="Company"
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition-shadow focus:ring-2 focus:ring-ring"
          >
            <option value="">All companies</option>
            {(companiesQuery.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Location…"
            aria-label="Location"
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition-shadow focus:ring-2 focus:ring-ring"
          />
          <select
            value={postedWithin}
            onChange={(e) => setPostedWithin(e.target.value)}
            aria-label="Posted within"
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition-shadow focus:ring-2 focus:ring-ring"
          >
            {POSTED_WITHIN_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "priority" | "recent")}
            aria-label="Sort by"
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition-shadow focus:ring-2 focus:ring-ring"
          >
            <option value="priority">Sort: relevance</option>
            <option value="recent">Sort: most recent</option>
          </select>
        </div>
        {usingCustomFilters && (
          <button
            type="button"
            onClick={resetToPreferences}
            className="mt-2 text-xs font-medium text-primary hover:underline"
          >
            Reset to my preferences
          </button>
        )}
      </div>

      {profileQuery.isLoading || !prefsInitialized ? (
        <p className="mt-6 text-sm text-muted-foreground">Loading…</p>
      ) : feedQuery.isLoading ? (
        <p className="mt-6 text-sm text-muted-foreground">Loading postings…</p>
      ) : feedQuery.error ? (
        <p className="mt-6 text-sm text-destructive">Could not load postings. Try again shortly.</p>
      ) : (feedQuery.data ?? []).length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-border p-6 text-center">
          <p className="text-sm text-muted-foreground">
            {usingCustomFilters
              ? "No postings match these filters. Try broadening your search."
              : "No postings match your targets yet. New roles appear as they are found and classified."}
          </p>
        </div>
      ) : (
        <ul className="mt-5 space-y-3">
          {(feedQuery.data ?? []).map((row) => (
            <PostingCard
              key={row.id}
              row={row}
              pending={pendingId === row.id}
              error={applyError?.postingId === row.id ? applyError.message : null}
              onApply={() => apply(row.id)}
              onOpen={() => setSelectedId(row.id)}
            />
          ))}
        </ul>
      )}

      {selected && <JobPanel row={selected} onClose={() => setSelectedId(null)} />}
    </div>
  );
}

function JobPanel({ row, onClose }: { row: FeedRow; onClose: () => void }) {
  const days = daysSince(row.datePosted);

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <button
        aria-label="Close job details"
        onClick={onClose}
        className="absolute inset-0 bg-foreground/30 backdrop-blur-sm"
      />
      <aside className="relative flex h-full w-full max-w-2xl flex-col border-l border-border bg-card shadow-xl">
        <div className="flex items-start gap-3 border-b border-border p-4">
          <CompanyLogo name={row.company} logoUrl={row.logoUrl} sourceUrl={row.sourceUrl} />
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">{row.company}</p>
            <h2 className="text-base font-semibold leading-snug text-foreground">{row.title}</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {[row.location, days === null ? null : `${days}d ago`].filter(Boolean).join(" · ")}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {row.description ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {row.description}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              No description was captured for this posting — open the application site for the full
              job description.
            </p>
          )}
        </div>

        <div className="border-t border-border p-4">
          <a
            href={row.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go to application site
            <ExternalLink className="size-3.5" aria-hidden />
          </a>
        </div>
      </aside>
    </div>
  );
}

function PostingCard({
  row,
  pending,
  error,
  onApply,
  onOpen,
}: {
  row: FeedRow;
  pending: boolean;
  error: string | null;
  onApply: () => void;
  onOpen: () => void;
}) {
  const days = daysSince(row.datePosted);

  return (
    <li className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <CompanyLogo name={row.company} logoUrl={row.logoUrl} sourceUrl={row.sourceUrl} />
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">{row.company}</p>
            <h2 className="mt-0.5 text-base font-semibold leading-snug text-foreground">
              <button onClick={onOpen} className="text-left hover:text-primary hover:underline">
                {row.title}
              </button>
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {[row.location, days === null ? null : `${days}d ago`].filter(Boolean).join(" · ")}
            </p>
          </div>
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
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </li>
  );
}
