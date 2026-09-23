# 작업 03·04 코드 리뷰

- 대상: `git diff bb0afd9..d068088` (`d0680881fefe1750c6511dda51b169c05a6906ad`)
- 기준: 대상 커밋의 `docs/기획서.md`, `docs/design/디자인-시스템.md`와 요청한 보안·정확성·접근성 기준.
- 범위: 구현 파일 변경 없이 소스/의존성 검토, 기존 테스트 실행, 읽기 전용 및 격리된 메모리 내 재현. 실제 Supabase 데이터 변경·삭제·업로드·마이그레이션 실행은 하지 않았다.
- 결과: **critical 0 / high 4 / medium 10 / low 5**. `확인 필요` 항목도 해당 심각도 개수에 포함한다.
- 검증: `pnpm test` **7개 통과**, `pnpm lint` **종료 코드 0**. 빌드는 실행하지 않았다. 테스트 통과는 아래 통합/경합 시나리오의 정상 동작을 보장하지 않는다.

## critical — 0

확인된 항목 없음.

## high — 4

### H1. OG fetch의 호스트 문자열 검사로 SSRF를 막을 수 없음

- **파일:줄:** `lib/og.ts:8`, `lib/og.ts:41`, `lib/og.ts:47`
- **문제:** `localhost`, IP 리터럴, 일부 접미사만 차단한다. `localhost.`는 통과하고, 일반 도메인이 사설/루프백 IP로 해석되는 경우도 검사하지 않는다. `redirect: "follow"`는 최초 URL 검사를 통과한 뒤의 리다이렉트 목적지를 검사하지 않는다. 공격자가 제어하는 링크를 owner가 게시하는 것만으로 서버가 내부 주소를 요청할 수 있다. 일반 회원이 직접 `savePost`를 호출해 쓰기 권한을 우회한다는 의미는 아니다.
- **재현 시나리오:** 리뷰용 HTTP 서버를 임의 로컬 포트에 띄우고 `fetchLinkPreview("http://localhost.:<port>/review-only")`를 호출했다. 함수가 그 서버의 제목 `controlled-loopback-proof`를 반환했다. 실제 내부 서비스에는 접근하지 않았다. 추가로 공개 URL이 내부 주소로 302를 반환하는 경우에도 현재 구현은 따라간다.
- **제안 수정:** 호스트를 정규화하고 DNS의 모든 A/AAAA 응답을 검증한다. 실제 연결도 검증한 IP에 고정하거나 검증된 egress 프록시를 사용해 DNS 재해석 경합을 막는다. 리다이렉트를 수동 처리하면서 매 단계 같은 검사를 적용하고 횟수를 제한한다. 루프백·사설·링크로컬·예약 주소와 IPv4-mapped IPv6를 모두 고려한다. [OWASP SSRF 방어 지침](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html)

### H2. 저장 시 sanitize만 수행하고 DB HTML을 읽을 때는 그대로 실행 가능한 DOM으로 삽입

- **파일:줄:** `lib/posts.ts:31`, `components/post/post-row.tsx:105`; 관련 `app/(app)/posts/actions.ts:58`
- **문제:** `sanitizePostHtml`의 허용 목록 자체는 제한적이지만, 조회 경로에서는 사용하지 않는다. RLS는 owner의 DB 직접 쓰기를 허용하므로 `savePost`가 유일한 쓰기 경로가 아니다. 기존 데이터, SQL 입력, owner 세션의 직접 REST 호출로 들어온 HTML은 모든 회원에게 그대로 렌더링된다. 기획서 3.4의 “렌더링 시 서버에서 sanitize”가 구현되지 않았다.
- **재현 시나리오:** 별도 테스트 DB에서 owner 권한으로 `content_html`에 `<img src="/invalid-image" onerror="document.body.dataset.reviewXss='1'">`를 직접 저장하고 회원으로 피드 또는 상세를 연다. 이벤트 속성이 제거되지 않고 DOM에 들어간다. 본 리뷰에서는 실제 DB에 해당 데이터를 삽입하지 않았다. 회원/anon에게 글 쓰기 권한이 생긴다는 주장은 아니다.
- **제안 수정:** `toPost` 등 공통 서버 조회 경계에서 본문을 sanitize하여 피드·상세·수정 화면 모두 정화된 값을 받도록 한다. 저장 시 정화도 유지한다. DB의 `link_url`/`link_image` 역시 렌더링 가능한 스킴을 명시적으로 검증한다. 직접 DB 입력과 레거시 HTML을 포함하는 회귀 테스트를 추가한다.

