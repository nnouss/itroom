"use client";
import { useState } from "react";
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

export function LinkDialog({
  open,
  initialHref,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  initialHref: string;
  onOpenChange: (open: boolean) => void;
  onSubmit: (href: string | null) => void;
}) {
  const [href, setHref] = useState(initialHref);
  // 다이얼로그가 열릴 때마다 현재 링크로 초기화한다 (렌더 중 상태 조정 패턴).
  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (open) setHref(initialHref);
  }
  const submit = () => {
    const value = href.trim();
    if (!value) {
      onSubmit(null);
      return;
    }
    onSubmit(/^https?:\/\//i.test(value) ? value : `https://${value}`);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[360px] rounded-2xl p-6">
        <DialogTitle className="type-heading">링크</DialogTitle>
        <DialogDescription className="type-body-sm text-text-muted">
          비워두고 저장하면 링크를 제거합니다.
        </DialogDescription>
        <form
          className="space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <Label htmlFor="link-href">주소</Label>
          <Input
            id="link-href"
            type="url"
            inputMode="url"
            autoFocus
            value={href}
            onChange={(event) => setHref(event.target.value)}
            placeholder="https://"
          />
          <DialogFooter className="mt-4 flex-row justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button type="submit">저장</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
