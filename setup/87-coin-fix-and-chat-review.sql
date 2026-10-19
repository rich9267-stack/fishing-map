-- Admin controls, step 10 (first part, LOCKED): correct a person's coins/gems, and review a reported chat.
-- Same rule as step 9: each feature has a master switch in gate_switches that starts CLOSED. While closed, nobody can use it, not even the owner.
-- Richard opens one in the SQL Editor only after the privacy page and terms say it and Legal has looked:
--     update public.gate_switches set is_open = true, changed_at = now() where name = 'coin_corrections';   -- or 'chat_review'
-- No new table (new switch rows only), so the weekly backup needs nothing.
-- NOT built here: "delete a person's data" (it would have to copy the big delete_my_account function; waits for a decision, see plans/step9-open-questions.md).
--
-- Coins: rows are never edited. A correction is a NEW ledger line (reason 'correction') with a typed reason in its note, so the history stays honest.
--        A race result is corrected the same way (its coins are ledger lines), the race rows themselves are not touched.
-- Chats: only a chat tied to an open report about a message, shown only for that pair, opened by a person with a typed reason. No browsing.
--        The log keeps who, which report, when and why - never the message text.

insert into public.gate_switches (name, is_open, note) values
  ('coin_corrections', false, 'Correcting entries for coins/gems with a typed reason. Open only after privacy page + terms say so and Legal has looked.'),
  ('chat_review', false, 'Owner/trusted admins may read the chat tied to a reported message, with a typed reason. Open only after privacy page + terms say so and Legal has looked.')
on conflict (name) do nothing;

