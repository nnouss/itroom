"use client";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TiptapImage from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { TextSelection } from "@tiptap/pm/state";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Toolbar } from "./toolbar";
import { TagInput } from "./tag-input";
import { LinkDialog } from "./link-dialog";
import { discardUploads, savePost, type SavePostResult } from "@/app/(app)/posts/actions";
import { goBack } from "@/lib/back-nav";
import { uploadImage, UploadError } from "@/lib/upload";
import { mediaUrl, pathFromMediaUrl } from "@/lib/media";
import { cn } from "@/lib/utils";
import { setLeaveGuard } from "@/lib/leave-guard";

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
  initialHtml = "",
  initialTags = [],
}: {
  mode: "create" | "edit";
  postId?: string;
  userId: string;
  initialHtml?: string;
  initialTags?: string[];
}) {
  const router = useRouter();
  const [tags, setTags] = useState(initialTags);
  const [uploading, setUploading] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [chars, setChars] = useState(0);
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
      Placeholder.configure({ placeholder: "무슨 소식을 전할까요?" }),
    ],
    editorProps: {
      attributes: {
        class: "tiptap post-content editor-surface min-h-[45dvh] outline-none",
        "aria-label": "본문",
      },
      handlePaste: (_view, event) => {
        const files = Array.from(event.clipboardData?.files ?? []).filter((f) => IMAGE_TYPES.has(f.type));
        if (files.length === 0) return false;
        event.preventDefault();
        void addImages(files);
        return true;
      },
      handleDrop: (view, event) => {
        const files = Array.from(event.dataTransfer?.files ?? []).filter((f) => IMAGE_TYPES.has(f.type));
        if (files.length === 0) return false;
        event.preventDefault();
        // 커서가 아니라 놓은 자리에 넣는다.
        const drop = view.posAtCoords({ left: event.clientX, top: event.clientY });
        if (drop) view.dispatch(view.state.tr.setSelection(TextSelection.near(view.state.doc.resolve(drop.pos))));
        void addImages(files);
        return true;
      },
    },
    onCreate: ({ editor }) => setChars(editor.getText().trim().length),
    onUpdate: ({ editor }) => {
      setDirty(true);
      setChars(editor.getText().trim().length);
    },
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
              attrs: { src: mediaUrl(path), alt: "첨부 이미지" },
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
      // 새 글은 피드 맨 위에서 확인한다. 수정은 들어온 화면(피드, 내 소식, 상세)으로 돌아간다.
      if (mode === "create") router.push("/");
      else goBack(router, `/posts/${result.id}`);
    });
  };
  const cancel = () => {
    if (dirty && !window.confirm("작성 중인 내용이 사라집니다. 나갈까요?")) return;
    submitted.current = true;
    cleanupUnused(new Set());
    goBack(router, mode === "create" ? "/" : `/posts/${postId}`);
  };
  // 에디터 밖 링크(헤더의 뒤로, 탭)로 나갈 때도 같은 확인을 거친다
  useEffect(() => {
    setLeaveGuard(() => {
      if (!dirty || submitted.current) return true;
      if (!window.confirm("작성 중인 내용이 사라집니다. 나갈까요?")) return false;
      submitted.current = true;
      const unused = [...uploaded.current];
      if (unused.length > 0) void discardUploads(unused).catch(() => {});
      return true;
    });
    return () => setLeaveGuard(null);
  }, [dirty]);
  const currentHref = editor?.getAttributes("link").href ?? "";
  const busy = pending || !editor;

  return (
    // editor-page: 앱 셸이 이 표시를 보고 페이지 바탕을 문서 면(canvas)으로 바꾼다
    <div className="editor-page -mt-3 px-4 pb-28 sm:-mt-5 sm:px-0">
      {editor ? (
        <Toolbar
          editor={editor}
          uploading={uploading}
          onPickImages={(files) => void addImages(files)}
          onLink={() => setLinkOpen(true)}
          disabled={pending}
        />
      ) : (
        <div aria-hidden="true" className="-mx-4 h-12 border-b border-hairline-soft sm:mx-0" />
      )}
      <div className="py-8">
        {editor ? (
          <EditorContent editor={editor} />
        ) : (
          <div className="min-h-[45dvh]" aria-hidden="true" />
        )}
      </div>
      <TagInput tags={tags} onChange={(next) => { setTags(next); setDirty(true); }} disabled={pending} />

      {/* 작업 바: 문서와 분리된 하단 고정 영역 */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-hairline-soft bg-page pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex h-16 max-w-[680px] items-center gap-3 px-4">
          <p className="type-caption min-w-0 flex-1 truncate text-text-muted" aria-live="polite">
            {error ? (
              <span role="alert" className="text-destructive">{error}</span>
            ) : uploading > 0 ? (
              `이미지 ${uploading}개 올리는 중`
            ) : (
              `${chars.toLocaleString("ko-KR")}자`
            )}
          </p>
          <Button type="button" variant="outline" className="w-[88px]" disabled={pending} onClick={cancel}>취소</Button>
          <Button
            type="button"
            className={cn("relative w-[88px]", pending && "pl-9")}
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
