"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Supabase 기본 메일 템플릿(초대, 재설정)은 검증 후 `#access_token=...&type=invite` 형태의
 * 해시로 돌아온다. 서버는 해시를 볼 수 없으므로 여기서 세션을 쿠키에 심고 다음 화면으로 보낸다.
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
    let cancelled = false;
    createClient()
      .auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error }) => {
        if (cancelled) return;
        clear();
        if (error) {
          router.replace("/auth/error");
          return;
        }
        router.replace(type === "invite" ? "/set-password" : type === "recovery" ? "/reset-password" : "/");
        router.refresh();
      });
    return () => {
      cancelled = true;
    };
  }, [router]);
  return null;
}
