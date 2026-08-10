export const ALLOWED_DOMAINS = [
  "kellogg.northwestern.edu",
  "kelloggalumni.northwestern.edu",
] as const;

export function emailDomain(email: string): string {
  return email.trim().toLowerCase().split("@")[1] ?? "";
}

export function isKelloggEmail(email: string): boolean {
  return (ALLOWED_DOMAINS as readonly string[]).includes(emailDomain(email));
}

export const DOMAIN_ERROR =
  "Use your Kellogg email (@kellogg.northwestern.edu or @kelloggalumni.northwestern.edu).";

/* ---------------------------------------------------------------------------
 * TAXONOMY — must match the values written by classification exactly.
 * ------------------------------------------------------------------------- */

export const TARGET_FUNCTIONS = [
  "Product Management",
  "Product Marketing",
  "Brand/Growth Marketing",
  "Strategy & Corporate Development",
  "Consulting/Internal Strategy",
  "Business Development/Partnerships",
  "Investment Banking/Corporate Finance",
  "Private Equity/Venture Capital",
  "Sales/Account Management",
  "Customer Success",
  "Operations/Supply Chain",
  "General Management/Rotational",
  "Data Science/Analytics",
  "Finance/FP&A",
  "People/HR",
  "Design/UX",
] as const;

export const TARGET_LEVELS = [
  "Entry-Level / Associate",
  "Mid-Level / Manager",
  "Senior / Director",
  "Executive / VP+",
] as const;

// Same 8-value list enforced by the check constraint on users.program and
// alum_profiles.program (2026-08-10) -- keep these in sync.
export const PROGRAMS = [
  "Full-Time MBA",
  "Part-Time MBA",
  "Evening & Weekend MBA",
  "1-Year MBA",
  "MiM",
  "MBAi",
  "MMM",
  "Other",
] as const;

export function daysSince(dateISO: string | null): number | null {
  if (!dateISO) return null;
  const then = new Date(`${dateISO}T00:00:00Z`).getTime();
  if (Number.isNaN(then)) return null;
  return Math.max(0, Math.floor((Date.now() - then) / 86_400_000));
}
