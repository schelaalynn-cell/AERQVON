begin;

-- Bind every trading row to a real Supabase Auth user.
alter table public.trading_balances
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table public.trading_orders
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table public.trading_trades
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table public.trading_notifications
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

-- The database was just created and contains no rows, so user_id can now be required.
alter table public.trading_balances alter column user_id set not null;
alter table public.trading_orders alter column user_id set not null;
alter table public.trading_trades alter column user_id set not null;
alter table public.trading_notifications alter column user_id set not null;

create index if not exists idx_trading_balances_user_id on public.trading_balances(user_id);
create index if not exists idx_trading_orders_user_id on public.trading_orders(user_id);
create index if not exists idx_trading_trades_user_id on public.trading_trades(user_id);
create index if not exists idx_trading_notifications_user_id on public.trading_notifications(user_id);

-- A balance belongs to exactly one authenticated user + asset.
alter table public.trading_balances drop constraint if exists trading_balances_session_asset_unique;
alter table public.trading_balances add constraint trading_balances_user_asset_unique unique (user_id, asset_id);

-- Remove any existing policies so this migration is deterministic.
drop policy if exists trading_balances_select_own on public.trading_balances;
drop policy if exists trading_balances_insert_own on public.trading_balances;
drop policy if exists trading_balances_update_own on public.trading_balances;
drop policy if exists trading_balances_delete_own on public.trading_balances;
drop policy if exists trading_orders_select_own on public.trading_orders;
drop policy if exists trading_orders_insert_own on public.trading_orders;
drop policy if exists trading_orders_update_own on public.trading_orders;
drop policy if exists trading_orders_delete_own on public.trading_orders;
drop policy if exists trading_trades_select_own on public.trading_trades;
drop policy if exists trading_trades_insert_own on public.trading_trades;
drop policy if exists trading_trades_update_own on public.trading_trades;
drop policy if exists trading_trades_delete_own on public.trading_trades;
drop policy if exists trading_notifications_select_own on public.trading_notifications;
drop policy if exists trading_notifications_insert_own on public.trading_notifications;
drop policy if exists trading_notifications_update_own on public.trading_notifications;
drop policy if exists trading_notifications_delete_own on public.trading_notifications;

-- Only authenticated users can reach their own trading rows.
create policy trading_balances_select_own on public.trading_balances
  for select to authenticated using ((select auth.uid()) = user_id);
create policy trading_balances_insert_own on public.trading_balances
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy trading_balances_update_own on public.trading_balances
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy trading_balances_delete_own on public.trading_balances
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy trading_orders_select_own on public.trading_orders
  for select to authenticated using ((select auth.uid()) = user_id);
create policy trading_orders_insert_own on public.trading_orders
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy trading_orders_update_own on public.trading_orders
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy trading_orders_delete_own on public.trading_orders
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy trading_trades_select_own on public.trading_trades
  for select to authenticated using ((select auth.uid()) = user_id);
create policy trading_trades_insert_own on public.trading_trades
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy trading_trades_update_own on public.trading_trades
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy trading_trades_delete_own on public.trading_trades
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy trading_notifications_select_own on public.trading_notifications
  for select to authenticated using ((select auth.uid()) = user_id);
create policy trading_notifications_insert_own on public.trading_notifications
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy trading_notifications_update_own on public.trading_notifications
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy trading_notifications_delete_own on public.trading_notifications
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Explicit least-privilege Data API grants. RLS remains the row-level boundary.
revoke all on table public.trading_balances from anon, authenticated;
revoke all on table public.trading_orders from anon, authenticated;
revoke all on table public.trading_trades from anon, authenticated;
revoke all on table public.trading_notifications from anon, authenticated;

grant select, insert, update, delete on public.trading_balances to authenticated;
grant select, insert, update, delete on public.trading_orders to authenticated;
grant select, insert, update, delete on public.trading_trades to authenticated;
grant select, insert, update, delete on public.trading_notifications to authenticated;

grant usage, select on sequence public.trading_trades_id_seq to authenticated;
grant usage, select on sequence public.trading_notifications_id_seq to authenticated;

commit;;
