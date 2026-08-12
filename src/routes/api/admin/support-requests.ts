import { createFileRoute } from "@tanstack/react-router";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export const Route = createFileRoute("/api/admin/support-requests")({
  server: {
    handlers: {
      GET: async ({ request }) => {
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

        const { data, error } = await supabaseAdmin
          .from("support_requests")
          .select("id, email, message, category, urgency, status, created_at, triaged_at")
          .order("created_at", { ascending: false })
          .limit(100);
        if (error) {
          return json({ error: "Query failed", detail: error.message }, 500);
        }

        return json({ requests: data ?? [] });
      },
    },
  },
});
