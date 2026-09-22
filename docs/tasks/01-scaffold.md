# 작업 01: 프로젝트 스캐폴딩 + 디자인 토큰 + 앱 셸

읽을 문서 (먼저 전부 읽고 시작):
- `docs/기획서.md` 전체
- `docs/design/디자인-시스템.md` 전체

## 목표
잇룸의 Next.js 프로젝트를 이 폴더(현재 cwd)에 생성하고, 디자인 토큰과 앱 셸(헤더, 레이아웃, 테마)까지 만든다. Supabase 연동과 실제 기능은 이번 작업에 포함하지 않는다. 화면은 플레이스홀더 데이터로 동작해야 한다.

## 제약
- 패키지 매니저: pnpm. 이미 `docs/` 폴더가 있으니 현재 폴더에 그대로 생성한다 (`create-next-app`은 `docs`를 허용한다).
- Next.js 최신 안정 버전, App Router, TypeScript, Tailwind CSS v4, ESLint, `src/` 디렉터리 없음, import alias `@/*`.
- `runtime = 'edge'` 사용 금지. 모든 것은 Node.js 런타임.
- 이모지 아이콘 금지. 아이콘은 `lucide-react`만.
- 그림자, blur, 그라데이션 금지. 디자인 시스템 3장 고도 규칙 그대로.
- 컴포넌트 안에서 hex 직접 사용 금지. 토큰만.
- 배포, git remote 추가, Vercel 관련 작업은 하지 않는다.

## 해야 할 일

### 1. 프로젝트 생성
```
pnpm create next-app@latest . --ts --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-pnpm --yes
```
생성 후 `pnpm dev`가 뜨는지 확인하고 종료한다.

### 2. 의존성
- `next-themes`, `lucide-react`, `pretendard`, `clsx`, `tailwind-merge`
- shadcn/ui 초기화: `pnpm dlx shadcn@latest init -y` (style: new-york, base color: neutral, CSS variables: yes). 컴포넌트 추가: `button input label dropdown-menu dialog sonner skeleton badge`.
- JetBrains Mono는 `next/font/google`로 코드블록 전용 변수 `--font-mono`에 연결.

### 3. 디자인 토큰 (`app/globals.css`)
디자인 시스템 1장 표의 라이트/다크 값을 CSS 변수로 정의한다.
- `:root`에 라이트, `.dark`에 다크. `next-themes`의 `attribute="class"` 사용.
- Tailwind v4 `@theme inline`으로 `--color-canvas`, `--color-canvas-soft`, `--color-field`, `--color-hairline-soft`, `--color-hairline`, `--color-ink`, `--color-ink-soft`, `--color-on-ink`, `--color-text-muted`, `--color-text-faint`, `--color-accent`, `--color-destructive`, `--color-overlay`, `--color-scrim` 등록 → `bg-canvas`, `text-ink`, `border-hairline` 같은 유틸리티가 되게.
- shadcn 변수 매핑: `--background`→canvas, `--foreground`→ink, `--muted`→canvas-soft, `--muted-foreground`→text-muted, `--border`→hairline-soft, `--input`→field, `--ring`→ink, `--primary`→ink, `--primary-foreground`→on-ink, `--destructive`→destructive, `--card`→canvas, `--popover`→canvas, `--radius`→1rem.
- 폰트: `pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css`를 import하고 `--font-sans: "Pretendard Variable", -apple-system, sans-serif`. `body`는 `font-weight: 450`, `line-height: 1.6`, `font-size: 16px`, `letter-spacing: 0`.
- 타이포 유틸리티: 디자인 시스템 2장 표를 `@utility` 또는 클래스로 정의 (`.type-display`, `.type-heading`, `.type-title`, `.type-body`, `.type-body-light`, `.type-body-sm`, `.type-label`, `.type-caption`).
- 포커스 링 전역: `focus-visible`에 2px ink 링, offset 0.
- `prefers-reduced-motion: reduce`일 때 전역 transition/animation 0ms.

### 4. 상수
`lib/constants.ts`:
```ts
export const SITE_NAME = "잇룸";
export const FEED_PAGE_SIZE = 10;
```

