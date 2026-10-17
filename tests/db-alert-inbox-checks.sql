-- Alert inbox checks for setup/77 (Oct 17, 2026). Paste into the Supabase SQL Editor (or run through the connector).
-- It cancels itself on purpose: the last line raises an error that starts with ROLLBACK_RESULT, so nothing is saved.
-- Expected result (read the message):
--   A_test_account_rows : one row "✅ Your page has a new name", url ?go=pages&id=…, result "no phone", sent true
--   A_admin_phone_rows  : one row "Rename request from …", url ?go=invite, result null, sent false (= phone ping queued)
--   B_switched_off_saved: 0   (alert type switched off -> not saved)      B_other_type_saved: 1
--   C_phone_row         : result null, sent false                          D_dedupe_count: 1
-- Uses the test account richard9267@gmail.com (owns page TLA1, no phone) and rich9267@gmail.com (admin, has a phone).
do $t$
declare t uuid; r uuid; pid uuid; rid uuid; out jsonb := '{}';
begin
  select id into t from auth.users where email = 'richard9267@gmail.com';
  select id into r from auth.users where email = 'rich9267@gmail.com';
  select id into pid from public.host_pages where owner = t and status = 'approved' limit 1;
  insert into host_page_renames(page_id, requested_by, old_name, new_name) values (pid, t, 'TLA1', 'TLA One Test') returning id into rid;
  update host_page_renames set status = 'approved', reviewed_at = now(), reviewed_by = r where id = rid;
  out := out || jsonb_build_object('A_test_account_rows', (select coalesce(jsonb_agg(jsonb_build_object('title', title, 'url', url, 'result', result, 'sent', sent_at is not null)), '[]') from notifications where user_id = t and dedupe_key = 'rename-dec:' || rid));
  out := out || jsonb_build_object('A_admin_phone_rows', (select coalesce(jsonb_agg(jsonb_build_object('title', title, 'url', url, 'result', result, 'sent', sent_at is not null)), '[]') from notifications where user_id = r and dedupe_key like 'rename-req:' || rid || ':%'));
  perform enqueue_notification(t, 'social', 'dup', 'x', '?go=feed', 'zz-dup');
  perform enqueue_notification(t, 'social', 'dup', 'x', '?go=feed', 'zz-dup');
  out := out || jsonb_build_object('D_dedupe_count', (select count(*) from notifications where dedupe_key = 'zz-dup'));
  insert into notif_prefs(user_id, social) values (t, false) on conflict (user_id) do update set social = false;
  perform enqueue_notification(t, 'social', 'off', 'x', '?go=feed', 'zz-off');
  perform enqueue_notification(t, 'contests', 'other type still saved', 'x', '?go=feed', 'zz-other');
  out := out || jsonb_build_object('B_switched_off_saved', (select count(*) from notifications where dedupe_key = 'zz-off'), 'B_other_type_saved', (select count(*) from notifications where dedupe_key = 'zz-other'));
  perform enqueue_notification(r, 'social', 'phone', 'x', '?go=feed', 'zz-phone');
  out := out || jsonb_build_object('C_phone_row', (select jsonb_build_object('result', result, 'sent', sent_at is not null) from notifications where dedupe_key = 'zz-phone'));
  raise exception 'ROLLBACK_RESULT %', out::text;
end $t$;
