import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const bodySchema = z.object({
  posting_id: z.string().uuid(),
  function_tag: z.string().trim().min(1).max(120),
  level_tag: z.string().trim().min(1).max(120),
  confidence: z.number().min(0).max(1),
});

const CONFIDENCE_THRESHOLD = 0.7;

export const Route = createFileRoute("/api/public/n8n/postings/classification")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { checkN8nSecret, json, refreshOverlap } = await import("@/lib/n8n.server");
        const denied = checkN8nSecret(request);
        if (denied) return denied;

        let parsed;
        try {
          parsed = bodySchema.parse(await request.json());
        } catch {
          return json({ error: "Invalid body" }, 400);
        }

        if (parsed.confidence < CONFIDENCE_THRESHOLD) {
          return json({ tagged: false });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { computeBaseScore } = await import("@/lib/n8n.server");
        const { data: posting, error } = await supabaseAdmin
          .from("postings")
          .update({ function_tag: parsed.function_tag, level_tag: parsed.level_tag })
          .eq("id", parsed.posting_id)
          .select("id, company_id, date_posted, created_at")
          .maybeSingle();

        if (error) {
          console.error("[n8n/classification]", error);
          return json({ error: "Update failed" }, 500);
        }
        if (!posting) return json({ error: "Posting not found" }, 404);

        let overlap: number;
        try {
          overlap = await refreshOverlap(
            supabaseAdmin as never,
            posting.id,
            posting.company_id,
            parsed.function_tag,
          );
        } catch (overlapError) {
          console.error("[n8n/classification] overlap", overlapError);
          return json({ error: "Overlap computation failed" }, 500);
        }

        // Score right away instead of waiting on the batch /n8n/rescore step
        // that only runs at the end of a full n8n execution -- otherwise a
        // posting classified in a run that crashes or gets skipped before
        // that step stays stuck at the schema default (0) indefinitely.
        const basis = posting.date_posted ?? posting.created_at;
        const { error: scoreError } = await supabaseAdmin
          .from("postings")
          .update({
            priority_score: computeBaseScore(basis, overlap),
            last_scored_at: new Date().toISOString(),
          })
          .eq("id", posting.id);
        if (scoreError) {
          console.error("[n8n/classification] score", scoreError);
          return json({ error: "Scoring failed" }, 500);
        }

        return json({ tagged: true });
      },
    },
  },
});
