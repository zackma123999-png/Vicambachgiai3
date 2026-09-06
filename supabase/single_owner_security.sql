-- Enforce a single immutable site owner.
begin;

create or replace function private.is_admin_internal()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() = '3e5ea3a2-c462-482f-9671-bc59a220adda'::uuid
     and exists (
       select 1 from public.profiles
       where user_id = '3e5ea3a2-c462-482f-9671-bc59a220adda'::uuid
         and role = 'admin' and status = 'active'
     )
$$;

revoke all on function private.is_admin_internal() from public, anon, authenticated;

create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  owner_id constant uuid := '3e5ea3a2-c462-482f-9671-bc59a220adda'::uuid;
begin
  if tg_op = 'INSERT' then
    new.role := 'reader';
    new.status := 'active';
    if new.avatar = 'vca:16' then
      raise exception 'Avatar nay chi danh cho chu so huu';
    end if;
    return new;
  end if;

  if old.user_id = owner_id then
    new.user_id := old.user_id;
    new.email := old.email;
    new.role := 'admin';
    new.status := 'active';
    return new;
  end if;

  if new.user_id is distinct from old.user_id
     or new.email is distinct from old.email
     or new.role is distinct from old.role then
    raise exception 'Khong duoc thay doi danh tinh hoac quyen tai khoan';
  end if;

  new.role := 'reader';

  if not public.is_admin() and new.status is distinct from old.status then
    raise exception 'Khong duoc thay doi trang thai tai khoan';
  end if;

  if not public.is_admin() and new.avatar = 'vca:16' then
    raise exception 'Avatar nay chi danh cho chu so huu';
  end if;

  return new;
end;
$$;

update public.profiles set role = 'reader'
where user_id <> '3e5ea3a2-c462-482f-9671-bc59a220adda'::uuid and role <> 'reader';

update public.profiles set role = 'admin', status = 'active'
where user_id = '3e5ea3a2-c462-482f-9671-bc59a220adda'::uuid;

commit;
