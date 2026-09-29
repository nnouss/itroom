import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";
import { safeNextPath } from "@/lib/auth-redirect";
const publicPaths = new Set([
  "/login",
  "/auth/callback",
  "/set-password",
  "/reset-password",
  "/auth/error",
]);
/** 로그인 화면 주소. 공유받은 글 링크처럼 가려던 화면이 있으면 로그인 뒤 그리로 보내도록 next에 담는다. */
function loginUrl(request: NextRequest): string {
  const { pathname, search } = request.nextUrl;
  // 피드(/)는 기본 도착지이고, 이미지·썸네일 요청은 화면이 아니므로 담지 않는다.
  if (request.method !== "GET" || pathname === "/" || /^\/(media|og)\//.test(pathname)) return "/login";
  return `/login?next=${encodeURIComponent(pathname + search)}`;
}

export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const path = request.nextUrl.pathname;
  const target =
    !user && !publicPaths.has(path)
      ? loginUrl(request)
      : user && path === "/login"
        ? safeNextPath(request.nextUrl.searchParams.get("next"))
        : null;
  if (!target) return response;
  const redirect = NextResponse.redirect(new URL(target, request.url), 302);
  response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  for (const header of ["cache-control", "expires", "pragma"]) {
    const value = response.headers.get(header);
    if (value) redirect.headers.set(header, value);
  }
  return redirect;
}
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest\\.webmanifest$|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff|woff2|ttf|otf|eot)$).*)",
  ],
};