### H3. 기존 초기 마이그레이션 수정만으로는 작업 02 DB에 images 컬럼이 생기지 않음

- **파일:줄:** `supabase/migrations/0001_init.sql:18`; 관련 `lib/posts.ts:8`
- **문제:** 새 컬럼을 이미 존재하는 `0001_init.sql`의 CREATE TABLE에만 추가했다. `bb0afd9` 스키마를 적용한 DB에는 `posts.images`가 없고, 조회·저장·삭제가 모두 이 컬럼에 의존한다. 초기 SQL을 다시 실행하면 기존 enum/테이블 충돌로 실패한다.
- **재현 시나리오:** 작업 02의 `0001_init.sql`을 적용한 DB에서 커밋만 갱신해 피드에 접근한다. `images` 컬럼 조회가 실패한다. **확인 필요:** 실제 프로젝트가 이전 마이그레이션을 적용했는지, 별도 수동 ALTER를 했는지는 저장소만으로 확인할 수 없다. 신규 DB에서 수정된 초기 파일만 실행한 경우에는 발생하지 않는다.
- **제안 수정:** 별도 후속 마이그레이션에 `ALTER TABLE public.posts ADD COLUMN ...`을 추가하고 기존 DB 업그레이드 절차를 문서화한다. 새 DB/기존 DB 양쪽에서 적용 가능한 마이그레이션 이력을 유지한다.

### H4. 이미지 경로 재사용을 허용하면서 수정·삭제 시 다른 글의 참조 확인 없이 객체를 영구 삭제

- **파일:줄:** `app/(app)/posts/actions.ts:60`, `app/(app)/posts/actions.ts:104`, `app/(app)/posts/actions.ts:35`
- **문제:** 이미지 검증은 현재 사용자 디렉터리 접두사 검사뿐이다. 같은 사용자 이미지 경로를 여러 글에 연결할 수 있는데, 어느 한 글에서 이미지를 제거하거나 글을 삭제하면 Storage 객체를 바로 지운다. 다른 글의 유효한 첨부가 깨진다. 경로 접두사는 “이 글만 소유한 파일”이라는 증거가 아니다.
- **재현 시나리오:** owner가 A 글에 이미지 P를 저장하고 B 글에도 `/media/P`를 붙여 넣거나 `savePost` 입력으로 같은 경로를 보낸다. A를 삭제하거나 A에서 P를 제거하고 저장하면 B의 이미지도 404가 된다. 두 편집 탭에서 한쪽이 이미지를 제거한 뒤 다른 쪽이 이전 HTML을 저장하는 경우에도 삭제된 객체 경로가 다시 저장될 수 있다.
- **제안 수정:** 이미지의 업로드 사용자·존재 여부·글 연결 관계를 서버에서 관리한다. 글별 독점 소유를 강제하거나 참조 테이블/참조 수를 사용한다. DB 저장과 연결 변경을 원자적으로 처리하고, 더 이상 참조되지 않는 객체만 지연 정리한다. 동시 수정에는 버전/`updated_at` 조건을 사용한다.

## medium — 10

### M1. 페이지네이션 실패 시 IntersectionObserver가 즉시 다시 요청하는 무제한 재시도

