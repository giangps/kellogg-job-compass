// Server-only helpers for the n8n automation endpoints.

export function checkN8nSecret(request: Request): Response | null {
  const expected = process.env["N8N_SHARED_SECRET"];
  if (!expected) return new Response("Endpoint not configured", { status: 503 });

  const provided = request.headers.get("x-n8n-secret") ?? "";
  if (!timingSafeEqualStr(provided, expected)) {
    return new Response("Unauthorized", { status: 401 });
  }
  return null;
}

function timingSafeEqualStr(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  if (ab.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ab.length; i++) diff |= ab[i]! ^ bb[i]!;
  return diff === 0;
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/** Recompute + upsert the alumni overlap count for a posting. */
export async function refreshOverlap(
  admin: {
    from: (t: string) => any;
  },
  postingId: string,
  companyId: string,
  functionTag: string,
): Promise<number> {
  const { count, error } = await admin
    .from("alumni_contacts")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("function", functionTag);
  if (error) throw error;

  const overlap = count ?? 0;
  const { error: upsertError } = await admin
    .from("posting_alumni_overlap")
    .upsert({ posting_id: postingId, overlap_count: overlap }, { onConflict: "posting_id" });
  if (upsertError) throw upsertError;
  return overlap;
}
