alter table public.users add column if not exists avatar_url text;
alter table public.alum_profiles add column if not exists avatar_url text;
alter table public.postings add column if not exists description text;
alter table public.companies add column if not exists logo_url text;

create or replace view public.alum_directory as
select id, name, linkedin_url, company_id, function, seniority, program, graduation_year, avatar_url
from public.alum_profiles
where name is not null;

grant select on public.alum_directory to authenticated;

create or replace view public.job_seeker_profile_for_alum as
select distinct u.id, u.name, u.avatar_url, u.program, u.graduation_year, u.target_function, u.target_level
from public.users u
join public.connection_requests cr on cr.job_seeker_id = u.id
where cr.alum_id = auth.uid();

grant select on public.job_seeker_profile_for_alum to authenticated;

create or replace view public.job_seeker_experience_for_alum as
select w.id, w.user_id, w.company_name, w.role_title, w.start_date, w.end_date
from public.user_work_experience w
where exists (
  select 1 from public.connection_requests cr
  where cr.job_seeker_id = w.user_id and cr.alum_id = auth.uid()
);

grant select on public.job_seeker_experience_for_alum to authenticated;