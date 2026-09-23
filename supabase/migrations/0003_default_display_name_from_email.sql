-- 2026-09-23 초대/생성 시 이름을 주지 않으면 이메일 @ 앞부분을 표시 이름으로 쓴다.
-- 그 이름이 운영 명칭이나 owner 이름과 겹쳐 guard_display_name이 막으면 '회원'으로 둔다.
begin;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  name text := coalesce(
    nullif(left(btrim(regexp_replace(new.raw_user_meta_data->>'display_name', '[[:cntrl:]]', '', 'g')), 30), ''),
    nullif(left(btrim(regexp_replace(split_part(new.email, '@', 1), '[[:cntrl:]]', '', 'g')), 30), ''),
    '회원'
  );
begin
  begin
    insert into public.profiles (id, display_name) values (new.id, name);
  exception when check_violation then
    insert into public.profiles (id, display_name) values (new.id, '회원');
  end;
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- 기존에 기본값 '회원'으로 만들어진 회원 이름을 이메일 앞부분으로 바꾼다.
update public.profiles p
set display_name = left(split_part(u.email, '@', 1), 30)
from auth.users u
where u.id = p.id and p.role = 'member' and p.display_name = '회원'
  and lower(split_part(u.email, '@', 1)) not in ('잇룸', 'itroom', '관리자', '운영자', 'admin', 'owner');

commit;
