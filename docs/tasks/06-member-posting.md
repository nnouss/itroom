# 작업 06: 모든 회원에게 글 작성·수정·삭제 권한 부여

읽을 문서:
- `docs/기획서.md` 2장, 3.2, 4.3, 5장
- `docs/supabase-setup.md` 4~6장
- `supabase/migrations/0001_init.sql`, `0002_security_hardening.sql` (현재 정책과 열 단위 grant)
- `node_modules/next/dist/docs/` 중 Server Actions, `params`/`searchParams` 관련 문서 (Next 16 기준, 기억에 의존하지 말 것)

## 목표
지금은 `role = 'owner'`만 글을 쓰고 고치고 지울 수 있다. 이를 아래 규칙으로 바꾼다.

| 동작 | member | owner |
| --- | --- | --- |
| 글 작성 | 가능 (`author_id = 본인`) | 가능 |
| 글 수정 | **본인 글만** | 모든 글 |
| 글 삭제 | **본인 글만** | 모든 글 |
| 이미지 업로드 | 본인 폴더(`<uid>/…`)만 | 본인 폴더만 |
| 이미지 삭제 | 본인 폴더만 | 모든 폴더 |

권한 검사는 지금처럼 네 겹(DB RLS → 서버 액션 → 페이지 가드 → UI 노출)을 모두 갖춘다. RLS가 최종 방어선이고 앱 쪽은 명확한 오류 메시지를 위한 것이다.

## 절대 규칙
- **커밋·푸시 금지.** 작업은 워킹 트리에만 남긴다. main 푸시는 곧바로 프로덕션 배포다.
- **`supabase db push`, `supabase config push` 등 원격 Supabase 변경 금지.** 마이그레이션 파일만 작성한다. 적용은 계획 pane(Claude)이 한다.
- service role / secret key는 어디에도 쓰지 않는다.
- `profiles`의 열 단위 grant(`display_name`만 update)와 `posts`의 열 단위 grant(0002)는 건드리지 않는다. 회원이 `author_id`나 `role`을 바꿀 길이 생기면 안 된다.
- `is_owner()` 함수는 owner 예외 판단용으로 계속 쓴다.

## 해야 할 일

### 1. 마이그레이션 `supabase/migrations/0005_member_posting.sql`
`begin; … commit;`으로 감싸고, 파일 맨 위에 날짜와 목적 주석을 단다.

- `posts` 정책 교체:
  - `drop policy "posts_insert_owner"` → `posts_insert_own`: `for insert to authenticated with check (author_id = auth.uid())`
  - `drop policy "posts_update_owner"` → `posts_update_own_or_owner`: `for update to authenticated using (author_id = auth.uid() or public.is_owner())`
  - `drop policy "posts_delete_owner"` → `posts_delete_own_or_owner`: `for delete to authenticated using (author_id = auth.uid() or public.is_owner())`
- `storage.objects` 정책 교체 (bucket은 항상 `'post-images'`, 폴더는 `(storage.foldername(name))[1] = auth.uid()::text`):
  - `post_images_insert_owner` → `post_images_insert_own`: 본인 폴더만 (`is_owner()` 조건 제거)
  - `post_images_update_owner` → `post_images_update_own_or_owner`: `using (bucket and (본인 폴더 or is_owner()))`, `with check (bucket and (본인 폴더 or is_owner()))`
  - `post_images_delete_owner` → `post_images_delete_own_or_owner`: `using (bucket and (본인 폴더 or is_owner()))`
  - `post_images_select`는 그대로.
- 정책 이름을 바꾸므로 `drop policy` 후 `create policy`로 쓴다 (`create or replace policy`는 없다).

