import { createFileRoute } from "@tanstack/react-router";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

// Reserved for documentation/testing per RFC 2606 -- never delivers real
// mail, so these accounts can never accidentally reach a real inbox.
const EMAIL_DOMAIN = "example.com";
// Shared across every seeded account. Fine for throwaway @example.com test
// data -- never reuse this pattern for anything with a real email behind it.
const TEST_REFERRER_PASSWORD = "KelloggTest2026!";

const GREENHOUSE_COMPANIES = [
  "Airbnb", "Stripe", "Instacart", "Pinterest", "Coinbase", "Databricks",
  "Figma", "Robinhood", "Affirm", "Brex", "Reddit", "Roblox", "Squarespace",
  "Twilio", "Asana", "HubSpot", "Dropbox", "Peloton", "Chime", "DoorDash",
] as const;

// Second referrer per company rotates through this list, one function
// heavier per company than the last -- broadens taxonomy coverage beyond
// the Product Marketing seed everyone gets as their first referrer.
const SECONDARY_FUNCTIONS = [
  "Product Management",
  "Strategy & Corporate Development",
  "Business Development/Partnerships",
  "General Management/Rotational",
  "Data Science/Analytics",
  "Brand/Growth Marketing",
  "Consulting/Internal Strategy",
  "Operations/Supply Chain",
] as const;

const SENIORITIES = [
  "Mid-Level / Manager",
  "Senior / Director",
  "Mid-Level / Manager",
  "Executive / VP+",
] as const;

const FIRST_NAMES = [
  "Jordan", "Priya", "Michael", "Sofia", "David", "Wei", "Amara", "Lucas",
  "Elena", "Omar", "Rachel", "Kenji", "Isabella", "Noah", "Fatima", "Ryan",
  "Maya", "Carlos", "Grace", "Aditya", "Hannah", "Diego", "Zoe", "Sam",
  "Nina", "Ethan", "Leila", "Marcus", "Chloe", "Tariq", "Ava", "Jack",
  "Simone", "Felix", "Anya", "Trevor", "Mei", "Gabriel", "Olivia", "Idris",
] as const;

const LAST_NAMES = [
  "Lee", "Anand", "Chen", "Martinez", "Kim", "Zhang", "Okafor", "Rossi",
  "Petrova", "Haddad", "Patel", "Sato", "Ferreira", "Cohen", "Ahmed",
  "Sullivan", "Nguyen", "Reyes", "Novak", "Sharma", "Baptiste", "Torres",
  "Weiss", "Johnson", "Bianchi", "Osei", "Kowalski", "Fitzgerald", "Wang",
  "Andrade", "Larsen", "Mensah", "Vargas", "Iqbal", "Dubois", "Yamamoto",
  "Klein", "Rivera", "Holt", "Bello",
] as const;

type SeedProfile = {
  email: string;
  name: string;
  companyName: string;
  function: string;
  seniority: string;
  program: string;
  graduationYear: number;
};

function buildSeedProfiles(): SeedProfile[] {
  const profiles: SeedProfile[] = [];
  let nameIdx = 0;

  GREENHOUSE_COMPANIES.forEach((companyName, companyIdx) => {
    const slug = companyName.toLowerCase().replace(/[^a-z0-9]/g, "");

    // Referrer 1 -- always Product Marketing, guaranteeing overlap coverage
    // for that function across every active company.
    profiles.push({
      email: `test-referrer-${slug}-1@${EMAIL_DOMAIN}`,
      name: `${FIRST_NAMES[nameIdx % FIRST_NAMES.length]} ${LAST_NAMES[nameIdx % LAST_NAMES.length]}`,
      companyName,
      function: "Product Marketing",
      seniority: SENIORITIES[companyIdx % SENIORITIES.length]!,
      program: companyIdx % 5 === 0 ? "1-Year MBA" : "Full-Time MBA",
      graduationYear: 2018 + (companyIdx % 7),
    });
    nameIdx++;

    // Referrer 2 -- rotates through the broader function list.
    profiles.push({
      email: `test-referrer-${slug}-2@${EMAIL_DOMAIN}`,
      name: `${FIRST_NAMES[nameIdx % FIRST_NAMES.length]} ${LAST_NAMES[nameIdx % LAST_NAMES.length]}`,
      companyName,
      function: SECONDARY_FUNCTIONS[companyIdx % SECONDARY_FUNCTIONS.length]!,
      seniority: SENIORITIES[(companyIdx + 2) % SENIORITIES.length]!,
      program: companyIdx % 6 === 0 ? "MMM" : "Full-Time MBA",
      graduationYear: 2017 + (companyIdx % 8),
    });
    nameIdx++;
  });

  return profiles;
}