- **파일:줄:** `components/post/feed-list.tsx:33`, `components/post/feed-list.tsx:44`, `components/post/feed-list.tsx:50`
- **문제:** 실패해도 cursor를 유지하며 observer에서 error를 확인하지 않는다. pending이 바뀔 때 `loadMore` 함수가 바뀌어 effect가 observer를 다시 등록한다. sentinel이 보이는 상태라면 pending이 false가 된 직후 다시 요청한다. “다시 시도” 버튼이 있어도 자동 재시도를 멈추지 못한다.
- **재현 시나리오:** 페이지 하단에서 `loadMorePosts`가 반복 실패하도록 네트워크/서버 오류를 만든다. 스크롤하거나 버튼을 누르지 않아도 실패 → pending 해제 → observer 재등록 → 요청이 반복된다.
- **제안 수정:** error가 있으면 자동 관찰/요청을 중단하고 명시적인 재시도에서만 error를 해제한다. 요청 중 상태를 ref 등으로 단일화하고 필요하다면 제한된 backoff를 적용한다.

### M2. 삭제 후 첫 페이지 재동기화가 이미 읽은 페이지를 버리고, 진행 중 응답은 이전 커서를 덮어쓸 수 있음

- **파일:줄:** `components/post/feed-list.tsx:25`, `components/post/feed-list.tsx:37`, `components/post/delete-post-dialog.tsx:45`
- **문제:** 새로운 `initialPosts` 참조를 받으면 현재 목록과 cursor를 첫 페이지로 무조건 교체한다. 삭제가 `revalidatePath`와 `router.refresh()`를 수행하므로 여러 페이지를 읽은 뒤 글 하나를 삭제해도 나머지 로드된 페이지가 사라진다. 이전 세대의 `loadMorePosts` 응답을 무효화하는 장치도 없다.
- **재현 시나리오:** 30개 이상 로드한 뒤 하단 글을 삭제하면 첫 페이지 기준 목록으로 돌아가며 스크롤 위치/읽던 위치가 흔들린다. **확인 필요 — 경합:** 21~30번 글을 요청한 상태에서 첫 페이지 refresh가 먼저 반영되고 기존 응답이 나중에 도착하면, 1~10번 뒤에 21~30번이 붙고 cursor가 30번으로 이동해 11~20번을 건너뛸 수 있다. 실제 서버 액션/refresh의 도착 순서는 지연을 주어 확인해야 한다.
- **제안 수정:** 삭제된 ID를 현재 로드 목록에서 제거하면서 페이지 범위를 보존하는 정책을 정한다. 전체 초기화가 필요하면 요청 generation을 증가시키고 이전 응답을 폐기한다. posts와 cursor를 같은 generation의 결과로 함께 갱신한다. Next 문서도 `router.refresh()`가 기존 클라이언트 상태를 보존하며 RSC 결과를 병합한다고 설명한다: `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-router.md`.

### M3. 저장 중에도 본문 편집·붙여넣기·드롭이 가능하여 제출 뒤 입력이 유실됨

- **파일:줄:** `components/editor/post-editor.tsx:68`, `components/editor/post-editor.tsx:113`, `components/editor/post-editor.tsx:151`
- **문제:** pending 동안 Toolbar와 TagInput은 비활성화하지만 Tiptap editor는 계속 editable이다. 업로드 핸들러도 pending을 검사하지 않는다. 저장 요청은 시작 시점의 HTML만 전송하고, 성공하면 이후 변경 여부와 무관하게 `submitted.current = true`로 이동한다.
- **재현 시나리오:** OG 응답이 느린 링크가 포함된 글을 저장한 직후 본문에 문장을 더 쓰거나 이미지를 붙여 넣는다. 화면에는 추가 내용이 보이지만 저장된 글에는 없고 성공 이동으로 사라진다. pending 중 업로드가 시작되면 사용되지 않는 객체도 남을 수 있다.
- **제안 수정:** 요청 중 `editor.setEditable(false)`와 업로드 핸들러의 pending 검사를 함께 적용한다. 계속 편집을 허용할 목적이라면 제출한 revision과 현재 revision을 비교해 변경 내용을 보존하고 자동 이동하지 않는다.

### M4. 업로드했으나 저장되지 않은 이미지의 정리 경로가 없음

