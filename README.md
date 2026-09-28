<div align="center">
  <img src="app/icon.svg" alt="잇룸 아이콘" width="88" height="88" />

  <h1>잇룸 <sub>it room</sub></h1>

  <p>초대받은 사람만 들어와 IT 소식을 짧은 글로 올리고 함께 읽는 <strong>폐쇄형 SNS</strong></p>

  <p>
    <a href="https://itroom.vercel.app"><img alt="Live" src="https://img.shields.io/badge/live-itroom.vercel.app-111?style=flat-square" /></a>
    <img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-000?style=flat-square&logo=nextdotjs" />
    <img alt="React" src="https://img.shields.io/badge/React-19-20232a?style=flat-square&logo=react" />
    <img alt="Supabase" src="https://img.shields.io/badge/Supabase-Auth·Postgres·Storage-3ecf8e?style=flat-square&logo=supabase&logoColor=white" />
    <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind_CSS-4-06b6d4?style=flat-square&logo=tailwindcss&logoColor=white" />
    <img alt="pnpm" src="https://img.shields.io/badge/pnpm-11-f69220?style=flat-square&logo=pnpm&logoColor=white" />
  </p>
</div>

---

## 왜 만들었나

공개 SNS의 소음 없이, 아는 사람들끼리 IT 뉴스와 생각을 나누는 공간이 필요했습니다.
회원 관리는 최소화하고, 글 쓰는 경험은 편하게. 그래서 **가입 페이지가 없는** SNS를 만들었습니다.

- 소유자가 계정을 만들어 준 사람만 들어올 수 있습니다.
- 로그인하지 않으면 어떤 페이지도 보이지 않고, 검색엔진 색인도 막습니다.
- Threads 스타일의 단일 컬럼 타임라인에 짧은 글, 이미지, 링크 카드를 올립니다.

## 기능

| 영역 | 내용 |
| --- | --- |
| 인증 | 이메일 + 비밀번호 로그인, 초대 링크로 비밀번호 설정, 비밀번호 재설정. 공개 가입 없음 |
| 권한 | `owner` 1명과 `member`. 글 수정·삭제는 본인 글 또는 owner만. RLS가 최종 방어선 |
| 피드 | 커서 기반 무한 스크롤, 태그 필터, 라이트/다크 테마 |
| 글쓰기 | Tiptap 리치 텍스트 에디터, 이미지 업로드, URL 붙이면 링크 미리보기 카드 자동 생성 |
| 공유 | 글별 OG 이미지 생성, 비공개 Storage 이미지 프록시 |
| 반응형 | 360px 모바일부터 1440px 데스크톱까지 |

## 기술 스택

```
Next.js 16 (App Router, Server Actions) · React 19 · TypeScript
Supabase (Auth · Postgres RLS · Storage) · @supabase/ssr
Tailwind CSS 4 · shadcn/ui · lucide-react · sonner · next-themes · Pretendard
Tiptap 3 · sanitize-html · cheerio
Vercel (icn1) · pnpm
```

## 시작하기

```sh
pnpm install
cp .env.example .env.local   # Supabase URL, publishable key, 사이트 URL 입력
pnpm dev                     # http://localhost:3000
```

Supabase 프로젝트 준비, 이메일 인증 설정, 마이그레이션 적용은 [Supabase 설정 안내](docs/supabase-setup.md)를 따릅니다.
환경 변수가 없어도 빌드는 통과하고, 보호 경로는 `/login`으로 이동합니다.

| 명령 | 설명 |
| --- | --- |
| `pnpm dev` | 개발 서버 |
| `pnpm lint` | ESLint |
| `pnpm test` | `node --test` 단위 테스트 (권한, 콘텐츠 정제, OG, auth 설정) |
| `pnpm build` | 프로덕션 빌드 |
| `supabase db push` | 마이그레이션을 원격 DB에 적용 |
| `supabase config push` | `supabase/config.toml`의 Auth 설정 적용 |

## 프로젝트 구조

```
app/
  (auth)/          로그인 · 비밀번호 설정 · 재설정 · auth 콜백
  (app)/           보호 영역: 피드, 글쓰기, 글 상세·수정
  og/[id]/         글별 OG 이미지
  media/[...path]/ Storage 이미지 프록시
components/        ui · post · editor · auth · layout
lib/               auth, permissions, posts, tags, sanitize, og, upload, supabase 클라이언트
proxy.ts           세션 갱신과 비로그인 리다이렉트
supabase/          migrations · config.toml · 메일 템플릿
tests/             단위 테스트
docs/              기획서 · 디자인 시스템 · 브랜드 · 작업 브리프 · 리뷰
```

## 배포

`main` 브랜치에 푸시하면 Vercel이 자동으로 배포합니다. 함수 리전은 서울(`icn1`)입니다.
DB 스키마 변경은 `supabase/migrations/`에 새 파일을 추가하고 `supabase db push`로 적용합니다.

## 문서

- [기획서](docs/기획서.md) · [디자인 시스템](docs/design/디자인-시스템.md) · [브랜드 아이콘](docs/brand/README.md)
- [Supabase 설정 안내](docs/supabase-setup.md)

---

<p align="center"><sub>비공개 프로젝트입니다. 회원 가입은 소유자의 초대로만 이루어집니다.</sub></p>
