
-- AERQVON security hardening: tighten Data API table grants without changing data.
-- Client financial writes remain server-authoritative through Edge Functions/RPCs.
begin;

-- Remove non-application privileges from anon across public application tables.
revoke all on table
  public.trading_balances,
  public.trading_orders,
  public.trading_trades,
  public.trading_notifications,
  public.telegram_identities,
  public.aqv_user_profiles,
  public.aqv_user_id_registry,
  public.aqv_transfers,
  public.market_candles,
  public.market_quotes,
  public.trading_positions,
  public.trading_account_events,
  public.trading_risk_events
from anon;

-- Anonymous clients may read only public market data.
grant select on table public.market_candles, public.market_quotes to anon;

-- Remove non-application table privileges from authenticated clients.
revoke references, trigger, truncate on table
  public.trading_balances,
  public.trading_orders,
  public.trading_trades,
  public.trading_notifications,
  public.telegram_identities,
  public.aqv_user_profiles,
  public.aqv_user_id_registry,
  public.aqv_transfers,
  public.market_candles,
  public.market_quotes,
  public.trading_positions,
  public.trading_account_events,
  public.trading_risk_events
from authenticated;

-- AQV profile state is server/trigger managed; clients only read their own row via RLS.
revoke insert, update, delete on table public.aqv_user_profiles from authenticated;

-- AQV transfer history is immutable from the client.
revoke insert, update, delete on table public.aqv_transfers from authenticated;

-- AQV registry is never client writable/readable.
revoke select, insert, update, delete on table public.aqv_user_id_registry from authenticated;

-- Financial/trading state is server-authoritative.
revoke insert, update, delete on table
  public.trading_balances,
  public.trading_orders,
  public.trading_trades,
  public.trading_notifications,
  public.trading_positions,
  public.trading_account_events,
  public.trading_risk_events
from authenticated;

-- Market data is read-only to authenticated clients.
grant select on table public.market_candles, public.market_quotes to authenticated;

commit;
;
