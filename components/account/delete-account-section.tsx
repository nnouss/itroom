"use client";
import { useActionState, useState } from "react";
import { CircleAlert, Eye, EyeOff, Loader2 } from "lucide-react";
import { deleteAccount, type AccountState } from "@/app/(app)/account/actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** 회원 탈퇴: 비밀번호를 다시 받아 계정, 내가 쓴 소식, 올린 이미지를 영구 삭제한다. */
export function DeleteAccountSection({ postCount }: { postCount: number }) {
  const [open, setOpen] = useState(false);
  // 다이얼로그를 열 때마다 폼 상태(오류, 입력값)를 새로 시작한다.
  const [session, setSession] = useState(0);
  const summary =
    postCount > 0
      ? `내가 쓴 소식 ${postCount.toLocaleString("ko-KR")}개와 올린 이미지가 모두 영구 삭제됩니다.`
      : "계정과 올린 이미지가 모두 영구 삭제됩니다.";
  return (
    <div className="px-4 py-5 md:px-6">
      <h2 className="type-title text-[17px]">회원 탈퇴</h2>
      <p className="type-body-sm mt-1 text-text-muted">
        {summary} 탈퇴한 뒤에는 되돌릴 수 없습니다.
      </p>
      <div className="mt-4 flex justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setSession((n) => n + 1);
            setOpen(true);
          }}
        >
          탈퇴하기
        </Button>
      </div>
      <DeleteAccountDialog key={session} open={open} onOpenChange={setOpen} summary={summary} />
    </div>
  );
}

function DeleteAccountDialog({
  open,
  onOpenChange,
  summary,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  summary: string;
}) {
  const [visible, setVisible] = useState(false);
  const [state, formAction, pending] = useActionState<AccountState, FormData>(deleteAccount, {});
  return (
    <Dialog open={open} onOpenChange={pending ? () => {} : onOpenChange}>
      <DialogContent className="max-w-[400px] rounded-2xl p-6" showCloseButton={!pending}>
        <DialogTitle className="type-heading">정말 탈퇴할까요?</DialogTitle>
        <DialogDescription className="type-body-sm text-text-muted">
          {summary} 계속하려면 비밀번호를 입력하세요.
        </DialogDescription>
        <form action={formAction} aria-busy={pending} className="mt-1 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="delete-password">비밀번호</Label>
            <div className="relative">
              <Input
                id="delete-password"
                name="password"
                type={visible ? "text" : "password"}
                autoComplete="current-password"
                placeholder="비밀번호를 입력하세요"
                required
                autoFocus
                disabled={pending}
                aria-describedby={state.error ? "delete-error" : undefined}
                className="pr-12"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute top-0.5 right-1"
                aria-label={visible ? "비밀번호 숨기기" : "비밀번호 표시"}
                aria-pressed={visible}
                onClick={() => setVisible(!visible)}
              >
                {visible ? <EyeOff /> : <Eye />}
              </Button>
            </div>
          </div>
          {state.error && (
            <p id="delete-error" role="alert" className="type-body-sm flex items-start gap-2 text-text-muted">
              <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              {state.error}
            </p>
          )}
          <DialogFooter className="flex-row justify-end gap-2 pt-1">
            <Button type="button" variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={pending}
              className={cn("relative", pending && "pl-9")}
            >
              {pending && <Loader2 aria-hidden="true" className="absolute left-3 animate-spin" />}
              탈퇴
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
