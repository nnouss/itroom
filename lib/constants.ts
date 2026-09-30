export const SITE_NAME = "잇룸";
/** 피드 한 번에 불러오는 글 수. 로컬 검증 시 NEXT_PUBLIC_FEED_PAGE_SIZE=3 으로 낮춰 확인한다. */
export const FEED_PAGE_SIZE = Math.max(1, Number(process.env.NEXT_PUBLIC_FEED_PAGE_SIZE) || 10);
/** 피드 본문이 이 높이를 넘을 때만 접는다 (px). */
export const POST_COLLAPSE_THRESHOLD = 720;
/** 접힌 피드 본문에서 보이는 높이 (px). */
export const POST_COLLAPSED_HEIGHT = 480;