-- ---------- coins ----------
create or replace function public.admin_coin_person(p_q text)
returns table(user_id uuid, name text, email text, coins bigint, gems bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_power('correct_coins') then raise exception 'You do not have the box for that'; end if;
  if not public.gate_is_open('coin_corrections') then raise exception 'This is locked until the privacy page and terms say it'; end if;
  p_q := trim(coalesce(p_q, ''));
  if length(p_q) < 3 then raise exception 'Type at least 3 letters of a name or email'; end if;
  return query
    select u.id, coalesce(m.display_name, u.email), u.email::text,
      coalesce((select sum(l.amount) from public.coin_ledger l where l.user_id = u.id and l.currency = 'coins'), 0)::bigint,
      coalesce((select sum(l.amount) from public.coin_ledger l where l.user_id = u.id and l.currency = 'gems'), 0)::bigint
    from auth.users u left join public.members m on lower(m.email) = lower(u.email)
    where u.email ilike '%' || replace(replace(p_q, '%', ''), '_', '') || '%' or m.display_name ilike '%' || replace(replace(p_q, '%', ''), '_', '') || '%'
    order by 2 limit 10;
end $$;

create or replace function public.admin_coin_history(p_user uuid)
returns table(at timestamptz, currency text, amount integer, reason text, note text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_power('correct_coins') then raise exception 'You do not have the box for that'; end if;
  if not public.gate_is_open('coin_corrections') then raise exception 'This is locked until the privacy page and terms say it'; end if;
  return query select l.created_at, l.currency, l.amount, l.reason, l.note from public.coin_ledger l where l.user_id = p_user order by l.created_at desc, l.id desc limit 25;
end $$;

create or replace function public.admin_coin_correct(p_user uuid, p_currency text, p_amount integer, p_reason text) returns bigint
language plpgsql security definer set search_path = public as $$
declare bal bigint; em text; lim integer;
begin
  if not public.has_power('correct_coins') then raise exception 'You do not have the box for that'; end if;
  if not public.gate_is_open('coin_corrections') then raise exception 'This is locked until the privacy page and terms say it'; end if;
  if p_currency not in ('coins', 'gems') then raise exception 'Coins or gems only'; end if;
  p_reason := trim(coalesce(p_reason, ''));
  if length(p_reason) < 10 then raise exception 'Write the reason (at least 10 letters)'; end if;
  if p_amount is null or p_amount = 0 then raise exception 'The amount can''t be zero'; end if;
  lim := case when p_currency = 'coins' then 5000 else 500 end;
  if abs(p_amount) > lim then raise exception 'That is more than one correction may change'; end if;
  select lower(email) into em from auth.users where id = p_user;
  if em is null then raise exception 'Person not found'; end if;
  select coalesce(sum(amount), 0) into bal from public.coin_ledger where user_id = p_user and currency = p_currency;
  if bal + p_amount < 0 then raise exception 'That would take the balance below zero (it is %)', bal; end if;
  insert into public.coin_ledger (user_id, currency, amount, reason, ref, day, note)
  values (p_user, p_currency, p_amount, 'correction', 'fix:' || gen_random_uuid()::text, current_date, left(p_reason, 150));
  perform private.log_admin('coins_corrected', 'member', em, p_currency || ' ' || case when p_amount > 0 then '+' else '' end || p_amount || ' · reason: ' || left(p_reason, 150));
  return bal + p_amount;
end $$;

-- ---------- reported chats ----------
create or replace function public.admin_reported_chats()
returns table(report_id uuid, created_at timestamptz, reporter_name text, about_name text, reason text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_power('review_chat') then raise exception 'You do not have the box for that'; end if;
  if not public.gate_is_open('chat_review') then raise exception 'This is locked until the privacy page and terms say it'; end if;
  return query
    select r.id, r.created_at,
      (select coalesce(m.display_name, u.email) from auth.users u left join public.members m on lower(m.email) = lower(u.email) where u.id = r.reporter),
      (select coalesce(m.display_name, u.email) from auth.users u left join public.members m on lower(m.email) = lower(u.email) where u.id = r.target_user),
      r.reason
    from public.reports r
    where r.status = 'open' and r.target_type = 'message' and r.target_id is not null
    order by r.created_at desc limit 30;
end $$;

create or replace function public.admin_open_reported_chat(p_report uuid, p_reason text)
returns table(msg_id uuid, at timestamptz, sender_name text, body text, removed boolean, is_reported boolean)
language plpgsql security definer set search_path = public as $$
declare r public.reports%rowtype; m public.messages%rowtype;
begin
  if not public.has_power('review_chat') then raise exception 'You do not have the box for that'; end if;
  if not public.gate_is_open('chat_review') then raise exception 'This is locked until the privacy page and terms say it'; end if;
  p_reason := trim(coalesce(p_reason, ''));
  if length(p_reason) < 10 then raise exception 'Write the reason (at least 10 letters)'; end if;
  select * into r from public.reports where id = p_report and target_type = 'message' and target_id is not null;
  if not found then raise exception 'That report is not about a chat message'; end if;
  select * into m from public.messages where id = r.target_id;
  if not found then raise exception 'That message no longer exists'; end if;
  perform private.log_admin('chat_reviewed', 'report', r.id::text, 'reason: ' || left(p_reason, 150));
  return query
    select x.id, x.created_at,
      (select coalesce(mm.display_name, u.email) from auth.users u left join public.members mm on lower(mm.email) = lower(u.email) where u.id = x.sender),
      x.body, x.deleted_at is not null, x.id = m.id
    from public.messages x
    where (x.sender = m.sender and x.recipient = m.recipient) or (x.sender = m.recipient and x.recipient = m.sender)
    order by x.created_at desc limit 40;
end $$;

revoke all on function public.admin_coin_person(text), public.admin_coin_history(uuid), public.admin_coin_correct(uuid, text, integer, text),
  public.admin_reported_chats(), public.admin_open_reported_chat(uuid, text) from public, anon;
grant execute on function public.admin_coin_person(text), public.admin_coin_history(uuid), public.admin_coin_correct(uuid, text, integer, text),
  public.admin_reported_chats(), public.admin_open_reported_chat(uuid, text) to authenticated;
