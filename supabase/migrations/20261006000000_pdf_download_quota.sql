-- Giới hạn tải PDF: mỗi user 10 lượt/ngày (ngày Việt Nam).
--
-- Lý do làm server-side: đếm ở client (localStorage) bypass được bằng cách
-- xóa storage hay spam click. claim_pdf_download() trừ lượt NGUYÊN TỬ
-- (advisory lock theo user) nên click đồng thời không vượt quota.
-- File PDF sinh ở client, nhưng nút tải chỉ chạy tiếp khi RPC trả allowed.

create table if not exists public.pdf_download_quota (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  count integer not null default 0 check (count >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

alter table public.pdf_download_quota enable row level security;

create or replace function public.claim_pdf_download()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_day date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  v_count integer;
  v_allowed boolean;
begin
  if not public.is_active_user() then
    raise exception 'Active account required' using errcode = '42501';
  end if;

  -- Chặn spam-click: tối đa 20 lượt gọi/phút/user (mỗi lần tải thật tốn
  -- vài giây sinh PDF nên người thường không bao giờ chạm trần này).
  select public.check_edge_rate_limit(
    'pdf-claim:' || auth.uid()::text, 20, 60
  ) into v_allowed;
  if not coalesce(v_allowed, false) then
    raise exception 'Too many requests, please slow down' using errcode = 'P0001';
  end if;

  -- Khóa theo user để các click đồng thời không vượt quota.
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));

  select count into v_count
  from public.pdf_download_quota
  where user_id = auth.uid() and day = v_day;

  if coalesce(v_count, 0) >= 10 then
    return jsonb_build_object('allowed', false, 'remaining', 0, 'limit', 10);
  end if;

  insert into public.pdf_download_quota as q (user_id, day, count, updated_at)
  values (auth.uid(), v_day, 1, now())
  on conflict (user_id, day) do update
    set count = q.count + 1, updated_at = now()
  returning q.count into v_count;

  return jsonb_build_object('allowed', true, 'remaining', greatest(10 - v_count, 0), 'limit', 10);
end;
$$;

revoke all on function public.claim_pdf_download() from public, anon;
grant execute on function public.claim_pdf_download() to authenticated;

-- Dọn dòng quota cũ hơn 90 ngày (bảng tăng 1 dòng/user/ngày).
create or replace function public.prune_pdf_download_quota(p_days integer default 90)
returns integer
language plpgsql
security definer
set search_path = '' as $$
declare
  v_cutoff date := ((now() at time zone 'Asia/Ho_Chi_Minh')::date - greatest(coalesce(p_days, 90), 7));
  v_deleted integer;
begin
  delete from public.pdf_download_quota where day < v_cutoff;
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function public.prune_pdf_download_quota(integer) from public, anon, authenticated;
grant execute on function public.prune_pdf_download_quota(integer) to service_role;

create extension if not exists pg_cron;
select cron.schedule(
  'prune-pdf-download-quota',
  '20 3 * * *',
  $$select public.prune_pdf_download_quota(90)$$
) where not exists (select 1 from cron.job where jobname = 'prune-pdf-download-quota');
