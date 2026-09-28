# 작업 07: "내 소식" 페이지, 아바타 메뉴 진입, 글 작성칸 삭제

읽을 문서:
- `docs/기획서.md` 3.7, 5장, 6장
- `docs/design/디자인-시스템.md` 4장, 5.1, 5.2
- `components/layout/app-header.tsx`, `components/post/compose-row.tsx`, `components/post/feed-list.tsx`
- `lib/posts.ts`, `app/(app)/posts/actions.ts`, `app/(app)/page.tsx`
- `node_modules/next/dist/docs/` 중 App Router 라우팅, Server Actions, `searchParams` 문서 (Next 16 기준, 기억에 의존하지 말 것)

## 목표

내가 쓴 글을 한 곳에 모아 보고 수정·삭제를 쉽게 하기 위해 아래 세 가지를 바꾼다.

1. **`/me` 페이지**를 새로 만든다. 피드와 같은 카드 목록이지만 로그인한 사용자 본인의 글만 최신순으로 보여 준다. 무한 스크롤도 같은 방식.
2. `/me` 진입은 **오른쪽 아바타(프로필) 메뉴**에 둔다. 헤더 탭은 **홈 / 쓰기** 두 개를 유지하되, 모바일에서도 보이게 한다.
3. 피드 맨 위의 글 작성칸 카드(`ComposeRow`, "OO님, 새 소식이 있나요?")를 **삭제**한다. 글쓰기 진입은 헤더의 쓰기 탭 하나로 통일한다.

결정 배경: 내 소식을 사람 아이콘 탭으로 두면 바로 옆 아바타와 "나"가 두 번 보인다. 홈·쓰기는 매일 쓰지만 내 글 정리는 가끔 하는 일이므로 아바타 메뉴 안에 두는 것이 자연스럽고 헤더도 가볍다. 폭에 따라 위치를 바꾸지 않고 모든 폭에서 같은 자리에 둔다.

## 절대 규칙
- **커밋·푸시 금지.** 작업은 워킹 트리에만 남긴다. main 푸시는 곧바로 프로덕션 배포다.
- **원격 Supabase 변경 금지.** 이 작업에는 마이그레이션이 필요 없다. RLS·스키마를 건드리지 않는다.
- "내 글" 필터의 사용자 ID는 **항상 서버 세션에서** 꺼낸다. 클라이언트가 보낸 `authorId`를 그대로 쿼리에 넣지 않는다.
- 전체 로드 금지. `/me`도 `FEED_PAGE_SIZE` 단위 커서 페이지네이션을 유지한다.
- 반응형 360px ~ 1440px 유지. 헤더는 360px에서 두 탭 + 워드마크 + 아바타가 한 줄에 들어가야 한다.
- 내 소식 진입 위치는 데스크톱과 모바일이 같아야 한다(아바타 메뉴). 폭에 따라 탭으로 옮기지 않는다.

## 해야 할 일

### 1. 데이터 조회 `lib/posts.ts`
- `fetchFeedPage` 옵션에 `authorId?: string | null`을 추가한다. 값이 있으면 `.eq("author_id", authorId)`를 건다. 커서·태그 로직은 그대로.
- 기존 인덱스 `posts_created_at_idx (created_at desc, id desc)`로 충분하다(회원 수가 적다). 인덱스 추가 마이그레이션은 만들지 않는다.

### 2. 서버 액션 `app/(app)/posts/actions.ts`
- `loadMorePosts(cursor, tag)` 시그니처를 `loadMorePosts(cursor, filter)`로 바꾼다. `filter`는 `{ tag?: string | null; mine?: boolean }` 형태의 unknown 입력이며 지금처럼 하나씩 검증한다.
- `mine === true`이면 `requireUser()`가 돌려준 `user.id`를 `authorId`로 넘긴다. 그 외에는 `authorId`를 넘기지 않는다.

