-- M1: composite multi-gate rate check for Edge Functions.
--
-- Motivation (log-cost): each edge invocation currently pays one REST
-- round-trip per gate (`get-paid-document` / `get-paid-question-bank` = 3,
-- `create-sepay-checkout` = 2); every round-trip is an edge log line on both
-- sides. This function evaluates up to 5 gates in ONE call.
--
-- Semantics mirror public.check_edge_rate_limit exactly (created directly on
-- prod as version 20260929195812 "p1_edge_rate_limit", body preserved in
-- backup-database/supabase-schema-20260930-061506.sql): fixed-window counter
-- with `for update` lock and a ~1% probabilistic janitor. Gates are evaluated
-- in order and the run SHORT-CIRCUITS at the first rejected gate — identical
-- to today's sequential rateGate() calls, so shared buckets keep the same
-- consumption pattern.
--
-- Caller: service_role only (edge functions). The frontend never calls either
-- rate RPC; SQL RPCs call check_edge_rate_limit under definer context.

revoke execute on function public.check_edge_rate_limit(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.check_edge_rate_limit(text, integer, integer)
  to service_role;

create or replace function public.check_edge_rate_limits(p_gates jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_gate jsonb;
  v_bucket text;
  v_limit integer;
  v_window integer;
  v_count integer;
  v_start timestamptz;
  v_allowed boolean;
  v_results boolean[] := '{}';
  v_all boolean := true;
  v_index integer := 0;
begin
  if p_gates is null or jsonb_typeof(p_gates) <> 'array'
     or jsonb_array_length(p_gates) < 1 or jsonb_array_length(p_gates) > 5 then
    raise exception 'p_gates must be a json array of 1..5 gate objects' using errcode = '22023';
  end if;

  for v_gate in select * from jsonb_array_elements(p_gates) loop
    v_index := v_index + 1;
    begin
      v_bucket := v_gate->>'bucket';
      v_limit := (v_gate->>'limit')::integer;
      v_window := (v_gate->>'window_seconds')::integer;
    exception when others then
      raise exception 'Invalid gate at index %', v_index using errcode = '22023';
    end;
    if v_bucket is null or char_length(trim(v_bucket)) = 0 or char_length(v_bucket) > 200
       or v_limit is null or v_limit <= 0 or v_limit > 100000
       or v_window is null or v_window <= 0 or v_window > 86400 then
      raise exception 'Invalid gate at index %', v_index using errcode = '22023';
    end if;

    -- Exact copy of check_edge_rate_limit's fixed-window body.
    select count, window_start into v_count, v_start
      from public.edge_rate_limits where bucket = v_bucket for update;

    if not found or v_start <= now() - make_interval(secs => v_window) then
      insert into public.edge_rate_limits(bucket, window_start, count)
      values (v_bucket, now(), 1)
      on conflict (bucket) do update set window_start = now(), count = 1;
      -- Probabilistic janitor, same as the single-gate function.
      if random() < 0.01 then
        delete from public.edge_rate_limits where window_start < now() - interval '7 days';
      end if;
      v_allowed := true;
    elsif v_count >= v_limit then
      v_allowed := false;
    else
      update public.edge_rate_limits set count = count + 1 where bucket = v_bucket;
      v_allowed := true;
    end if;

    v_results := v_results || v_allowed;
    if not v_allowed then
      v_all := false;
      exit;
    end if;
  end loop;

  return jsonb_build_object('allowed', v_all, 'results', to_jsonb(v_results));
end;
$$;

revoke all on function public.check_edge_rate_limits(jsonb) from public, anon, authenticated;
grant execute on function public.check_edge_rate_limits(jsonb) to service_role;
