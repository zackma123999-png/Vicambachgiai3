begin;

-- This is an intentional read-only public projection. It exposes only the
-- identity fields already displayed beside public comments; account email,
-- role and status remain available only through the protected profiles table.
create or replace view public.public_profiles
with (security_invoker = false, security_barrier = true)
as
select
  user_id,
  display_name,
  avatar,
  coalesce(bio, '') as bio
from public.profiles
where status = 'active';

revoke all on table public.public_profiles from public, anon, authenticated;
grant select on table public.public_profiles to anon, authenticated;

notify pgrst, 'reload schema';

commit;