- **파일:줄:** `components/editor/post-editor.tsx:92`, `components/editor/post-editor.tsx:127`, `lib/upload.ts:34`
- **문제:** 업로드 즉시 Storage에 객체를 만들지만 새로 올린 경로들을 별도로 추적하지 않는다. 취소, 업로드 후 이미지 제거/undo, 저장 실패 후 이탈 시 객체를 정리하지 않는다. 기존 글의 `previous.images` 차집합으로는 한 번도 글에 저장되지 않은 객체를 찾을 수 없다.
- **재현 시나리오:** 새 글에 큰 이미지를 여러 장 올린 뒤 취소하거나, 이미지 노드를 모두 지운 뒤 텍스트만 게시한다. Storage에는 모든 업로드가 남는다. 아무 편집도 하지 않고 업로드를 시작한 직후 취소하면 dirty가 아직 false라 경고 없이 나갈 수도 있다.
- **제안 수정:** 임시 업로드를 업로드 사용자/만료 시각과 함께 추적하고 게시 성공 시 채택된 첨부만 확정한다. 미사용 파일은 서버 작업으로 정리한다. 클라이언트 이탈 시 삭제만으로 해결하지 말고 종료/네트워크 단절에도 동작하는 만료 정리를 둔다.

### M5. 서버 액션의 TypeScript 타입을 런타임 입력 검증으로 간주함

- **파일:줄:** `app/(app)/posts/actions.ts:13`, `app/(app)/posts/actions.ts:53`, `app/(app)/posts/actions.ts:62`; 관련 `lib/tags.ts:6`, `lib/posts.ts:72`
- **문제:** `cursor`/`input`의 객체 여부를 확인하기 전에 속성을 읽고, tags가 배열인지만 확인해 각 원소를 문자열로 처리한다. `Date.parse`의 성공 여부만 검사한 createdAt을 PostgREST 필터 문자열에 그대로 삽입한다. 올바른 ISO timestamp 형태를 보장하지 않으며 잘못된 필터나 예외를 만들 수 있다. 이것만으로 RLS를 우회할 수 있다고 판단하지는 않는다.
- **재현 시나리오:** 인증된 호출자가 `loadMorePosts(null, null)`을 보내거나 owner가 `savePost({contentHtml:"<p>x</p>", tags:[null]})`를 보낸다. 정상적인 오류 반환 대신 예외가 발생한다. `normalizeTags([null])`의 `TypeError`는 로컬에서 확인했다.
- **제안 수정:** 액션 경계에서 unknown 입력을 스키마로 검증한다. 객체/null, UUID, timestamp 형식, tag 원소 타입·길이·개수, HTML 길이를 검사하고 일관된 오류를 반환한다. timestamp 검증 시 PostgreSQL의 마이크로초 정밀도는 유지해야 하므로 `Date.toISOString()`으로 무조건 정규화해 정밀도를 잃지 않도록 한다.

### M6. 저장·삭제 액션이 reject되면 인라인 오류 처리에 도달하지 못함

- **파일:줄:** `components/editor/post-editor.tsx:116`, `components/post/delete-post-dialog.tsx:34`
- **문제:** 두 컴포넌트 모두 `{ error }` 반환만 처리하고 await의 reject는 처리하지 않는다. 네트워크 장애, 서버 예외, 예상 밖 Storage 오류 등이 발생하면 `setError` 대신 React의 오류 경계 경로로 빠질 수 있다. 특히 에디터가 unmount되면 작성 내용 보존도 보장하지 못한다.
- **재현 시나리오:** 작성 내용을 입력한 상태에서 저장 POST가 네트워크 오류로 실패하게 하거나, 삭제 POST가 서버 예외로 종료되게 한다. 정상적인 “저장하지 못했습니다”/다이얼로그 오류 상태가 설정되지 않는다. 실제 오류 경계 UI의 모양은 앱 실행 환경에서 **확인 필요**다.
- **제안 수정:** 예상 가능한 서버 실패를 액션의 명시적인 result로 변환하고 클라이언트에서도 네트워크 reject를 처리해 입력을 유지한다. framework redirect/notFound 제어 흐름은 일반 실패로 삼키지 않는다. 저장 재시도 시 중복 생성 가능성도 고려한다.

### M7. UPDATE 영향 행 수를 확인하지 않아 삭제된 글을 “저장 성공”으로 보고함

