CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
begin
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
  if new.email !~* '@(kellogg\.northwestern\.edu|kelloggalumni\.northwestern\.edu)$' then
    raise exception 'Signup restricted to Kellogg email domains (got: %)', new.email;
  end if;
  return new;
end;
$function$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.validate_kellogg_domain() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.validate_kellogg_domain() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.validate_kellogg_domain() TO authenticated, service_role;