### 3. 피드 리스트 `components/post/feed-list.tsx`
- `tag: string | null` prop을 `filter: { tag: string | null; mine: boolean }`으로 바꾸고 `loadMorePosts(cursor, filter)`로 호출한다.
- 삭제 시 목록에서 즉시 빼는 `onDeleted` 동작은 그대로 둔다. `/me`에서 삭제하면 그 자리에서 사라져야 한다.
- 마지막 안내문은 `/me`에서 "마지막 소식입니다." 대신 "내가 쓴 소식은 여기까지입니다."처럼 문맥에 맞게 prop으로 받는다(`endLabel?: string`).

### 4. 새 페이지 `app/(app)/me/page.tsx`
- `requireUser()` 후 `fetchFeedPage({ authorId: profile.id })`.
- 맨 위에 안내 카드 하나: 제목 "내 소식"(`type-title` 17px), 보조 문구 "내가 쓴 글만 모아 봅니다. 수정·삭제는 각 글의 ⋯ 메뉴에서." 태그 필터 카드와 같은 `Card` 높이·여백을 쓴다.
- 빈 상태: 아이콘은 `PenLine`, 제목 "아직 쓴 소식이 없습니다", 보조 "위 쓰기 버튼으로 첫 소식을 남겨보세요." 피드의 빈 상태 카드와 같은 구성.
- `FeedList`에 `filter={{ tag: null, mine: true }}`, `viewer`, `serverNow`를 넘긴다. `/me`는 `?tag=`를 받지 않는다. 태그 칩은 지금처럼 `/?tag=`로 간다.
- `h1`은 sr-only "내 소식".
- `app/(app)/layout.tsx`가 이미 `force-dynamic`이므로 별도 설정은 필요 없다.

### 5. 피드 페이지 `app/(app)/page.tsx`
- `ComposeRow` import와 렌더를 제거한다. 태그 카드는 `tag`가 있을 때만 남는다.
- 빈 상태 보조 문구 "위에서 첫 소식을 남겨보세요." → "위 쓰기 버튼으로 첫 소식을 남겨보세요."
- `FeedList`에 `filter={{ tag, mine: false }}`.

### 6. 글 작성칸 삭제
- `components/post/compose-row.tsx` 파일 삭제.
- `app/globals.css`의 `--tint-photo / --tint-link / --tint-tag`(라이트·다크·`@theme` 매핑 모두)는 이 컴포넌트에서만 쓰였다. 함께 지운다. 다른 곳에서 쓰는지 `grep`으로 다시 확인한 뒤 지울 것.

### 7. 헤더 `components/layout/app-header.tsx`
- 탭은 홈 `/`(`Home`)과 쓰기 `/write`(`Pencil`) 두 개 그대로. 내 소식 탭은 만들지 않는다.
- 활성 판정은 지금처럼 `path === "/"`, `path === "/write"`. `/me`, 글 상세·수정 화면에서는 어느 탭도 활성이 아니다.
- **모바일에서도 탭을 보인다.** 지금은 `nav`가 `hidden sm:flex`라 640px 미만에서는 글쓰기 진입점이 작성칸뿐이었다. 작성칸을 없애므로 탭이 모든 폭에서 보여야 한다.
  - 그리드를 모든 폭에서 `grid-cols-[1fr_auto_1fr]`로 바꾼다.
  - 탭 폭: 모바일 `w-14`(56px), `sm` 이상 `w-24`. 아이콘 크기는 그대로.
  - 360px 계산: 안쪽 폭 328px = 워드마크 약 44px + 탭 112px + 아바타 44px + 여유. 한 줄에 들어간다.
- 모바일 하위 화면(`/write`, `/posts/[id]`, `/posts/[id]/edit`)은 지금처럼 "← + 제목"을 보이고 **탭은 숨긴다**(`sub && "hidden sm:flex"`). 뒤로 가기가 이미 있으므로 탭까지 넣어 좁게 만들지 않는다.
- `subPage()`에 `/me`를 추가한다: `{ title: "내 소식", back: "/" }`. 모바일에서는 "← 내 소식" 헤더가 되고, 이때도 탭은 숨긴다. 데스크톱은 워드마크 + 두 탭 그대로이고 페이지 안의 안내 카드가 제목 역할을 한다.
- `confirmLeave()` 가드는 두 탭과 뒤로 가기에 그대로 유지한다.

