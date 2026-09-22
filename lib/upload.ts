import { createClient } from "@/lib/supabase/client";
import { IMAGE_TYPES, MAX_IMAGE_BYTES, MAX_IMAGE_EDGE } from "@/lib/media";

export class UploadError extends Error {}

async function shrink(file: File): Promise<Blob> {
  if (file.type === "image/gif") return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height));
  if (scale === 1) {
    bitmap.close();
    return file;
  }
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const type = file.type === "image/png" ? "image/png" : file.type === "image/webp" ? "image/webp" : "image/jpeg";
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new UploadError("이미지를 변환하지 못했습니다."))),
      type,
      0.9,
    ),
  );
}

/** 이미지를 줄여서 Storage에 올리고 객체 경로를 돌려준다. */
export async function uploadImage(file: File, userId: string): Promise<string> {
  const ext = IMAGE_TYPES[file.type];
  if (!ext) throw new UploadError("jpg, png, gif, webp 이미지만 올릴 수 있습니다.");
  if (file.size > MAX_IMAGE_BYTES) throw new UploadError("이미지는 10MB 이하여야 합니다.");
  const blob = await shrink(file);
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const supabase = createClient();
  const { error } = await supabase.storage
    .from("post-images")
    .upload(path, blob, { contentType: blob.type || file.type, upsert: false });
  if (error) throw new UploadError("업로드에 실패했습니다. 잠시 후 다시 시도해주세요.");
  return path;
}
