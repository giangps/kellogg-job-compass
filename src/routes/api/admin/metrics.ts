import { createFileRoute } from "@tanstack/react-router";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export const Route = createFileRoute("/api/admin/metrics")({
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
        if (callerError) {
          console.error("[admin/metrics] caller lookup", callerError);
          return json({ error: "Query failed" }, 500);
        }
        // is_admin isn't in the generated types yet -- see apply_admin_flag.sql.
        if (!(caller as { is_admin: boolean } | null)?.is_admin) {
          return json({ error: "Forbidden" }, 403);
        }

        try {
          const metrics = await computeMetrics(supabaseAdmin);
          return json(metrics);
        } catch (err) {
          console.error("[admin/metrics]", err);
          return json({ error: "Query failed" }, 500);
        }
      },
    },
  },
});

async function countRows(
  admin: any,
  table: string,
  modify?: (q: any) => any,
): Promise<number> {
  let q = admin.from(table).select("id", { count: "exact", head: true });
  if (modify) q = modify(q);
  const { count, error } = await q;
  if (error) throw error;
  return count ?? 0;
}

async function computeMetrics(admin: any) {
  const now = Date.now();
  const oneDayAgo = new Date(now - 1 * 86_400_000).toISOString();
  const sevenDaysAgo = new Date(now - 7 * 86_400_000).toISOString();

  const [
    totalJobSeekers,
    totalReferrers,
    jobSeekersWithPrefs,
    jobSeekersWithProfile,
    referrersWithProfile,
    newJobSeekers7d,
    newReferrers7d,
    totalPostings,
    classifiedPostings,
    postingsWithDescription,
    postingsIngested24h,
    postingsIngested7d,
    totalApplications,
    applications7d,
    connectionRequestsRes,
    applicantRowsRes,
    appOverlapRowsRes,
    overlapRowsRes,
    companyRowsRes,
  ] = await Promise.all([
    countRows(admin, "users"),
    countRows(admin, "alum_profiles"),
    countRows(admin, "users", (q) =>
      q.not("target_function", "is", null).not("target_level", "is", null),
    ),
    countRows(admin, "users", (q) => q.not("name", "is", null)),
    countRows(admin, "alum_profiles", (q) => q.not("name", "is", null)),
    countRows(admin, "users", (q) => q.gte("created_at", sevenDaysAgo)),
    countRows(admin, "alum_profiles", (q) => q.gte("created_at", sevenDaysAgo)),
    countRows(admin, "postings"),
    countRows(admin, "postings", (q) => q.not("function_tag", "is", null)),
    countRows(admin, "postings", (q) => q.not("description", "is", null)),
    countRows(admin, "postings", (q) => q.gte("created_at", oneDayAgo)),
    countRows(admin, "postings", (q) => q.gte("created_at", sevenDaysAgo)),
    countRows(admin, "applications"),
    countRows(admin, "applications", (q) => q.gte("date_applied", sevenDaysAgo)),
    admin.from("connection_requests").select("status"),
    admin.from("applications").select("user_id"),
    admin.from("applications").select("postings(posting_alumni_overlap(overlap_count))"),
    admin.from("posting_alumni_overlap").select("overlap_count").gt("overlap_count", 0),
    admin.from("companies").select("name, active, postings(count)").order("name"),
  ]);

  if (connectionRequestsRes.error) throw connectionRequestsRes.error;
  if (applicantRowsRes.error) throw applicantRowsRes.error;
  if (appOverlapRowsRes.error) throw appOverlapRowsRes.error;
  if (overlapRowsRes.error) throw overlapRowsRes.error;
  if (companyRowsRes.error) throw companyRowsRes.error;

  const requests = connectionRequestsRes.data ?? [];
  const pending = requests.filter((r: any) => r.status === "pending").length;
  const accepted = requests.filter((r: any) => r.status === "accepted").length;
  const declined = requests.filter((r: any) => r.status === "declined").length;
  const responded = accepted + declined;

  const distinctApplicants = new Set(
    (applicantRowsRes.data ?? []).map((r: any) => r.user_id),
  ).size;

  const networkAssistedApplications = (appOverlapRowsRes.data ?? []).filter((r: any) => {
    const posting = Array.isArray(r.postings) ? r.postings[0] : r.postings;
    const overlap = posting
      ? Array.isArray(posting.posting_alumni_overlap)
        ? posting.posting_alumni_overlap[0]
        : posting.posting_alumni_overlap
      : null;
    return (overlap?.overlap_count ?? 0) > 0;
  }).length;

  const postingsWithOverlap = (overlapRowsRes.data ?? []).length;

  const perCompany = (companyRowsRes.data ?? [])
    .map((c: any) => {
      const postingsField = Array.isArray(c.postings) ? c.postings[0] : c.postings;
      return {
        name: c.name as string,
        active: c.active as boolean,
        postings: postingsField?.count ?? 0,
      };
    })
    .sort((a: any, b: any) => b.postings - a.postings);

  return {
    generatedAt: new Date().toISOString(),
    signups: {
      totalJobSeekers,
      totalReferrers,
      jobSeekersWithPrefs,
      jobSeekersWithProfile,
      referrersWithProfile,
      newJobSeekers7d,
      newReferrers7d,
    },
    postings: {
      totalPostings,
      classifiedPostings,
      postingsWithDescription,
      postingsIngested24h,
      postingsIngested7d,
      perCompany,
    },
    applications: {
      totalApplications,
      applications7d,
      distinctApplicants,
      pctJobSeekersWhoApplied:
        totalJobSeekers > 0 ? distinctApplicants / totalJobSeekers : null,
      networkAssistedApplications,
      pctNetworkAssisted:
        totalApplications > 0 ? networkAssistedApplications / totalApplications : null,
    },
    referrers: {
      totalConnectionRequests: requests.length,
      pending,
      accepted,
      declined,
      acceptanceRate: responded > 0 ? accepted / responded : null,
      postingsWithOverlap,
      pctPostingsWithOverlap: totalPostings > 0 ? postingsWithOverlap / totalPostings : null,
    },
  };
}
