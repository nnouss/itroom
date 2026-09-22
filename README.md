# 잇룸

초대형 IT 소식 커뮤니티입니다. Supabase 인증과 라우트 보호를 연결했으며, 피드는 아직 목 데이터를 사용합니다.

```sh
pnpm install
pnpm dev
pnpm lint
pnpm build
node --test tests/auth-config.test.mjs
```

[Supabase 설정 안내](docs/supabase-setup.md)에 따라 프로젝트를 준비하고 `.env.example`을 `.env.local`로 복사해 값을 채웁니다. 환경 변수 없이도 빌드는 통과하며, 보호 경로는 `/login`으로 이동합니다.

피드: http://localhost:3000 · 로그인: http://localhost:3000/login

실제 글 작성·수정·삭제와 태그 필터는 후속 작업에서 연결합니다.