export const Route = createFileRoute("/api/admin/seed-referrers")({
  server: {
    handlers: {
      POST: async ({ request }) => {
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

        const { data: companyRows, error: companyError } = await supabaseAdmin
          .from("companies")
          .select("id, name")
          .in("name", GREENHOUSE_COMPANIES as unknown as string[]);
        if (companyError) return json({ error: "Query failed", detail: companyError.message }, 500);

        const companyIdByName = new Map((companyRows ?? []).map((c: any) => [c.name, c.id]));

        const profiles = buildSeedProfiles();
        const results: { email: string; status: "created" | "skipped" | "error"; detail?: string }[] = [];

        for (const p of profiles) {
          const companyId = companyIdByName.get(p.companyName);
          if (!companyId) {
            results.push({ email: p.email, status: "error", detail: `Unknown company ${p.companyName}` });
            continue;
          }

          const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: p.email,
            password: TEST_REFERRER_PASSWORD,
            email_confirm: true,
            user_metadata: { role: "referrer" },
          });

          if (createError) {
            if (createError.message?.toLowerCase().includes("already been registered")) {
              results.push({ email: p.email, status: "skipped", detail: "Account already exists" });
            } else {
              results.push({ email: p.email, status: "error", detail: createError.message });
            }
            continue;
          }

          const userId = created.user?.id;
          if (!userId) {
            results.push({ email: p.email, status: "error", detail: "No user id returned" });
            continue;
          }

          const { error: updateError } = await supabaseAdmin
            .from("alum_profiles")
            .update({
              name: p.name,
              company_id: companyId,
              function: p.function,
              seniority: p.seniority,
              program: p.program,
              graduation_year: p.graduationYear,
            })
            .eq("id", userId);

          if (updateError) {
            results.push({ email: p.email, status: "error", detail: updateError.message });
            continue;
          }

          const { error: contactError } = await supabaseAdmin.from("alumni_contacts").insert({
            name: p.name,
            company_id: companyId,
            function: p.function,
            seniority: p.seniority,
            source: "seed-referrers script",
          });
          if (contactError) {
            results.push({ email: p.email, status: "error", detail: `Profile ok, alumni_contacts failed: ${contactError.message}` });
            continue;
          }

          results.push({ email: p.email, status: "created" });
        }

        const overlapRecomputed = await recomputeOverlap(supabaseAdmin);

        return json({
          password: TEST_REFERRER_PASSWORD,
          created: results.filter((r) => r.status === "created").length,
          skipped: results.filter((r) => r.status === "skipped").length,
          errors: results.filter((r) => r.status === "error"),
          overlapPairsRecomputed: overlapRecomputed,
        });
      },
    },
  },
});

async function recomputeOverlap(admin: any): Promise<number> {
  const { data: postings, error } = await admin
    .from("postings")
    .select("id, company_id, function_tag")
    .not("function_tag", "is", null)
    .not("company_id", "is", null);
  if (error) throw error;

  const groups = new Map<string, { companyId: string; functionTag: string; postingIds: string[] }>();
  for (const p of postings ?? []) {
    const key = `${p.company_id}|${p.function_tag}`;
    if (!groups.has(key)) {
      groups.set(key, { companyId: p.company_id, functionTag: p.function_tag, postingIds: [] });
    }
    groups.get(key)!.postingIds.push(p.id);
  }

  for (const g of groups.values()) {
    const { count, error: countError } = await admin
      .from("alumni_contacts")
      .select("id", { count: "exact", head: true })
      .eq("company_id", g.companyId)
      .eq("function", g.functionTag);
    if (countError) throw countError;

    const rows = g.postingIds.map((id) => ({ posting_id: id, overlap_count: count ?? 0 }));
    for (let i = 0; i < rows.length; i += 500) {
      const { error: upsertError } = await admin
        .from("posting_alumni_overlap")
        .upsert(rows.slice(i, i + 500), { onConflict: "posting_id" });
      if (upsertError) throw upsertError;
    }
  }

  return groups.size;
}
