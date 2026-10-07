export const MEDIA_PREFIX = "/media/";
export const OBJECT_PATH_RE =
  /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|jpeg|png|gif|webp)$/i;
export const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
};
/** 업로드 결과(버킷 file_size_limit과 같다). GIF는 변환하지 않으므로 원본에 적용된다. */
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
/** 변환 전 원본. 큰 사진도 줄여서 올릴 수 있게 결과 상한보다 넉넉히 둔다. */
export const MAX_SOURCE_BYTES = 30 * 1024 * 1024;
export const MAX_IMAGE_EDGE = 1600;

export type EncodeTarget = { type: string; quality?: number };

/**
 * 정지 이미지를 다시 인코딩할 형식 후보. 앞에서부터 시도하고, 브라우저가 그 형식을 만들지 못하면
 * (Safari는 canvas에서 WebP를 만들지 못하고 PNG를 돌려준다) 다음 후보로 넘어간다. 마지막 후보는 항상 받는다.
 * 사진(JPEG)만 WebP로 바꾸고, PNG는 글자 선명도와 투명도를 위해 PNG로 둔다.
 * WebP 원본은 투명하지 않으면 PNG 대신 JPEG로 받는다 (PNG로 받으면 원본보다 몇 배 커진다).
 */
export function encodeTargets(sourceType: string, opaque = false): EncodeTarget[] {
  const jpeg = { type: "image/jpeg", quality: 0.85 };
  if (sourceType === "image/jpeg") return [{ type: "image/webp", quality: 0.8 }, jpeg];
  if (sourceType === "image/webp")
    return [{ type: "image/webp", quality: 0.85 }, ...(opaque ? [jpeg] : []), { type: "image/png" }];
  return [{ type: "image/png" }];
}

/** 긴 변이 maxEdge를 넘지 않게 줄인 크기. 확대는 하지 않는다. */
export function fitWithin(width: number, height: number, maxEdge = MAX_IMAGE_EDGE) {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export function mediaUrl(path: string) {
  return MEDIA_PREFIX + path.split("/").map(encodeURIComponent).join("/");
}

/** `/media/<path>` 형태의 URL에서 Storage 객체 경로를 꺼낸다. 아니면 null. */
export function pathFromMediaUrl(src: string): string | null {
  if (!src.startsWith(MEDIA_PREFIX)) return null;
  try {
    const path = src
      .slice(MEDIA_PREFIX.length)
      .split("/")
      .map(decodeURIComponent)
      .join("/");
    return OBJECT_PATH_RE.test(path) ? path : null;
  } catch {
    return null;
  }
}
