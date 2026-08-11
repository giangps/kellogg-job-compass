import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { UserAvatar } from "@/components/UserAvatar";

export const Route = createFileRoute("/referrer/seeker/$seekerId")({
  head: () => ({
    meta: [
      { title: "Job Seeker Profile — Kellogg Recruiting Copilot" },
      {
        name: "description",
        content: "Profile of the Kellogg job seeker who requested to connect with you.",
      },
      { property: "og:title", content: "Job Seeker Profile" },
      {
        property: "og:description",
        content: "Target role, program, and work history of a Kellogg job seeker.",
      },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SeekerProfilePage,
});

function SeekerProfilePage() {
  const { seekerId } = useParams({ from: "/referrer/seeker/$seekerId" });

  const seekerQuery = useQuery({
    queryKey: ["seeker-profile", seekerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_seeker_profile_for_alum")
        .select("id, name, avatar_url, program, graduation_year, target_function, target_level")
        .eq("id", seekerId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const experienceQuery = useQuery({
    queryKey: ["seeker-experience", seekerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_seeker_experience_for_alum")
        .select("id, company_name, role_title, start_date, end_date")
        .eq("user_id", seekerId);
      if (error) throw error;
      return data ?? [];
    },
  });

  const seeker = seekerQuery.data;

  return (
    <div>
      <Link
        to="/referrer/inbox"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        Back to inbox
      </Link>

      {seekerQuery.isLoading ? (
        <p className="mt-6 text-sm text-muted-foreground">Loading…</p>
      ) : !seeker ? (
        <p className="mt-6 text-sm text-muted-foreground">This profile isn&apos;t available.</p>
      ) : (
        <div className="mt-4 space-y-5">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-start gap-4">
              <UserAvatar path={seeker.avatar_url} name={seeker.name} className="size-16 text-base" />
              <div className="min-w-0">
                <h1 className="text-lg font-semibold tracking-tight text-foreground">
                  {seeker.name ?? "A cohort member"}
                </h1>
                {(seeker.program || seeker.graduation_year) && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Kellogg {[seeker.program, seeker.graduation_year].filter(Boolean).join(" · ")}
                  </p>
                )}
                {(seeker.target_function || seeker.target_level) && (
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    Targeting{" "}
                    <span className="text-foreground">
                      {[seeker.target_function, seeker.target_level].filter(Boolean).join(" · ")}
                    </span>
                  </p>
                )}
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-foreground">Work experience</h2>
            {experienceQuery.isLoading ? (
              <p className="mt-2 text-sm text-muted-foreground">Loading…</p>
            ) : (experienceQuery.data ?? []).length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">Nothing listed yet.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {(experienceQuery.data ?? []).map((x) => (
                  <li key={x.id} className="rounded-lg border border-border bg-card px-3 py-2">
                    <p className="text-sm font-medium text-foreground">{x.role_title}</p>
                    <p className="text-xs text-muted-foreground">
                      {x.company_name}
                      {(x.start_date || x.end_date) &&
                        ` · ${x.start_date ?? "?"} – ${x.end_date ?? "Present"}`}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
