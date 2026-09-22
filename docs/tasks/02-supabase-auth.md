# 작업 02: Supabase 연동, DB 스키마, 인증, 라우트 보호

읽을 문서:
- `docs/기획서.md` 3.1, 3.2, 4장, 5장, 7.3
- `docs/design/디자인-시스템.md` 5.4, 5.5, 5.6, 5.8
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md` (Next 16은 middleware가 아니라 `proxy.ts`)
- `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`

## 목표
Supabase Auth로 실제 로그인/로그아웃/초대 수락/비밀번호 재설정이 동작하고, 비로그인 사용자는 어떤 페이지도 볼 수 없게 한다. DB 스키마와 RLS를 마이그레이션 SQL로 작성한다. 피드는 아직 목 데이터를 쓰되, owner 여부는 실제 `profiles.role`로 판단한다.

## 중요한 전제
- **아직 Supabase 프로젝트 URL과 키가 없다.** `.env.local`이 없어도 `pnpm build`가 통과해야 한다. 모듈 import 시점에 env를 검사해 throw 하지 말고, 클라이언트 생성 시점에 검사한다. env가 없으면 `/login`이 "환경 변수가 설정되지 않았습니다" 안내를 보여주면 된다.
- 실제 로그인 동작 검증은 키가 들어온 뒤 Claude가 한다. 네 쪽에서는 코드, 타입, 빌드, 그리고 env 없는 상태의 리다이렉트 동작까지만 검증한다.
- service role 키는 어디에도 쓰지 않는다.

## 정리 항목 (먼저)
- `package.json` dependencies에서 `cn`과 `shadcn` 제거 (`pnpm remove cn shadcn`). `shadcn`은 항상 `pnpm dlx`로만 쓴다.

## 해야 할 일

### 1. 의존성
`@supabase/supabase-js`, `@supabase/ssr` 추가.

### 2. 환경 변수
- `.env.example` 생성:
  ```
  NEXT_PUBLIC_SUPABASE_URL=
  NEXT_PUBLIC_SUPABASE_ANON_KEY=
  NEXT_PUBLIC_SITE_URL=http://localhost:3000
  ```
- `lib/env.ts`: 세 값을 읽는 함수. 없으면 명확한 에러 메시지로 throw (호출 시점에만).

### 3. 마이그레이션 SQL
`supabase/migrations/0001_init.sql` 하나에 기획서 4장의 SQL을 그대로, 아래 보완을 더해 작성한다. Supabase 대시보드 SQL 편집기에 붙여넣어 한 번에 실행 가능해야 한다.
- `create extension if not exists pgcrypto;` (gen_random_uuid)
- `user_role` enum, `profiles`, `posts`, 인덱스 2개 (기획서 4.1 그대로)
- 트리거 1: `auth.users` insert 시 `profiles` 행 생성. `display_name`은 `raw_user_meta_data->>'display_name'`이 있으면 그것, 없으면 이메일 `@` 앞부분. `security definer`, `set search_path = public`.
- 트리거 2: `posts` update 시 `updated_at = now()`.
- `is_owner()` 함수 (기획서 4.3), `security definer`, `set search_path = public`, `stable`.
- RLS 정책 (기획서 4.3 그대로). `anon`에는 정책 없음.
- Storage: `insert into storage.buckets (id, name, public) values ('post-images','post-images', false) on conflict do nothing;` 그리고 `storage.objects` 정책: select는 `authenticated` + `bucket_id = 'post-images'`, insert/update/delete는 `is_owner()` + 같은 bucket.
- 파일 맨 위 주석으로 "실행 후 `update profiles set role='owner' where id='<uuid>';`를 수동 실행" 안내.

### 4. Supabase 클라이언트
- `lib/supabase/client.ts`: 브라우저용 `createBrowserClient`.
- `lib/supabase/server.ts`: 서버 컴포넌트/서버 액션/라우트 핸들러용 `createServerClient` + `cookies()` (Next 16 async cookies).
- `lib/supabase/proxy.ts`: `updateSession(request)` — `@supabase/ssr` 공식 패턴. 세션 갱신 후 사용자 유무 반환.
- `lib/auth.ts`: `getCurrentUser()`(서버, user + profile role 반환, 없으면 null), `requireUser()`(없으면 `redirect('/login')`), `isOwner()`.

### 5. 라우트 보호 `proxy.ts` (프로젝트 루트)
- 모든 요청에서 `updateSession` 실행.
- 공개 경로: `/login`, `/auth/callback`, `/set-password`, `/reset-password`, `/auth/error`. 그 외 세션 없으면 `/login`으로 redirect.
- 세션 있고 `/login`이면 `/`로 redirect.
- matcher는 `_next/static`, `_next/image`, `favicon.ico`, 이미지/폰트 정적 파일 제외.
- env가 없으면 proxy는 통과시키지 말고 `/login`으로 보낸다 (그래야 env 없이도 "잠긴" 상태가 유지됨). 단 공개 경로는 통과.

### 6. 인증 화면과 액션
`app/(auth)/actions.ts` 서버 액션:
- `signIn(formData)`: `signInWithPassword`. 실패 시 폼 아래에 표시할 메시지 반환 (예: "이메일 또는 비밀번호가 올바르지 않습니다."). 성공 시 `redirect('/')`.
- `signOut()`: `signOut()` 후 `redirect('/login')`.
- `requestPasswordReset(formData)`: `resetPasswordForEmail(email, { redirectTo: `${SITE_URL}/auth/callback?next=/reset-password` })`. 존재하지 않는 이메일이어도 같은 성공 문구 ("메일을 보냈습니다. 받은 편지함을 확인하세요.").
- `updatePassword(formData)`: `auth.updateUser({ password })`. 8자 이상 검증. 성공 시 `redirect('/')`.

화면:
- `/login`: 작업 01 화면에 `signIn` 액션 연결. `useActionState`로 에러 표시 (필드 아래 `type-body-sm`, 아이콘 + 문구, `role="alert"`). 제출 중 버튼 비활성 + 스피너, 라벨 유지. "비밀번호를 잊으셨나요?" → `/reset-password?mode=request`.
- `/reset-password`: `mode=request`면 이메일 입력 폼(`requestPasswordReset`), 아니면(메일 링크로 돌아온 세션 있음) 새 비밀번호 입력 폼(`updatePassword`). 같은 로그인 카드 레이아웃.
- `/set-password`: 초대 수락 후 최초 비밀번호 설정. `updatePassword` 재사용. 제목 "비밀번호를 정해주세요."
- `/auth/callback/route.ts`: `code`가 있으면 `exchangeCodeForSession`, `token_hash`+`type`이 있으면 `verifyOtp`. 성공 시 `type`이 `invite`면 `/set-password`, `recovery`면 `/reset-password`, 그 외 `next` 파라미터 또는 `/`. 실패 시 `/auth/error`.
- `/auth/error`: "링크가 만료되었거나 잘못되었습니다." + 로그인으로 가는 `button-primary`.
- 모든 인증 화면은 `(auth)` 그룹, nav-pill 없음, 디자인 시스템 5.6 규격.

### 7. 앱 셸에 실제 사용자 반영
- `app/(app)/layout.tsx`: `requireUser()`로 보호. `NavPill`에 `displayName`과 `isOwner` 전달.
- `NavPill`: 아바타 글자는 `displayName` 첫 글자. 드롭다운에 표시 이름, 역할("소유자"/"회원") `type-caption`, 로그아웃 항목은 `signOut` 서버 액션을 `<form action>`으로 호출.
- `app/(app)/page.tsx`: `isOwner`를 실제 값으로. 목 데이터는 유지.

### 8. 문서
`docs/supabase-setup.md`: 대시보드에서 해야 할 일을 순서대로. (1) 프로젝트 생성 (2) Authentication > Providers > Email에서 "Enable sign ups" 끄기, "Confirm email" 켜기 (3) Authentication > URL Configuration: Site URL `http://localhost:3000`, Redirect URLs에 `http://localhost:3000/auth/callback` (4) SQL Editor에서 `supabase/migrations/0001_init.sql` 실행 (5) Authentication > Users > Invite user로 본인 초대 → 메일 링크 → 비밀번호 설정 (6) SQL로 본인을 owner로 변경 (7) `.env.local`에 URL, anon(publishable) key 입력 (8) 회원 초대 방법. 이메일 템플릿(Invite user, Reset password)의 링크가 `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=invite` 형식이 되도록 바꾸는 방법도 적는다.

### 9. git
커밋: `feat: add supabase auth, schema migration, and route protection` + Co-Authored-By 줄.

### 10. 완료 조건
- `pnpm lint`, `pnpm build` 에러 0 (env 없이).
- env 없이 `pnpm dev`: `/` 접근 시 `/login`으로 302, `/login`은 env 미설정 안내 표시, `/auth/error` 렌더링.
- `supabase/migrations/0001_init.sql`이 문법적으로 완결 (세미콜론, 함수 `$$` 닫힘).

## 보고
1. 추가/변경 파일 목록
2. lint, build 결과 마지막 5줄
3. env 없는 상태 리다이렉트 검증 결과
4. 지시서와 다르게 한 부분과 이유
5. 못 한 부분
