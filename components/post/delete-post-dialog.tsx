"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { deletePost } from "@/app/(app)/posts/actions";
import { cn } from "@/lib/utils";

export function DeletePostDialog({
  postId,
  open,
  onOpenChange,
  afterDelete,
  onDeleted,
}: {
  postId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  afterDelete: "refresh" | "home" | "none";
  onDeleted?: (id: string) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const confirm = () =>
    startTransition(async () => {
      setError(null);
      let result: { error?: string };
      try {
        result = await deletePost(postId);
      } catch {
        result = { error: "연결에 실패했습니다. 잠시 후 다시 시도해주세요." };
      }
      if (result.error) {
        setError(result.error);
        return;
      }
      onOpenChange(false);
      onDeleted?.(postId);
      toast("소식을 삭제했습니다.");
      if (afterDelete === "home") router.push("/");
      else if (afterDelete === "refresh") router.refresh();
    });

  return (
    <Dialog open={open} onOpenChange={pending ? () => {} : onOpenChange}>
      <DialogContent className="max-w-[360px] rounded-2xl p-6">
        <DialogTitle className="type-heading">소식을 삭제할까요?</DialogTitle>
        <DialogDescription className="type-body-sm text-text-muted">
          삭제한 글과 첨부 이미지는 되돌릴 수 없습니다.
        </DialogDescription>
        {error && (
          <p role="alert" className="type-body-sm text-text-muted">
            {error}
          </p>
        )}
        <DialogFooter className="mt-2 flex-row justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            취소
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={pending}
            onClick={confirm}
            className={cn("relative", pending && "pl-9")}
          >
            {pending && (
              <Loader2 aria-hidden="true" className="absolute left-3 animate-spin" />
            )}
            삭제
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
