REVOKE EXECUTE ON FUNCTION public.enforce_connection_request_update() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enforce_connection_request_update() FROM anon;
REVOKE EXECUTE ON FUNCTION public.enforce_connection_request_update() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_connection_request_update() TO service_role;