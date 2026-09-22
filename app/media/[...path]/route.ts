import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isEnvConfigured } from "@/lib/env";
import { OBJECT_PATH_RE } from "@/lib/media";

// private 버킷의 이미지를 세션 확인 후 1시간짜리 signed URL로 넘겨준다.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const objectPath = path.map(decodeURIComponent).join("/");
  if (!OBJECT_PATH_RE.test(objectPath) || !isEnvConfigured())
    return new NextResponse(null, { status: 404 });
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse(null, { status: 401 });
  const { data, error } = await supabase.storage
    .from("post-images")
    .createSignedUrl(objectPath, 3600);
  if (error || !data) return new NextResponse(null, { status: 404 });
  return NextResponse.redirect(data.signedUrl, {
    status: 302,
    headers: { "Cache-Control": "private, max-age=3000" },
  });
}
