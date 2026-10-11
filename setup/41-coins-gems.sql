-- 41: coins 🪙 and gems 💎 for the tank game (simulator step 6). Everything is checked on the server; the app only asks.
-- Rules (Richard's choices, Oct 2026):
--   coins:  2 per logged catch WITH A PHOTO (+1 if a length is logged), max 50 catch/measure coins per fishing day (New York time)
--           new species 40 (once ever per species), new personal best 25 (max 3 a day), finished collection group 150 (once per group)
--           official tournament top 3: 1st 200, 2nd 120, 3rd 80
--   gems:   earned only (never sold): tournament 1st/2nd/3rd = 3/2/1, finished collection group = 2
-- coin_ledger is the only record. Balance = sum of rows. Nobody can write to it directly (no insert/update/delete policies).
create table if not exists public.coin_ledger (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  currency text not null check (currency in ('coins','gems')),
  amount int not null,
  reason text not null,   -- catch | measured | species | best | collection | tournament   (step 7 adds: purchase)
  ref text not null,      -- what it was paid for, so the same thing never pays twice (catch:<id>, species:snook, best:<id>, coll:inshore, tour:<id>)
  day date,               -- fishing day (New York) for the daily cap
  note text,
  created_at timestamptz not null default now(),
  unique (user_id, currency, ref)
);
create index if not exists coin_ledger_user on public.coin_ledger (user_id, created_at desc);
alter table public.coin_ledger enable row level security;
create policy "see own ledger" on public.coin_ledger for select using (user_id = auth.uid());
revoke insert, update, delete on public.coin_ledger from anon, authenticated;
revoke all on sequence public.coin_ledger_id_seq from anon, authenticated;

create or replace function public._coin_grant(p_user uuid, p_cur text, p_amt int, p_reason text, p_ref text, p_day date, p_note text) returns boolean
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  insert into public.coin_ledger (user_id, currency, amount, reason, ref, day, note) values (p_user, p_cur, p_amt, p_reason, p_ref, p_day, p_note)
    on conflict (user_id, currency, ref) do nothing;
  get diagnostics n = row_count; return n > 0;
end $$;
revoke all on function public._coin_grant(uuid, text, int, text, text, date, text) from public, anon, authenticated;

create or replace function public.my_wallet() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'coins', coalesce(sum(amount) filter (where currency = 'coins'), 0),
    'gems', coalesce(sum(amount) filter (where currency = 'gems'), 0),
    'today', coalesce(sum(amount) filter (where currency = 'coins' and reason in ('catch','measured') and day = (now() at time zone 'America/New_York')::date), 0),
    'cap', 50,
    'collections', coalesce(jsonb_agg(substr(ref, 6)) filter (where reason = 'collection' and currency = 'coins'), '[]'::jsonb),
    'recent', coalesce((select jsonb_agg(jsonb_build_object('reason', r.reason, 'currency', r.currency, 'amount', r.amount, 'note', r.note, 'at', r.created_at))
                        from (select * from public.coin_ledger x where x.user_id = auth.uid() and x.amount <> 0 order by x.created_at desc, x.id desc limit 12) r), '[]'::jsonb))
  from public.coin_ledger where user_id = auth.uid() and public.is_member();
$$;

-- Look at my recent photographed catches and my finished official tournaments; pay whatever has not been paid yet. Safe to call any time.
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
    if ok then added := added || jsonb_build_array(jsonb_build_object('reason', 'tournament', 'coins', case t.rk when 1 then 200 when 2 then 120 else 80 end, 'gems', case t.rk when 1 then 3 when 2 then 2 else 1 end, 'note', t.title)); end if;
  end loop;
  return public.my_wallet() || jsonb_build_object('added', added);
end $$;

-- A finished collection group (inshore / beach / offshore / fresh). The app sends, for each species in the group, the names you logged it under;
-- every one needs a photographed catch of yours, and at least 5 species. Pays once per group, ever.
create or replace function public.claim_collection(p_group text, p_species jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare u uuid := auth.uid(); alt jsonb; n int; ok boolean;
begin
  if u is null or not public.is_member() then raise exception 'sign in first'; end if;
  if p_group not in ('inshore','beach','offshore','fresh') then raise exception 'unknown collection'; end if;
  if jsonb_typeof(p_species) <> 'array' then raise exception 'bad list'; end if;
  n := jsonb_array_length(p_species);
  if n < 5 or n > 60 then raise exception 'A collection needs at least 5 species.'; end if;
  for alt in select * from jsonb_array_elements(p_species) loop
    if jsonb_typeof(alt) <> 'array' or not exists (
      select 1 from public.catches c join jsonb_array_elements_text(alt) s(name) on lower(btrim(c.species)) = lower(btrim(s.name))
      where c.created_by = u and c.deleted_at is null and exists (select 1 from public.photos p where p.catch_id = c.id)) then
      raise exception 'Every species needs a photographed catch first.';
    end if;
  end loop;
  ok := public._coin_grant(u, 'coins', 150, 'collection', 'coll:' || p_group, null, p_group);
  perform public._coin_grant(u, 'gems', 2, 'collection', 'coll:' || p_group, null, p_group);
  return public.my_wallet() || jsonb_build_object('added', case when ok then jsonb_build_array(jsonb_build_object('reason', 'collection', 'coins', 150, 'gems', 2, 'note', p_group)) else '[]'::jsonb end);
end $$;

revoke all on function public.my_wallet(), public.claim_coins(), public.claim_collection(text, jsonb) from public, anon;
grant execute on function public.my_wallet(), public.claim_coins(), public.claim_collection(text, jsonb) to authenticated;