- **파일:줄:** `app/(app)/posts/actions.ts:76`, `app/(app)/posts/actions.ts:102`, `app/(app)/posts/actions.ts:116`
- **문제:** 존재 확인 SELECT와 UPDATE가 분리되어 있고 UPDATE 결과는 error만 검사한다. Supabase/PostgREST에서 조건에 맞는 행이 0개인 UPDATE는 반드시 오류가 되는 것이 아니다. 그 경우 이미지 정리까지 진행한 뒤 기존 id를 성공 결과로 반환한다.
- **재현 시나리오:** 탭 A가 수정 대상 SELECT를 끝내고 OG를 가져오는 동안 탭 B에서 글을 삭제한다. A의 UPDATE는 0행이어도 성공 경로를 타며 “수정했습니다” 토스트 후 404 상세로 이동한다. 읽기 이후 역할이 바뀌어 RLS의 수정 대상에서 제외된 경우도 확인 대상이다.
- **제안 수정:** `.select("id, updated_at")` 등으로 실제 갱신 행을 확인한다. 수정 시작 시점 버전 조건을 UPDATE에 넣고 0행이면 삭제/충돌 오류를 반환한다. 갱신 성공이 확인된 뒤에만 첨부 정리를 수행한다.

### M8. 긴 태그·작성자 이름의 최소 너비 때문에 모바일 컬럼이 넘침

- **파일:줄:** `app/(app)/page.tsx:22`, `components/post/post-row.tsx:61`
- **문제:** 태그 필터 헤더와 작성자 행의 긴 텍스트에 `min-w-0`, 줄바꿈/말줄임, 너비 제한이 없다. URL의 tag는 40자까지 받으며, 실제 프로필 이름에는 길이 제한도 없다. flex item의 자동 최소 너비 때문에 좁은 화면을 벗어난다.
- **재현 시나리오:** 360px에서 `/?tag=`에 연속된 `W` 40자를 넣거나 작성자 이름을 긴 영문 문자열로 설정한다. 같은 flex/크기 규칙을 사용한 격리 브라우저 fixture에서 태그 행 scrollWidth 523px, 이름 행 989px를 확인했다. 이는 실제 인증 화면을 렌더링한 통합 측정은 아니다.
- **제안 수정:** 긴 텍스트에 `min-w-0`와 명시적인 truncate 또는 `overflow-wrap:anywhere`를 적용하고 시간/메뉴의 너비를 보호한다. 필요하면 작성자/시간을 두 줄로 배치한다. 유효한 최대 태그와 실제 긴 프로필 이름으로 360/390px 검증을 추가한다.

### M9. 에디터에서 보이는 이미지가 저장 시 안내 없이 삭제될 수 있음

- **파일:줄:** `lib/media.ts:19`, `lib/sanitize.ts:12`, `components/editor/post-editor.tsx:60`
- **문제:** Tiptap Image는 HTML의 일반 이미지 URL을 받아들이지만 저장 로직은 상대 `/media/` URL만 보존한다. 동일 사이트의 절대 `https://.../media/...` URL도 거부하며, `splitImages`는 경로 판정 실패 여부와 무관하게 모든 img를 제거한다. 따라서 사용자가 에디터에서 본 내용과 게시 결과가 달라진다.
- **재현 시나리오:** 본문과 함께 `<img src="https://itroom.example/media/<uid>/<uuid>.jpg">`를 붙여 넣는다. 로컬 함수 재현에서 본문은 남고 images는 빈 배열이 됐다. 이미지 없는 글로 저장되어도 사용자에게 별도 오류가 없다. 외부 이미지 HTML을 붙여 넣는 경우도 같다.
- **제안 수정:** 신뢰하는 사이트 origin의 절대 media URL을 정규화한 뒤 동일한 경로 검증을 적용한다. 지원하지 않는 이미지 URL은 붙여넣기 단계에서 거절/안내하거나 정식 업로드로 변환한다. 저장 시 발견한 비허용 이미지도 조용히 버리지 말고 구체적인 오류를 반환한다.

