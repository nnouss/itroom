# 작업 08: 피드의 긴 글 접기 + 제자리 "더보기"

읽을 문서:
- `docs/기획서.md` 3.7, 3.8
- `docs/design/디자인-시스템.md` 1장(토큰), 5.2, 6장(모션)
- `components/post/post-row.tsx`, `components/post/feed-list.tsx`, `app/(app)/posts/[id]/page.tsx`
- `app/globals.css`의 `.post-content` 규칙, `lib/constants.ts`

## 목표

본문 길이 제한이 없어서 긴 글 하나가 피드 화면을 여러 장 차지한다. 피드에서만 긴 본문을 일정 높이로 접고,
"더보기"를 누르면 **그 자리에서 펼친다**. 상세 페이지로 이동하지 않는다.

결정 배경: 상세 페이지에는 댓글·좋아요가 없어 피드 카드와 내용이 같다. 이동시키면 무한 스크롤 위치와
이미 불러온 묶음을 잃기 쉽다. 그래서 Facebook/LinkedIn처럼 제자리에서 펼친다.

## 절대 규칙
- **커밋·푸시 금지.** 작업은 워킹 트리에만 남긴다.
- **원격 Supabase 변경 금지.** DB·RLS·서버 액션은 건드리지 않는다. 클라이언트 표시만 바꾼다.
- 색은 토큰만 쓴다(hex 금지). 라이트/다크 모두에서 자연스러워야 한다.
- 반응형 360px ~ 1440px 유지. 그림자 금지(디자인 시스템 고도 규칙).

## 해야 할 일

### 1. 상수 `lib/constants.ts`
- `POST_COLLAPSE_THRESHOLD = 720` : 접히는 영역의 실제 높이(px)가 이 값을 **넘을 때만** 접는다.
- `POST_COLLAPSED_HEIGHT = 480` : 접었을 때 보이는 높이(px).
- 두 값의 차이(240px)는 "한두 줄만 가리려고 접는" 상황을 막기 위한 여유다. 이미지 한 장(최대 520px) + 짧은 글은 접히지 않아야 한다.

### 2. `components/post/post-row.tsx`
- `PostRow`에 `collapsible?: boolean` prop 추가(기본 `false`).
- 접히는 영역은 **본문 블록(`post.blocks`: html + 이미지 묶음)만**이다. **링크 카드와 태그는 접히는 영역 밖**, 그 아래에 항상 보인다.
- 새 클라이언트 컴포넌트(예: `components/post/collapsible-body.tsx`)로 분리해도 좋다.
- 동작:
  - `collapsible`이 아니면 지금과 완전히 같게 렌더한다.
  - 높이 측정은 `ResizeObserver`로 내부 콘텐츠를 관찰한다. 이미지 로드나 화면 폭 변화로 높이가 바뀌어도 다시 판단한다.
  - 내부 높이 > `POST_COLLAPSE_THRESHOLD`이면 `max-height: POST_COLLAPSED_HEIGHT` + `overflow: hidden`으로 접고,
    아래쪽에 약 64px 페이드(투명 → `--canvas`, 카드 배경 토큰)를 덮는다. 페이드는 `pointer-events: none`.
  - 첫 렌더(SSR·측정 전)에는 `max-height: POST_COLLAPSE_THRESHOLD` + `overflow: hidden`을 적용해 두어,
    짧은 글은 측정 후에도 높이 변화가 없고 긴 글이 전부 펼쳐졌다 줄어드는 깜빡임이 없게 한다.
  - 접힌 경우에만 접히는 영역 바로 아래에 "더보기" 버튼을 둔다. 왼쪽 정렬, 텍스트 버튼
    (`type-body-sm` 또는 이에 준하는 크기, `font-medium`, `text-text-muted`, hover 시 `text-text` 또는 밑줄).
    크기 변화 없는 눌림 피드백(디자인 시스템 5.4). 버튼에 `aria-expanded`, `aria-controls` 지정.
  - 누르면 펼친다(`max-height` 해제, 페이드 제거, 버튼 제거). **"접기" 버튼은 두지 않는다.**
    전환 애니메이션은 없거나 짧게, `prefers-reduced-motion`이면 즉시.
  - 펼친 상태는 컴포넌트 로컬 상태로 충분하다(무한 스크롤 중 항목은 언마운트되지 않는다).
- 카드 위쪽의 시간 링크(상세 이동)와 ⋯ 메뉴(링크 복사 등)는 그대로 둔다.

### 3. 사용처
- `components/post/feed-list.tsx`: `PostRow`에 `collapsible`을 넘긴다(홈, 태그 필터, `/me` 모두 적용).
- `app/(app)/posts/[id]/page.tsx`: 넘기지 않는다. 상세 페이지는 항상 본문 전체.

### 4. 문서
- `docs/기획서.md` 3.7: "글 카드에 본문 전체" 문구를, 긴 본문은 높이 기준으로 접고 제자리 "더보기"로 펼친다는 내용으로 고친다(링크 카드·태그는 항상 노출, 상세는 전체 표시).
- `docs/design/디자인-시스템.md` 5.2: 접기 규칙(임계 720 / 접힌 높이 480 / 페이드 / 더보기 버튼 스타일 / 접기 버튼 없음)을 한 단락 추가.

## 검증 (구현 쪽에서 할 것)
- `pnpm lint`, `pnpm test`, `pnpm build` 모두 통과.
- 결과 보고: 바꾼 파일 목록, 핵심 설계(측정·첫 렌더 처리), 남은 우려 사항. 브라우저 확인은 계획 쪽에서 한다.
