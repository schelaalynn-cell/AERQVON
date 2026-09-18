
create table if not exists public.aqv_user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  aqv_user_id text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table public.aqv_user_profiles enable row level security;

revoke all on table public.aqv_user_profiles from anon;
grant select on table public.aqv_user_profiles to authenticated;

drop policy if exists "Users can view their own AQV user ID" on public.aqv_user_profiles;
create policy "Users can view their own AQV user ID"
on public.aqv_user_profiles
for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

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
      select 1 from public.aqv_user_profiles where aqv_user_id = candidate
    );
  end loop;
  return candidate;
end;
$function$;

revoke execute on function public.generate_aqv_user_id() from public, anon, authenticated;

create or replace function public.handle_new_aqv_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  insert into public.aqv_user_profiles (user_id, aqv_user_id)
  values (new.id, public.generate_aqv_user_id())
  on conflict (user_id) do nothing;
  return new;
end;
$function$;

drop trigger if exists on_auth_user_created_aqv_id on auth.users;
create trigger on_auth_user_created_aqv_id
after insert on auth.users
for each row execute function public.handle_new_aqv_user();

insert into public.aqv_user_profiles (user_id, aqv_user_id)
select u.id, public.generate_aqv_user_id()
from auth.users u
left join public.aqv_user_profiles p on p.user_id = u.id
where p.user_id is null;

alter table public.aqv_user_profiles
add constraint aqv_user_id_format_check
check (aqv_user_id ~ '^AQV-[A-Z0-9]{8}$');

create index if not exists aqv_user_profiles_aqv_user_id_idx
on public.aqv_user_profiles (aqv_user_id);
;