### M10. /media의 인증된 리다이렉트를 50분 캐시하여 로그아웃 뒤 세션 검사를 건너뛸 수 있음

- **파일:줄:** `app/media/[...path]/route.ts:24`
- **문제:** signed URL 자체의 1시간 수명은 기획서에 명시되어 있지만, 정규 `/media/...` 주소까지 `private, max-age=3000`으로 캐시한다. private는 브라우저 캐시를 금지하지 않는다. 캐시가 재사용되면 이 주소를 다시 열어도 GET의 `getUser()` 검사가 실행되지 않는다. 이미지 확장자는 proxy matcher에서도 제외되어 이 응답에는 proxy의 no-store를 기대할 수 없다.
- **재현 시나리오:** 로그인 상태에서 이미지를 연 뒤 로그아웃하고 같은 브라우저에서 같은 `/media/...jpg`를 일반 이미지 요청으로 다시 연다. 캐시된 302를 사용하는 브라우저는 인증 검사 없이 아직 유효한 signed URL을 사용한다. **확인 필요:** 사용 브라우저의 캐시/탐색 방식과 실제 응답 헤더를 포함한 통합 재현. 새 브라우저의 비인증 요청까지 허용된다는 의미는 아니다.
- **제안 수정:** 인증 판단을 수행하는 `/media` 응답은 `private, no-store`로 반환한다. 이미 발급된 signed URL의 수명까지 즉시 취소해야 한다면 현재 리다이렉트 설계로는 보장할 수 없으므로 별도 요구사항으로 결정한다.

## low — 5

### L1. /media params의 중복 디코딩이 잘못된 경로를 404 대신 서버 예외로 처리

- **파일:줄:** `app/media/[...path]/route.ts:12`
- **문제:** Next의 동적 params는 URL 디코딩을 거친 값인데, 다시 `decodeURIComponent`를 호출하고 예외를 잡지 않는다. 허용 경로 정규식에 도달하기 전에 URIError가 날 수 있다. 정상 경로의 `..`/임의 확장자를 통과시키는 우회는 확인하지 못했다.
- **재현 시나리오:** `/media/%25.jpg`처럼 첫 디코딩 뒤 잘못된 `%` 시퀀스가 남는 주소를 요청한다. 두 번째 디코딩 함수가 URIError를 발생시키는 것은 로컬에서 확인했다. 이미지 확장자라 proxy의 정적 파일 제외 패턴에도 해당한다.
- **제안 수정:** params를 중복 디코딩하지 않고 join 후 검증하거나, 꼭 필요한 디코딩은 try/catch로 감싸 400/404로 반환한다. percent-encoded slash, malformed percent, traversal 입력을 함께 테스트한다.

### L2. 이미지 업로드 중 본문 자리 표시자가 없어 삽입 위치가 변하고 레이아웃이 갑자기 이동

- **파일:줄:** `components/editor/post-editor.tsx:86`, `components/editor/toolbar.tsx:108`
- **문제:** 업로드 동안 Toolbar의 스피너/문구만 바뀌며 본문에는 placeholder 노드가 없다. 디자인 시스템 5.7은 먼저 skeleton 타일을 삽입하도록 요구한다. 완료 시에는 업로드 시작 위치가 아니라 그때의 selection에 `setImage`를 수행한다.
- **재현 시나리오:** 느린 연결에서 이미지를 업로드하고 완료 전에 다른 문단으로 커서를 옮긴다. 나중에 그 위치에 이미지가 생기며 본문이 밀린다. 드롭 위치도 사용하지 않아 드롭한 문단과 실제 삽입 문단이 다를 수 있다.
- **제안 수정:** 업로드 시작/드롭 위치에 식별 가능한 placeholder를 삽입하고 문서 transaction에 따라 위치를 매핑한다. 성공 시 해당 노드만 이미지로 교체하고 실패 시 제거/재시도를 제공한다.

### L3. 새 태그 제거 버튼의 터치 영역이 20×20px

