"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isReservedDisplayName, normalizeDisplayName } from "@/lib/profile";

export type AccountState = { error?: string; success?: string; name?: string };
export type NameAvailability = "available" | "same" | "taken" | "reserved" | "invalid";

const field = (data: FormData, key: string) =>
  typeof data.get(key) === "string" ? (data.get(key) as string) : "";

/**
 * 입력 중인 닉네임을 쓸 수 있는지 미리 확인한다. 화면 안내용이며 최종 판단은 저장 시 DB가 한다.
 * 회원 목록은 원래 모든 회원이 볼 수 있으므로(profiles_select) 중복 여부를 알려 줘도 새로 드러나는 정보는 없다.
 */
export async function checkDisplayName(value: unknown): Promise<NameAvailability> {
  const { user, profile } = await requireUser();
  const result = normalizeDisplayName(value);
  if ("error" in result) return "invalid";
  if (result.name === profile.displayName) return "same";
  if (profile.role !== "owner" && isReservedDisplayName(result.name)) return "reserved";
  const supabase = await createClient();
  // ilike는 와일드카드가 없으면 대소문자만 무시한 일치 비교다. %, _, \는 이스케이프한다.
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .ilike("display_name", result.name.replace(/[\\%_]/g, "\\$&"))
    .neq("id", user.id)
    .limit(1);
  if (error) return "invalid";
  return data && data.length > 0 ? "taken" : "available";
}

export async function updateDisplayName(_previous: AccountState, formData: FormData): Promise<AccountState> {
  const { user, profile } = await requireUser();
  const result = normalizeDisplayName(field(formData, "displayName"));
  if ("error" in result) return { error: result.error };
  if (result.name === profile.displayName) return { name: result.name };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({ display_name: result.name })
    .eq("id", user.id)
    .select("display_name");
  // 23505: 유니크 인덱스(다른 회원과 중복), 23514: 금지어·owner 이름(guard_display_name)
  if (error?.code === "23505") return { error: "이미 다른 회원이 쓰고 있는 닉네임이에요." };
  if (error?.code === "23514") return { error: "운영용 이름이라 쓸 수 없어요." };
  if (error || !data || data.length === 0)
    return { error: "닉네임을 바꾸지 못했어요. 잠시 후 다시 시도해 주세요." };
  revalidatePath("/", "layout");
  return { success: "닉네임을 바꿨어요.", name: result.name };
}

const IMAGE_BUCKET = "post-images";
const LIST_LIMIT = 1000;

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** 내 폴더(`<uid>/`)의 이미지를 모두 지운다. 목록은 한 번에 최대 1000개라 빌 때까지 반복한다. */
async function removeOwnImages(supabase: Supabase, userId: string): Promise<boolean> {
  // 지운 만큼 목록이 줄어들므로 offset 없이 처음부터 다시 읽는다. 무한 반복을 막기 위해 횟수를 제한한다.
  for (let round = 0; round < 50; round++) {
    const { data, error } = await supabase.storage.from(IMAGE_BUCKET).list(userId, { limit: LIST_LIMIT });
    if (error) return false;
    const paths = (data ?? []).filter((item) => item.id).map((item) => `${userId}/${item.name}`);
    if (paths.length === 0) return true;
    const { error: removeError } = await supabase.storage.from(IMAGE_BUCKET).remove(paths);
    if (removeError) return false;
  }
  return false;
}

export async function deleteAccount(_previous: AccountState, formData: FormData): Promise<AccountState> {
  const { user, profile } = await requireUser();
  if (profile.role === "owner") return { error: "소유자 계정은 탈퇴할 수 없습니다." };
  const password = field(formData, "password");
  if (!password) return { error: "비밀번호를 입력해주세요." };
  if (!user.email) return { error: "계정 정보를 확인하지 못했습니다." };

  const supabase = await createClient();
  // 세션만으로는 탈퇴할 수 없게 비밀번호를 다시 확인한다.
  const { data: verified, error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password,
  });
  if (signInError || verified.user?.id !== user.id) return { error: "비밀번호가 올바르지 않습니다." };

  // 이미지는 SQL로 지울 수 없어 계정보다 먼저 지운다. 실패하면 계정은 그대로 두고 다시 시도하게 한다.
  if (!(await removeOwnImages(supabase, user.id)))
    return { error: "이미지를 정리하지 못했습니다. 잠시 후 다시 시도해주세요." };

  // auth.users 삭제 → profiles → posts가 cascade로 함께 지워진다.
  const { error } = await supabase.rpc("delete_my_account");
  if (error) return { error: "탈퇴하지 못했습니다. 잠시 후 다시 시도해주세요." };

  // 계정이 사라졌으므로 서버 쪽 로그아웃은 실패할 수 있다. 실패해도 세션 쿠키는 직접 지운다.
  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    /* 아래에서 쿠키를 지운다 */
  }
  const cookieStore = await cookies();
  for (const { name } of cookieStore.getAll()) if (name.startsWith("sb-")) cookieStore.delete(name);
  revalidatePath("/", "layout");
  redirect("/login?deleted=1");
}
