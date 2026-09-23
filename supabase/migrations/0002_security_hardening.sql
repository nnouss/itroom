-- 2026-09-23 보안 점검 후속 조치. `supabase db push`로 적용한다.
begin;

-- 1. 글의 id, 작성자, 작성/수정 시각은 앱에서 바꿀 수 없다. 쓰기는 본문 관련 열만 연다.
--    (updated_at은 트리거가 채우므로 열 권한이 필요 없다.)
revoke insert, update on public.posts from authenticated;
grant insert (author_id, content_html, tags, images, link_url, link_title, link_description, link_image)
  on public.posts to authenticated;
grant update (content_html, tags, images, link_url, link_title, link_description, link_image)
  on public.posts to authenticated;

-- 2. 표시 이름: 1~30자, 제어 문자 금지. 회원은 owner의 이름이나 운영 명칭을 쓸 수 없다.
alter table public.profiles add constraint profiles_display_name_check check (
  display_name is null
  or (char_length(btrim(display_name)) between 1 and 30 and display_name !~ '[[:cntrl:]]')
);

create function public.guard_display_name() returns trigger
language plpgsql set search_path = public as $$
declare
  name text := lower(btrim(new.display_name));
begin
  if new.role <> 'owner' and name is not null and (
    name in ('잇룸', 'itroom', '관리자', '운영자', 'admin', 'owner')
    or exists (
      select 1 from public.profiles
      where role = 'owner' and id <> new.id and lower(btrim(display_name)) = name
    )
  ) then
    raise exception '사용할 수 없는 이름입니다.' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger on_profile_name_guard before insert or update of display_name on public.profiles
for each row execute function public.guard_display_name();

-- 3. 초대 시 이름을 주지 않으면 이메일 앞부분 대신 '회원'으로 둔다 (다른 회원에게 이메일 아이디 노출 방지).
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(left(btrim(regexp_replace(new.raw_user_meta_data->>'display_name', '[[:cntrl:]]', '', 'g')), 30), ''),
      '회원'
    )
  );
  return new;
end;
$$;

-- 4. 함수 실행 권한. Supabase는 anon/authenticated에 직접 EXECUTE를 주므로 PUBLIC 회수만으로는 부족하다.
--    트리거 함수는 실행 권한 없이도 트리거로 동작한다.
revoke execute on function public.handle_new_user(), public.set_updated_at(), public.guard_display_name()
  from public, anon, authenticated;
revoke execute on function public.is_owner() from public, anon;
grant execute on function public.is_owner() to authenticated;

-- 5. 앞으로 만드는 테이블/시퀀스/함수는 기본으로 anon/authenticated에 열리지 않는다.
--    새 테이블은 RLS를 켜고 필요한 권한만 명시적으로 grant한다.
alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public revoke execute on functions from public, anon, authenticated;

-- 6. 이미지 버킷: 앱과 같은 10MB, 이미지 형식 제한을 서버에서 강제하고, 본인 폴더에만 올리게 한다.
update storage.buckets
set file_size_limit = 10 * 1024 * 1024,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/gif', 'image/webp']
where id = 'post-images';

drop policy "post_images_insert_owner" on storage.objects;
create policy "post_images_insert_owner" on storage.objects for insert to authenticated
with check (
  bucket_id = 'post-images' and public.is_owner()
  and (storage.foldername(name))[1] = auth.uid()::text
);
drop policy "post_images_update_owner" on storage.objects;
create policy "post_images_update_owner" on storage.objects for update to authenticated
using (bucket_id = 'post-images' and public.is_owner())
with check (
  bucket_id = 'post-images' and public.is_owner()
  and (storage.foldername(name))[1] = auth.uid()::text
);
commit;
