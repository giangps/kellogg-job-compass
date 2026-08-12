import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const bodySchema = z.object({
  support_request_id: z.string().uuid(),
  category: z.enum(["bug", "question", "account", "feature_request", "other"]),
  urgency: z.enum(["low", "normal", "high"]),
});

export const Route = createFileRoute("/api/public/n8n/support-requests/classification")({
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
        const { error } = await supabaseAdmin
          .from("support_requests")
          .update({
            category: parsed.category,
            urgency: parsed.urgency,
            triaged_at: new Date().toISOString(),
          })
          .eq("id", parsed.support_request_id);

        if (error) {
          console.error("[n8n/support-requests/classification]", error);
          return json({ error: "Update failed" }, 500);
        }

        return json({ tagged: true });
      },
    },
  },
});
