import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { UserAvatar } from "@/components/UserAvatar";

export const Route = createFileRoute("/_authenticated/alum/$alumId")({
  head: () => ({
    meta: [
      { title: "Alum Profile — Kellogg Recruiting Copilot" },
      {
        name: "description",
        content: "Kellogg alum profile: company, function, seniority, and LinkedIn.",
      },
      { property: "og:title", content: "Alum Profile" },
      {
        property: "og:description",
        content: "Kellogg alum profile with company, function, and seniority.",
      },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AlumDetailPage,
});

function AlumDetailPage() {
  const { alumId } = useParams({ from: "/_authenticated/alum/$alumId" });

  const alumQuery = useQuery({
    queryKey: ["alum-detail", alumId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alum_directory")
        .select("id, name, linkedin_url, avatar_url, company_id, function, seniority, program, graduation_year")
        .eq("id", alumId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const companyQuery = useQuery({
    queryKey: ["company", alumQuery.data?.company_id],
    enabled: Boolean(alumQuery.data?.company_id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("name")
        .eq("id", alumQuery.data!.company_id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const requestQuery = useQuery({
    queryKey: ["alum-request", alumId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("connection_requests")
        .select("id, status")
        .eq("alum_id", alumId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const contactQuery = useQuery({
    queryKey: ["alum-contact-unlocked"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alum_contact_unlocked")
        .select("alum_id, email, phone");
      if (error) throw error;
      return data ?? [];
    },
  });

  const alum = alumQuery.data;
  const contact = (contactQuery.data ?? []).find((c) => c.alum_id === alumId);

  return (
    <div>
      <Link
        to="/alumni"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        Back to alumni network
      </Link>

      {alumQuery.isLoading ? (
        <p className="mt-6 text-sm text-muted-foreground">Loading…</p>
      ) : !alum ? (
        <p className="mt-6 text-sm text-muted-foreground">This alum profile isn&apos;t available.</p>
      ) : (
        <div className="mt-4 rounded-xl border border-border bg-card p-5">
          <div className="flex items-start gap-4">
            <UserAvatar path={alum.avatar_url} name={alum.name} className="size-16 text-base" />
            <div className="min-w-0">
              <h1 className="text-lg font-semibold tracking-tight text-foreground">{alum.name}</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {[companyQuery.data?.name, alum.function, alum.seniority].filter(Boolean).join(" · ")}
              </p>
              {(alum.program || alum.graduation_year) && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Kellogg {[alum.program, alum.graduation_year].filter(Boolean).join(" · ")}
                </p>
              )}
              {alum.linkedin_url && (
                <a
                  href={alum.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  LinkedIn <ExternalLink className="size-3" aria-hidden />
                </a>
              )}
            </div>
          </div>

          <div className="mt-5 border-t border-border pt-4">
            {requestQuery.data?.status === "accepted" ? (
              <div className="rounded-lg bg-primary/10 px-3 py-2 text-xs text-primary">
                {contact?.email && <p>{contact.email}</p>}
                {contact?.phone && <p>{contact.phone}</p>}
                {!contact?.email && !contact?.phone && <p>Connection accepted.</p>}
              </div>
            ) : requestQuery.data?.status === "pending" ? (
              <p className="text-xs text-muted-foreground">
                Connection requested — contact details unlock if they accept.
              </p>
            ) : requestQuery.data?.status === "declined" ? (
              <p className="text-xs text-muted-foreground">This request was declined.</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Request a connection from the alumni network list to unlock contact details.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
