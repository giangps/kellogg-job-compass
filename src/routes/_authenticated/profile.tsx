import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { TARGET_FUNCTIONS, TARGET_LEVELS, PROGRAMS } from "@/lib/kellogg";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "My Profile — Kellogg Recruiting Copilot" },
      {
        name: "description",
        content: "Your name, program, preferred roles, and work history.",
      },
    ],
  }),
  component: ProfilePage,
});

const fieldClass =
  "w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring";
const smallFieldClass =
  "rounded-lg border border-input bg-background px-2.5 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring";

function ProfilePage() {
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ["profile-full"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return null;
      const { data, error } = await supabase
        .from("users")
        .select("id, name, kellogg_email, program, graduation_year")
        .eq("id", auth.user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">My profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Not visible to anyone else in the cohort — this is just your own record.
        </p>
      </div>

      {profileQuery.isLoading || !profileQuery.data ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <BasicInfoForm profile={profileQuery.data} />
          <PreferredRoles userId={profileQuery.data.id} />
          <WorkExperience userId={profileQuery.data.id} />
        </>
      )}
    </div>
  );
}

function BasicInfoForm({
  profile,
}: {
  profile: { id: string; name: string | null; kellogg_email: string; program: string | null; graduation_year: number | null };
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [program, setProgram] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setName(profile.name ?? "");
    setProgram(profile.program ?? "");
    setGraduationYear(profile.graduation_year ? String(profile.graduation_year) : "");
  }, [profile]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    const { error: err } = await supabase
      .from("users")
      .update({
        name: name.trim() || null,
        program: program || null,
        graduation_year: graduationYear ? Number(graduationYear) : null,
      })
      .eq("id", profile.id);
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["profile-full"] });
    setSaved(true);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-border bg-card p-4">
      <div className="space-y-1.5">
        <label htmlFor="name" className="text-sm font-medium text-foreground">
          Name
        </label>
        <input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={fieldClass}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Email</label>
        <p className="rounded-lg bg-muted px-3 py-2.5 text-sm text-muted-foreground">
          {profile.kellogg_email}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label htmlFor="program" className="text-sm font-medium text-foreground">
            Program
          </label>
          <select
            id="program"
            value={program}
            onChange={(e) => setProgram(e.target.value)}
            className={fieldClass}
          >
            <option value="">Select</option>
            {PROGRAMS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="gradYear" className="text-sm font-medium text-foreground">
            Graduation year
          </label>
          <input
            id="gradYear"
            type="number"
            inputMode="numeric"
            min={1950}
            max={2100}
            value={graduationYear}
            onChange={(e) => setGraduationYear(e.target.value)}
            className={fieldClass}
          />
        </div>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
      {saved && <p className="text-xs text-primary">Saved.</p>}

      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60 sm:w-auto"
      >
        {saving ? "Saving…" : "Save"}
      </button>
    </form>
  );
}

type TargetRole = { id: string; function: string; level: string };

