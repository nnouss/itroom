# Supabase 초기 설정

작업 02는 Supabase 프로젝트 없이도 빌드됩니다. 환경 변수가 없으면 보호 페이지는 `/login`으로 이동하고 인증 폼은 환경 변수 안내와 함께 비활성화됩니다. 실제 인증 검증은 아래 설정 후 진행합니다.

## 1. 프로젝트 생성

Supabase 대시보드에서 새 프로젝트를 생성합니다. 프로젝트의 Connect 또는 Settings > API Keys에서 Project URL과 publishable key(기존 프로젝트는 anon key)를 확인합니다. 이 앱은 공개 키만 사용합니다.

## 2. 이메일 인증 설정

Authentication > Providers > Email에서 Email provider를 켜고, **Enable sign ups는 끄고 Confirm email은 켭니다.** 대시보드 버전에 따라 가입 허용 설정은 Authentication > Sign In / Providers 또는 General Configuration에 표시될 수 있습니다. Anonymous Sign-Ins도 사용하지 않습니다.

공개 회원가입은 없으며, 회원은 대시보드의 Invite user로만 추가합니다.

## 3. URL과 이메일 템플릿

> **무료 플랜 주의**: 기본 메일 제공자를 쓰는 무료 플랜은 템플릿을 바꿀 수 없다. 이 경우 기본 링크(`{{ .ConfirmationURL }}`)가 사이트로 돌아올 때 URL 해시에 토큰을 담아오며, 앱의 `AuthHashHandler`(루트 레이아웃)가 이를 세션으로 바꿔 `/set-password` 또는 `/reset-password`로 보낸다. 아래 템플릿 변경은 유료 플랜 또는 커스텀 SMTP 설정 후에만 적용한다. 설정 자체는 `supabase/config.toml` + `supabase config push`로 관리한다.

Authentication > URL Configuration:

- Site URL: `http://localhost:3000`
- Redirect URLs: `http://localhost:3000/auth/callback`
- 재설정 요청의 쿼리까지 일치하도록 `http://localhost:3000/auth/callback?next=/reset-password`도 추가합니다.

Authentication > Email Templates에서 아래 링크를 적용하고 저장합니다. 기본 `{{ .ConfirmationURL }}` 링크 대신 서버가 검증할 token hash를 사용합니다.

**Invite user**:

```html
<a
  href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&amp;type=invite"
  >잇룸 초대 수락</a
>
```

**Reset password**:

```html
<a
  href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&amp;type=recovery"
  >비밀번호 재설정</a
>
```

Invite 링크는 `/set-password`, Reset 링크는 `/reset-password`로 연결됩니다. 콜백은 PKCE `code` 교환도 지원하지만, 대시보드 초대는 위 token-hash 템플릿을 사용해야 브라우저의 PKCE verifier 없이 수락할 수 있습니다. 링크는 일회성이므로 메일 미리보기/보안 스캐너가 먼저 소비했거나 만료된 경우 새 메일을 요청합니다.

## 4. DB 마이그레이션

SQL Editor에서 [`supabase/migrations/0001_init.sql`](../supabase/migrations/0001_init.sql) 전체를 붙여넣고 한 번 실행합니다. 테이블·함수·트리거·RLS·private Storage 버킷과 정책이 하나의 트랜잭션으로 생성됩니다. 기존 테이블이 있는 프로젝트에 반복 실행하는 파일은 아닙니다.

`profiles_update_self`는 본인 행만 허용하며, 추가 열 권한으로 `display_name`만 변경할 수 있습니다. 회원이 자신의 `role`을 owner로 바꾸는 것을 막기 위한 설정입니다. 역할 변경은 SQL Editor에서만 수행합니다.

[`0002_security_hardening.sql`](../supabase/migrations/0002_security_hardening.sql)은 보안 점검 후속 조치입니다 (`supabase db push`).

- `posts`는 본문 관련 열만 쓰기 권한이 있어 id·작성자·작성 시각을 바꿀 수 없습니다.
- 표시 이름은 1~30자이고, 회원은 owner 이름이나 운영 명칭(잇룸, 관리자 등)을 쓸 수 없습니다. 초대 시 이름을 주지 않으면 이메일 @ 앞부분이 이름이 됩니다([`0003`](../supabase/migrations/0003_default_display_name_from_email.sql)). 그 이름이 운영 명칭이나 owner 이름과 겹치면 `회원`이 됩니다.
- `post-images` 버킷은 10MB, jpg/png/gif/webp만 받고, 업로더 본인 폴더(`<user id>/...`)에만 올릴 수 있습니다.
- `public` 스키마에 새로 만드는 테이블·함수는 기본으로 anon/authenticated에 열리지 않습니다. 새 테이블은 RLS를 켜고 필요한 권한을 직접 `grant`하세요.

[`0005_member_posting.sql`](../supabase/migrations/0005_member_posting.sql)은 모든 회원에게 글 작성 권한을 줍니다 (`supabase db push`).