- **파일:줄:** `components/editor/tag-input.tsx:47`, `components/editor/tag-input.tsx:52`
- **문제:** `size-5` 버튼이 칩 내부의 실제 누르기 영역 전부다. 요청한 44px 터치 타깃 기준에 미달하며 인접 태그를 잘못 누르기 쉽다. aria-label은 존재하므로 라벨 누락으로 지적하는 것은 아니다. 참고로 디자인 시스템 자체는 일반 icon/button을 40px로 지정하므로 Toolbar의 40px만을 디자인 문서 위반으로 세지 않았다.
- **재현 시나리오:** 모바일에서 여러 태그를 추가한 뒤 손가락으로 작은 ×만 눌러 제거한다. DOM 버튼 박스는 20px이며 별도 hit-area 확장이 없다.
- **제안 수정:** 시각적 아이콘 크기와 실제 터치 영역을 분리해 최소 44px의 비중첩 영역을 확보한다. 작은 재시도/시간 링크 등에도 같은 터치 영역 정책을 적용할지 결정한다.

### L4. 게시·삭제 로딩 스피너가 유지된 버튼 라벨과 겹침

- **파일:줄:** `components/editor/post-editor.tsx:161`, `components/post/delete-post-dialog.tsx:74`
- **문제:** 짧은 두 글자 라벨의 기본 버튼에 `absolute left-3` 스피너를 얹지만 스피너용 여백은 확보하지 않는다. 기본 버튼은 좌우 16px 패딩이라 왼쪽 12~28px의 아이콘이 첫 글자 영역과 겹친다. 라벨은 유지하지만 읽을 수 있는 배치를 보장하지 않는다.
- **재현 시나리오:** 느린 저장/삭제 응답에서 pending 상태를 확인한다. “게시”, “저장”, “삭제” 첫 글자 위에 스피너가 놓인다.
- **제안 수정:** 평상시에도 스피너 폭을 예약해 버튼 폭을 유지하거나 좌우 대칭의 고정 아이콘 슬롯을 사용한다. pending 전후 레이블과 버튼 크기를 비교한다.

### L5. 피드의 상대 시각을 서버/클라이언트에서 서로 다른 현재 시각으로 계산

- **파일:줄:** `components/post/feed-list.tsx:61`, `components/post/feed-list.tsx:73`
- **문제:** Client Component도 최초 요청에서 서버 렌더링되는데, 렌더마다 새 Date를 만들어 상대 시각을 계산한다. SSR과 hydration 사이에 분/시간/날짜 표시 경계를 지나면 초기 텍스트가 달라질 수 있다. 작업 01처럼 서버에서 확정한 문자열을 전달하던 구조와 달라졌다.
- **재현 시나리오:** 서버 렌더 시 게시 후 59초인 글을, JS 로딩을 늦춰 61초에 hydrate한다. 서버의 “방금 전”과 클라이언트의 “1분 전”이 다르다. **확인 필요:** 실제 페이지에서 느린 JS 로딩을 사용한 hydration 경고 재현은 하지 않았다.
- **제안 수정:** 최초 렌더의 기준 시각 또는 상대 시각 문자열을 서버에서 전달해 양쪽이 같은 값을 사용한다. hydration 이후에만 필요에 따라 갱신한다. 단순히 `suppressHydrationWarning`으로 숨기는 방법은 우선하지 않는다.

## 검토했으나 결함으로 세지 않은 사항

