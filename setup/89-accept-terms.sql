-- setup/89: save the date each member agreed to the Terms. No new table, nothing dropped.
alter table public.members add column if not exists terms_accepted_at timestamptz;
alter table public.members add column if not exists terms_version text;

create or replace function public.accept_terms(p_version text) returns text
language plpgsql security definer set search_path = public as $$
declare e text := lower(coalesce(auth.jwt() ->> 'email', '')); v text := left(btrim(coalesce(p_version, '')), 20);
begin
  if e = '' or auth.uid() is null then raise exception 'sign in first'; end if;
  if v = '' then raise exception 'version needed'; end if;
  update public.members set terms_accepted_at = now(), terms_version = v where email = e;
  if not found then raise exception 'no member record'; end if;
  return v;
end $$;
revoke all on function public.accept_terms(text) from public, anon;
grant execute on function public.accept_terms(text) to authenticated;
