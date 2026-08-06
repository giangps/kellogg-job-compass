import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/n8n/companies")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { checkN8nSecret, json } = await import("@/lib/n8n.server");
        const denied = checkN8nSecret(request);
        if (denied) return denied;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin
          .from("companies")
          .select("id, name, ats_type, ats_feed_url")
          .eq("active", true)
          .eq("monitoring_method", "automated")
          .order("name");

        if (error) {
          console.error("[n8n/companies]", error);
          return json({ error: "Query failed" }, 500);
        }
        return json({ companies: data ?? [] });
      },
    },
  },
});
