-- 42: tank shop + customizing (simulator step 7). Catalog and prices live here so the phone can't change them.
--   shop_items  = what exists and what it costs (coins and/or gems) — or how = 'tournament' (only won, never bought)
--   user_items  = what each person owns
--   tank_setups = the gravel + placed pieces of each person's saltwater / freshwater tank; friends can see it exactly when they can see the person's profile
--   buy_item(key), save_tank_setup(tank, gravel, placed) = the only ways to change those (spending adds negative rows to coin_ledger from setup/41)
--   claim_coins() now also hands out the tournament trophy cups (gold / silver / bronze for 1st / 2nd / 3rd)
create table if not exists public.shop_items (
  key text primary key,
  name text not null,
  category text not null check (category in ('gravel','wood','plant','rock','coral','shell','diver','chest','trophy')),
  water text not null default 'both' check (water in ('salt','fresh','both')),
  coins int check (coins is null or coins > 0),
  gems int check (gems is null or gems > 0),
  how text not null default 'shop' check (how in ('shop','tournament')),
  sort int not null default 0,
  active boolean not null default true
);
alter table public.shop_items enable row level security;
create policy "members see the shop" on public.shop_items for select using (public.is_member() and active);

insert into public.shop_items (key, name, category, water, coins, gems, how, sort) values
  ('gravel_black', 'Black volcanic gravel', 'gravel', 'both', 40, null, 'shop', 10),
  ('gravel_blue',  'Blue glass gravel',     'gravel', 'both', 50, null, 'shop', 11),
  ('gravel_green', 'Moss green gravel',     'gravel', 'both', 50, null, 'shop', 12),
  ('gravel_pink',  'Pink gravel',           'gravel', 'both', 60, null, 'shop', 13),
  ('gravel_white', 'White pearl gravel',    'gravel', 'both', 60, null, 'shop', 14),
  ('wood_small',   'Small driftwood',       'wood',   'both', 60, null, 'shop', 20),
  ('wood_big',     'Big driftwood',         'wood',   'both', 180, null, 'shop', 21),
  ('plant_grass',  'Sea grass',             'plant',  'salt', 40, null, 'shop', 30),
  ('plant_kelp',   'Kelp',                  'plant',  'salt', 120, null, 'shop', 31),
  ('plant_leafy',  'Leafy water plant',     'plant',  'fresh', 40, null, 'shop', 32),
  ('plant_fern',   'Water fern',            'plant',  'fresh', 70, null, 'shop', 33),
  ('plant_lily',   'Lily pads',             'plant',  'fresh', 90, null, 'shop', 34),
  ('rock_small',   'Small rocks',           'rock',   'both', 50, null, 'shop', 40),
  ('rock_pile',    'Boulder pile',          'rock',   'both', 150, null, 'shop', 41),
  ('rock_arch',    'Rock arch',             'rock',   'both', 240, null, 'shop', 42),
  ('coral_brain',  'Brain coral',           'coral',  'salt', 160, null, 'shop', 50),
  ('coral_fan',    'Sea fan',               'coral',  'salt', 200, null, 'shop', 51),
  ('coral_branch', 'Staghorn coral',        'coral',  'salt', 260, null, 'shop', 52),
  ('shell_scallop','Scallop shell',         'shell',  'salt', 50, null, 'shop', 60),
  ('shell_conch',  'Conch shell',           'shell',  'salt', 70, null, 'shop', 61),
  ('diver',        'Diver figurine',        'diver',  'both', null, 8, 'shop', 70),
  ('chest',        'Treasure chest',        'chest',  'both', null, 12, 'shop', 71),
  ('trophy_gold',  'Gold trophy cup',       'trophy', 'both', null, null, 'tournament', 80),
  ('trophy_silver','Silver trophy cup',     'trophy', 'both', null, null, 'tournament', 81),
  ('trophy_bronze','Bronze trophy cup',     'trophy', 'both', null, null, 'tournament', 82)
on conflict (key) do nothing;

create table if not exists public.user_items (
  user_id uuid not null references auth.users(id) on delete cascade,
  item_key text not null references public.shop_items(key),
  how text not null default 'bought',
  created_at timestamptz not null default now(),
  primary key (user_id, item_key)
);
alter table public.user_items enable row level security;
create policy "see own items" on public.user_items for select using (user_id = auth.uid());
revoke insert, update, delete on public.user_items from anon, authenticated;

