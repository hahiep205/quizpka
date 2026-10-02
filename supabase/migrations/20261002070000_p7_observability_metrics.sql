-- P7: internal, low-cardinality operational metrics. No request payloads.
create table if not exists public.security_metrics_daily (
  metric_date date not null default current_date,
  metric_key text not null check (metric_key ~ '^[a-z0-9_:.\\-]{1,80}$'),
  metric_value bigint not null default 0 check (metric_value >= 0),
  updated_at timestamptz not null default now(),
  primary key (metric_date, metric_key)
);

alter table public.security_metrics_daily enable row level security;
revoke all on public.security_metrics_daily from public, anon, authenticated;

create or replace function public.increment_security_metric(p_metric_key text, p_amount integer default 1)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_metric_key is null or p_metric_key !~ '^[a-z0-9_:.\\-]{1,80}$' then
    raise exception 'Invalid metric key';
  end if;
  if p_amount is null or p_amount < 1 or p_amount > 100000 then
    raise exception 'Invalid metric amount';
  end if;
  insert into public.security_metrics_daily(metric_date, metric_key, metric_value)
  values (current_date, p_metric_key, p_amount)
  on conflict (metric_date, metric_key) do update
    set metric_value = public.security_metrics_daily.metric_value + excluded.metric_value,
        updated_at = now();
end;
$$;
revoke all on function public.increment_security_metric(text, integer) from public, anon, authenticated;
grant execute on function public.increment_security_metric(text, integer) to service_role;

create or replace function public.prune_security_metrics(p_keep_days integer default 90)
returns integer language plpgsql security definer set search_path = public as $$
declare v_count integer;
begin
  if p_keep_days < 30 then p_keep_days := 30; end if;
  delete from public.security_metrics_daily where metric_date < current_date - p_keep_days;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
revoke all on function public.prune_security_metrics(integer) from public, anon, authenticated;
grant execute on function public.prune_security_metrics(integer) to service_role;

select cron.schedule('expire-pending-orders', '*/5 * * * *', $$select public.expire_pending_orders()$$)
where not exists (select 1 from cron.job where jobname = 'expire-pending-orders');
select cron.schedule('prune-security-metrics', '15 3 * * *', $$select public.prune_security_metrics(90)$$)
where not exists (select 1 from cron.job where jobname = 'prune-security-metrics');