### 2. 서버 액션 `app/(app)/posts/actions.ts`
- `savePost`, `deletePost`, `discardUploads`에서 `profile.role !== "owner"` 거부를 제거한다.
- **수정 권한 검사**: `savePost`가 `id`로 기존 글을 읽을 때 `author_id`도 함께 select 하고, `previous.author_id !== user.id && profile.role !== "owner"`이면 `{ error: "이 글을 수정할 권한이 없습니다." }`를 돌려준다.
- **이미지 소유 검사 완화**: 현재는 `images.some(path => !path.startsWith(`${user.id}/`))`라서 owner가 회원 글을 수정하면 그 글의 기존 이미지가 거부된다. 규칙을 "각 경로가 (a) 내 폴더이거나 (b) 수정 대상 글의 기존 `images`에 이미 들어 있는 경로"로 바꾼다. 신규 글은 (a)만 적용.
- `deletePost`: 역할 검사만 빼면 된다. RLS가 남의 글 삭제를 0행으로 돌려주므로 기존 "이미 삭제된 글입니다" 분기가 그대로 동작하지만, 메시지를 "삭제할 수 없는 글입니다." 정도로 중립적으로 바꾼다.
- `discardUploads`: 역할 검사만 뺀다. 본인 폴더 필터는 유지.
- 새 헬퍼는 `lib/`에 두되 `server-only`가 필요 없는 순수 함수라면 클라이언트에서도 쓸 수 있게 만든다. 예: `lib/permissions.ts`의 `canManagePost(viewer: { id: string; isOwner: boolean }, authorId: string): boolean`. 서버 액션·페이지·UI가 모두 이 함수 하나를 쓴다.

### 3. 페이지 가드
- `app/(app)/write/page.tsx`: 역할 검사 제거. 로그인만 요구.
- `app/(app)/posts/[id]/edit/page.tsx`: `fetchPost` 후 `canManagePost(...)`가 false면 `redirect(`/posts/${id}`)`.

### 4. UI
- `lib/types.ts`에 `Viewer = { id: string; isOwner: boolean }` 타입 추가.
- `FeedList`, `PostRow`의 `isOwner: boolean` prop을 `viewer: Viewer`로 교체. `PostRow` 안에서 `canManagePost(viewer, post.authorId)`로 메뉴(수정·삭제)와 `DeletePostDialog` 렌더 여부를 결정한다. 피드는 클라이언트에서 계속 페이지를 불러오므로 글 단위로 계산해야 한다.
- `app/(app)/page.tsx`, `app/(app)/posts/[id]/page.tsx`에서 `viewer={{ id: profile.id, isOwner: profile.role === "owner" }}`를 넘긴다.
- `ComposeRow`: `isOwner` prop과 `if (!isOwner) return null` 제거. 모두에게 보인다.
- `AppHeader`: 글쓰기 탭(`/write`)을 모두에게 보인다. `isOwner` prop은 `ProfileMenu`의 "소유자/회원" 표기에 여전히 쓰이므로 남긴다.
- 빈 피드 안내문(`page.tsx`): 역할 분기 없이 "위에서 첫 소식을 남겨보세요."
- `lib/posts.ts` `toPost`의 작성자 이름 폴백 `"잇룸"` → `"회원"`. (여러 사람이 쓰므로 운영 명칭을 폴백으로 쓰면 안 된다.)
- 반응형 360~1440px 유지. 새 레이아웃은 없다.

### 5. 문서
- `docs/기획서.md`: 2장 권한 표, 3.2의 "작성/수정/삭제는 owner만", 5장의 "owner에게만 … 노출" 문구, 7장 경로 표의 `/write`·`/posts/[id]/edit` 권한, 8장 "회원의 글 작성" 제외 항목, 9장 "회원에게 작성 권한 부여"를 새 규칙으로 고친다. 4.3의 SQL 예시는 새 정책으로 바꾼다.
- `docs/supabase-setup.md`: 4~5장 정책 설명과 7장 확인 항목을 새 규칙으로 고치고, 마이그레이션 목록에 `0005`를 추가한다.

### 6. 테스트
- `tests/permissions.test.mjs` 추가: `canManagePost`의 네 경우 (본인·member, 타인·member, 본인·owner, 타인·owner).
- `pnpm test`, `pnpm lint`, `pnpm build`가 모두 통과해야 한다.
- RLS 검증 SQL을 `docs/supabase-setup.md`에 예시로 남긴다. 형태: 트랜잭션 안에서 `set local role authenticated; set local request.jwt.claims = '{"sub":"<uuid>","role":"authenticated"}';` 후 insert/update/delete를 시도하고 `rollback`. 실제 실행은 계획 pane이 한다.

## 완료 보고
끝나면 다음을 한 줄씩 보고한다.
1. 바꾼 파일 목록.
2. `pnpm test` / `pnpm lint` / `pnpm build` 결과 (실패가 있으면 출력 그대로).
3. 브리프와 다르게 판단한 부분과 이유.
4. 계획 pane이 직접 확인해야 할 항목 (마이그레이션 적용, 브라우저 검증).