### 5. 레이아웃과 셸
- `app/layout.tsx`: `lang="ko"`, `<html suppressHydrationWarning>`, `ThemeProvider`(`attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange`), metadata `title: "잇룸"`, `robots: { index: false, follow: false }`, viewport `width=device-width, initial-scale=1` (zoom 비활성화 금지). `min-h-dvh bg-canvas text-ink`.
- 라우트 그룹 두 개:
  - `app/(auth)/login/page.tsx`: 로그인 화면. 디자인 시스템 5.6 규격. 지금은 폼 제출 시 아무 동작 없이 `/`로 이동하는 플레이스홀더 (실제 인증은 작업 03).
  - `app/(app)/layout.tsx`: 헤더(nav-pill) + `<main>` 컬럼(최대 640px, 모바일 여백 16, md 24, `pt-20`).
  - `app/(app)/page.tsx`: 피드. 지금은 `lib/mock-posts.ts`의 목 데이터 6개를 렌더링.
- `components/layout/nav-pill.tsx`: 디자인 시스템 5.1. `sticky top-3`, canvas-soft, rounded-full, 높이 56. 좌 로고 "잇룸." (Link to `/`), 우 `ThemeToggle` + 아바타 메뉴(DropdownMenu: 표시 이름, 로그아웃 항목은 지금은 `/login`으로 이동).
- `components/layout/theme-toggle.tsx`: 40px 원형 아이콘 버튼, Sun/Moon 아이콘, `aria-label` 필수, hydration mismatch 방지(mounted 체크).
- `components/post/post-row.tsx`: 디자인 시스템 5.2. 아바타(36px, 첫 글자), 이름 + "·" + 상대 시각, 본문(`dangerouslySetInnerHTML`은 이번엔 목 HTML 그대로. sanitize는 작업 04), 이미지 타일(1장 / 여러 장 가로 스크롤), 링크 카드, 태그 칩. 아래 1px hairline-soft. owner용 [⋯] 메뉴는 `isOwner` prop으로 노출.
- `components/post/link-card.tsx`: 5.2의 링크 카드. 모바일 세로, sm 이상 가로.
- `components/post/tag-chip.tsx`: 5.2의 태그 칩. `active` prop.
- `components/post/compose-row.tsx`: 5.3. `isOwner`일 때만 피드 위에 렌더링. 전체가 `/write` 링크.
- 상대 시각 유틸 `lib/format.ts` (`formatRelative(date)`: "방금 전", "n분 전", "n시간 전", "n일 전", 그 이상은 "M월 d일").
- `/write`, `/posts/[id]`, `/posts/[id]/edit`은 이번 작업에서 만들지 않는다.

### 6. 목 데이터
`lib/mock-posts.ts`: 글 6개. 다음 조합을 포함해 컴포넌트 케이스가 다 보이게:
1. 텍스트만 + 태그 2개
2. 텍스트 + 본문 링크(accent 색) + 링크 카드(썸네일 있음)
3. 텍스트 + 이미지 1장 (https://picsum.photos/seed/itroom1/1200/800)
4. 텍스트 + 이미지 3장
5. 텍스트 + 코드블록 + 인라인 코드
6. 링크 카드(썸네일 없음) + 태그 4개
피드 페이지에서 `isOwner = true`로 고정해 compose-row와 [⋯] 메뉴가 보이게 한다.

### 7. git
- `git init`, `.gitignore`에 `.env*.local`, `.env` 포함 확인.
- 커밋 1개: `chore: scaffold itroom with design tokens and app shell`. 커밋 메시지 끝에 `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` 줄 추가.

### 8. 완료 조건
- `pnpm lint`와 `pnpm build` 모두 에러 0.
- `pnpm dev` 후 `http://localhost:3000`이 피드(목 데이터)를, `/login`이 로그인 화면을 렌더링.
- 라이트/다크 토글 동작, 새로고침 후 유지.
- 360px 폭에서 가로 스크롤 없음.

## 보고
끝나면 다음을 한 번에 답한다:
1. 생성된 파일 트리 (`app`, `components`, `lib` 아래)
2. `pnpm lint`, `pnpm build` 결과 마지막 10줄
3. 지시서와 다르게 한 부분과 이유
4. 못 한 부분
