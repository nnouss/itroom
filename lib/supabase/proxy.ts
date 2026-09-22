import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getEnv, isEnvConfigured } from "@/lib/env";
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  response.headers.set("Cache-Control", "private, no-store");
  if (!isEnvConfigured()) return { response, user: null };
  const env = getEnv();
  const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        const previous = response;
        response = NextResponse.next({ request });
        previous.cookies
          .getAll()
          .forEach((cookie) => response.cookies.set(cookie));
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        Object.entries(headers ?? {}).forEach(([name, value]) =>
          response.headers.set(name, value),
        );
        response.headers.set("Cache-Control", "private, no-store");
      },
    },
  });
  // Validate with the Auth server, never trust a cookie's unverified session.
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    return { response, user: error ? null : user };
  } catch {
    return { response, user: null };
  }
}