create table if not exists public.tank_setups (
  user_id uuid not null references auth.users(id) on delete cascade,
  tank text not null check (tank in ('salt','fresh')),
  gravel text,
  placed jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, tank)
);
alter table public.tank_setups enable row level security;
create policy "see tanks you may see" on public.tank_setups for select using (public.can_view_profile(user_id));
revoke insert, update, delete on public.tank_setups from anon, authenticated;

create or replace function public.buy_item(p_key text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare u uuid := auth.uid(); it public.shop_items; bc int; bg int;
begin
  if u is null or not public.is_member() then raise exception 'sign in first'; end if;
  perform pg_advisory_xact_lock(hashtext('wallet:' || u::text));
  select * into it from public.shop_items where key = p_key and active;
  if not found then raise exception 'That item is not in the shop.'; end if;
  if it.how <> 'shop' then raise exception 'That one can only be won in a tournament.'; end if;
  if exists (select 1 from public.user_items where user_id = u and item_key = p_key) then raise exception 'You already own that.'; end if;
  select coalesce(sum(amount) filter (where currency = 'coins'), 0), coalesce(sum(amount) filter (where currency = 'gems'), 0) into bc, bg from public.coin_ledger where user_id = u;
  if coalesce(it.coins, 0) > bc then raise exception 'Not enough coins yet.'; end if;
  if coalesce(it.gems, 0) > bg then raise exception 'Not enough gems yet.'; end if;
  if it.coins is not null then perform public._coin_grant(u, 'coins', -it.coins, 'purchase', 'buy:' || p_key, null, it.name); end if;
  if it.gems is not null then perform public._coin_grant(u, 'gems', -it.gems, 'purchase', 'buy:' || p_key, null, it.name); end if;
  insert into public.user_items (user_id, item_key, how) values (u, p_key, 'bought');
  return public.my_wallet();
end $$;

-- p_placed = [{"key":"wood_small","x":30,"layer":"back"}, ...]  (x = 0..100 across the tank). Up to 10 pieces, each owned, each suited to that water.
create or replace function public.save_tank_setup(p_tank text, p_gravel text, p_placed jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare u uuid := auth.uid(); e jsonb; it public.shop_items; clean jsonb := '[]'::jsonb; seen text[] := '{}'; g public.shop_items;
begin
  if u is null or not public.is_member() then raise exception 'sign in first'; end if;
  if p_tank not in ('salt','fresh') then raise exception 'Unknown tank.'; end if;
  if p_gravel is not null and p_gravel <> 'sand' then
    select * into g from public.shop_items where key = p_gravel and category = 'gravel' and active;
    if not found or not exists (select 1 from public.user_items where user_id = u and item_key = p_gravel) then raise exception 'You do not own that gravel.'; end if;
  end if;
  if jsonb_typeof(p_placed) <> 'array' or jsonb_array_length(p_placed) > 10 then raise exception 'Up to 10 pieces per tank.'; end if;
  for e in select * from jsonb_array_elements(p_placed) loop
    if jsonb_typeof(e) <> 'object' or jsonb_typeof(e->'x') <> 'number' or (e->>'layer') not in ('back','front') then raise exception 'Bad piece.'; end if;
    select * into it from public.shop_items where key = e->>'key' and active and category <> 'gravel';
    if not found or not exists (select 1 from public.user_items where user_id = u and item_key = it.key) then raise exception 'You do not own that piece.'; end if;
    if it.water not in ('both', p_tank) then raise exception '% does not go in this tank.', it.name; end if;
    if it.key = any (seen) then raise exception 'Each piece can be placed once.'; end if;
    seen := seen || it.key;
    clean := clean || jsonb_build_array(jsonb_build_object('key', it.key, 'x', greatest(0, least(100, round((e->>'x')::numeric))), 'layer', e->>'layer'));
  end loop;
  insert into public.tank_setups (user_id, tank, gravel, placed, updated_at) values (u, p_tank, nullif(p_gravel, 'sand'), clean, now())
    on conflict (user_id, tank) do update set gravel = excluded.gravel, placed = excluded.placed, updated_at = now();
end $$;

revoke all on function public.buy_item(text), public.save_tank_setup(text, text, jsonb) from public, anon;
grant execute on function public.buy_item(text), public.save_tank_setup(text, text, jsonb) to authenticated;

-- claim_coins() again, now also giving the trophy cup for a tournament placing
create or replace function public.claim_coins() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  u uuid := auth.uid(); c record; t record; pb record; vday date; used int; give int; nbest int; sp text; ok boolean;
  launch constant timestamptz := '2026-10-11 18:00+00';
  cap constant int := 50;
  added jsonb := '[]'::jsonb;
begin
  if u is null or not public.is_member() then raise exception 'sign in first'; end if;
  for c in
    select x.* from public.catches x
    where x.created_by = u and x.deleted_at is null and x.created_at >= launch and x.caught_at >= now() - interval '7 days'
      and coalesce(x.review_state, '') <> 'blurred'
      and exists (select 1 from public.photos p where p.catch_id = x.id)
      and not exists (select 1 from public.coin_ledger l where l.user_id = u and l.ref = 'catch:' || x.id)
    order by x.caught_at, x.created_at
  loop
    vday := (c.caught_at at time zone 'America/New_York')::date;
    select coalesce(sum(amount), 0) into used from public.coin_ledger where user_id = u and currency = 'coins' and reason in ('catch','measured') and day = vday;
    give := greatest(0, least(2, cap - used));
    perform public._coin_grant(u, 'coins', give, 'catch', 'catch:' || c.id, vday, c.species); -- (a 0 row just marks a catch past the daily cap as handled)
    if give > 0 then added := added || jsonb_build_array(jsonb_build_object('reason', 'catch', 'coins', give, 'note', c.species)); end if;
    if c.length_in is not null and used + give < cap then
      if public._coin_grant(u, 'coins', 1, 'measured', 'measure:' || c.id, vday, c.species) then added := added || jsonb_build_array(jsonb_build_object('reason', 'measured', 'coins', 1, 'note', c.species)); end if;
    end if;
    sp := lower(btrim(coalesce(c.species, '')));
    if sp <> '' then
      select p.weight_lb, p.length_in into pb from public.catches p
        where p.created_by = u and p.deleted_at is null and lower(btrim(coalesce(p.species, ''))) = sp and (p.caught_at, p.created_at, p.id) < (c.caught_at, c.created_at, c.id)
        order by coalesce(p.weight_lb, 0) desc, coalesce(p.length_in, 0) desc limit 1;
      if not found then
        if public._coin_grant(u, 'coins', 40, 'species', 'species:' || sp, vday, c.species) then added := added || jsonb_build_array(jsonb_build_object('reason', 'species', 'coins', 40, 'note', c.species)); end if;
      elsif coalesce(c.weight_lb, 0) > coalesce(pb.weight_lb, 0) or (coalesce(c.weight_lb, 0) = coalesce(pb.weight_lb, 0) and coalesce(c.length_in, 0) > coalesce(pb.length_in, 0)) then
        select count(*) into nbest from public.coin_ledger where user_id = u and reason = 'best' and day = vday;
        if nbest < 3 and public._coin_grant(u, 'coins', 25, 'best', 'best:' || c.id, vday, c.species) then added := added || jsonb_build_array(jsonb_build_object('reason', 'best', 'coins', 25, 'note', c.species)); end if;
      end if;
    end if;
  end loop;
  -- official tournaments that have finished since launch: best placing on any board counts
  for t in
    select tt.id, tt.title, min(q.rk) as rk from public.tournaments tt
    cross join lateral (select * from (select x.user_id, row_number() over (partition by x.board order by x.value desc, x.caught_at asc) as rk from public.tournament_standings_raw(tt.id) x) z where z.user_id = u and z.rk <= 3) q
    where tt.kind = 'official' and tt.cancelled_at is null and tt.ends_at < now() and tt.ends_at >= launch
      and not exists (select 1 from public.coin_ledger l where l.user_id = u and l.ref = 'tour:' || tt.id)
    group by tt.id, tt.title
  loop
    ok := public._coin_grant(u, 'coins', case t.rk when 1 then 200 when 2 then 120 else 80 end, 'tournament', 'tour:' || t.id, null, t.title);
    perform public._coin_grant(u, 'gems', case t.rk when 1 then 3 when 2 then 2 else 1 end, 'tournament', 'tour:' || t.id, null, t.title);
    insert into public.user_items (user_id, item_key, how) values (u, case t.rk when 1 then 'trophy_gold' when 2 then 'trophy_silver' else 'trophy_bronze' end, 'won') on conflict do nothing;
    if ok then added := added || jsonb_build_array(jsonb_build_object('reason', 'tournament', 'coins', case t.rk when 1 then 200 when 2 then 120 else 80 end, 'gems', case t.rk when 1 then 3 when 2 then 2 else 1 end, 'note', t.title)); end if;
  end loop;
  return public.my_wallet() || jsonb_build_object('added', added);
end $$;
