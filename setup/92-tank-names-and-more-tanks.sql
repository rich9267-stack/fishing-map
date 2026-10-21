-- 92: 🐠 Tank names + more tanks (Oct 20, Richard's answers).
-- • Any tank can have a name (up to 24 letters), shown on its plaque and to anyone who may see your profile.
--   Checked here: no links, no < >, a short list of rude words; the team ("reports" box) can remove a name (logged, owner told).
-- • Up to 5 tanks in all: the free saltwater + freshwater tanks plus up to 3 more (each salt or fresh).
--   More tanks will be bought with 🏴‍☠️ doubloons later (real money, after the lawyer review). Until then only the OWNER can
--   give one (testing); nobody can buy one. how = 'gift' now; 'doubloons' is kept for later.
-- • You pick which of your best catches swim in an extra tank (tank_species); every other fish stays in the free tank of its water.
-- New tables user_tanks + tank_species: the weekly backup picks them up by itself (plans/database-change-rule.md).

alter table public.tank_setups add column if not exists name text check (name is null or char_length(name) between 1 and 24);
alter table public.tank_setups add column if not exists name_hidden_at timestamptz;

create table if not exists public.user_tanks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  water text not null check (water in ('salt','fresh')),
  name text check (name is null or char_length(name) between 1 and 24),
  name_hidden_at timestamptz,
  gravel text,
  placed jsonb not null default '[]'::jsonb,
  how text not null default 'gift' check (how in ('gift','doubloons')),
  given_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists user_tanks_user_idx on public.user_tanks (user_id);
alter table public.user_tanks enable row level security;
drop policy if exists "see tanks you may see" on public.user_tanks;
create policy "see tanks you may see" on public.user_tanks for select using (public.can_view_profile(user_id));
revoke insert, update, delete on public.user_tanks from anon, authenticated;

create table if not exists public.tank_species (
  user_id uuid not null references auth.users(id) on delete cascade,
  species_key text not null check (char_length(species_key) between 1 and 80),
  tank_id uuid not null references public.user_tanks(id) on delete cascade,
  primary key (user_id, species_key)
);
create index if not exists tank_species_tank_idx on public.tank_species (tank_id);
alter table public.tank_species enable row level security;
drop policy if exists "see tank fish you may see" on public.tank_species;
create policy "see tank fish you may see" on public.tank_species for select using (public.can_view_profile(user_id));
revoke insert, update, delete on public.tank_species from anon, authenticated;

-- a tank name, cleaned: spaces tidied, '' = no name. Raises a plain-English error when it isn't allowed.
create or replace function private.tank_name_clean(p text) returns text
language plpgsql immutable set search_path = public as $$
declare n text := btrim(regexp_replace(coalesce(p, ''), '\s+', ' ', 'g')); flat text;
begin
  if n = '' then return null; end if;
  if char_length(n) > 24 then raise exception 'Tank names can be up to 24 letters.'; end if;
  if n ~ '[<>[:cntrl:]]' then raise exception 'Tank names can''t use < or >.'; end if;
  if n ~* '(https?:|www\.|\.com\b|\.net\b|\.org\b)' then raise exception 'No links in tank names.'; end if;
  flat := regexp_replace(lower(translate(n, '013457@$', 'oieastas')), '[^a-z]', '', 'g');
  if flat ~ '(fuck|shit|cunt|bitch|nigg|fag|whore|slut|nazi|asshole|pussy|penis|vagina|porn|kkk)' then
    raise exception 'Please pick a different name.';
  end if;
  return n;
end $$;
revoke all on function private.tank_name_clean(text) from public, anon, authenticated;

-- 'salt' / 'fresh' = your free tanks; anything else must be the id of one of your extra tanks
create or replace function public.set_tank_name(p_tank text, p_name text) returns text
language plpgsql security definer set search_path = public as $$
declare u uuid := auth.uid(); n text;
begin
  if u is null or not public.is_member() then raise exception 'sign in first'; end if;
  n := private.tank_name_clean(p_name);
  if p_tank in ('salt','fresh') then
    insert into public.tank_setups (user_id, tank, name, updated_at) values (u, p_tank, n, now())
      on conflict (user_id, tank) do update set name = excluded.name, name_hidden_at = null, updated_at = now();
  elsif p_tank ~ '^[0-9a-f-]{36}$' then
    update public.user_tanks set name = n, name_hidden_at = null, updated_at = now() where id = p_tank::uuid and user_id = u;
    if not found then raise exception 'That tank isn''t yours.'; end if;
  else raise exception 'Unknown tank.';
  end if;
  return n;
end $$;

-- exactly these species swim in this extra tank (others that were in it go back to the free tank of their water)
create or replace function public.set_tank_fish(p_tank uuid, p_species text[]) returns void
language plpgsql security definer set search_path = public as $$
declare u uuid := auth.uid(); clean text[];
begin
  if u is null or not public.is_member() then raise exception 'sign in first'; end if;
  if not exists (select 1 from public.user_tanks where id = p_tank and user_id = u) then raise exception 'That tank isn''t yours.'; end if;
  if coalesce(array_length(p_species, 1), 0) > 300 then raise exception 'Too many fish.'; end if;
  select coalesce(array_agg(distinct k), '{}') into clean
    from (select lower(btrim(x)) k from unnest(coalesce(p_species, '{}')) x) s where char_length(k) between 1 and 80;
  delete from public.tank_species where user_id = u and tank_id = p_tank and not (species_key = any (clean));
  insert into public.tank_species (user_id, species_key, tank_id) select u, k, p_tank from unnest(clean) k
    on conflict (user_id, species_key) do update set tank_id = excluded.tank_id;
end $$;

-- the setup-42 save, now also for extra tanks (p_tank = 'salt' / 'fresh' / an extra tank's id)
create or replace function public.save_tank_setup(p_tank text, p_gravel text, p_placed jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare u uuid := auth.uid(); e jsonb; it public.shop_items; clean jsonb := '[]'::jsonb; seen text[] := '{}'; g public.shop_items; w text; xid uuid;
begin
  if u is null or not public.is_member() then raise exception 'sign in first'; end if;
  if p_tank in ('salt','fresh') then w := p_tank;
  elsif p_tank ~ '^[0-9a-f-]{36}$' then
    xid := p_tank::uuid;
    select water into w from public.user_tanks where id = xid and user_id = u;
    if not found then raise exception 'That tank isn''t yours.'; end if;
  else raise exception 'Unknown tank.';
  end if;
  if p_gravel is not null and p_gravel <> 'sand' then
    select * into g from public.shop_items where key = p_gravel and category = 'gravel' and active;
    if not found or not exists (select 1 from public.user_items where user_id = u and item_key = p_gravel) then raise exception 'You do not own that gravel.'; end if;
  end if;
  if jsonb_typeof(p_placed) <> 'array' or jsonb_array_length(p_placed) > 10 then raise exception 'Up to 10 pieces per tank.'; end if;
  for e in select * from jsonb_array_elements(p_placed) loop
    if jsonb_typeof(e) <> 'object' or jsonb_typeof(e->'x') <> 'number' or (e->>'layer') not in ('back','front') then raise exception 'Bad piece.'; end if;
    select * into it from public.shop_items where key = e->>'key' and active and category <> 'gravel';
    if not found or not exists (select 1 from public.user_items where user_id = u and item_key = it.key) then raise exception 'You do not own that piece.'; end if;
    if it.water not in ('both', w) then raise exception '% does not go in this tank.', it.name; end if;
    if it.key = any (seen) then raise exception 'Each piece can be placed once.'; end if;
    seen := seen || it.key;
    clean := clean || jsonb_build_array(jsonb_build_object('key', it.key, 'x', greatest(0, least(100, round((e->>'x')::numeric))), 'layer', e->>'layer'));
  end loop;
  if xid is null then
    insert into public.tank_setups (user_id, tank, gravel, placed, updated_at) values (u, p_tank, nullif(p_gravel, 'sand'), clean, now())
      on conflict (user_id, tank) do update set gravel = excluded.gravel, placed = excluded.placed, updated_at = now();
  else
    update public.user_tanks set gravel = nullif(p_gravel, 'sand'), placed = clean, updated_at = now() where id = xid;
  end if;
end $$;

-- Owner only, while doubloons aren't on sale: give someone (or yourself) one more tank, to test. Up to 3 extra (5 in all).
create or replace function public.give_tank(p_user uuid, p_water text) returns uuid
language plpgsql security definer set search_path = public as $$
declare nid uuid;
begin
  if not public.is_owner() then raise exception 'Only the owner can give tanks until doubloons are on sale.'; end if;
  if p_water not in ('salt','fresh') then raise exception 'Pick saltwater or freshwater.'; end if;
  if not exists (select 1 from public.members m join auth.users au on lower(au.email) = m.email where au.id = p_user and m.status = 'approved') then raise exception 'That person isn''t an approved member.'; end if;
  perform pg_advisory_xact_lock(hashtext('tanks:' || p_user::text));
  if (select count(*) from public.user_tanks where user_id = p_user) >= 3 then raise exception 'They already have 5 tanks (the most).'; end if;
  insert into public.user_tanks (user_id, water, how, given_by) values (p_user, p_water, 'gift', auth.uid()) returning id into nid;
  perform private.log_admin('give_tank', 'user', p_user::text, p_water || ' tank (test gift)');
  return nid;
end $$;

-- Owner only: take back a given tank (its fish go back to the free tank)
create or replace function public.take_tank(p_tank uuid) returns void
language plpgsql security definer set search_path = public as $$
declare t public.user_tanks;
begin
  if not public.is_owner() then raise exception 'Only the owner can take a tank back.'; end if;
  select * into t from public.user_tanks where id = p_tank;
  if not found then raise exception 'Tank not found.'; end if;
  if t.how <> 'gift' then raise exception 'Bought tanks can''t be taken back here.'; end if;
  delete from public.user_tanks where id = p_tank;
  perform private.log_admin('take_tank', 'user', t.user_id::text, t.water || ' tank' || coalesce(' "' || t.name || '"', ''));
end $$;

-- The team removes a tank's name ("reports" box). The old name goes only into the admin log; the owner is told and can pick a new one.
create or replace function public.hide_tank_name(p_owner uuid, p_tank text, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare old text;
begin
  if not public.has_power('reports') then raise exception 'You need the "Reports" box for that'; end if;
  p_reason := btrim(coalesce(p_reason, ''));
  if char_length(p_reason) < 5 then raise exception 'Write a reason (at least 5 letters)'; end if;
  if p_owner = auth.uid() then raise exception 'That is your own tank'; end if;
  if p_tank in ('salt','fresh') then
    select name into old from public.tank_setups where user_id = p_owner and tank = p_tank;
    update public.tank_setups set name = null, name_hidden_at = now() where user_id = p_owner and tank = p_tank and name is not null;
  elsif p_tank ~ '^[0-9a-f-]{36}$' then
    select name into old from public.user_tanks where id = p_tank::uuid and user_id = p_owner;
    update public.user_tanks set name = null, name_hidden_at = now() where id = p_tank::uuid and user_id = p_owner and name is not null;
  else raise exception 'Unknown tank.';
  end if;
  if old is null then raise exception 'That tank has no name to remove.'; end if;
  perform private.log_admin('hide_tank_name', 'user', p_owner::text, left('"' || old || '" · ' || p_reason, 200));
  perform public.enqueue_notification(p_owner, 'safety', '🐠 Your tank name was removed',
    left('The team removed the name "' || old || '" from your tank. You can pick a new one. Reason: ' || p_reason, 160), '?go=tank',
    'tankname:' || p_owner::text || ':' || extract(epoch from now())::bigint::text);
end $$;

revoke all on function public.set_tank_name(text, text), public.set_tank_fish(uuid, text[]), public.save_tank_setup(text, text, jsonb),
  public.give_tank(uuid, text), public.take_tank(uuid), public.hide_tank_name(uuid, text, text) from public, anon;
grant execute on function public.set_tank_name(text, text), public.set_tank_fish(uuid, text[]), public.save_tank_setup(text, text, jsonb),
  public.give_tank(uuid, text), public.take_tank(uuid), public.hide_tank_name(uuid, text, text) to authenticated;
