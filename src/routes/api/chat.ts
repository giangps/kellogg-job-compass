import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

// Kept short and hardcoded on purpose -- the FAQ surface is small and
// stable, so a vector DB / RAG setup would be pure overhead. Anything
// outside this scope should be turned away toward Contact Us rather than
// guessed at, both for answer quality and to keep this cheap to run.
const SYSTEM_PROMPT = `You are the support chatbot for the Kellogg Recruiting Copilot, a job-search tool for Kellogg MBA students and alumni referrers. Answer ONLY using the facts below. If a question is outside these facts, say you're not sure and point the user to the "Contact us" page instead of guessing. Keep answers to 2-3 sentences.

Facts:
- The Feed shows job postings ranked by a priority score based on how fresh the posting is, whether cohort-mates have applied, and alumni overlap at that company in your target function.
- Users set a target function and level under Preferences, which the Feed uses to rank and can also be used to filter.
- Clicking "I applied" on a posting logs it under "My applications" and updates the shared applicant count other users see.
- The Alumni network page lets job seekers browse Kellogg alumni at companies with open postings and request an introduction/referral; alumni (referrers) accept or decline requests from their own dashboard.
- To reach the founder directly with a bug, question, or anything else, use the "Contact us" page in the nav.`;

const bodySchema = z.object({
  message: z.string().trim().min(1).max(2000),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(2000) }))
    .max(6)
    .optional(),
});

export const Route = createFileRoute("/api/chat")({
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

        const apiKey = process.env["ANTHROPIC_API_KEY"];
        if (!apiKey) return json({ error: "Chat is not configured" }, 503);

        const { default: Anthropic } = await import("@anthropic-ai/sdk");
        const anthropic = new Anthropic({ apiKey });

        try {
          const response = await anthropic.messages.create({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 300,
            system: SYSTEM_PROMPT,
            messages: [
              ...(parsed.history ?? []).map((m) => ({ role: m.role, content: m.content })),
              { role: "user" as const, content: parsed.message },
            ],
          });
          const reply = response.content.find((block) => block.type === "text");
          return json({ reply: reply && "text" in reply ? reply.text : "" });
        } catch (err) {
          console.error("[chat]", err);
          return json({ error: "Chat request failed" }, 500);
        }
      },
    },
  },
});
