-- V3 step 5: fish length and weight on catches (applied via the Supabase connector, Oct 8 2026)
alter table public.catches
  add column if not exists length_in real check (length_in > 0 and length_in < 200),
  add column if not exists weight_lb real check (weight_lb > 0 and weight_lb < 2000),
  add column if not exists weight_est boolean not null default false; -- true = weight estimated from length
