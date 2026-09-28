-- 2026-09-28 모든 회원에게 글 작성·수정·삭제 권한을 준다.
-- member는 본인 글과 본인 폴더 이미지만, owner는 모든 글과 모든 폴더 이미지를 수정·삭제한다.
-- 열 단위 grant(0002)는 그대로 두므로 author_id·role은 여전히 바꿀 수 없다.
begin;

-- 1. posts: 작성은 본인 명의로만, 수정·삭제는 본인 글 또는 owner.
--    update는 using만 둔다. with check가 없으면 using이 새 행에도 적용되고, author_id는 열 권한으로 막혀 있다.
drop policy "posts_insert_owner" on public.posts;
create policy "posts_insert_own" on public.posts for insert to authenticated
with check (author_id = auth.uid());

drop policy "posts_update_owner" on public.posts;
create policy "posts_update_own_or_owner" on public.posts for update to authenticated
using (author_id = auth.uid() or public.is_owner());

drop policy "posts_delete_owner" on public.posts;
create policy "posts_delete_own_or_owner" on public.posts for delete to authenticated
using (author_id = auth.uid() or public.is_owner());

-- 2. post-images: 업로드는 누구나 본인 폴더에만. 수정·삭제는 본인 폴더 또는 owner.
--    post_images_select는 그대로 둔다.
drop policy "post_images_insert_owner" on storage.objects;
create policy "post_images_insert_own" on storage.objects for insert to authenticated
with check (
  bucket_id = 'post-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy "post_images_update_owner" on storage.objects;
create policy "post_images_update_own_or_owner" on storage.objects for update to authenticated
using (
  bucket_id = 'post-images'
  and ((storage.foldername(name))[1] = auth.uid()::text or public.is_owner())
)
with check (
  bucket_id = 'post-images'
  and ((storage.foldername(name))[1] = auth.uid()::text or public.is_owner())
);

drop policy "post_images_delete_owner" on storage.objects;
create policy "post_images_delete_own_or_owner" on storage.objects for delete to authenticated
using (
  bucket_id = 'post-images'
  and ((storage.foldername(name))[1] = auth.uid()::text or public.is_owner())
);

commit;