function PreferredRoles({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const [fn, setFn] = useState("");
  const [level, setLevel] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rolesQuery = useQuery({
    queryKey: ["target-roles", userId],
    queryFn: async () => {
      const { data, error: err } = await supabase
        .from("user_target_roles")
        .select("id, function, level")
        .eq("user_id", userId)
        .order("created_at");
      if (err) throw err;
      return (data ?? []) as TargetRole[];
    },
  });

  const roles = rolesQuery.data ?? [];
  const atCap = roles.length >= 3;

  async function addRole(e: React.FormEvent) {
    e.preventDefault();
    if (!fn || !level || atCap) return;
    setAdding(true);
    setError(null);
    const { error: err } = await supabase
      .from("user_target_roles")
      .insert({ user_id: userId, function: fn, level });
    setAdding(false);
    if (err) {
      setError(err.code === "23505" ? "Already on your list." : "Could not add this role.");
      return;
    }
    setFn("");
    setLevel("");
    await queryClient.invalidateQueries({ queryKey: ["target-roles", userId] });
  }

  async function removeRole(id: string) {
    await supabase.from("user_target_roles").delete().eq("id", id);
    await queryClient.invalidateQueries({ queryKey: ["target-roles", userId] });
  }

  return (
    <div>
      <h2 className="text-sm font-semibold text-foreground">Preferred roles</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Up to 3 — just for your own reference, this doesn&apos;t change what shows up in your
        feed (that&apos;s set in Preferences).
      </p>

      {roles.length > 0 && (
        <ul className="mt-3 space-y-2">
          {roles.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2 text-sm"
            >
              <span className="text-foreground">
                {r.function} · {r.level}
              </span>
              <button
                onClick={() => removeRole(r.id)}
                aria-label="Remove"
                className="text-muted-foreground transition-colors hover:text-destructive"
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      {!atCap && (
        <form onSubmit={addRole} className="mt-3 flex flex-wrap items-end gap-2">
          <select value={fn} onChange={(e) => setFn(e.target.value)} className={smallFieldClass}>
            <option value="">Function</option>
            {TARGET_FUNCTIONS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className={smallFieldClass}
          >
            <option value="">Level</option>
            {TARGET_LEVELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={adding || !fn || !level}
            className="rounded-lg border border-primary px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-60"
          >
            {adding ? "Adding…" : "Add"}
          </button>
        </form>
      )}
      {atCap && <p className="mt-2 text-xs text-muted-foreground">You&apos;ve added 3 — remove one to add another.</p>}
      {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
    </div>
  );
}

type WorkExperience = {
  id: string;
  company_name: string;
  role_title: string;
  start_date: string | null;
  end_date: string | null;
};

function WorkExperience({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const [company, setCompany] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const experienceQuery = useQuery({
    queryKey: ["work-experience", userId],
    queryFn: async () => {
      const { data, error: err } = await supabase
        .from("user_work_experience")
        .select("id, company_name, role_title, start_date, end_date")
        .eq("user_id", userId)
        .order("start_date", { ascending: false, nullsFirst: false });
      if (err) throw err;
      return (data ?? []) as WorkExperience[];
    },
  });

  const experience = experienceQuery.data ?? [];

  async function addExperience(e: React.FormEvent) {
    e.preventDefault();
    if (!company.trim() || !roleTitle.trim()) return;
    setAdding(true);
    setError(null);
    const { error: err } = await supabase.from("user_work_experience").insert({
      user_id: userId,
      company_name: company.trim(),
      role_title: roleTitle.trim(),
      start_date: startDate || null,
      end_date: endDate || null,
    });
    setAdding(false);
    if (err) {
      setError("Could not add this entry.");
      return;
    }
    setCompany("");
    setRoleTitle("");
    setStartDate("");
    setEndDate("");
    await queryClient.invalidateQueries({ queryKey: ["work-experience", userId] });
  }

  async function removeExperience(id: string) {
    await supabase.from("user_work_experience").delete().eq("id", id);
    await queryClient.invalidateQueries({ queryKey: ["work-experience", userId] });
  }

  return (
    <div>
      <h2 className="text-sm font-semibold text-foreground">Work experience</h2>
      <p className="mt-1 text-xs text-muted-foreground">Company, role, and dates only.</p>

      {experience.length > 0 && (
        <ul className="mt-3 space-y-2">
          {experience.map((x) => (
            <li
              key={x.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2 text-sm"
            >
              <div>
                <p className="font-medium text-foreground">{x.role_title}</p>
                <p className="text-xs text-muted-foreground">
                  {x.company_name}
                  {(x.start_date || x.end_date) &&
                    ` · ${x.start_date ?? "?"} – ${x.end_date ?? "Present"}`}
                </p>
              </div>
              <button
                onClick={() => removeExperience(x.id)}
                aria-label="Remove"
                className="text-muted-foreground transition-colors hover:text-destructive"
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      <form
        onSubmit={addExperience}
        className="mt-3 grid grid-cols-1 gap-2 rounded-xl border border-dashed border-border p-3 sm:grid-cols-2"
      >
        <input
          placeholder="Company"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          className={smallFieldClass}
        />
        <input
          placeholder="Role title"
          value={roleTitle}
          onChange={(e) => setRoleTitle(e.target.value)}
          className={smallFieldClass}
        />
        <input
          type="date"
          aria-label="Start date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className={smallFieldClass}
        />
        <input
          type="date"
          aria-label="End date (leave blank if current)"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className={smallFieldClass}
        />
        <button
          type="submit"
          disabled={adding || !company.trim() || !roleTitle.trim()}
          className="rounded-lg border border-primary px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-60 sm:col-span-2"
        >
          {adding ? "Adding…" : "Add work experience"}
        </button>
      </form>
      {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
    </div>
  );
}
