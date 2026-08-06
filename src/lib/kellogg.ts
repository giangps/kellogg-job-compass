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
 * PLACEHOLDER DATA + LOCAL STATE
 * Temporary only: replaced by the real tables/RLS in the upcoming migration.
 * ------------------------------------------------------------------------- */

export type Posting = {
  id: string;
  company: string;
  title: string;
  location: string;
  postedDaysAgo: number;
  priorityScore: number;
  /** Aggregate count across the cohort. Never expose names. */
  networkApplied: number;
  /** Boolean signal only — no names, no counts of people. */
  alumniOverlap: boolean;
};

export const MOCK_POSTINGS: Posting[] = [
  {
    id: "p1",
    company: "McKinsey & Company",
    title: "Associate, Strategy & Corporate Finance",
    location: "Chicago, IL",
    postedDaysAgo: 3,
    priorityScore: 92,
    networkApplied: 6,
    alumniOverlap: true,
  },
  {
    id: "p2",
    company: "Stripe",
    title: "Product Manager, Payments",
    location: "San Francisco, CA (Hybrid)",
    postedDaysAgo: 8,
    priorityScore: 88,
    networkApplied: 4,
    alumniOverlap: true,
  },
  {
    id: "p3",
    company: "Kraft Heinz",
    title: "Senior Brand Manager",
    location: "Chicago, IL",
    postedDaysAgo: 1,
    priorityScore: 84,
    networkApplied: 2,
    alumniOverlap: false,
  },
  {
    id: "p4",
    company: "Amazon",
    title: "Senior Product Manager, Retail",
    location: "Seattle, WA",
    postedDaysAgo: 14,
    priorityScore: 76,
    networkApplied: 9,
    alumniOverlap: true,
  },
  {
    id: "p5",
    company: "Bain Capital",
    title: "Investment Associate",
    location: "Boston, MA",
    postedDaysAgo: 21,
    priorityScore: 71,
    networkApplied: 1,
    alumniOverlap: false,
  },
  {
    id: "p6",
    company: "Deloitte Consulting",
    title: "Manager, Operations Transformation",
    location: "New York, NY",
    postedDaysAgo: 5,
    priorityScore: 68,
    networkApplied: 3,
    alumniOverlap: true,
  },
];

export type Preferences = { targetFunction: string; targetLevel: string };

const PREFS_KEY = "krc.preferences";
const APPS_KEY = "krc.applications";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function getPreferences(): Preferences | null {
  return read<Preferences | null>(PREFS_KEY, null);
}

export function savePreferences(prefs: Preferences) {
  window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

export type LoggedApplication = { postingId: string; appliedAt: string };

export function getApplications(): LoggedApplication[] {
  return read<LoggedApplication[]>(APPS_KEY, []);
}

export function logApplication(postingId: string): LoggedApplication[] {
  const existing = getApplications();
  if (existing.some((a) => a.postingId === postingId)) return existing;
  const next = [...existing, { postingId, appliedAt: new Date().toISOString() }];
  window.localStorage.setItem(APPS_KEY, JSON.stringify(next));
  return next;
}

/**
 * Count shown back to a viewer excludes their own application, so the number
 * always reads as "other people in the network".
 */
export function othersAppliedCount(posting: Posting, viewerApplied: boolean): number {
  return Math.max(0, posting.networkApplied - (viewerApplied ? 1 : 0));
}
