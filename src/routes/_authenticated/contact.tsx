import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/contact")({
  head: () => ({
    meta: [
      { title: "Contact Us — Kellogg Recruiting Copilot" },
      {
        name: "description",
        content: "Send a message to the Kellogg Recruiting Copilot team.",
      },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      if (!token) throw new Error("Not signed in");
      const res = await fetch("/api/support-requests/create", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ message }),
      });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      setSent(true);
      setMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight text-foreground">Contact us</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Bug reports, questions, anything else — we read every message.
      </p>

      <form
        onSubmit={onSubmit}
        className="mt-6 space-y-4 rounded-xl border border-border bg-card p-4"
      >
        <div className="space-y-1.5">
          <label htmlFor="message" className="text-sm font-medium text-foreground">
            Your message
          </label>
          <textarea
            id="message"
            required
            minLength={1}
            maxLength={4000}
            rows={6}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="What's going on?"
            className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        {sent && (
          <p className="rounded-lg bg-primary/10 px-3 py-2 text-xs text-foreground">
            Sent — we'll get back to you.
          </p>
        )}
        <button
          type="submit"
          disabled={sending || message.trim().length === 0}
          className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          {sending ? "Sending…" : "Send message"}
        </button>
      </form>
    </div>
  );
}
