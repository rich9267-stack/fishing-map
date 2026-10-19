-- setup/90: six functions added after setup/67 were still runnable by signed-out visitors. Lock them like the rest.
-- Signed-in members and the server keep running them. Safe to run twice.
revoke execute on function public.admin_power_names() from public, anon;
revoke execute on function public.cancel_host_page_rename(uuid) from public, anon;
revoke execute on function public.host_page_renames_admin() from public, anon;
revoke execute on function public.host_page_renames_mine() from public, anon;
revoke execute on function public.request_host_page_rename(uuid, text) from public, anon;
revoke execute on function public.review_host_page_rename(uuid, boolean) from public, anon;
grant execute on function public.admin_power_names() to authenticated, service_role;
grant execute on function public.cancel_host_page_rename(uuid) to authenticated, service_role;
grant execute on function public.host_page_renames_admin() to authenticated, service_role;
grant execute on function public.host_page_renames_mine() to authenticated, service_role;
grant execute on function public.request_host_page_rename(uuid, text) to authenticated, service_role;
grant execute on function public.review_host_page_rename(uuid, boolean) to authenticated, service_role;

-- TO UNDO (only if something on the phone stops working):
-- grant execute on function public.admin_power_names() to public;  (and likewise for the other five)
