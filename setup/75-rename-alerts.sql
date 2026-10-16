-- 75: 📲 Phone alerts for page-rename requests (Oct 16, 2026, sprint #7 item 1).
-- setup/74 let a page owner ask for a new name and the admin say yes or no, but nobody got told.
--   * A new request  -> every approved admin gets "✏️ Rename request" (tap = the Invite / requests screen, where Approve / Decline live).
--   * A decision     -> the owner gets "✅ Page renamed" or "Rename not approved" (tap = that page).
--   * Cancelling a request sends nothing.
-- Same pattern as the 🐞 problem-report alert (setup/51): alerts are sent by database triggers, so no screen can forget to send them,
-- and a failed alert never blocks the request or the decision itself (each send is wrapped so errors are ignored).
-- Category 'social' (the "Friends & messages" switch in Settings -> Phone alerts), same as problem reports. Respects quiet hours.
-- Only create statements (the Supabase connector refuses removals).

create or replace function private.trg_rename_request_alert() returns trigger
language plpgsql security definer set search_path = public, private as $$
declare a record; nm text;
begin
  select coalesce(nullif(display_name, ''), handle) into nm from public.profiles where user_id = new.requested_by;
  for a in select u.id from public.members m join auth.users u on lower(u.email) = lower(m.email)
           where m.is_admin and m.status = 'approved' and u.id <> new.requested_by loop
    begin
      perform public.enqueue_notification(a.id, 'social', '✏️ Rename request from ' || coalesce(nm, 'a page owner'),
        '“' || new.old_name || '” → “' || new.new_name || '”. Tap to approve or decline.', './?go=invite', 'rename-req:' || new.id || ':' || a.id);
    exception when others then null;
    end;
  end loop;
  return new;
end $$;

create or replace trigger host_page_renames_alert_admin after insert on public.host_page_renames
  for each row execute function private.trg_rename_request_alert();

create or replace function private.trg_rename_decision_alert() returns trigger
language plpgsql security definer set search_path = public, private as $$
begin
  if old.status = 'pending' and new.status in ('approved', 'declined') and new.reviewed_by is distinct from new.requested_by then
    begin
      if new.status = 'approved' then
        perform public.enqueue_notification(new.requested_by, 'social', '✅ Your page has a new name',
          '“' || new.old_name || '” is now “' || new.new_name || '”.', './?go=pages&id=' || new.page_id, 'rename-dec:' || new.id);
      else
        perform public.enqueue_notification(new.requested_by, 'social', 'Rename not approved',
          'Your page keeps the name “' || new.old_name || '”. You can ask again with another name.', './?go=pages&id=' || new.page_id, 'rename-dec:' || new.id);
      end if;
    exception when others then null;
    end;
  end if;
  return new;
end $$;

create or replace trigger host_page_renames_alert_owner after update of status on public.host_page_renames
  for each row execute function private.trg_rename_decision_alert();
