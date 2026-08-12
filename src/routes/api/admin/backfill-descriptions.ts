import { createFileRoute } from "@tanstack/react-router";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

// One admin-click pass over the backlog: postings classified before the
// per-job content-fetch branch existed in n8n permanently lack a
// description under that branch's design (it only fires for postings
// flagged is_new in the run that classifies them). This sweeps
// description-less Greenhouse postings directly, independent of n8n.
//
// Capped per call (BATCH_LIMIT) since this runs synchronously inside one
// HTTP request/response cycle -- same timeout risk n8n hit, just a
// different host. Safe to click repeatedly; each call picks up wherever
// the last one left off (query is always "description is null").
const BATCH_LIMIT = 150;
const CONCURRENCY = 8;

function cleanDescription(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let s = raw
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, "’")
    .replace(/&lsquo;/g, "‘")
    .replace(/&rdquo;/g, "”")
    .replace(/&ldquo;/g, "“")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&hellip;/g, "…")
    .replace(/&amp;/g, "&");
  s = s
    .replace(/<\/(p|div|h[1-6]|ul|ol)>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>/gi, "\n• ")
    .replace(/<\/li>/gi, "");
  s = s.replace(/<[^>]*>/g, "");
  s = s
    .split("\n")
    .map((l) => l.replace(/[ \t]+/g, " ").trim())
    .join("\n");
  s = s.replace(/\n{3,}/g, "\n\n").trim();
  return s.slice(0, 20000) || null;
}

function extractJobId(sourceUrl: string): string | null {
  const match = sourceUrl.match(/\/jobs\/(\d+)/);
  return match ? match[1]! : null;
}

export const Route = createFileRoute("/api/admin/backfill-descriptions")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const authHeader = request.headers.get("authorization") ?? "";
        const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
        if (!token) return json({ error: "Unauthorized" }, 401);

        const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
        if (authError || !authData.user) return json({ error: "Unauthorized" }, 401);

        const { data: caller, error: callerError } = await supabaseAdmin
          .from("users")
          .select("is_admin")
          .eq("id", authData.user.id)
          .maybeSingle();
        if (callerError) return json({ error: "Query failed" }, 500);
        if (!(caller as { is_admin: boolean } | null)?.is_admin) {
          return json({ error: "Forbidden" }, 403);
        }

        const { data: postings, error: postingsError } = await supabaseAdmin
          .from("postings")
          .select("id, company_id, title, source_url, companies!inner(ats_type, ats_feed_url)")
          .eq("companies.ats_type", "greenhouse")
          .is("description", null)
          .limit(BATCH_LIMIT);
        if (postingsError) {
          return json({ error: "Query failed", detail: postingsError.message }, 500);
        }

        const candidates = (postings ?? [])
          .map((p: any) => {
            const company = Array.isArray(p.companies) ? p.companies[0] : p.companies;
            if (company?.ats_type !== "greenhouse" || !company?.ats_feed_url) return null;
            const jobId = extractJobId(p.source_url);
            if (!jobId) return null;
            return {
              id: p.id as string,
              companyId: p.company_id as string,
              title: p.title as string,
              sourceUrl: p.source_url as string,
              contentUrl: `${company.ats_feed_url}/${jobId}?content=true`,
            };
          })
          .filter(
            (c): c is { id: string; companyId: string; title: string; sourceUrl: string; contentUrl: string } =>
              c !== null,
          );

        // Greenhouse-only is already enforced by the query itself now (the
        // !inner join + eq filter above) -- anything skipped here just
        // failed to yield a job id from its source_url.
        const skippedNoJobId = (postings ?? []).length - candidates.length;
        const results: {
          id: string;
          status: "updated" | "no_content" | "error";
          detail?: string | undefined;
        }[] = [];
        const updates: { id: string; company_id: string; title: string; source_url: string; description: string }[] =
          [];

        for (let i = 0; i < candidates.length; i += CONCURRENCY) {
          const chunk = candidates.slice(i, i + CONCURRENCY);
          const fetched = await Promise.all(
            chunk.map(async (c) => {
              try {
                const res = await fetch(c.contentUrl);
                if (!res.ok) return { c, status: "error" as const, detail: `HTTP ${res.status}` };
                const data = await res.json();
                const description = cleanDescription(data?.content);
                if (!description) return { c, status: "no_content" as const };
                return { c, status: "updated" as const, description };
              } catch (err) {
                return {
                  c,
                  status: "error" as const,
                  detail: err instanceof Error ? err.message : "Fetch failed",
                };
              }
            }),
          );
          for (const f of fetched) {
            if (f.status === "updated") {
              updates.push({
                id: f.c.id,
                company_id: f.c.companyId,
                title: f.c.title,
                source_url: f.c.sourceUrl,
                description: (f as { description: string }).description,
              });
              results.push({ id: f.c.id, status: "updated" });
            } else {
              results.push({ id: f.c.id, status: f.status, detail: (f as { detail?: string }).detail });
            }
          }
        }

        for (let i = 0; i < updates.length; i += 500) {
          const chunk = updates.slice(i, i + 500);
          const { error: updateError } = await supabaseAdmin
            .from("postings")
            .upsert(chunk, { onConflict: "id" });
          if (updateError) {
            console.error("[admin/backfill-descriptions] update", updateError);
          }
        }

        // Scoped to Greenhouse too -- this is "how many more this tool can
        // actually fix," not the total including permanently-unfixable
        // non-Greenhouse rows (Lever/Workday/bespoke aren't handled here).
        const { count: remaining } = await supabaseAdmin
          .from("postings")
          .select("id, companies!inner(ats_type)", { count: "exact", head: true })
          .eq("companies.ats_type", "greenhouse")
          .is("description", null);

        return json({
          attempted: candidates.length,
          updated: updates.length,
          skippedNoJobId,
          errors: results.filter((r) => r.status === "error"),
          remaining: remaining ?? 0,
        });
      },
    },
  },
});
