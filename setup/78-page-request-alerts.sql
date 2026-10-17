-- 78: 📲 Alert fix, step 3 (Oct 17, 2026, from phone test session 1, section D, items D7 and D8).
-- A new club / business page request sent no alert, and neither did approving or declining it.
--   * A new request (status 'pending') -> every approved admin gets "🏷 New page request" (tap = Me > Invite, where Approve / Decline live).
--   * Approved  -> the owner gets "✅ Your page is live" (tap = that page).
--   * Declined  -> the owner gets "Page request not approved" (tap = the pages list).
--   * The owner approving or declining their own request (an admin who is also the owner) sends nothing to themselves.
-- Same pattern as setup/75: database triggers, so no screen can forget to send them; each send is wrapped so a failed alert
-- NEVER blocks the request or the decision. Category 'social' ("Friends & messages" switch). Links use the plain "?go=" form (setup/76).
-- Only create statements (the Supabase connector refuses removals).

create or replace function private.trg_page_request_alert() returns trigger
language plpgsql security definer set search_path = public, private as $$
declare a record; nm text;
begin
  if new.status is distinct from 'pending' then return new; end if;
  begin
    select coalesce(nullif(display_name, ''), handle) into nm from public.profiles where user_id = new.owner;
    for a in select u.id from public.members m join auth.users u on lower(u.email) = lower(m.email)
             where m.is_admin and m.status = 'approved' and u.id <> new.owner loop
      begin
        perform public.enqueue_notification(a.id, 'social', '🏷 New page request from ' || coalesce(nm, 'a member'),
          'A new ' || new.kind || ' page: “' || new.name || '”. Tap to approve or decline.', '?go=invite', 'page-req:' || new.id || ':' || a.id);
      exception when others then null;
      end;
    end loop;
  exception when others then null;
  end;
  return new;
end $$;

create or replace trigger host_pages_alert_admin after insert on public.host_pages
  for each row execute function private.trg_page_request_alert();

create or replace function private.trg_page_decision_alert() returns trigger
language plpgsql security definer set search_path = public, private as $$
begin
  if old.status = 'pending' and new.status in ('approved', 'declined') and new.reviewed_by is distinct from new.owner then
    begin
      if new.status = 'approved' then
        perform public.enqueue_notification(new.owner, 'social', '✅ Your page is live',
          '“' || new.name || '” was approved. Tap to open it.', '?go=pages&id=' || new.id, 'page-dec:' || new.id);
      else
        perform public.enqueue_notification(new.owner, 'social', 'Page request not approved',
          '“' || new.name || '” was not approved this time. Tap to see your pages.', '?go=pages', 'page-dec:' || new.id);
      end if;
    exception when others then null;
    end;
  end if;
  return new;
end $$;

create or replace trigger host_pages_alert_owner after update of status on public.host_pages
  for each row execute function private.trg_page_decision_alert();
