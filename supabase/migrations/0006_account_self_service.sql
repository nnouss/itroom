-- 2026-09-29 내 정보 페이지: 표시 이름 중복 금지와 회원 본인 탈퇴.
begin;

-- 1. 표시 이름은 대소문자와 앞뒤 공백을 무시하고 겹칠 수 없다.
create unique index profiles_display_name_unique_idx
  on public.profiles (lower(btrim(display_name)));

-- 2. 계정 생성 시 기본 이름(이메일 앞부분)이 금지어이거나 이미 쓰이고 있으면 '회원-xxxxxx'로 둔다.
--    unique_violation을 잡지 않으면 이름이 겹치는 이메일로 계정을 만들 때 생성 자체가 실패한다.
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
  exception when check_violation or unique_violation then
    insert into public.profiles (id, display_name)
    values (new.id, '회원-' || left(replace(new.id::text, '-', ''), 6));
  end;
  return new;
end;
$$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- 3. 회원 본인 탈퇴. auth.users 행을 지우면 profiles → posts가 cascade로 함께 지워진다(hard delete).
--    Storage 이미지는 SQL로 지울 수 없으므로(protect_objects_delete) 앱이 먼저 Storage API로 지운다.
--    owner는 탈퇴할 수 없다. 운영자가 사라지면 계정을 관리할 사람이 없다.
create function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception '로그인이 필요합니다.' using errcode = '42501';
  end if;
  if exists (select 1 from public.profiles where id = uid and role = 'owner') then
    raise exception '소유자 계정은 탈퇴할 수 없습니다.' using errcode = '42501';
  end if;
  delete from auth.users where id = uid;
end;
$$;
revoke execute on function public.delete_my_account() from public, anon, authenticated;
grant execute on function public.delete_my_account() to authenticated;

commit;
