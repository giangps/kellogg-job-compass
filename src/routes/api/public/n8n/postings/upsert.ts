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
        description: z.string().trim().max(20000).nullish(),
      }),
    )
    .min(1)
    .max(2000),
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
        } catch (err) {
          if (err instanceof z.ZodError) {
            return json(
              {
                error: "Invalid body",
                issues: err.issues.slice(0, 20).map((i) => ({
                  path: i.path.join("."),
                  message: i.message,
                })),
                issue_count: err.issues.length,
              },
              400,
            );
          }
          return json({ error: "Invalid body", issues: [{ path: "", message: "Malformed JSON" }] }, 400);
        }


        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Dedupe within the batch: a repeated (company_id, source_url) pair makes
        // Postgres reject the whole statement ("cannot affect row a second time").
        const byKey = new Map<string, (typeof parsed.postings)[number]>();
        for (const p of parsed.postings) byKey.set(`${p.company_id}|${p.source_url}`, p);
        const postings = [...byKey.values()];
        const duplicates_in_batch = parsed.postings.length - postings.length;

        // Which (company_id, source_url) pairs already exist?
        // Chunked: PostgREST puts `in.(...)` filters in the URL, so a single
        // 979-item lookup exceeds the max URL length and fails at the transport layer.
        const urls = postings.map((p) => p.source_url);
        const seen = new Set<string>();
        const CHUNK = 100;
        for (let i = 0; i < urls.length; i += CHUNK) {
          const { data: existing, error: existingError } = await supabaseAdmin
            .from("postings")
            .select("id, company_id, source_url")
            .in("source_url", urls.slice(i, i + CHUNK));
          if (existingError) {
            console.error("[n8n/postings/upsert] lookup", existingError);
            return json({ error: "Query failed", detail: existingError.message }, 500);
          }
          for (const r of existing ?? []) seen.add(`${r.company_id}|${r.source_url}`);
        }

        const rows = postings.map((p) => ({
          company_id: p.company_id,
          title: p.title,
          location: p.location ?? null,
          date_posted: p.date_posted ?? null,
          source_url: p.source_url,
          description: p.description ?? null,
        }));

        const results: { id: string; source_url: string; is_new: boolean }[] = [];
        for (let i = 0; i < rows.length; i += 500) {
          const { data: upserted, error } = await supabaseAdmin
            .from("postings")
            .upsert(rows.slice(i, i + 500), { onConflict: "company_id,source_url" })
            .select("id, company_id, source_url");
          if (error) {
            console.error("[n8n/postings/upsert]", error);
            return json({ error: "Upsert failed", detail: error.message }, 500);
          }
          for (const r of upserted ?? []) {
            results.push({
              id: r.id,
              source_url: r.source_url,
              is_new: !seen.has(`${r.company_id}|${r.source_url}`),
            });
          }
        }

        return json({ results, duplicates_in_batch });

      },
    },
  },
});
