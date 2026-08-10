import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, X } from "lucide-react";
import { useState } from "react";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/referrer/inbox")({
  head: () => ({
    meta: [
      { title: "Inbox — Kellogg Recruiting Copilot" },
      {
        name: "description",
        content: "Connection requests from job seekers in the Kellogg cohort.",
      },
    ],
  }),
  component: InboxPage,
});

function InboxPage() {
  const queryClient = useQueryClient();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const profileQuery = useQuery({
    queryKey: ["alum-profile"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return null;
      const { data, error } = await supabase
        .from("alum_profiles")
        .select("id, name")
        .eq("id", auth.user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const requestsQuery = useQuery({
    queryKey: ["connection-requests-inbox"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("connection_requests_for_alum")
        .select("id, job_seeker_id, job_seeker_name, status, requested_at, responded_at, outcome")
        .order("requested_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  async function respond(id: string, status: "accepted" | "declined") {
    setPendingId(id);
    try {
      const { error } = await supabase
        .from("connection_requests")
        .update({ status, responded_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["connection-requests-inbox"] });
    } finally {
      setPendingId(null);
    }
  }

  const hasProfile = Boolean(profileQuery.data?.name);
  const requests = requestsQuery.data ?? [];

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight text-foreground">Inbox</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Job seekers who want to connect. Accepting shares your email/phone with them —
        declining shares nothing.
      </p>

      {!profileQuery.isLoading && !hasProfile && (
        <div className="mt-5 rounded-xl border border-dashed border-border p-4 text-sm">
          <p className="text-muted-foreground">
            Your profile isn&apos;t visible to job seekers yet — finish it to start receiving
            requests.
          </p>
          <Link
            to="/referrer/profile"
            className="mt-2 inline-flex rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Complete my profile
          </Link>
        </div>
      )}

      {requestsQuery.isLoading ? (
        <p className="mt-6 text-sm text-muted-foreground">Loading…</p>
      ) : requestsQuery.error ? (
        <p className="mt-6 text-sm text-destructive">
          Could not load requests. Try again shortly.
        </p>
      ) : requests.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-border p-6 text-center">
          <p className="text-sm text-muted-foreground">No requests yet.</p>
        </div>
      ) : (
        <ul className="mt-5 space-y-3">
          {requests.map((r) => (
            <li key={r.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{r.job_seeker_name ?? "A cohort member"}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Requested {r.requested_at ? new Date(r.requested_at).toLocaleDateString() : ""}
                  </p>
                </div>
                <StatusBadge status={r.status} />
              </div>

              {r.status === "pending" && (
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => respond(r.id!, "accepted")}
                    disabled={pendingId === r.id}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
                  >
                    <Check className="size-3.5" aria-hidden />
                    Accept
                  </button>
                  <button
                    onClick={() => respond(r.id!, "declined")}
                    disabled={pendingId === r.id}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-input px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-60"
                  >
                    <X className="size-3.5" aria-hidden />
                    Decline
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  const label = status === "accepted" ? "Accepted" : status === "declined" ? "Declined" : "Pending";
  const cls =
    status === "accepted"
      ? "bg-primary/10 text-primary"
      : status === "declined"
        ? "bg-muted text-muted-foreground"
        : "bg-accent text-foreground";
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${cls}`}>{label}</span>
  );
}
