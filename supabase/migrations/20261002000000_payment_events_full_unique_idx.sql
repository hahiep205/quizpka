DROP INDEX IF EXISTS public.payment_events_provider_event_idx;
DROP INDEX IF EXISTS public.payment_events_provider_transaction_idx;
CREATE UNIQUE INDEX payment_events_provider_event_idx
  ON public.payment_events(provider, event_id);
CREATE UNIQUE INDEX payment_events_provider_transaction_idx
  ON public.payment_events(provider, transaction_id);