### 7-1. 프로필 메뉴 `components/layout/profile-menu.tsx`
- 맨 위 이름 영역(`DropdownMenuLabel`: 아바타 + 이름 + 소유자/회원)을 `/me`로 가는 `Link`로 감싸거나, 같은 모양의 항목으로 바꿔 누르면 `/me`로 이동하게 한다. hover 시 `bg-canvas-soft`.
- 그 바로 아래에 명시적인 항목 **"내 소식"**(`FileText` 또는 `Newspaper` 아이콘, `DropdownMenuItem asChild` + `Link href="/me"`)을 첫 줄로 넣는다. 그 다음 구분선, 다크 모드, 구분선, 로그아웃 순.
- 에디터에서 나갈 때의 `confirmLeave()` 가드를 두 링크에도 건다(탭과 같은 `onClick` 처리).
- `/me`에 있을 때는 "내 소식" 항목에 `aria-current="page"`를 주고 글자색을 `text-ink`로 강조한다.
- 메뉴 항목 높이는 44px 이상(모바일 터치).

### 8. 문서
- `docs/기획서.md`
  - 5장 경로표: `/`의 설명에서 "글 작성칸" 제거, `/me | 내 소식 | 로그인 | 본인 글만 최신순, 무한 스크롤, 수정·삭제 메뉴` 행 추가.
  - 5.1 공통 레이아웃: 헤더 구성을 "좌측 잇룸 워드마크, 가운데 홈·쓰기 탭(모든 폭), 우측 테마 토글·프로필 메뉴(내 소식, 다크 모드, 로그아웃)"로 고친다.
  - 6장: "구성은 Facebook(상단 헤더, 글 작성칸 카드, 글 카드 목록)" → 글 작성칸 삭제. "글쓰기 진입: 헤더의 쓰기 탭. 모든 회원에게 노출, `/write`로 이동."
  - 6.1: 헤더 구성 문구를 "로고, 홈·쓰기 탭, 아바타"로 갱신.
- `docs/design/디자인-시스템.md` 5.1: 가운데 "홈 탭" → "홈·쓰기 두 탭(모든 폭에서 표시, 모바일 하위 화면에서는 숨김)". 오른쪽에서 "새 소식(+, 소유자만)" 삭제. 프로필 메뉴 구성(이름 영역 → 내 소식, 내 소식 항목, 다크 모드, 로그아웃)을 적는다. 3px ink 밑줄 규칙은 유지.
- `CLAUDE.md` 구조 표의 `app/(app)/` 줄에 `내 소식(me)` 추가.

### 9. 검증
- `pnpm lint`, `pnpm test`, `pnpm build` 모두 통과.
- 브라우저(계획 pane이 확인하지만 구현 측도 `pnpm dev`로 한 번 본다):
  - 360 / 390 / 768 / 1440px에서 헤더 한 줄 유지, 활성 탭 밑줄 위치.
  - 아바타 메뉴에서 이름 영역과 "내 소식" 항목 모두 `/me`로 가는지. 모바일 `/me`에서 "← 내 소식" 헤더와 뒤로 가기.
  - `/me`에서 남의 글이 보이지 않는지, ⋯ 메뉴로 수정·삭제가 되는지, 삭제 후 목록에서 즉시 빠지는지.
  - `NEXT_PUBLIC_FEED_PAGE_SIZE=3`으로 `/me` 무한 스크롤.
  - 피드에 작성칸이 없고, 에디터에서 다른 탭을 누르면 나가기 확인이 뜨는지.

## 완료 보고
끝나면 다음을 한 줄씩 보고한다.
1. 바꾼 파일 목록(삭제 포함).
2. `pnpm test` / `pnpm lint` / `pnpm build` 결과 (실패가 있으면 출력 그대로).
3. 브리프와 다르게 판단한 부분과 이유.
4. 계획 pane이 직접 확인해야 할 항목.
