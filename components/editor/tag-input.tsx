"use client";
import { useState, type KeyboardEvent } from "react";
import { Hash, X } from "lucide-react";
import { MAX_TAGS, MAX_TAG_LENGTH, normalizeTag } from "@/lib/tags";

export function TagInput({
  tags,
  onChange,
  disabled,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState("");
  const full = tags.length >= MAX_TAGS;

  const commit = () => {
    const tag = normalizeTag(draft);
    setDraft("");
    if (!tag || full) return;
    if (tags.some((t) => t.toLowerCase() === tag.toLowerCase())) return;
    onChange([...tags, tag]);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return;
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      commit();
    } else if (event.key === "Backspace" && draft === "" && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-hairline-soft pt-4">
      <label htmlFor="tag-input" className="inline-flex items-center gap-1 text-text-faint">
        <Hash className="size-4" aria-hidden="true" />
        <span className="sr-only">태그</span>
      </label>
      {tags.map((tag) => (
        <span
          key={tag}
          className="type-label inline-flex h-8 items-center gap-0.5 rounded-full bg-canvas-soft pr-0.5 pl-3 text-ink"
        >
          {tag}
          <button
            type="button"
            aria-label={`${tag} 태그 제거`}
            disabled={disabled}
            onClick={() => onChange(tags.filter((t) => t !== tag))}
            className="inline-flex size-7 items-center justify-center rounded-full text-text-muted hover:bg-field hover:text-ink"
          >
            <X className="size-3.5" />
          </button>
        </span>
      ))}
      <input
        id="tag-input"
        value={draft}
        disabled={disabled || full}
        maxLength={MAX_TAG_LENGTH}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={onKeyDown}
        onBlur={commit}
        placeholder={full ? `태그는 ${MAX_TAGS}개까지` : tags.length ? "태그 더하기" : "태그 추가"}
        className="h-8 min-w-32 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-text-faint focus-visible:outline-none"
      />
    </div>
  );
}
