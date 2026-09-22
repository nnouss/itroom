"use client";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TiptapImage from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Toolbar } from "./toolbar";
import { TagInput } from "./tag-input";
import { LinkDialog } from "./link-dialog";
import { savePost } from "@/app/(app)/posts/actions";
import { uploadImage, UploadError } from "@/lib/upload";
import { mediaUrl } from "@/lib/media";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

export function PostEditor({
  mode,
  postId,
  userId,
  authorInitial,
  initialHtml = "",
  initialTags = [],
}: {
  mode: "create" | "edit";
  postId?: string;
  userId: string;
  authorInitial: string;
  initialHtml?: string;
  initialTags?: string[];
}) {
  const router = useRouter();
  const [tags, setTags] = useState(initialTags);
  const [uploading, setUploading] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const submitted = useRef(false);

  const editor = useEditor({
    immediatelyRender: false,
    content: initialHtml,
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        horizontalRule: false,
        link: {
          openOnClick: false,
          autolink: true,
          linkOnPaste: true,
          defaultProtocol: "https",
          HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" },
        },
      }),
      TiptapImage.configure({ inline: false, allowBase64: false }),
      Placeholder.configure({ placeholder: "무슨 소식인가요?" }),
    ],
    editorProps: {
      attributes: {
        class: "tiptap post-content type-body min-h-40 outline-none",
        "aria-label": "본문",
      },
      handlePaste: (_view, event) => {
        const files = Array.from(event.clipboardData?.files ?? []).filter((f) => IMAGE_TYPES.has(f.type));
        if (files.length === 0) return false;
        event.preventDefault();
        void addImages(files);
        return true;
      },
      handleDrop: (_view, event) => {
        const files = Array.from(event.dataTransfer?.files ?? []).filter((f) => IMAGE_TYPES.has(f.type));
        if (files.length === 0) return false;
        event.preventDefault();
        void addImages(files);
        return true;
      },
    },
    onUpdate: () => setDirty(true),
  });

  const addImages = useCallback(
    async (files: File[]) => {
      if (!editor) return;
      for (const file of files) {
        setUploading((n) => n + 1);
        try {
          const path = await uploadImage(file, userId);
          editor.chain().focus().setImage({ src: mediaUrl(path), alt: file.name }).run();
          setDirty(true);
        } catch (err) {
          toast(err instanceof UploadError ? err.message : "이미지를 올리지 못했습니다.");
        } finally {
          setUploading((n) => n - 1);
        }
      }
    },
    [editor, userId],
  );

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty && !submitted.current) event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const submit = () => {
    if (!editor || uploading > 0) return;
    setError(null);
    startTransition(async () => {
      const result = await savePost({ id: postId, contentHtml: editor.getHTML(), tags });
      if (result.error || !result.id) {
        setError(result.error ?? "저장하지 못했습니다.");
        return;
      }
      submitted.current = true;
      toast(mode === "create" ? "소식을 올렸습니다." : "소식을 수정했습니다.");
      router.push(mode === "create" ? "/" : `/posts/${result.id}`);
    });
  };
  const cancel = () => {
    if (dirty && !window.confirm("작성 중인 내용이 사라집니다. 나갈까요?")) return;
    submitted.current = true;
    router.push(mode === "create" ? "/" : `/posts/${postId}`);
  };
  const currentHref = editor?.getAttributes("link").href ?? "";
  const busy = pending || !editor;

  return (
    <div className="grid grid-cols-[36px_minmax(0,1fr)] gap-3 py-4 md:py-6">
      <div aria-hidden="true" className="type-label flex size-9 items-center justify-center rounded-full bg-canvas-soft">
        {authorInitial}
      </div>
      <div className="min-w-0 space-y-4">
        {editor && (
          <Toolbar
            editor={editor}
            uploading={uploading}
            onPickImages={(files) => void addImages(files)}
            onLink={() => setLinkOpen(true)}
            disabled={pending}
          />
        )}
        {editor ? (
          <EditorContent editor={editor} />
        ) : (
          <div className="min-h-40 rounded-2xl bg-canvas-soft" aria-hidden="true" />
        )}
        <TagInput tags={tags} onChange={(next) => { setTags(next); setDirty(true); }} disabled={pending} />
        {error && (
          <p role="alert" className="type-body-sm text-text-muted">{error}</p>
        )}
        <div className="sticky bottom-0 -mx-4 flex justify-end gap-2 border-t border-hairline-soft bg-canvas px-4 py-3 md:static md:mx-0 md:border-0 md:px-0 md:py-0">
          <Button type="button" variant="outline" disabled={pending} onClick={cancel}>취소</Button>
          <Button type="button" className="relative" disabled={busy || uploading > 0} onClick={submit}>
            {pending && <Loader2 aria-hidden="true" className="absolute left-3 animate-spin" />}
            {mode === "create" ? "게시" : "저장"}
          </Button>
        </div>
      </div>
      {editor && (
        <LinkDialog
          open={linkOpen}
          initialHref={currentHref}
          onOpenChange={setLinkOpen}
          onSubmit={(href) => {
            setLinkOpen(false);
            const chain = editor.chain().focus().extendMarkRange("link");
            if (href) chain.setLink({ href }).run();
            else chain.unsetLink().run();
            setDirty(true);
          }}
        />
      )}
    </div>
  );
}
