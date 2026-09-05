This function validates the Supabase JWT inside the handler because the project
uses ES256 publishable-key sessions that are not accepted by the Edge gateway's
legacy `verify_jwt` mode. Keep gateway verification disabled and do not remove
the handler-level `auth.getUser()` check.
