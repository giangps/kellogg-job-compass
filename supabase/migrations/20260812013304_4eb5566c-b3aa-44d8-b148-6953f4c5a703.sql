CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
begin
  if new.raw_user_meta_data ->> 'role' = 'referrer' then
    insert into public.alum_profiles (id, email)
    values (new.id, new.email);
    return new;
  end if;

  insert into public.users (id, kellogg_email)
  values (new.id, new.email);
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.validate_kellogg_domain()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
begin
  if new.raw_user_meta_data ->> 'role' = 'referrer' then
    return new;
  end if;

  if new.email !~* '@(kellogg\.northwestern\.edu|kelloggalumni\.northwestern\.edu)$' then
    raise exception 'Signup restricted to Kellogg email domains (got: %)', new.email;
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.enforce_connection_request_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
declare
  caller_is_alum boolean;
begin
  select exists (
    select 1 from public.alum_profiles where id = old.alum_id and id = auth.uid()
  ) into caller_is_alum;

  if caller_is_alum then
    if new.outcome is distinct from old.outcome
       or new.outcome_reported_at is distinct from old.outcome_reported_at
       or new.job_seeker_id is distinct from old.job_seeker_id
       or new.alum_id is distinct from old.alum_id
       or new.requested_at is distinct from old.requested_at
    then
      raise exception 'Alum may only update status/responded_at on a connection request';
    end if;
  else
    if new.status is distinct from old.status
       or new.responded_at is distinct from old.responded_at
       or new.job_seeker_id is distinct from old.job_seeker_id
       or new.alum_id is distinct from old.alum_id
       or new.requested_at is distinct from old.requested_at
    then
      raise exception 'Job seeker may only update outcome/outcome_reported_at on a connection request';
    end if;
  end if;
  return new;
end;
$function$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_kellogg_domain() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_connection_request_update() FROM PUBLIC, anon, authenticated;