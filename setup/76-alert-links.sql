-- 76: 🔗 Alert links fix, step 1 (Oct 17, 2026, from phone test session 1, section D).
-- The rename-request, rename-decision and problem-report alerts saved their link as "./?go=…" (with a leading "./").
-- The phone tap handler (sw.js) and the Alerts list (js/12 handleGo) only understood "?go=…", so tapping opened the app and went nowhere.
-- The app now accepts both forms (v121). This file makes NEW alerts use the plain "?go=…" form like every other alert,
-- and repairs the alerts already saved. Only create-or-replace and a targeted update (no removals).

create or replace function private.trg_rename_request_alert() returns trigger
language plpgsql security definer set search_path = public, private as $$
declare a record; nm text;
begin
  select coalesce(nullif(display_name, ''), handle) into nm from public.profiles where user_id = new.requested_by;
  for a in select u.id from public.members m join auth.users u on lower(u.email) = lower(m.email)
           where m.is_admin and m.status = 'approved' and u.id <> new.requested_by loop
    begin
      perform public.enqueue_notification(a.id, 'social', '✏️ Rename request from ' || coalesce(nm, 'a page owner'),
        '“' || new.old_name || '” → “' || new.new_name || '”. Tap to approve or decline.', '?go=invite', 'rename-req:' || new.id || ':' || a.id);
    exception when others then null;
    end;
  end loop;
  return new;
end $$;

create or replace function private.trg_rename_decision_alert() returns trigger
language plpgsql security definer set search_path = public, private as $$
begin
  if old.status = 'pending' and new.status in ('approved', 'declined') and new.reviewed_by is distinct from new.requested_by then
    begin
      if new.status = 'approved' then
        perform public.enqueue_notification(new.requested_by, 'social', '✅ Your page has a new name',
          '“' || new.old_name || '” is now “' || new.new_name || '”.', '?go=pages&id=' || new.page_id, 'rename-dec:' || new.id);
      else
        perform public.enqueue_notification(new.requested_by, 'social', 'Rename not approved',
          'Your page keeps the name “' || new.old_name || '”. You can ask again with another name.', '?go=pages&id=' || new.page_id, 'rename-dec:' || new.id);
      end if;
    exception when others then null;
    end;
  end if;
  return new;
end $$;

create or replace function private.trg_problem_alert() returns trigger
language plpgsql security definer set search_path = public, private as $$
declare a record; nm text;
begin
  select coalesce(nullif(display_name, ''), handle) into nm from public.profiles where user_id = new.user_id;
  new.who := coalesce(nm, 'Someone');
  for a in select u.id from public.members m join auth.users u on lower(u.email) = lower(m.email) where m.is_admin and m.status = 'approved' loop
    begin
      perform public.enqueue_notification(a.id, 'social', '🐞 Problem report from ' || new.who, left(new.note, 140), '?go=problems', 'problem:' || new.id || ':' || a.id);
    exception when others then null;
    end;
  end loop;
  return new;
end $$;

-- repair the alerts already saved (rename, problem, and the older race / license ones that used the same "./" form)
update public.notifications set url = substr(url, 3) where url like './?go=%';
