-- setup/117: a seventh collection group, 'baitother' (Shrimp, crabs & other bait). Same rules as the others: at least 5 species, each with a photographed catch, pays once.
create or replace function public.claim_collection(p_group text, p_species jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare u uuid := auth.uid(); alt jsonb; n int; ok boolean;
begin
  if u is null or not public.is_member() then raise exception 'sign in first'; end if;
  if p_group not in ('inshore','beach','offshore','fresh','bait','baitfresh','baitother') then raise exception 'unknown collection'; end if;
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
