-- Alert fix step 3 checks (Oct 17, 2026). Self-cancelling: the last line raises an error, so nothing is saved.
-- Expect: "RESULT D7 admin alerts=1 ... url=?go=invite; owner self-alerts=0; D8 approve alerts=1 ... url=?go=pages&id=...; D8 decline alerts=1 ... url=?go=pages"
do $$
declare adm uuid; own uuid; pid uuid; pid2 uuid; r text := ''; n int; t text; u text; res text;
begin
  select u2.id into adm from members m join auth.users u2 on lower(u2.email)=lower(m.email) where m.is_admin and m.status='approved' order by u2.created_at limit 1;
  select u2.id into own from members m join auth.users u2 on lower(u2.email)=lower(m.email) where not m.is_admin and m.status='approved' and u2.id<>adm order by u2.created_at limit 1;
  if adm is null or own is null then raise exception 'NEED ACCOUNTS adm=% own=%', adm, own; end if;
  insert into host_pages(owner, kind, name) values (own, 'club', 'ZZ Alert Test Club') returning id into pid;
  select count(*), max(title), max(url) into n, t, u from notifications where dedupe_key like 'page-req:'||pid||':%' and user_id=adm;
  r := r || format('D7 admin alerts=%s title=%s url=%s; ', n, t, u);
  select count(*) into n from notifications where dedupe_key like 'page-req:'||pid||':%' and user_id=own;
  r := r || format('owner self-alerts=%s; ', n);
  update host_pages set status='approved', reviewed_by=adm, reviewed_at=now() where id=pid;
  select count(*), max(title), max(url), max(result) into n, t, u, res from notifications where dedupe_key='page-dec:'||pid and user_id=own;
  r := r || format('D8 approve alerts=%s title=%s url=%s; ', n, t, u);
  insert into host_pages(owner, kind, name) values (own, 'club', 'ZZ Alert Test Two') returning id into pid2;
  update host_pages set status='declined', reviewed_by=adm, reviewed_at=now() where id=pid2;
  select count(*), max(title), max(url) into n, t, u from notifications where dedupe_key='page-dec:'||pid2 and user_id=own;
  r := r || format('D8 decline alerts=%s title=%s url=%s; ', n, t, u);
  raise exception 'RESULT %', r;
end $$;
