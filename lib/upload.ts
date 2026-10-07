import { createClient } from "@/lib/supabase/client";
import {
  encodeTargets,
  fitWithin,
  IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  MAX_SOURCE_BYTES,
} from "@/lib/media";

export class UploadError extends Error {}

function isOpaque(context: CanvasRenderingContext2D, width: number, height: number) {
  const { data } = context.getImageData(0, 0, width, height);
  for (let i = 3; i < data.length; i += 4) if (data[i] !== 255) return false;
  return true;
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * 정지 이미지는 크기와 상관없이 canvas로 다시 그려 인코딩한다.
 * 다시 그리면 EXIF(GPS 등) 메타데이터가 남지 않는다. GIF는 애니메이션을 지키려고 그대로 둔다.
 */
async function normalize(file: File): Promise<Blob> {
  if (file.type === "image/gif") return file;
  let bitmap: ImageBitmap;
  try {
    // EXIF 방향은 픽셀에 반영해 둔다. 메타데이터가 사라져도 사진이 눕지 않는다.
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new UploadError("이미지를 읽지 못했습니다.");
  }
  const canvas = document.createElement("canvas");
  try {
    const size = fitWithin(bitmap.width, bitmap.height);
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext("2d");
    if (!context) throw new UploadError("이미지를 변환하지 못했습니다.");
    context.imageSmoothingQuality = "high";
    context.drawImage(bitmap, 0, 0, size.width, size.height);
    bitmap.close();
    const opaque = file.type === "image/webp" && isOpaque(context, size.width, size.height);
    const targets = encodeTargets(file.type, opaque);
    for (const [index, target] of targets.entries()) {
      const blob = await toBlob(canvas, target.type, target.quality);
      if (!blob) continue;
      // 요청한 형식이 아니면 브라우저가 지원하지 않는 것이다. 마지막 후보는 실제 형식 그대로 받는다.
      if (blob.type === target.type || index === targets.length - 1) return blob;
    }
    throw new UploadError("이미지를 변환하지 못했습니다.");
  } finally {
    bitmap.close();
    // Safari는 canvas 메모리를 늦게 돌려준다. 크기를 0으로 줄여 바로 놓아준다.
    canvas.width = 0;
    canvas.height = 0;
  }
}

/** 이미지를 정리·축소해서 Storage에 올리고 객체 경로를 돌려준다. */
export async function uploadImage(file: File, userId: string): Promise<string> {
  if (!IMAGE_TYPES[file.type]) throw new UploadError("jpg, png, gif, webp 이미지만 올릴 수 있습니다.");
  if (file.type === "image/gif" && file.size > MAX_IMAGE_BYTES)
    throw new UploadError("GIF는 10MB 이하여야 합니다.");
  if (file.size > MAX_SOURCE_BYTES) throw new UploadError("이미지는 30MB 이하여야 합니다.");
  const blob = await normalize(file);
  // 확장자는 원본이 아니라 실제로 만들어진 형식을 따른다 (JPEG → WebP, Safari의 PNG 대체 등).
  const ext = IMAGE_TYPES[blob.type];
  if (!ext) throw new UploadError("이미지를 변환하지 못했습니다.");
  if (blob.size > MAX_IMAGE_BYTES) throw new UploadError("변환한 이미지가 10MB를 넘습니다.");
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const supabase = createClient();
  const { error } = await supabase.storage
    .from("post-images")
    .upload(path, blob, { contentType: blob.type, upsert: false });
  if (error) throw new UploadError("업로드에 실패했습니다. 잠시 후 다시 시도해주세요.");
  return path;
}
