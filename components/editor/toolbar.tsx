"use client";
import { useRef } from "react";
import type { Editor } from "@tiptap/react";
import { useEditorState } from "@tiptap/react";
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  SquareCode,
  Link2,
  List,
  ListOrdered,
  ImagePlus,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

function ToolButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={cn(
        "inline-flex size-10 shrink-0 items-center justify-center rounded-full transition-opacity disabled:opacity-[0.38] [&_svg]:size-4",
        active ? "bg-ink text-on-ink" : "hover:bg-canvas",
      )}
    >
      {children}
    </button>
  );
}

export function Toolbar({
  editor,
  uploading,
  onPickImages,
  onLink,
  disabled,
}: {
  editor: Editor;
  uploading: number;
  onPickImages: (files: File[]) => void;
  onLink: () => void;
  disabled?: boolean;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const state = useEditorState({
    editor,
    selector: ({ editor }) => ({
      bold: editor.isActive("bold"),
      italic: editor.isActive("italic"),
      strike: editor.isActive("strike"),
      code: editor.isActive("code"),
      codeBlock: editor.isActive("codeBlock"),
      link: editor.isActive("link"),
      bulletList: editor.isActive("bulletList"),
      orderedList: editor.isActive("orderedList"),
    }),
  });
  const run = (fn: (chain: ReturnType<Editor["chain"]>) => ReturnType<Editor["chain"]>) =>
    fn(editor.chain().focus()).run();
  return (
    <div
      role="toolbar"
      aria-label="서식"
      className="scrollbar-none sticky top-20 z-20 flex items-center gap-1 overflow-x-auto rounded-full bg-canvas-soft p-1"
    >
      <ToolButton label="굵게" active={state.bold} disabled={disabled} onClick={() => run((c) => c.toggleBold())}><Bold /></ToolButton>
      <ToolButton label="기울임" active={state.italic} disabled={disabled} onClick={() => run((c) => c.toggleItalic())}><Italic /></ToolButton>
      <ToolButton label="취소선" active={state.strike} disabled={disabled} onClick={() => run((c) => c.toggleStrike())}><Strikethrough /></ToolButton>
      <ToolButton label="인라인 코드" active={state.code} disabled={disabled} onClick={() => run((c) => c.toggleCode())}><Code /></ToolButton>
      <ToolButton label="코드블록" active={state.codeBlock} disabled={disabled} onClick={() => run((c) => c.toggleCodeBlock())}><SquareCode /></ToolButton>
      <ToolButton label="링크" active={state.link} disabled={disabled} onClick={onLink}><Link2 /></ToolButton>
      <ToolButton label="글머리 목록" active={state.bulletList} disabled={disabled} onClick={() => run((c) => c.toggleBulletList())}><List /></ToolButton>
      <ToolButton label="번호 목록" active={state.orderedList} disabled={disabled} onClick={() => run((c) => c.toggleOrderedList())}><ListOrdered /></ToolButton>
      <ToolButton label="이미지 추가" disabled={disabled} onClick={() => fileInput.current?.click()}>
        {uploading > 0 ? <Loader2 className="animate-spin" /> : <ImagePlus />}
      </ToolButton>
      <input
        ref={fileInput}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        multiple
        hidden
        onChange={(event) => {
          onPickImages(Array.from(event.target.files ?? []));
          event.target.value = "";
        }}
      />
      {uploading > 0 && (
        <span className="type-caption ml-2 shrink-0 pr-3 text-text-muted" aria-live="polite">
          이미지 {uploading}개 올리는 중
        </span>
      )}
    </div>
  );
}
