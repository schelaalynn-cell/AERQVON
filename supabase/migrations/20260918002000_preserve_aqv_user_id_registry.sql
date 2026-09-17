-- Preserve AQV IDs in a private registry so identifiers are never reused.
create table if not exists public.aqv_user_id_registry (
  aqv_user_id text primary key,
  user_id uuid unique references auth.users(id) on delete set null,
  assigned_at timestamptz not null default now(),
  retired_at timestamptz
);

alter table public.aqv_user_id_registry enable row level security;
revoke all on table public.aqv_user_id_registry from anon, authenticated;

insert into public.aqv_user_id_registry (aqv_user_id, user_id, assigned_at)
select p.aqv_user_id, p.user_id, p.created_at
from public.aqv_user_profiles p
on conflict (aqv_user_id) do nothing;

create or replace function public.generate_aqv_user_id()
returns text
language plpgsql
security definer
set search_path = ''
as $function$
declare
  candidate text;
begin
  loop
    candidate := 'AQV-' || upper(substr(md5(gen_random_uuid()::text), 1, 8));
    exit when not exists (
      select 1 from public.aqv_user_id_registry where aqv_user_id = candidate
    );
  end loop;
  return candidate;
end;
$function$;

create or replace function public.handle_new_aqv_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  assigned_id text;
begin
  select aqv_user_id into assigned_id
  from public.aqv_user_id_registry
  where user_id = new.id;

  if assigned_id is null then
    assigned_id := public.generate_aqv_user_id();
    insert into public.aqv_user_id_registry (aqv_user_id, user_id)
    values (assigned_id, new.id);
  end if;

  insert into public.aqv_user_profiles (user_id, aqv_user_id)
  values (new.id, assigned_id)
  on conflict (user_id) do nothing;

  return new;
end;
$function$;

revoke all on table public.aqv_user_id_registry from anon, authenticated;
revoke execute on function public.generate_aqv_user_id() from public, anon, authenticated;
revoke execute on function public.handle_new_aqv_user() from public, anon, authenticated;
