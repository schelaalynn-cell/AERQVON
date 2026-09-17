-- Harden function execution privileges and fix mutable search_path.
alter function public.set_trading_balances_updated_at()
set search_path = public;

revoke execute on function public.handle_new_aqv_user() from public, anon, authenticated;
