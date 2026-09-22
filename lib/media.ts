export const MEDIA_PREFIX = "/media/";
export const OBJECT_PATH_RE =
  /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|jpeg|png|gif|webp)$/i;
export const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
};
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_IMAGE_EDGE = 2000;

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
