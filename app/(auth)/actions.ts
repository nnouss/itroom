"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ENV_MISSING_MESSAGE, getEnv, isEnvConfigured } from "@/lib/env";
export type AuthState = { error?: string; success?: string };
const field = (data: FormData, key: string) =>
  typeof data.get(key) === "string" ? (data.get(key) as string) : "";
const validEmail = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
export async function signIn(formData: FormData): Promise<AuthState> {
  if (!isEnvConfigured()) return { error: ENV_MISSING_MESSAGE };
  const email = field(formData, "email").trim();
  const password = field(formData, "password");
  if (!validEmail(email) || !password)
    return { error: "이메일과 비밀번호를 입력해주세요." };
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) return { error: "이메일 또는 비밀번호가 올바르지 않습니다." };
  } catch {
    return { error: "로그인에 실패했습니다. 잠시 후 다시 시도해주세요." };
  }
  revalidatePath("/", "layout");
  redirect("/");
}
export async function signOut(): Promise<void> {
  if (isEnvConfigured()) {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();
    if (error)
      throw new Error("로그아웃하지 못했습니다. 잠시 후 다시 시도해주세요.");
  }
  revalidatePath("/", "layout");
  redirect("/login");
}
export async function requestPasswordReset(
  formData: FormData,
): Promise<AuthState> {
  if (!isEnvConfigured()) return { error: ENV_MISSING_MESSAGE };
  const email = field(formData, "email").trim();
  if (!validEmail(email))
    return { error: "올바른 이메일 주소를 입력해주세요." };
  try {
    const supabase = await createClient();
    // Never expose account existence through Auth error messages.
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${getEnv().siteUrl}/auth/callback?next=/reset-password`,
    });
  } catch {
    return { error: "메일 요청에 실패했습니다. 잠시 후 다시 시도해주세요." };
  }
  return { success: "메일을 보냈습니다. 받은 편지함을 확인하세요." };
}
export async function updatePassword(formData: FormData): Promise<AuthState> {
  if (!isEnvConfigured()) return { error: ENV_MISSING_MESSAGE };
  const password = field(formData, "password");
  if (password.length < 8)
    return { error: "비밀번호는 8자 이상 입력해주세요." };
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user)
      return {
        error:
          "링크가 만료되었거나 잘못되었습니다. 메일에서 링크를 다시 열어주세요.",
      };
    const { error } = await supabase.auth.updateUser({ password });
    // secure_password_change: 로그인한 지 24시간이 넘은 세션은 재인증 없이 비밀번호를 바꿀 수 없다.
    if (error?.code === "reauthentication_needed")
      return {
        error:
          "보안을 위해 로그인 화면에서 비밀번호 재설정 메일을 받아 다시 진행해주세요.",
      };
    if (error)
      return {
        error:
          "비밀번호를 변경하지 못했습니다. 다른 비밀번호로 다시 시도해주세요.",
      };
  } catch {
    return {
      error: "비밀번호 변경에 실패했습니다. 잠시 후 다시 시도해주세요.",
    };
  }
  revalidatePath("/", "layout");
  redirect("/");
}
