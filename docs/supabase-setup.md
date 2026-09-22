# Supabase 초기 설정

작업 02는 Supabase 프로젝트 없이도 빌드됩니다. 환경 변수가 없으면 보호 페이지는 `/login`으로 이동하고 인증 폼은 환경 변수 안내와 함께 비활성화됩니다. 실제 인증 검증은 아래 설정 후 진행합니다.

## 1. 프로젝트 생성

Supabase 대시보드에서 새 프로젝트를 생성합니다. 프로젝트의 Connect 또는 Settings > API Keys에서 Project URL과 publishable key(기존 프로젝트는 anon key)를 확인합니다. 이 앱은 공개 키만 사용합니다.

## 2. 이메일 인증 설정

Authentication > Providers > Email에서 Email provider를 켜고, **Enable sign ups는 끄고 Confirm email은 켭니다.** 대시보드 버전에 따라 가입 허용 설정은 Authentication > Sign In / Providers 또는 General Configuration에 표시될 수 있습니다. Anonymous Sign-Ins도 사용하지 않습니다.

공개 회원가입은 없으며, 회원은 대시보드의 Invite user로만 추가합니다.

## 3. URL과 이메일 템플릿

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

## 5. 본인 초대 및 최초 비밀번호 설정

**메일 링크를 열기 전에 7번의 `.env.local` 설정을 먼저 마치고 `pnpm dev`를 실행하세요.** 환경 변수 없이 초대 링크를 열면 인증할 수 없습니다.

Authentication > Users > Invite user에서 본인 이메일로 초대합니다. 메일 링크를 열면 `/auth/callback`에서 검증한 후 `/set-password`로 이동합니다. 8자 이상의 비밀번호를 저장하면 피드에 들어갑니다. 이때 역할은 기본 `member`입니다.

## 6. 본인을 owner로 지정

Authentication > Users에서 본인 User UID를 복사하고 SQL Editor에서 실행합니다.

```sql
update public.profiles set role = 'owner' where id = '<본인의 User UID>';
```

피드를 새로고침하면 프로필 메뉴에 `소유자`, 피드에 작성 진입과 게시물 메뉴가 나타납니다. 소유자는 한 명만 지정합니다.

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
- 권한: owner에게만 작성/수정 메뉴가 보이는지, member에게는 숨겨지는지 확인합니다. 피드 내용은 아직 목 데이터입니다.
- DB/Storage: anon 조회 거부, member 조회 허용 및 글/이미지 쓰기 거부, member의 자기 역할 변경 거부, owner 쓰기 허용을 각 사용자 세션으로 확인합니다.

키가 없는 작업 환경에서는 실제 메일 발송·인증·원격 RLS 적용은 검증하지 않았습니다.

## 참고

- [Supabase SSR 클라이언트와 세션 갱신](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [열 단위 수정 권한](https://supabase.com/docs/guides/database/postgres/column-level-security)
- [이메일 템플릿](https://supabase.com/docs/guides/auth/auth-email-templates)