| 정책 | 대상 | 규칙 |
| --- | --- | --- |
| `posts_insert_own` | `posts` insert | `author_id = auth.uid()` (본인 명의로만 작성) |
| `posts_update_own_or_owner` | `posts` update | 본인 글 또는 `is_owner()` |
| `posts_delete_own_or_owner` | `posts` delete | 본인 글 또는 `is_owner()` |
| `post_images_insert_own` | `post-images` insert | 본인 폴더만 (owner 포함) |
| `post_images_update_own_or_owner` | `post-images` update | 본인 폴더 또는 `is_owner()` |
| `post_images_delete_own_or_owner` | `post-images` delete | 본인 폴더 또는 `is_owner()` |

- `post_images_select`와 0002의 열 단위 grant는 그대로입니다. 회원은 `author_id`(글)나 `role`(프로필)을 바꿀 수 없습니다.
- 앱은 같은 규칙을 `lib/permissions.ts`의 `canManagePost`로 서버 액션·페이지 가드·메뉴 노출에 적용합니다. 최종 방어선은 RLS입니다.

### 마이그레이션 목록

| 파일 | 내용 |
| --- | --- |
| `0001_init.sql` | 테이블, 트리거, RLS, private Storage 버킷과 정책 |
| `0002_security_hardening.sql` | `posts` 열 단위 grant, 표시 이름 제한, 함수 실행 권한, 버킷 크기·형식 제한 |
| `0003_default_display_name_from_email.sql` | 초대 시 기본 표시 이름을 이메일 앞부분으로 |
| `0004_revoke_public_function_default.sql` | 새 함수의 PUBLIC 실행 기본값 회수 |
| `0005_member_posting.sql` | 모든 회원의 글 작성, 본인 글·폴더 수정/삭제, owner는 전체 |

## 5. 본인 초대 및 최초 비밀번호 설정

**메일 링크를 열기 전에 7번의 `.env.local` 설정을 먼저 마치고 `pnpm dev`를 실행하세요.** 환경 변수 없이 초대 링크를 열면 인증할 수 없습니다.

Authentication > Users > Invite user에서 본인 이메일로 초대합니다. 메일 링크를 열면 `/auth/callback`에서 검증한 후 `/set-password`로 이동합니다. 8자 이상의 비밀번호를 저장하면 피드에 들어갑니다. 이때 역할은 기본 `member`입니다.

## 6. 본인을 owner로 지정

Authentication > Users에서 본인 User UID를 복사하고 SQL Editor에서 실행합니다.

```sql
update public.profiles set role = 'owner' where id = '<본인의 User UID>';
```

피드를 새로고침하면 프로필 메뉴에 `소유자`가 표시되고, 다른 회원의 글에도 수정·삭제 메뉴가 나타납니다. 글 작성 진입은 모든 회원에게 보입니다. 소유자는 한 명만 지정합니다.

## 7. 로컬 환경 변수

프로젝트 루트에서 `.env.example`을 `.env.local`로 복사하고 값을 입력합니다. **실행 순서는 5번 초대 수락보다 먼저입니다.**

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable 또는 legacy anon key>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

설정 후 개발 서버를 다시 시작합니다. 변수 이름은 `ANON_KEY`이지만 publishable key도 지원합니다. `.env.local`은 git에서 제외되며 `.env.example`만 커밋합니다.

## 8. 회원 초대 및 검증

Authentication > Users > Invite user에 회원 이메일을 입력합니다. 회원은 메일 링크를 열고 최초 비밀번호를 설정합니다. 새 회원은 자동으로 `member` 프로필이 만들어집니다.

- 비로그인: `/` 및 보호 경로가 `/login`으로 이동하는지 확인합니다.
- 로그인/로그아웃: 정상 로그인, 틀린 비밀번호, 새로고침 시 세션 유지, 로그아웃 뒤 피드 접근 차단을 확인합니다.
- 초대: 링크에서 비밀번호 설정 후 피드 진입, 재사용/만료 링크에서 오류 화면을 확인합니다.
- 재설정: 로그인 화면 → 비밀번호 찾기 → 이메일 → 새 비밀번호 저장 → 새 비밀번호 로그인까지 확인합니다. 존재하지 않는 이메일에도 같은 발송 안내가 표시됩니다.
- 권한(UI): 모든 회원에게 글 작성칸과 글쓰기 탭이 보이는지, member는 본인 글에만 수정·삭제 메뉴가 보이는지, owner는 모든 글에 메뉴가 보이는지 확인합니다. member가 남의 글 `/posts/<id>/edit`을 직접 열면 글 상세로 돌아가야 합니다.
- DB/Storage: anon 조회 거부, member의 본인 글 작성·수정·삭제 허용, 남의 글 수정·삭제 거부(0행), 남의 명의 작성 거부, 남의 폴더 업로드 거부, 자기 역할·글 작성자 변경 거부, owner의 모든 글 수정·삭제 허용을 각 사용자 세션으로 확인합니다. SQL 예시는 아래와 같습니다.

