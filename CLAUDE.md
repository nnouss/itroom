# 잇룸 (it room)

초대받은 회원만 들어와 IT 소식을 짧은 글로 올리고 읽는 폐쇄형 SNS. 소유자 1명이 운영한다.
상세 기획은 `docs/기획서.md`, 디자인 원칙은 `docs/design/디자인-시스템.md`를 따른다.

## 목적

- 공개 회원가입 없음. 소유자가 Supabase에서 계정을 만들어야만 회원이 된다.
- 비로그인 상태에서는 `/login` 외 어떤 페이지도 볼 수 없다. 검색엔진 색인도 막는다(`noindex`).
- 회원 관리는 최소화하고, 글쓰기 경험(에디터·이미지·링크 카드)은 편해야 한다.

## 기술 스택

- Next.js 16 App Router + React 19 + TypeScript. `node_modules/next/dist/docs/`를 먼저 읽고 코드를 쓴다.
- Supabase: Auth(이메일+비밀번호), Postgres(RLS), Storage(이미지). `@supabase/ssr`로 서버·클라이언트·proxy 각각 연결.
- UI: Tailwind CSS 4, shadcn/ui(radix-ui), lucide-react, sonner, next-themes, Pretendard 폰트.
- 에디터: Tiptap 3. 저장 전 `sanitize-html`로 정제, 링크 미리보기는 `cheerio`로 OG 파싱.
- 배포: Vercel(`itroom.vercel.app`, 리전 icn1). main 푸시 시 자동 배포.
- 패키지 매니저는 pnpm. 스크립트: `pnpm dev` / `pnpm lint` / `pnpm build` / `pnpm test`.

## 구조

```
app/(auth)/        로그인, 비밀번호 설정·재설정, auth 콜백. actions.ts에 서버 액션
app/(app)/         보호 영역. 피드(page.tsx), 글쓰기(write), 글 상세·수정(posts/[id]), posts/actions.ts
app/og/[id]        글별 OG 이미지 / app/media/[...path]  Storage 이미지 프록시
components/        ui(shadcn), post(피드·행·링크카드), editor(Tiptap·툴바·태그), auth, layout
lib/               auth, permissions(canManagePost), posts, tags, sanitize, og, upload, media, env, constants
lib/supabase/      client.ts / server.ts / proxy.ts
proxy.ts           루트 미들웨어. 세션 갱신과 비로그인 리다이렉트
supabase/          migrations/*.sql, config.toml(auth 설정), templates/(메일)
tests/             node --test 기반 단위 테스트(permissions, content, og, auth-config)
docs/              기획서, design, brand, tasks(구현 브리프), reviews(리뷰 결과)
```

## 기능

- 인증: 이메일 로그인, 초대 링크 → `/set-password`, 비밀번호 재설정, 로그아웃. 가입 UI 없음.
- 권한: `profiles.role`이 owner | member. 글 수정·삭제는 `canManagePost(viewer, authorId)` 하나로 판단하며
  RLS → 서버 액션 → 페이지 가드 → UI 네 겹이 같은 규칙을 쓴다. RLS가 최종 방어선.
- 피드: 단일 컬럼 타임라인. 커서 기반 무한 스크롤(`FEED_PAGE_SIZE`), 전체 로드 금지. 태그 필터.
- 글: 모든 회원 작성 가능. Tiptap 리치 텍스트, 이미지 업로드(본인 폴더), 링크 카드, 태그.
- 테마: 라이트/다크. 반응형은 필수(360px ~ 1440px).
- 초기 버전에 좋아요·댓글·북마크·관리자 페이지는 없다. 계정 관리는 Supabase 대시보드로 한다.

## 코딩 규칙

- 이메일 등 계정 정보를 코드에 하드코딩하지 않는다. 시크릿은 `.env.local`과 `~/.config/itroom/`에만 둔다.
- DB 스키마 변경은 `supabase/migrations/`에 새 파일로 추가한다. 원격 Supabase 변경은 사용자 확인 후에만.
- 사용자 입력 HTML은 항상 `lib/sanitize.ts`를 거친다.
- 설명·주석·커밋 메시지는 한국어로 쓴다. 코드 식별자는 영어.

## 작업 방식 (Herdr)

이 세션은 Herdr의 `계획` pane에서 실행된다. 옆에는 `구현` pane(Claude Code)이 같은 디렉터리에 있다.

1. **계획**: 요구사항을 정리하고 `docs/tasks/NN-*.md`에 번호 붙인 브리프를 작성한다.
   브리프에는 목표, 절대 규칙(커밋·푸시 금지, 원격 Supabase 변경 금지), 단계, 완료 보고 형식을 담는다.
2. **구현 위임**: `herdr pane list --workspace "$HERDR_WORKSPACE_ID"`로 라벨이 `구현`인 pane ID를 확인하고
   `herdr agent prompt <pane> "<브리프 경로> 읽고 구현"`으로 넘긴다. `herdr agent wait`로 완료를 기다린다.
3. **검증**: 결과를 직접 확인한다. `pnpm lint`, `pnpm test`, `pnpm build`, 마이그레이션 적용, 브라우저 동작 확인.
   문제가 있으면 수정 지시를 다시 `구현` pane에 보낸다.
4. **커밋·푸시 승인**: 작업이 끝나 커밋·푸시가 필요하면 변경 요약을 보여 주고 **사용자 승인을 받은 뒤에만** 진행한다.
   승인 전에는 절대 커밋하지 않는다. 사용자가 로컬 테스트를 마쳤다고 말할 때까지 기다린다.

UI 작업에는 `/frontend-design`, `/ui-ux-pro-max:ui-ux-pro-max` 스킬을 활용한다.

@AGENTS.md
