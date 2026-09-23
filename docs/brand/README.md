# 잇룸 사이트 아이콘

기존 노을 그라데이션 타일 위에 흰색 소문자 ‘i’ 하나를 배치했다. 오른쪽으로 14도 기울인 줄기 아래를 펜촉처럼 좁혀 IT 소식과 생각을 쓰는 공간을 표현한다. 전경은 원 하나와 path 하나뿐이며, 글꼴 텍스트·그림자·외곽선·추가 장식은 사용하지 않는다.

## 색과 형태

- 하늘: 기존 아바타의 `#6c4bb8`, `#d9598f`, `#f47f5b`, `#ffc27a`. 로그인 하늘처럼 위 보라 → 아래 금빛 순서로 재배치했다. 아바타의 140deg 방향을 그대로 복제하지 않고 아래쪽으로 약간 기울어진 그라데이션을 사용한다.
- 전경: `#ffffff`. 64×64 좌표계에서 점은 반경 5, 줄기는 폭 10이며 점과 줄기 사이 간격은 5다. 회전 전 전체 높이는 37(타일의 약 58%)이며, 중심 (32,32)을 기준으로 14도 회전한다. 줄기 아래 6만 삼각형으로 좁혀 16px에서도 본체 두께와 점 사이 간격을 유지한다.
- 일반 아이콘: 64×64 좌표계, 모서리 반경 14인 타일. 배경색 면이 있어 밝고 어두운 탭 모두에서 윤곽이 남는다.
- Apple: 모서리 라운드와 투명 채널이 없는 꽉 찬 사각형. OS가 모서리를 처리한다.
- Maskable: 불투명 사각 배경을 가장자리까지 채우고 ‘i’의 크기와 위치를 유지한다. 전경의 중심 (32,32)으로부터 최대 거리는 19이므로 중앙 지름 80% 안전 원(반경 25.6) 안에 전체 마크가 들어간다. OS 마스크는 바깥 배경만 자른다.
- Manifest: 밝은 앱 캔버스 `#ffffff`를 시작 배경으로, 어두운 앱 캔버스 `#161616`을 테마색으로 사용한다.

## 파일

| 경로 | 역할 |
| --- | --- |
| `app/icon.svg` | 편집 가능한 벡터 원본, 모던 브라우저 파비콘 |
| `app/favicon.ico` | 16/32/48px BGRA DIB 프레임과 AND 마스크를 포함하는 ICO |
| `app/apple-icon.png` | 180×180 RGB 아이콘 |
| `proxy.ts` | `/manifest.webmanifest`만 인증 프록시 매칭에서 제외 |
| `app/manifest.ts` | 이름·설명·시작 URL·standalone 및 아이콘 선언 |
| `public/icons/icon-192.png` | 192×192 일반 앱 아이콘 |
| `public/icons/icon-512.png` | 512×512 일반 앱 아이콘 |
| `public/icons/maskable-512.png` | 512×512 RGB maskable 아이콘 |
| `docs/brand/icon-preview.png` | 라이트/다크 배경의 16/32/48/180/512px 실제 크기 비교. 180px은 Apple 버전 |
| `docs/brand/generate-icons.mjs` | SVG에서 모든 래스터 산출물과 미리보기를 재생성하는 스크립트 |

Next.js 파일 기반 메타데이터 규칙으로 icon, apple-touch-icon, manifest 링크가 자동 추가된다. 기존 레이아웃이나 헤더에 별도 선언하지 않는다.

## 다시 만들기

프로젝트 루트에서, 프로젝트 의존성이 설치된 상태로 실행한다.

```sh
node docs/brand/generate-icons.mjs
pnpm lint
pnpm build
```

Node.js와 Next.js에 이미 설치된 `sharp`를 사용한다(제작 당시 Node 24.15.0, sharp 0.35.4). 패키지 추가나 package.json/lockfile 수정은 필요 없다. `app/icon.svg`를 고친 후 명령을 다시 실행하면 PNG, ICO, 미리보기가 함께 갱신된다. Apple/maskable은 생성 스크립트에서 타일 라운드를 제거한다. ‘i’의 도형과 회전, 안전 영역 배치는 SVG 원본에 정의되어 있다.

기존 개발 서버에서 확인:

```sh
curl -I http://localhost:3000/icon.svg
curl -I http://localhost:3000/favicon.ico
curl -I http://localhost:3000/apple-icon.png
curl -I http://localhost:3000/manifest.webmanifest
curl -s http://localhost:3000/login
```

마지막 HTML의 `<head>`에서 `rel="icon"`, `rel="apple-touch-icon"`, `rel="manifest"` 링크를 확인한다.

## 검증 메모

`pnpm lint` 통과. 이 실행 환경에서는 기본 `pnpm build`가 Turbopack 내부 포트 생성 권한 오류(`Operation not permitted`)로 실패하여, 공식 대체 옵션인 `pnpm build --webpack`으로 빌드를 검증했다. 기존 설정 파일은 변경하지 않았다.

기존 localhost:3000 서버에서 SVG, ICO, Apple PNG, manifest와 3개 앱 PNG가 모두 HTTP 200을 반환한다. `/login`의 head에 icon/Apple/manifest 링크가 있다. manifest만 정확한 경로로 인증 검사에서 제외했으며, 비로그인 `/` 및 `/manifest.webmanifest-private`는 계속 302를 반환한다.
