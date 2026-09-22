import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/auth-redirect";
const otpTypes = new Set<string>([
  "invite",
  "recovery",
  "signup",
  "email",
  "email_change",
  "magiclink",
]);
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const type = params.get("type");
  const code = params.get("code");
  const tokenHash = params.get("token_hash");
  let destination = "/auth/error";
  try {
    const supabase = await createClient();
    const result = code
      ? await supabase.auth.exchangeCodeForSession(code)
      : tokenHash && type && otpTypes.has(type)
        ? await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as EmailOtpType,
          })
        : null;
    if (result && !result.error && result.data.user) {
      destination =
        type === "invite"
          ? "/set-password"
          : type === "recovery"
            ? "/reset-password"
            : safeNextPath(params.get("next"));
    }
  } catch {
    /* Missing env, expired token, or Auth outage: show the safe error page. */
  }
  const response = NextResponse.redirect(
    new URL(destination, request.url),
    302,
  );
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
