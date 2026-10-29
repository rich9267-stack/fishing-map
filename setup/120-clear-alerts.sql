-- 120: 🧹 Clear alerts from your inbox (v243, migration `clear_alerts`). Nothing is deleted: a cleared alert only gets a cleared_at time
-- (deleting would let alerts with a dedupe_key be sent a second time). The inbox (js/10) reads only rows with cleared_at null.
-- clear_my_alerts(p_id): clears one of your own alerts; with no id, clears all of yours. Members still can't write the table directly.
-- No new tables (new column on notifications).

alter table public.notifications add column if not exists cleared_at timestamptz;

create or replace function public.clear_my_alerts(p_id uuid default null) returns integer
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  update public.notifications set cleared_at = now()
   where user_id = auth.uid() and cleared_at is null and (p_id is null or id = p_id);
  get diagnostics n = row_count;
  return n;
end $$;

revoke all on function public.clear_my_alerts(uuid) from public, anon;
grant execute on function public.clear_my_alerts(uuid) to authenticated;
