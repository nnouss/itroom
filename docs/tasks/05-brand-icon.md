# 작업 05: 잇룸 사이트 아이콘(파비콘) 제작과 적용

## 너의 역할
디자인과 구현을 맡는다. 끝나면 Claude(계획 pane)가 검증한다.

## 절대 규칙
- **git commit / git push 하지 마.** 사용자가 로컬 테스트 후 직접 결정한다.
- 작업 트리에 이미 **커밋 안 된 다른 변경(헤더, 에디터, 카드 등)이 많다.** 그 파일들은 읽기만 하고 수정하지 마. 이번 작업에 필요한 파일만 만들거나 바꾼다.
- 런타임 의존성 추가 금지. PNG/ICO 변환에 도구가 필요하면 일회성(`pnpm dlx`, npx, 시스템 도구 `sips`, `ffmpeg` 등)으로 쓰고 package.json은 건드리지 마.
- 로컬 개발 서버가 이미 http://localhost:3000 에서 돌고 있다. 새로 띄우지 말고 그걸로 확인해.

## 먼저 읽을 것
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/app-icons.md`
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/manifest.md`
- `app/layout.tsx`, `app/globals.css` (색 토큰, `.avatar-sunset` 그라데이션)
- `lib/sky-fluid.ts` 의 `sky()` 함수 색 (로그인 배경)

## 브랜드 맥락
- 서비스명: **잇룸** (IT + room). 초대받은 사람만 들어오는 폐쇄형 IT 소식 SNS.
- 로그인 화면: 노을 지는 저녁 하늘(위 남보라 → 보라 → 분홍 → 주황 → 지평선 금빛)과 어두운 산 능선 실루엣이 유체처럼 섞이는 배경.
- 앱 안: 모노크롬(흑백) UI에 **노을 그라데이션**(`#ffc27a → #f47f5b → #d9598f → #6c4bb8`, 140deg)이 유일한 색 포인트. 아바타가 이 그라데이션을 쓴다.
- 헤더 로고는 "잇룸" 글씨만 있다 (로고 타일은 사용자가 뺐다). 그러니 아이콘은 헤더와 별개로 브라우저 탭, 홈 화면, 북마크용이다.

## 디자인 요구
- 로그인 화면의 노을 하늘과 이어지는 **고유한 마크**. 예: 노을 그라데이션 둥근 사각형 안의 지평선·해·능선 같은 단순한 기하 형태, 또는 "잇" 글자를 다듬은 모노그램. 둘 중 더 좋은 쪽을 네가 고르고 이유를 짧게 적어.
- **16px 탭 아이콘에서도 알아볼 수 있어야 한다.** 가는 선, 작은 디테일, 긴 글자 금지.
- 라이트/다크 브라우저 탭 모두에서 보여야 한다 (배경이 있는 타일 형태 권장).
- 흔한 AI 느낌(보라 그라데이션 원 + 반짝이) 피할 것.

## 산출물 (Next.js 16 App Router 파일 규칙)
1. `app/icon.svg` : 벡터 원본 겸 모던 브라우저 파비콘.
2. `app/favicon.ico` : 기존 Next 기본 파비콘을 **교체**. 16/32/48 크기 포함.
3. `app/apple-icon.png` : 180×180, 투명 없음, 모서리 라운드는 OS가 하므로 꽉 찬 사각 배경.
4. `app/manifest.ts` : name "잇룸", short_name "잇룸", description, start_url "/", display "standalone", background_color / theme_color는 앱 톤에 맞게, icons에 192·512 PNG와 maskable 512 PNG.
5. `public/icons/icon-192.png`, `public/icons/icon-512.png`, `public/icons/maskable-512.png` (maskable은 안전 영역 80% 안에 마크).
6. 미리보기: `docs/brand/icon-preview.png` 한 장에 16, 32, 48, 180, 512 크기를 라이트 배경과 다크 배경 위에 나란히.
7. `docs/brand/README.md` : 마크 설명, 색, 파일 목록, 다시 만드는 방법(사용한 명령).
- `public/` 에 있는 Next 기본 예제 SVG(file, globe, next, vercel, window)는 코드에서 쓰이지 않으면 삭제해도 된다. 쓰이는지 grep 으로 먼저 확인.

## 확인
- `pnpm lint`, `pnpm build` 에러 0.
- 로컬 서버에서 `/icon.svg`, `/favicon.ico`, `/apple-icon.png`, `/manifest.webmanifest` 가 200으로 응답하는지.
- `/login` HTML `<head>`에 icon, apple-touch-icon, manifest 링크가 들어갔는지.

## 보고 (채팅에 짧게)
1. 고른 마크 방향과 이유 (2~3문장)
2. 만든/바꾼/지운 파일 목록
3. lint/build 결과, 각 URL 응답 코드
4. 규칙에서 벗어난 점이 있으면 무엇과 이유
