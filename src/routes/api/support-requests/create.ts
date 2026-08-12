import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const bodySchema = z.object({
  message: z.string().trim().min(1).max(4000),
});

// Fire the n8n "Support Triage" webhook and give it a short budget -- the
// row is already saved by the time this runs, so a slow/unreachable n8n
// just means the request stays untriaged in /admin rather than failing the
// user's submission.
async function notifyN8n(supportRequestId: string, email: string, message: string) {
  const url = process.env["N8N_SUPPORT_WEBHOOK_URL"];
  const secret = process.env["N8N_SHARED_SECRET"];
  if (!url || !secret) return;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", "x-n8n-secret": secret },
      body: JSON.stringify({ support_request_id: supportRequestId, email, message }),
      signal: controller.signal,
    });
  } catch (err) {
    console.error("[support-requests/create] n8n notify failed", err);
  } finally {
    clearTimeout(timeout);
  }
}

export const Route = createFileRoute("/api/support-requests/create")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const authHeader = request.headers.get("authorization") ?? "";
        const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
        if (!token) return json({ error: "Unauthorized" }, 401);

        const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
        if (authError || !authData.user) return json({ error: "Unauthorized" }, 401);

        let parsed;
        try {
          parsed = bodySchema.parse(await request.json());
        } catch {
          return json({ error: "Invalid body" }, 400);
        }

        const email = authData.user.email ?? "";
        const { data: row, error } = await supabaseAdmin
          .from("support_requests")
          .insert({ user_id: authData.user.id, email, message: parsed.message })
          .select("id")
          .single();
        if (error) {
          console.error("[support-requests/create]", error);
          return json({ error: "Insert failed" }, 500);
        }

        await notifyN8n((row as { id: string }).id, email, parsed.message);

        return json({ ok: true });
      },
    },
  },
});
