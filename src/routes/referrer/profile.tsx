import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { TARGET_FUNCTIONS, TARGET_LEVELS, PROGRAMS } from "@/lib/kellogg";
import { AvatarUpload } from "@/components/UserAvatar";

export const Route = createFileRoute("/referrer/profile")({
  head: () => ({
    meta: [
      { title: "My Profile — Kellogg Recruiting Copilot" },
      {
        name: "description",
        content: "Complete your referrer profile so job seekers can find and reach you.",
      },
    ],
  }),
  component: ReferrerProfilePage,
});

const fieldClass =
  "w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring";

function ReferrerProfilePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [phone, setPhone] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [fn, setFn] = useState("");
  const [seniority, setSeniority] = useState("");
  const [program, setProgram] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const profileQuery = useQuery({
    queryKey: ["alum-profile"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return null;
      const { data, error: err } = await supabase
        .from("alum_profiles")
        .select(
          "id, name, linkedin_url, phone, company_id, function, seniority, program, graduation_year, avatar_url",
        )
        .eq("id", auth.user.id)
        .maybeSingle();
      if (err) throw err;
      return data;
    },
  });

  const companiesQuery = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const { data, error: err } = await supabase
        .from("companies")
        .select("id, name")
        .order("name");
      if (err) throw err;
      return data ?? [];
    },
  });

  useEffect(() => {
    const profile = profileQuery.data;
    if (!profile) return;
    setName(profile.name ?? "");
    setLinkedinUrl(profile.linkedin_url ?? "");
    setPhone(profile.phone ?? "");
    setCompanyId(profile.company_id ?? "");
    setFn(profile.function ?? "");
    setSeniority(profile.seniority ?? "");
    setProgram(profile.program ?? "");
    setGraduationYear(profile.graduation_year ? String(profile.graduation_year) : "");
  }, [profileQuery.data]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profileQuery.data) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    const { error: err } = await supabase
      .from("alum_profiles")
      .update({
        name: name.trim() || null,
        linkedin_url: linkedinUrl.trim() || null,
        phone: phone.trim() || null,
        company_id: companyId || null,
        function: fn || null,
        seniority: seniority || null,
        program: program.trim() || null,
        graduation_year: graduationYear ? Number(graduationYear) : null,
      })
      .eq("id", profileQuery.data.id);
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["alum-profile"] });
    setSaved(true);
  }

  if (profileQuery.isLoading) {
    return <p className="mt-6 text-sm text-muted-foreground">Loading…</p>;
  }

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight text-foreground">My profile</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Visible to job seekers: your name and LinkedIn link. Email and phone stay hidden until
        you accept a connection request.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-xl border border-border bg-card p-4">
        {profileQuery.data && (
          <AvatarUpload
            userId={profileQuery.data.id}
            name={profileQuery.data.name}
            table="alum_profiles"
            currentPath={profileQuery.data.avatar_url}
            onUploaded={() => queryClient.invalidateQueries({ queryKey: ["alum-profile"] })}
          />
        )}

        <div className="space-y-1.5">
          <label htmlFor="name" className="text-sm font-medium text-foreground">
            Name
          </label>
          <input
            id="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={fieldClass}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="linkedin" className="text-sm font-medium text-foreground">
            LinkedIn URL
          </label>
          <input
            id="linkedin"
            type="url"
            required
            placeholder="https://linkedin.com/in/…"
            value={linkedinUrl}
            onChange={(e) => setLinkedinUrl(e.target.value)}
            className={fieldClass}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="phone" className="text-sm font-medium text-foreground">
            Phone{" "}
            <span className="font-normal text-muted-foreground">
              (only shown after you accept a request)
            </span>
          </label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={fieldClass}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="company" className="text-sm font-medium text-foreground">
            Company
          </label>
          <select
            id="company"
            required
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
            className={fieldClass}
          >
            <option value="" disabled>
              Select a company
            </option>
            {(companiesQuery.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label htmlFor="function" className="text-sm font-medium text-foreground">
              Function
            </label>
            <select
              id="function"
              required
              value={fn}
              onChange={(e) => setFn(e.target.value)}
              className={fieldClass}
            >
              <option value="" disabled>
                Select
              </option>
              {TARGET_FUNCTIONS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="seniority" className="text-sm font-medium text-foreground">
              Seniority
            </label>
            <select
              id="seniority"
              required
              value={seniority}
              onChange={(e) => setSeniority(e.target.value)}
              className={fieldClass}
            >
              <option value="" disabled>
                Select
              </option>
              {TARGET_LEVELS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
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

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => navigate({ to: "/referrer/inbox" })}
            className="w-full rounded-lg border border-input px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go to inbox
          </button>
        </div>
      </form>
    </div>
  );
}
