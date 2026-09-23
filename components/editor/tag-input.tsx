"use client";
import { useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";
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
    <div>
      <label htmlFor="tag-input" className="type-caption mb-2 block text-text-muted">
        태그
      </label>
      <div className="flex min-h-11 flex-wrap items-center gap-2 rounded-2xl bg-field px-3 py-1.5 focus-within:outline-2 focus-within:outline-ink">
        {tags.map((tag) => (
          <span
            key={tag}
            className="type-label inline-flex h-9 items-center gap-0.5 rounded-full bg-canvas pl-3 pr-0.5 text-ink"
          >
            {tag}
            <button
              type="button"
              aria-label={`${tag} 태그 제거`}
              disabled={disabled}
              onClick={() => onChange(tags.filter((t) => t !== tag))}
              className="inline-flex size-8 items-center justify-center rounded-full hover:bg-canvas-soft"
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
          placeholder={full ? `태그는 ${MAX_TAGS}개까지` : "태그 추가 (Enter)"}
          className="min-w-32 flex-1 bg-transparent py-1 text-base text-ink outline-none focus-visible:outline-none placeholder:text-text-faint"
        />
      </div>
    </div>
  );
}
