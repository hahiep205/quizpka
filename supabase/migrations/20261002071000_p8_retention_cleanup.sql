-- P8: bounded cleanup for internal operational and payment data.
create or replace function public.cleanup_payment_operational_data()
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_events integer; v_payloads integer; v_rate_rows integer;
begin
  delete from public.payment_events where received_at < now() - interval '180 days';
  get diagnostics v_events = row_count;
  update public.payment_events set payload = '{}'::jsonb
    where received_at < now() - interval '30 days' and payload <> '{}'::jsonb;
  get diagnostics v_payloads = row_count;
  delete from public.edge_rate_limits where window_start < now() - interval '7 days';
  get diagnostics v_rate_rows = row_count;
  return jsonb_build_object('payment_events_deleted', v_events, 'payment_payloads_redacted', v_payloads, 'rate_limit_rows_deleted', v_rate_rows);
end;
$$;
revoke all on function public.cleanup_payment_operational_data() from public, anon, authenticated;
grant execute on function public.cleanup_payment_operational_data() to service_role;

select cron.schedule('cleanup-payment-operational-data', '30 3 * * *', $$select public.cleanup_payment_operational_data()$$)
where not exists (select 1 from cron.job where jobname = 'cleanup-payment-operational-data');
