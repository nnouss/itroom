import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isEnvConfigured } from "@/lib/env";
export const getCurrentUser = cache(async () => {
  if (!isEnvConfigured()) return null;
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, display_name, role")
    .eq("id", user.id)
    .single();
  if (profileError || !profile || !["owner", "member"].includes(profile.role))
    throw new Error(
      "프로필을 확인하지 못했습니다. DB 마이그레이션과 프로필 설정을 확인해주세요.",
    );
  return {
    user,
    profile: {
      id: profile.id as string,
      displayName: (profile.display_name as string | null)?.trim() || "회원",
      role: profile.role as "owner" | "member",
    },
  };
});
export async function requireUser() {
  const current = await getCurrentUser();
  if (!current) redirect("/login");
  return current;
}
export async function isOwner() {
  return (await getCurrentUser())?.profile.role === "owner";
}
