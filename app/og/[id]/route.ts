import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isEnvConfigured } from "@/lib/env";
import { UUID_RE } from "@/lib/posts";
import { safeHttpUrl } from "@/lib/sanitize";
import { fetchPreviewImage } from "@/lib/og";

// 링크 카드 썸네일을 서버가 대신 받아 넘긴다. 외부 사이트는 회원의 IP나 브라우저를 볼 수 없다.
// 글에 저장된 주소만 가져오므로 임의 URL을 대신 받아 주는 프록시가 되지 않는다.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!UUID_RE.test(id) || !isEnvConfigured())
    return new NextResponse(null, { status: 404 });
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse(null, { status: 401 });
  const { data } = await supabase
    .from("posts")
    .select("link_image")
    .eq("id", id)
    .maybeSingle();
  const source = safeHttpUrl(data?.link_image as string | null | undefined);
  const image = source ? await fetchPreviewImage(source) : null;
  if (!image) return new NextResponse(null, { status: 404 });
  return new NextResponse(new Uint8Array(image.body), {
    headers: {
      "Content-Type": image.contentType,
      "Cache-Control": "private, max-age=86400",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
