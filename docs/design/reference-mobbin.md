# 디자인 참고: Mobbin 테마 (원문 요약)

> 사용자가 제공한 Mobbin 디자인 시스템 문서. 잇룸의 시각 언어는 이 문서를 기준으로 하되, 구조(레이아웃, 피드 흐름)는 Threads를 따른다.

## 핵심 원칙
- 엄격한 모노크롬: ink #141414 on canvas #ffffff. 색은 콘텐츠(이미지, 로고)만 가진다.
- 인터랙티브 요소는 전부 스타디움 필(rounded-full). 컨테이너 24px, 미디어 타일 16px, 앱 아이콘은 30% 스쿼클.
- 그림자 없음. 위계는 틴트 사다리(canvas-soft #f3f3f3, field #f0f0f0, hairline-soft #f0f0f0, hairline #e0e0e0)와 1px 헤어라인으로만.
- 단일 서체(Saans) 가변 굵기: 제목 652, 본문 456, 리드 300. 자간 0, 문장형 대소문자, 제목 끝 마침표.
- 악센트 블루 #0066ff는 한 페이지에 1~2개, 결정을 요구하는 신호에만. CTA에는 쓰지 않는다 (CTA는 ink 필).

## 색 토큰
| 토큰 | 값 | 용도 |
|---|---|---|
| primary / ink | #141414 | CTA 필, 푸터, 제목/본문 |
| accent | #0066ff | 상업 신호 전용 |
| canvas | #ffffff | 페이지/카드 배경 |
| canvas-soft | #f3f3f3 | 플로팅 nav 필, 강조 카드, 소프트 필 |
| field | #f0f0f0 | 입력창 채움 (테두리 없음) |
| hairline-soft | #f0f0f0 | 카드 1px 외곽선 |
| hairline | #e0e0e0 | 아웃라인 버튼 테두리 |
| ink-soft | #262626 | 보조 로고/락업 |
| text-muted | #707070 | 보조 문구 |
| text-faint | #adadad | 플레이스홀더, 각주 |

## 타이포 스케일
| 토큰 | 크기 | 굵기 | 행간 |
|---|---|---|---|
| display | 80 | 652 | 1.0 |
| heading-1 | 56 | 652 | 1.0 |
| heading-2 | 44 | 652 | 1.13 |
| heading-3 | 32 | 652 | 1.13 |
| heading-4 | 24 | 652 | 1.25 |
| title | 20 | 600 | 1.3 |
| body-lg | 20 | 300 | 1.38 |
| body | 16 | 456 | 1.38 |
| body-sm | 14 | 456 | 1.43 |
| link | 16 | 600 | 1.38 |
| label | 12 | 600 | 1.33 |
| caption | 12 | 456 | 1.33 |

## 간격
4 / 8 / 12 / 16 / 24 / 32 / 48 / 80 / 120. 버튼은 고정 높이 필 + 좌우 16px. 입력창은 12px 16px.

## 곡률
none 0 / sm 16 / md 24 / full 9999.

## 고도(elevation)
0 flat / 1 canvas-soft 채움 / 2 hairline-soft 1px 외곽선 / 3 inset ring / inverse ink 채움 + 흰 글자. 드롭섀도 없음 (세그먼트 컨트롤 활성 필만 예외).

## 컴포넌트 요약
- button-primary: ink 채움, 흰 라벨, 필.
- button-outline: 흰 채움, ink 라벨, hairline 1px, 필.
- button-pill-soft: canvas-soft 채움, 필, 테두리 없음.
- text-input: field 채움, 테두리 없음, 16px 곡률. 포커스 시 2px ink 링.
- nav-pill: 뷰포트에서 떨어진 중앙 정렬 플로팅 필, sticky. 모바일은 로고 + CTA만.
- badge-overlay: rgba(115,115,115,0.56) 반투명 필, 흰 12px 라벨.
- segmented-control: canvas-soft 트랙 + 흰 활성 필.
- footer: ink 전폭 밴드, 상단 24px 곡률.

## Do / Don't
- Do: 캔버스는 흰색, 인터랙티브는 전부 필, 강조는 틴트로, 악센트는 최소로, 제목 652 + 리드 300 대비.
- Don't: 그림자, 악센트 CTA, 추가 색상/그라데이션, 자간/대문자, 입력창 테두리, 작은 크기에서 필 각지게.

## 서체 대체
Saans는 상용. Inter Variable 또는 Hanken Grotesk로 대체 시 652→650, 456→450 매핑. 한글은 Pretendard Variable이 같은 가변 굵기 축을 지원한다.