### RLS 검증 SQL

SQL Editor(또는 `psql`)에서 블록 하나씩 실행합니다. 모든 블록은 `rollback`으로 끝나 데이터가 남지 않습니다. `<member uuid>`, `<other uuid>`(다른 회원), `<owner uuid>`를 실제 User UID로 바꿉니다. 정책 위반은 오류로 트랜잭션을 멈추므로, 오류를 기대하는 시도는 블록마다 하나씩만 둡니다.

```sql
-- A. member: 본인 글 작성·수정·삭제는 성공, 남의 글 수정·삭제는 0행
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"<member uuid>","role":"authenticated"}';
insert into public.posts (author_id, content_html)
  values ('<member uuid>', '<p>rls test</p>') returning id;                             -- 기대: 1행
update public.posts set content_html = '<p>rls test edited</p>'
  where content_html = '<p>rls test</p>' returning id;                                  -- 기대: 1행
update public.posts set content_html = '<p>x</p>'
  where author_id <> '<member uuid>' returning id;                                      -- 기대: 0행
delete from public.posts where author_id <> '<member uuid>' returning id;               -- 기대: 0행
delete from public.posts where content_html = '<p>rls test edited</p>' returning id;    -- 기대: 1행
rollback;

-- B. member: 남의 명의로 작성 → 오류 (new row violates row-level security policy)
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"<member uuid>","role":"authenticated"}';
insert into public.posts (author_id, content_html) values ('<other uuid>', '<p>x</p>');
rollback;

-- C. member: 작성자 변경 → 오류 (permission denied for table posts, 열 단위 grant)
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"<member uuid>","role":"authenticated"}';
update public.posts set author_id = '<member uuid>' where author_id = '<other uuid>';
rollback;

-- D. member: 자기 역할 변경 → 오류 (permission denied for table profiles)
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"<member uuid>","role":"authenticated"}';
update public.profiles set role = 'owner' where id = '<member uuid>';
rollback;

-- E. owner: 남의 글 수정·삭제 → 해당 행 수만큼 성공
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"<owner uuid>","role":"authenticated"}';
update public.posts set content_html = content_html where author_id = '<member uuid>' returning id;  -- 기대: member 글 수
delete from public.posts where author_id = '<member uuid>' returning id;                             -- 기대: member 글 수
rollback;

-- F. member: 남의 폴더에 업로드 → 오류 (Storage 정책만 확인. 본인 폴더로 바꾸면 성공)
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"<member uuid>","role":"authenticated"}';
insert into storage.objects (bucket_id, name) values ('post-images', '<other uuid>/rls-test.jpg');
rollback;
```

Storage 삭제는 Supabase가 `storage.objects` 직접 delete를 막을 수 있으므로 앱(Storage API)으로 확인합니다: member가 본인 글을 지우면 이미지도 지워지고, owner가 member 글을 지우면 member 폴더의 이미지도 지워져야 합니다.

키가 없는 작업 환경에서는 실제 메일 발송·인증·원격 RLS 적용은 검증하지 않았습니다.

## 참고

- [Supabase SSR 클라이언트와 세션 갱신](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [열 단위 수정 권한](https://supabase.com/docs/guides/database/postgres/column-level-security)
- [이메일 템플릿](https://supabase.com/docs/guides/auth/auth-email-templates)

---

## 실제 운영 정보 (2026-09-23 기준)

- Supabase 프로젝트: `itroom` (ref `dikhxlwgquzfdvgwkzjd`, 서울 ap-northeast-2, 무료 플랜). 대시보드: https://supabase.com/dashboard/project/dikhxlwgquzfdvgwkzjd
- 인증 설정은 `supabase/config.toml`이 원본이다. 바꾼 뒤 `supabase config push`로 반영한다. 스키마 변경은 `supabase/migrations/`에 새 파일을 추가하고 `supabase db push`.
- Vercel: https://itroom.vercel.app (프로젝트 `itroom`, main 브랜치 push 시 자동 배포, 함수 리전 icn1). 환경 변수는 Production/Preview 모두 등록되어 있다.
- 로컬 비밀값: `~/.config/itroom/` 아래 DB 비밀번호와 초기 계정 비밀번호. 저장소에는 넣지 않는다.
- 회원 초대: 대시보드 Authentication > Users > Invite user. 초대 메일의 링크는 https://itroom.vercel.app 으로 돌아오며, 앱이 세션을 만들고 `/set-password`로 보낸다.
- 테스트용 회원 계정은 2026-09-23 보안 점검 후 삭제했다. RLS 검증은 `set local role` + `request.jwt.claims`로 역할을 흉내 내고 `rollback`하는 SQL로 한다.