- `lib/posts.ts:65`의 `(created_at DESC, id DESC)`와 `:72`의 lexicographic 조건, limit+1 조회, 마지막 **노출된 행**의 cursor 생성은 정상적인 keyset 구조다. DB 원본 timestamp를 문자열로 유지하므로 현재 코드 자체에서 마이크로초를 잘라 생기는 중복/누락은 발견하지 못했다. 위 M2는 이 쿼리와 별개인 클라이언트 상태 문제다.
- `Toolbar`는 `useEditorState`로 active 상태를 구독한다. 설치된 Tiptap 3.31.3의 `useEditor`가 transaction마다 부모를 다시 렌더링하지 않는 기본값이어도 Toolbar 상태는 갱신된다. `currentHref`도 다이얼로그를 여는 부모 state 변경 시 다시 계산된다. “툴바 상태가 전혀 갱신되지 않는다”는 지적은 하지 않는다. [Tiptap React 통합](https://tiptap.dev/docs/editor/getting-started/install/react)
- `immediatelyRender: false`, async params/searchParams, 루트 `proxy.ts`, Node 런타임 사용은 확인한 범위에서 Next 16 관례에 맞는다. 사용자별 데이터를 공유하는 `use cache` 사용도 발견하지 못했다.
- FeedList, PostEditor, Toolbar, 각 Dialog의 클라이언트 경계는 상태/브라우저 API 때문에 필요하다. PostRow 전체를 더 잘게 분리할 수는 있지만 이번 리뷰에서 기능 결함으로 세지 않았다.
- 현재 SQL의 member/anon 쓰기 권한 우회, service-role 사용은 발견하지 못했다. 다만 실제 원격 DB에 이 SQL과 같은 정책이 적용되어 있는지는 확인하지 않았다. Storage 객체 **접두사 검증**과 실제 객체 소유/글 참조 검증은 구분해야 한다(H4).
- `sanitizePostHtml`을 실제 호출했을 때의 기본 script/event-handler/javascript URL 차단은 테스트로 확인했다. 허용 목록을 뚫는 구체적인 XSS payload는 발견하지 못했으며, H2는 그 정화 함수를 **조회 경로에서 호출하지 않는 문제**다.
- 새 코드에서 그림자·blur·그라데이션·컴포넌트 내 hex·이모지 아이콘의 명확한 추가 위반은 찾지 못했다. 이미지/링크 카드는 일반적인 pill 규칙보다 구체적인 5.2의 16px 곡률 규정을 우선하여 평가했다.

---

## 조치 결과 (2026-09-23, Claude)

| 항목 | 조치 |
|---|---|
| H1 | `lib/og.ts`: DNS 조회로 모든 A/AAAA가 공개 주소인지 확인, 리다이렉트 수동 처리(최대 3회, 매 단계 재검증), IPv4-mapped IPv6 포함. `tests/og.test.mjs` 추가 |
| H2 | `lib/posts.ts` `toPost`에서 본문 sanitize, `link_url`/`link_image`는 http(s)만 통과 |
| H3 | 아직 어떤 DB에도 마이그레이션을 적용한 적이 없어 `0001_init.sql` 수정으로 확정. 첫 적용 이후부터는 후속 파일로만 변경 |
| H4 | `savePost`가 다른 글이 참조하는 이미지 경로를 거부. 삭제/수정 시 `removeUnreferenced`로 다른 글이 쓰지 않는 객체만 제거 |
| M1 | 실패 후 자동 재요청 중단, "다시 시도"에서만 재개 |
| M2 | 삭제 시 첫 페이지 리셋 대신 로컬 목록에서 제거. 세대(generation) 카운터로 오래된 응답 폐기 |
| M3 | 저장 중 `editor.setEditable(false)`, 업로드 핸들러도 pending 검사 |
| M4 | 세션 중 업로드 경로를 추적해 취소/저장 시 미사용 객체를 `discardUploads`로 정리 |
| M5 | 액션 입력을 unknown으로 받아 객체/UUID/timestamp 정규식/태그 원소 타입 검증 |
| M6 | 저장/삭제 await를 try/catch로 감싸 인라인 오류로 변환 |
| M7 | UPDATE/DELETE에 `.select("id")`로 영향 행 확인, 0행이면 오류 |
| M8 | 태그 헤더와 작성자 이름에 `min-w-0` + truncate |
| M9 | `splitImages`가 비허용 이미지를 세고, `savePost`가 명시적 오류 반환 |
| M10 | `/media` 응답 `Cache-Control: private, no-store` |
| L1 | params 이중 디코딩 제거 |
| L2 | 보류. 업로드 placeholder 노드는 후속 개선 |
| L3 | 태그 제거 버튼 32px + 칩 36px 높이 |
| L4 | pending 시 `pl-9`로 스피너 공간 확보 |
| L5 | 서버 렌더 시각을 `serverNow`로 전달해 같은 기준으로 계산 |
