import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/n8n/rescore")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { checkN8nSecret, json } = await import("@/lib/n8n.server");
        const denied = checkN8nSecret(request);
        if (denied) return denied;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: postings, error } = await supabaseAdmin
          .from("postings")
          .select("id, date_posted, created_at, posting_alumni_overlap(overlap_count)")
          .not("function_tag", "is", null);
        if (error) {
          console.error("[n8n/rescore] fetch", error);
          return json({ error: "Query failed" }, 500);
        }

        const now = Date.now();
        const nowIso = new Date(now).toISOString();
        let rescored = 0;

        for (const p of postings ?? []) {
          const basis = p.date_posted ?? p.created_at;
          const days = Math.max(0, (now - new Date(basis).getTime()) / 86_400_000);
          const recency = Math.pow(2, -days / 7);
          const overlapRow = Array.isArray(p.posting_alumni_overlap)
            ? p.posting_alumni_overlap[0]
            : (p.posting_alumni_overlap as { overlap_count: number } | null);
          const overlap = overlapRow?.overlap_count ?? 0;
          const raw =
            100 * (0.45 * recency + 0.3 * 1.0 + 0.25 * (Math.min(overlap, 3) / 3));
          const score = Math.round(raw * 100) / 100;

          const { error: updateError } = await supabaseAdmin
            .from("postings")
            .update({ priority_score: score, last_scored_at: nowIso })
            .eq("id", p.id);
          if (updateError) {
            console.error("[n8n/rescore] update", updateError);
            continue;
          }
          rescored += 1;
        }

        return json({ rescored_count: rescored });
      },
    },
  },
});
