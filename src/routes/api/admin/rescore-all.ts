import { createFileRoute } from "@tanstack/react-router";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

// Same scoring logic as /api/public/n8n/rescore (n8n-secret gated, meant
// for the workflow's own rescore step) -- this is an admin-session-gated
// twin so a stuck-at-0 backlog can be swept from the dashboard without
// touching n8n. Classified postings only ever get scored when n8n's
// rescore step actually runs to completion for that batch; anything
// classified in a run that crashed or was skipped stays at the schema
// default (0) forever otherwise.
export const Route = createFileRoute("/api/admin/rescore-all")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { computeBaseScore } = await import("@/lib/n8n.server");

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

        const { data: postings, error } = await supabaseAdmin
          .from("postings")
          .select(
            "id, company_id, source_url, title, date_posted, created_at, posting_alumni_overlap(overlap_count)",
          )
          .not("function_tag", "is", null);
        if (error) {
          return json({ error: "Query failed", detail: error.message }, 500);
        }

        const now = Date.now();
        const nowIso = new Date(now).toISOString();

        const rows = (postings ?? []).map((p: any) => {
          const basis = p.date_posted ?? p.created_at;
          const overlapRow = Array.isArray(p.posting_alumni_overlap)
            ? p.posting_alumni_overlap[0]
            : (p.posting_alumni_overlap as { overlap_count: number } | null);
          const overlap = overlapRow?.overlap_count ?? 0;
          const score = computeBaseScore(basis, overlap);
          return {
            id: p.id,
            company_id: p.company_id,
            source_url: p.source_url,
            title: p.title,
            priority_score: score,
            last_scored_at: nowIso,
          };
        });

        let rescored = 0;
        for (let i = 0; i < rows.length; i += 500) {
          const chunk = rows.slice(i, i + 500);
          const { error: updateError } = await supabaseAdmin
            .from("postings")
            .upsert(chunk, { onConflict: "id" });
          if (updateError) {
            console.error("[admin/rescore-all]", updateError);
            continue;
          }
          rescored += chunk.length;
        }

        return json({ rescored });
      },
    },
  },
});
