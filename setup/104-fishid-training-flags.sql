-- 104: Own Fish ID model, step 3 (owner-only label fixing on Admin → 🧠 Fish ID, js/57). Applied live Oct 22 2026 as migration
-- `fishid_training_flags`; this file is the saved copy, safe to re-run. Needs setup/97 (catches, fishid_training_list) and setup/79 (is_owner).
-- Nothing is copied: a flag is only a catch id + "wrong" / "unsure". A name merge is only two fish names. Members' catches are never changed.
-- Deleting a catch for good (or the account) removes its flag too (cascade); a deleted/hidden photo drops out of the list by itself.

-- Photos the owner flagged: left out of training counts. One flag per catch (covers every photo of that catch).
create table if not exists public.fishid_training_flags (
  catch_id uuid primary key references public.catches(id) on delete cascade,
  flag text not null check (flag in ('wrong', 'unsure')),
  flagged_at timestamptz not null default now()
);
-- Name merges for training counts only: "snok" counts as "Snook". from_name is stored trimmed + lowercase.
create table if not exists public.fishid_training_names (
  from_name text primary key check (from_name = lower(trim(from_name)) and from_name <> '' and length(from_name) <= 80),
  to_name text not null check (trim(to_name) <> '' and length(to_name) <= 80),
  merged_at timestamptz not null default now()
);
-- Owner-only: no table rules at all, so only the owner functions below can read or change them.
alter table public.fishid_training_flags enable row level security;
alter table public.fishid_training_names enable row level security;
revoke all on public.fishid_training_flags from anon, authenticated, public;
revoke all on public.fishid_training_names from anon, authenticated, public;

-- Read every flag and merge (owner only).
create or replace function public.fishid_training_marks()
returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_owner() then raise exception 'Owner only.'; end if;
  return jsonb_build_object(
    'flags', coalesce((select jsonb_agg(jsonb_build_object('catch_id', catch_id, 'flag', flag)) from public.fishid_training_flags), '[]'::jsonb),
    'names', coalesce((select jsonb_agg(jsonb_build_object('from_name', from_name, 'to_name', to_name) order by from_name) from public.fishid_training_names), '[]'::jsonb));
end $$;
revoke all on function public.fishid_training_marks() from anon, public;
grant execute on function public.fishid_training_marks() to authenticated;

-- Flag a catch's photos 'wrong' (wrong fish) or 'unsure' (can't tell); null/blank = take the flag off (owner only).
create or replace function public.fishid_training_set_flag(p_catch uuid, p_flag text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_owner() then raise exception 'Owner only.'; end if;
  if nullif(trim(coalesce(p_flag, '')), '') is null then
    delete from public.fishid_training_flags where catch_id = p_catch;
    return;
  end if;
  if p_flag not in ('wrong', 'unsure') then raise exception 'Unknown flag.'; end if;
  insert into public.fishid_training_flags (catch_id, flag) values (p_catch, p_flag)
    on conflict (catch_id) do update set flag = excluded.flag, flagged_at = now();
end $$;
revoke all on function public.fishid_training_set_flag(uuid, text) from anon, public;
grant execute on function public.fishid_training_set_flag(uuid, text) to authenticated;

-- Count name p_from as p_to in training; blank p_to = undo the merge (owner only). Members' catches are not touched.
create or replace function public.fishid_training_set_name(p_from text, p_to text)
returns void
language plpgsql security definer set search_path = public as $$
declare k text := lower(trim(coalesce(p_from, '')));
begin
  if not public.is_owner() then raise exception 'Owner only.'; end if;
  if k = '' then raise exception 'No name.'; end if;
  if nullif(trim(coalesce(p_to, '')), '') is null then
    delete from public.fishid_training_names where from_name = k;
    return;
  end if;
  insert into public.fishid_training_names (from_name, to_name) values (k, trim(p_to))
    on conflict (from_name) do update set to_name = excluded.to_name, merged_at = now();
end $$;
revoke all on function public.fishid_training_set_name(text, text) from anon, public;
grant execute on function public.fishid_training_set_name(text, text) to authenticated;
