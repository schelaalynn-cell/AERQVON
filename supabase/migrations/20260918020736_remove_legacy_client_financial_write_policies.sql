begin;
drop policy if exists trading_balances_insert_own on public.trading_balances;
drop policy if exists trading_balances_update_own on public.trading_balances;
drop policy if exists trading_balances_delete_own on public.trading_balances;

drop policy if exists trading_orders_insert_own on public.trading_orders;
drop policy if exists trading_orders_update_own on public.trading_orders;
drop policy if exists trading_orders_delete_own on public.trading_orders;

drop policy if exists trading_trades_insert_own on public.trading_trades;
drop policy if exists trading_trades_update_own on public.trading_trades;
drop policy if exists trading_trades_delete_own on public.trading_trades;

drop policy if exists trading_notifications_insert_own on public.trading_notifications;
drop policy if exists trading_notifications_update_own on public.trading_notifications;
drop policy if exists trading_notifications_delete_own on public.trading_notifications;
commit;;
