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
import { discardUploads, savePost, type SavePostResult } from "@/app/(app)/posts/actions";
import { uploadImage, UploadError } from "@/lib/upload";
import { mediaUrl, pathFromMediaUrl } from "@/lib/media";
import { cn } from "@/lib/utils";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

/** 현재 에디터 HTML에 남아 있는 /media 경로 */
function imagePathsIn(html: string): Set<string> {
  const paths = new Set<string>();
  for (const match of html.matchAll(/<img[^>]+src="([^"]+)"/g)) {
    const path = pathFromMediaUrl(match[1]);
    if (path) paths.add(path);
  }
  return paths;
}

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
  const pendingRef = useRef(false);
  /** 이 세션에서 새로 올린 이미지. 글에 채택되지 않은 것은 정리한다. */
  const uploaded = useRef<Set<string>>(new Set());

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
      if (!editor || pendingRef.current) return;
      for (const file of files) {
        setUploading((n) => n + 1);
        setDirty(true);
        try {
          const path = await uploadImage(file, userId);
          uploaded.current.add(path);
          // 직전에 넣은 이미지가 선택된 상태에서 setImage를 쓰면 그 노드를 덮어쓴다.
          // 항상 현재 선택 끝 뒤에 삽입한다.
          editor
            .chain()
            .focus()
            .insertContentAt(editor.state.selection.to, {
              type: "image",
              attrs: { src: mediaUrl(path), alt: file.name },
            })
            .run();
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

  const cleanupUnused = (keep: Set<string>) => {
    const unused = [...uploaded.current].filter((path) => !keep.has(path));
    if (unused.length > 0) void discardUploads(unused).catch(() => {});
  };

  const submit = () => {
    if (!editor || uploading > 0 || pendingRef.current) return;
    setError(null);
    pendingRef.current = true;
    editor.setEditable(false);
    const contentHtml = editor.getHTML();
    startTransition(async () => {
      let result: SavePostResult;
      try {
        result = await savePost({ id: postId, contentHtml, tags });
      } catch {
        result = { error: "연결에 실패했습니다. 잠시 후 다시 시도해주세요." };
      }
      if (result.error || !result.id) {
        setError(result.error ?? "저장하지 못했습니다.");
        pendingRef.current = false;
        editor.setEditable(true);
        return;
      }
      submitted.current = true;
      cleanupUnused(imagePathsIn(contentHtml));
      toast(mode === "create" ? "소식을 올렸습니다." : "소식을 수정했습니다.");
      router.push(mode === "create" ? "/" : `/posts/${result.id}`);
    });
  };
  const cancel = () => {
    if (dirty && !window.confirm("작성 중인 내용이 사라집니다. 나갈까요?")) return;
    submitted.current = true;
    cleanupUnused(new Set());
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
          <Button
            type="button"
            className={cn("relative", pending && "pl-9")}
            disabled={busy || uploading > 0}
            onClick={submit}
          >
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
