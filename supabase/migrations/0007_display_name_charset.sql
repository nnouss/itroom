-- 2026-09-29 닉네임은 한글(완성형), 영문 대소문자, 숫자만 쓸 수 있다. 공백·특수문자·이모지 불가.
-- 적용 시점의 기존 닉네임은 모두 이 규칙에 맞는다.
begin;

alter table public.profiles drop constraint profiles_display_name_check;
alter table public.profiles add constraint profiles_display_name_check check (
  display_name is null
  or (char_length(display_name) between 1 and 30 and display_name ~ '^[가-힣A-Za-z0-9]+$')
);

-- 계정 생성 시 기본 이름(초대 메타데이터 또는 이메일 앞부분)에서 허용되지 않는 문자를 지운다.
-- 비었거나 금지어·중복이면 '회원' + id 앞 6자리(16진수)로 둔다.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  name text := coalesce(
    nullif(left(regexp_replace(coalesce(new.raw_user_meta_data->>'display_name', ''), '[^가-힣A-Za-z0-9]', '', 'g'), 30), ''),
    nullif(left(regexp_replace(split_part(new.email, '@', 1), '[^가-힣A-Za-z0-9]', '', 'g'), 30), ''),
    '회원'
  );
begin
  begin
    insert into public.profiles (id, display_name) values (new.id, name);
  exception when check_violation or unique_violation then
    insert into public.profiles (id, display_name)
    values (new.id, '회원' || left(replace(new.id::text, '-', ''), 6));
  end;
  return new;
end;
$$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

commit;
