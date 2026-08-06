import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const bodySchema = z.object({
  postings: z
    .array(
      z.object({
        company_id: z.string().uuid(),
        title: z.string().trim().min(1).max(300),
        location: z.string().trim().max(200).nullish(),
        date_posted: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .nullish(),
        source_url: z.string().trim().url().max(2000),
      }),
    )
    .min(1)
    .max(500),
});

export const Route = createFileRoute("/api/public/n8n/postings/upsert")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { checkN8nSecret, json } = await import("@/lib/n8n.server");
        const denied = checkN8nSecret(request);
        if (denied) return denied;

        let parsed;
        try {
          parsed = bodySchema.parse(await request.json());
        } catch {
          return json({ error: "Invalid body" }, 400);
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Which (company_id, source_url) pairs already exist?
        const urls = parsed.postings.map((p) => p.source_url);
        const { data: existing, error: existingError } = await supabaseAdmin
          .from("postings")
          .select("id, company_id, source_url")
          .in("source_url", urls);
        if (existingError) {
          console.error("[n8n/postings/upsert] lookup", existingError);
          return json({ error: "Query failed" }, 500);
        }
        const seen = new Set((existing ?? []).map((r) => `${r.company_id}|${r.source_url}`));

        const rows = parsed.postings.map((p) => ({
          company_id: p.company_id,
          title: p.title,
          location: p.location ?? null,
          date_posted: p.date_posted ?? null,
          source_url: p.source_url,
        }));

        const { data: upserted, error } = await supabaseAdmin
          .from("postings")
          .upsert(rows, { onConflict: "company_id,source_url" })
          .select("id, company_id, source_url");
        if (error) {
          console.error("[n8n/postings/upsert]", error);
          return json({ error: "Upsert failed" }, 500);
        }

        const results = (upserted ?? []).map((r) => ({
          id: r.id,
          source_url: r.source_url,
          is_new: !seen.has(`${r.company_id}|${r.source_url}`),
        }));

        return json({ results });
      },
    },
  },
});
