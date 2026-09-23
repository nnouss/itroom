"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

/** 메일 링크 유효 시간과 같다 (config.toml `otp_expiry`). */
const LINK_MAX_AGE_SECONDS = 3600;

type Claims = { sub?: string; amr?: { method?: string; timestamp?: number }[] };

function readClaims(token: string): Claims | null {
  try {
    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, "="))) as Claims;
  } catch {
    return null;
  }
}

/** 메일 링크 검증으로 막 발급된 토큰인지 본다. 비밀번호 로그인으로 얻은 토큰은 amr이 password다. */
function isFreshEmailLinkToken(claims: Claims): boolean {
  const now = Date.now() / 1000;
  return (claims.amr ?? []).some(
    (entry) =>
      entry.method === "otp" &&
      typeof entry.timestamp === "number" &&
      now - entry.timestamp <= LINK_MAX_AGE_SECONDS,
  );
}

/**
 * Supabase 기본 메일 템플릿(초대, 재설정)은 검증 후 `#access_token=...&type=invite` 형태의
 * 해시로 돌아온다. 서버는 해시를 볼 수 없으므로 여기서 세션을 쿠키에 심고 다음 화면으로 보낸다.
 *
 * 해시는 누구나 만들어 보낼 수 있다. 다른 회원이 자기 토큰을 담은 링크로 로그인된 사람의 세션을
 * 바꿔치기하지 못하도록, 메일 링크로 막 발급된 토큰만 받고 이미 다른 계정으로 로그인돼 있으면 거절한다.
 */
export function AuthHashHandler() {
  const router = useRouter();
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    const params = new URLSearchParams(hash);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const type = params.get("type");
    const clear = () => history.replaceState(null, "", window.location.pathname + window.location.search);
    if (params.get("error") || params.get("error_code")) {
      clear();
      router.replace("/auth/error");
      return;
    }
    if (!accessToken || !refreshToken) return;
    const claims = readClaims(accessToken);
    if ((type !== "invite" && type !== "recovery") || !claims?.sub || !isFreshEmailLinkToken(claims)) {
      clear();
      router.replace("/auth/error");
      return;
    }
    let cancelled = false;
    const supabase = createClient();
    (async () => {
      // 해시의 JWT는 서명 검증 전 값이다. Auth 서버에 먼저 확인받아 서명·만료가 유효한 토큰만 믿는다.
      const { data: verified, error: verifyError } = await supabase.auth.getUser(accessToken);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      // 개발 모드에서 effect가 두 번 돌 때 먼저 취소된 쪽이 해시를 지우지 않게 여기서 지운다.
      if (cancelled) return;
      clear();
      if (verifyError || verified.user?.id !== claims.sub) {
        router.replace("/auth/error");
        return;
      }
      if (session && session.user.id !== claims.sub) {
        toast.error("이미 다른 계정으로 로그인되어 있습니다. 로그아웃한 뒤 메일의 링크를 다시 열어주세요.");
        return;
      }
      const { data, error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
      if (cancelled) return;
      // refresh token이 다른 사용자 것이면 확인한 사용자와 달라진다. 그런 세션은 버린다.
      if (error || data.user?.id !== claims.sub) {
        if (!error) await supabase.auth.signOut({ scope: "local" });
        router.replace("/auth/error");
        return;
      }
      router.replace(type === "invite" ? "/set-password" : "/reset-password");
      router.refresh();
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);
  return null;
}
