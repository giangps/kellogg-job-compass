import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { useMemo, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { TARGET_FUNCTIONS } from "@/lib/kellogg";

export const Route = createFileRoute("/_authenticated/alumni")({
  head: () => ({
    meta: [
      { title: "Alumni Network — Kellogg Recruiting Copilot" },
      {
        name: "description",
        content: "Kellogg alumni willing to field a coffee chat or referral request.",
      },
    ],
  }),
  component: AlumniPage,
});

const selectClass =
  "rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring";

type AlumRow = {
  id: string;
  name: string | null;
  linkedinUrl: string | null;
  companyId: string | null;
  companyName: string;
  function: string | null;
  seniority: string | null;
  program: string | null;
  graduationYear: number | null;
};

type RequestState = {
  id: string;
  status: "pending" | "accepted" | "declined";
  outcome: string | null;
};

const OUTCOME_OPTIONS: { value: string; label: string }[] = [
  { value: "chatted", label: "Chatted" },
  { value: "referred", label: "Referred me" },
  { value: "no_response", label: "No response" },
];

function AlumniPage() {
  const queryClient = useQueryClient();
  const [companyFilter, setCompanyFilter] = useState("");
  const [functionFilter, setFunctionFilter] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<{ alumId: string; message: string } | null>(
    null,
  );

  const profileQuery = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return null;
      return auth.user;
    },
  });

  const companiesQuery = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const { data, error } = await supabase.from("companies").select("id, name").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const alumniQuery = useQuery({
    queryKey: ["alum-directory"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alum_directory")
        .select("id, name, linkedin_url, company_id, function, seniority, program, graduation_year");
      if (error) throw error;
      return data ?? [];
    },
  });

  const myRequestsQuery = useQuery({
    queryKey: ["my-connection-requests"],
    enabled: Boolean(profileQuery.data?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("connection_requests")
        .select("id, alum_id, status, outcome")
        .eq("job_seeker_id", profileQuery.data!.id);
      if (error) throw error;
      return data ?? [];
    },
  });

  const contactQuery = useQuery({
    queryKey: ["alum-contact-unlocked"],
    enabled: Boolean(profileQuery.data?.id),
    queryFn: async () => {
      const { data, error } = await supabase.from("alum_contact_unlocked").select("alum_id, email, phone");
      if (error) throw error;
      return data ?? [];
    },
  });

  const companyNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of companiesQuery.data ?? []) map.set(c.id, c.name);
    return map;
  }, [companiesQuery.data]);

  const requestByAlumId = useMemo(() => {
    const map = new Map<string, RequestState>();
    for (const r of myRequestsQuery.data ?? []) {
      if (r.alum_id) map.set(r.alum_id, { id: r.id, status: r.status, outcome: r.outcome });
    }
    return map;
  }, [myRequestsQuery.data]);

  const contactByAlumId = useMemo(() => {
    const map = new Map<string, { email: string | null; phone: string | null }>();
    for (const c of contactQuery.data ?? []) {
      if (c.alum_id) map.set(c.alum_id, { email: c.email, phone: c.phone });
    }
    return map;
  }, [contactQuery.data]);

  const rows: AlumRow[] = useMemo(() => {
    return (alumniQuery.data ?? [])
      .map((a) => ({
        id: a.id!,
        name: a.name,
        linkedinUrl: a.linkedin_url,
        companyId: a.company_id,
        companyName: a.company_id ? (companyNameById.get(a.company_id) ?? "—") : "—",
        function: a.function,
        seniority: a.seniority,
        program: a.program,
        graduationYear: a.graduation_year,
      }))
      .filter((a) => !companyFilter || a.companyId === companyFilter)
      .filter((a) => !functionFilter || a.function === functionFilter);
  }, [alumniQuery.data, companyNameById, companyFilter, functionFilter]);

  async function requestConnection(alumId: string) {
    if (!profileQuery.data?.id) return;
    setPendingId(alumId);
    setRequestError(null);
    try {
      const { error } = await supabase
        .from("connection_requests")
        .insert({ job_seeker_id: profileQuery.data.id, alum_id: alumId });
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["my-connection-requests"] });
    } catch (err) {
      setRequestError({
        alumId,
        message: err instanceof Error ? err.message : "Could not send this request.",
      });
    } finally {
      setPendingId(null);
    }
  }

  async function logOutcome(requestId: string, outcome: string) {
    const { error } = await supabase
      .from("connection_requests")
      .update({ outcome, outcome_reported_at: new Date().toISOString() })
      .eq("id", requestId);
    if (!error) {
      await queryClient.invalidateQueries({ queryKey: ["my-connection-requests"] });
    }
  }

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight text-foreground">Alumni network</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Self-registered Kellogg alumni willing to field a coffee chat or referral request.
        Contact info stays hidden until they accept.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <select
          value={companyFilter}
          onChange={(e) => setCompanyFilter(e.target.value)}
          className={selectClass}
        >
          <option value="">All companies</option>
          {(companiesQuery.data ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={functionFilter}
          onChange={(e) => setFunctionFilter(e.target.value)}
          className={selectClass}
        >
          <option value="">All functions</option>
          {TARGET_FUNCTIONS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </div>

      {alumniQuery.isLoading ? (
        <p className="mt-6 text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-border p-6 text-center">
          <p className="text-sm text-muted-foreground">No alumni match these filters yet.</p>
        </div>
      ) : (
        <ul className="mt-5 space-y-3">
          {rows.map((a) => (
            <AlumCard
              key={a.id}
              alum={a}
              request={requestByAlumId.get(a.id)}
              contact={contactByAlumId.get(a.id)}
              pending={pendingId === a.id}
              error={requestError?.alumId === a.id ? requestError.message : null}
              onRequest={() => requestConnection(a.id)}
              onLogOutcome={(outcome) => {
                const req = requestByAlumId.get(a.id);
                if (req) void logOutcome(req.id, outcome);
              }}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function AlumCard({
  alum,
  request,
  contact,
  pending,
  error,
  onRequest,
  onLogOutcome,
}: {
  alum: AlumRow;
  request: RequestState | undefined;
  contact: { email: string | null; phone: string | null } | undefined;
  pending: boolean;
  error: string | null;
  onRequest: () => void;
  onLogOutcome: (outcome: string) => void;
}) {
  return (
    <li className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{alum.name}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {[alum.companyName, alum.function, alum.seniority].filter(Boolean).join(" · ")}
          </p>
          {alum.linkedinUrl && (
            <a
              href={alum.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1.5 inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              LinkedIn <ExternalLink className="size-3" aria-hidden />
            </a>
          )}
        </div>
      </div>

      <div className="mt-3">
        {!request && (
          <button
            onClick={onRequest}
            disabled={pending}
            className="rounded-lg border border-primary px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-60"
          >
            {pending ? "Sending…" : "Request connection"}
          </button>
        )}
        {request?.status === "pending" && (
          <span className="inline-flex rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-foreground">
            Requested — awaiting response
          </span>
        )}
        {request?.status === "declined" && (
          <span className="inline-flex rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
            Declined
          </span>
        )}
        {request?.status === "accepted" && (
          <div className="space-y-2">
            <div className="rounded-lg bg-primary/10 px-3 py-2 text-xs text-primary">
              {contact?.email && <p>{contact.email}</p>}
              {contact?.phone && <p>{contact.phone}</p>}
            </div>
            {!request.outcome ? (
              <div className="flex flex-wrap gap-1.5">
                <span className="text-xs text-muted-foreground">How&apos;d it go?</span>
                {OUTCOME_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    onClick={() => onLogOutcome(o.value)}
                    className="rounded-full border border-input px-2.5 py-1 text-xs text-foreground transition-colors hover:bg-accent"
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Logged: {OUTCOME_OPTIONS.find((o) => o.value === request.outcome)?.label ?? request.outcome}
              </p>
            )}
          </div>
        )}
        {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
      </div>
    </li>
  );
}
