-- Keep the private AQV ID registry inaccessible even if a policy is inspected.
drop policy if exists "AQV registry is never client readable" on public.aqv_user_id_registry;
create policy "AQV registry is never client readable"
on public.aqv_user_id_registry
for select
to authenticated
using (false);
