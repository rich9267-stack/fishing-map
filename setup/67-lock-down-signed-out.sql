-- 67: take away permissions that signed-out visitors (and some internal tables) never needed.
-- Everything in the app already works without them: signing in is required, and row-level security
-- was already blocking every request. This is a second lock on the same door.
-- Run in the Supabase SQL Editor (the connector refuses "revoke"). Safe to run twice.
--
-- TO UNDO (if anything on the phone stops working after this), run the block at the bottom.

-- 1) signed-out visitors ("anon"): no tables, no functions, no counters
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke execute on all functions in schema public from anon;
revoke execute on all functions in schema public from public;
-- signed-in members and the server keep running the functions
grant execute on all functions in schema public to authenticated, service_role;

-- 2) signed-in members never need these table powers (the app only reads and writes rows)
revoke truncate, references, trigger on all tables in schema public from authenticated;

-- 3) internal tables: only the database's own functions and the server touch them
revoke all on public.app_secrets, public.push_config, public.official_import_jobs, public.tournament_ranks from authenticated;

-- 4) the same for anything created later
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke execute on functions from anon;
alter default privileges in schema public revoke execute on functions from public;

-- ===== UNDO (only if needed; paste this block alone) =====
-- grant select, insert, update, delete on all tables in schema public to anon;
-- grant execute on all functions in schema public to anon, public;
-- grant truncate, references, trigger on all tables in schema public to authenticated;
-- grant all on public.app_secrets, public.push_config, public.official_import_jobs, public.tournament_ranks to authenticated;
