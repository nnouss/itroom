import { ShieldCheck } from "lucide-react";
import { Card } from "@/components/layout/card";
import { AvatarMark } from "@/components/ui/avatar-mark";
import { DisplayNameForm } from "@/components/account/display-name-form";
import { DeleteAccountSection } from "@/components/account/delete-account-section";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/** 내 정보: 닉네임 변경과 회원 탈퇴. 계정 정보는 본인에게만 보인다. */
export default async function AccountPage() {
  const { user, profile } = await requireUser();
  const owner = profile.role === "owner";
  let postCount = 0;
  if (!owner) {
    const supabase = await createClient();
    const { count } = await supabase
      .from("posts")
      .select("id", { count: "exact", head: true })
      .eq("author_id", user.id);
    postCount = count ?? 0;
  }
  return (
    <>
      <h1 className="sr-only">내 정보</h1>

      <Card className="flex items-center gap-4 px-4 py-5 md:px-6">
        <AvatarMark name={profile.displayName} size={40} className="size-14 text-xl" />
        <div className="min-w-0">
          <p className="type-heading truncate text-[20px]">{profile.displayName}</p>
          <p className="type-body-sm mt-0.5 truncate text-text-muted">
            {owner ? "소유자" : "회원"}
            {user.email && <span className="text-text-faint"> · {user.email}</span>}
          </p>
        </div>
      </Card>

      <Card>
        <DisplayNameForm key={profile.displayName} current={profile.displayName} />
      </Card>

      <Card>
        {owner ? (
          <div className="flex items-start gap-3 px-4 py-5 md:px-6">
            <ShieldCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-text-muted" />
            <div>
              <h2 className="type-title text-[17px]">회원 탈퇴</h2>
              <p className="type-body-sm mt-1 text-text-muted">
                소유자 계정은 탈퇴할 수 없습니다. 운영을 넘기거나 계정을 정리하려면 Supabase 대시보드에서 진행하세요.
              </p>
            </div>
          </div>
        ) : (
          <DeleteAccountSection postCount={postCount} />
        )}
      </Card>
    </>
  );
}
