
create table if not exists public.aqv_transfers (
  id uuid primary key default gen_random_uuid(),
  idempotency_key uuid not null unique,
  sender_user_id uuid references auth.users(id) on delete set null,
  recipient_user_id uuid references auth.users(id) on delete set null,
  sender_aqv_user_id text not null,
  recipient_aqv_user_id text not null,
  asset_id text not null,
  amount numeric(38,18) not null check (amount > 0),
  fee numeric(38,18) not null default 0 check (fee >= 0),
  status text not null default 'completed' check (status in ('completed','failed')),
  note text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists aqv_transfers_sender_idx on public.aqv_transfers(sender_user_id, created_at desc);
create index if not exists aqv_transfers_recipient_idx on public.aqv_transfers(recipient_user_id, created_at desc);

alter table public.aqv_transfers enable row level security;
revoke all on table public.aqv_transfers from anon, authenticated;
grant select on table public.aqv_transfers to authenticated;

drop policy if exists "Users can view their AQV transfers" on public.aqv_transfers;
create policy "Users can view their AQV transfers"
on public.aqv_transfers
for select
to authenticated
using (
  (select auth.uid()) is not null
  and ((select auth.uid()) = sender_user_id or (select auth.uid()) = recipient_user_id)
);

revoke insert, update, delete on table public.trading_balances from authenticated, anon;

create or replace function public.transfer_tokens_by_aqv_id(
  p_recipient_aqv_id text,
  p_asset_id text,
  p_amount numeric,
  p_idempotency_key uuid,
  p_note text default null
)
returns public.aqv_transfers
language plpgsql
security definer
set search_path = ''
as $function$
declare
  sender uuid;
  recipient uuid;
  sender_aqv text;
  recipient_aqv text;
  sender_balance numeric;
  result_row public.aqv_transfers;
begin
  sender := (select auth.uid());
  if sender is null then
    raise exception 'Authentication required';
  end if;

  if p_recipient_aqv_id is null or p_recipient_aqv_id !~ '^AQV-[A-Z0-9]{8}$' then
    raise exception 'Invalid AERQVON User ID';
  end if;

  if p_asset_id is null or length(trim(p_asset_id)) = 0 or length(p_asset_id) > 32 then
    raise exception 'Invalid asset';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be greater than zero';
  end if;

  if p_idempotency_key is null then
    raise exception 'Idempotency key is required';
  end if;

  select aqv_user_id
    into sender_aqv
  from public.aqv_user_profiles
  where user_id = sender
    and deleted_at is null;

  if sender_aqv is null then
    raise exception 'AERQVON account profile not found';
  end if;

  select user_id, aqv_user_id
    into recipient, recipient_aqv
  from public.aqv_user_profiles
  where aqv_user_id = upper(trim(p_recipient_aqv_id))
    and deleted_at is null;

  if recipient is null then
    raise exception 'Recipient AERQVON User ID not found';
  end if;

  if recipient = sender then
    raise exception 'You cannot send tokens to yourself';
  end if;

  select *
    into result_row
  from public.aqv_transfers
  where idempotency_key = p_idempotency_key
  limit 1;

  if result_row.id is not null then
    if result_row.sender_user_id <> sender then
      raise exception 'Idempotency key already belongs to another account';
    end if;
    return result_row;
  end if;

  select amount
    into sender_balance
  from public.trading_balances
  where user_id = sender
    and asset_id = trim(p_asset_id)
  for update;

  if sender_balance is null then
    raise exception 'Insufficient balance';
  end if;

  if sender_balance < p_amount then
    raise exception 'Insufficient balance';
  end if;

  update public.trading_balances
  set amount = amount - p_amount,
      updated_at = now()
  where user_id = sender
    and asset_id = trim(p_asset_id);

  insert into public.trading_balances (user_id, asset_id, amount, session_id)
  values (recipient, trim(p_asset_id), p_amount, 'aqv-transfer')
  on conflict (user_id, asset_id)
  do update set amount = public.trading_balances.amount + excluded.amount,
                updated_at = now();

  insert into public.aqv_transfers (
    idempotency_key, sender_user_id, recipient_user_id,
    sender_aqv_user_id, recipient_aqv_user_id,
    asset_id, amount, fee, status, note, completed_at
  )
  values (
    p_idempotency_key, sender, recipient,
    sender_aqv, recipient_aqv,
    trim(p_asset_id), p_amount, 0, 'completed', left(p_note, 280), now()
  )
  returning * into result_row;

  return result_row;
end;
$function$;

revoke execute on function public.transfer_tokens_by_aqv_id(text,text,numeric,uuid,text) from public, anon;
grant execute on function public.transfer_tokens_by_aqv_id(text,text,numeric,uuid,text) to authenticated;
;
