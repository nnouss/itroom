import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";
const publicPaths = new Set([
  "/login",
  "/auth/callback",
  "/set-password",
  "/reset-password",
  "/auth/error",
]);
export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const path = request.nextUrl.pathname;
  const target =
    !user && !publicPaths.has(path)
      ? "/login"
      : user && path === "/login"
        ? "/"
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
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff|woff2|ttf|otf|eot)$).*)",
  ],
};
