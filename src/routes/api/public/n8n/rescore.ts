import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/n8n/rescore")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { checkN8nSecret, json, computeBaseScore } = await import("@/lib/n8n.server");
        const denied = checkN8nSecret(request);
        if (denied) return denied;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: postings, error } = await supabaseAdmin
          .from("postings")
          .select(
            "id, company_id, source_url, title, date_posted, created_at, posting_alumni_overlap(overlap_count)",
          )
          .not("function_tag", "is", null);
        if (error) {
          console.error("[n8n/rescore] fetch", error);
          return json({ error: "Query failed" }, 500);
        }

        const now = Date.now();
        const nowIso = new Date(now).toISOString();

        // company_id/source_url/title are just passed through unchanged --
        // Supabase's generated Insert type requires them even though the
        // ON CONFLICT (id) path below always hits (every id came from this
        // same table), so the insert branch never actually executes.
        const rows = (postings ?? []).map((p) => {
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

        // Batched upsert-by-id instead of one UPDATE per row -- the
        // original per-row loop did ~1-2k sequential round trips and
        // reliably blew past n8n's 5-minute HTTP timeout once the corpus
        // grew past a few hundred postings.
        let rescored = 0;
        for (let i = 0; i < rows.length; i += 500) {
          const chunk = rows.slice(i, i + 500);
          const { error: updateError } = await supabaseAdmin
            .from("postings")
            .upsert(chunk, { onConflict: "id" });
          if (updateError) {
            console.error("[n8n/rescore] update", updateError);
            continue;
          }
          rescored += chunk.length;
        }

        return json({ rescored_count: rescored });
      },
    },
  },
});
