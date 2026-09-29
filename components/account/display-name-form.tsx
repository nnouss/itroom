"use client";
import { useActionState, useEffect, useState } from "react";
import { CircleAlert, CircleCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  checkDisplayName,
  updateDisplayName,
  type AccountState,
  type NameAvailability,
} from "@/app/(app)/account/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DISPLAY_NAME_RE, MAX_DISPLAY_NAME_LENGTH, normalizeDisplayName, tidyDisplayName } from "@/lib/profile";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "checking" | "success" | "error";

const RULE_HINT = `1~${MAX_DISPLAY_NAME_LENGTH}자, 한글·영문·숫자만 쓸 수 있어요.`;

const availabilityMessage: Record<NameAvailability, [Tone, string]> = {
  available: ["success", "사용할 수 있는 닉네임이에요."],
  taken: ["error", "이미 사용 중인 닉네임이에요."],
  reserved: ["error", "운영용 이름은 쓸 수 없어요."],
  invalid: ["error", "한글, 영문, 숫자만 쓸 수 있어요."],
  same: ["neutral", RULE_HINT],
};

/** 입력칸 아래 한 줄 안내. 사용 가능은 초록 체크, 오류는 빨간 느낌표. */
function StatusLine({ id, tone, children }: { id: string; tone: Tone; children: React.ReactNode }) {
  const Icon = tone === "success" ? CircleCheck : tone === "error" ? CircleAlert : tone === "checking" ? Loader2 : null;
  return (
    <p
      id={id}
      aria-live="polite"
      className={cn(
        "type-body-sm mt-2 flex min-h-5 items-center gap-1.5",
        (tone === "neutral" || tone === "checking") && "text-text-muted",
        tone === "success" && "text-success",
        tone === "error" && "text-destructive",
      )}
    >
      {Icon && <Icon aria-hidden="true" className={cn("size-4 shrink-0", tone === "checking" && "animate-spin")} />}
      {children}
    </p>
  );
}

export function DisplayNameForm({ current }: { current: string }) {
  const [value, setValue] = useState(current);
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [checked, setChecked] = useState<{ name: string; status: NameAvailability } | null>(null);
  const [composing, setComposing] = useState(false);
  const [state, formAction, pending] = useActionState<AccountState, FormData>(async (previous, data) => {
    setSubmitted(tidyDisplayName(String(data.get("displayName") ?? "")));
    let result: AccountState;
    try {
      result = await updateDisplayName(previous, data);
    } catch {
      result = { error: "연결에 실패했어요. 잠시 후 다시 시도해 주세요." };
    }
    // 저장이 끝나면 서버가 정리한 닉네임으로 입력칸을 맞춘다.
    if (result.name !== undefined) setValue(result.name);
    if (result.success) toast(result.success);
    return result;
  }, {});

  const name = tidyDisplayName(value);
  const length = Array.from(name).length;
  const local = normalizeDisplayName(value);
  const needsCheck = !("error" in local) && local.name !== current;
  // 한글 조합 중에는 마지막 글자가 잠깐 낱자(ㅎ, ㅗ)가 된다. 이때는 오류로 번쩍이지 않게 안내만 둔다.
  const midSyllable =
    composing && /[ㄱ-ㅎㅏ-ㅣ]$/.test(name) && (name.length === 1 || DISPLAY_NAME_RE.test(name.slice(0, -1)));

  // 입력이 멈추면 서버에 중복·금지어를 물어본다. 늦게 온 이전 응답은 이름이 달라 무시된다.
  useEffect(() => {
    if (!needsCheck) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const status = await checkDisplayName(name);
        if (!cancelled) setChecked({ name, status });
      } catch {
        /* 확인에 실패하면 확인 중으로 두고, 저장 시 DB가 판단한다 */
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [name, needsCheck]);

  // 저장 오류(동시에 같은 이름을 가져간 경우 등)는 그 이름을 그대로 두고 있을 때만 보여 준다.
  const saveError = state.error && submitted === name ? state.error : null;
  let [tone, message]: [Tone, string] = ["checking", "확인하는 중…"];
  if (saveError) [tone, message] = ["error", saveError];
  else if (midSyllable) [tone, message] = ["neutral", RULE_HINT];
  else if ("error" in local) [tone, message] = ["error", local.error];
  else if (!needsCheck) [tone, message] = ["neutral", RULE_HINT];
  else if (checked?.name === name) [tone, message] = availabilityMessage[checked.status];

  return (
    <form action={formAction} aria-busy={pending} className="px-4 py-5 md:px-6">
      <label htmlFor="displayName" className="type-title block text-[17px]">
        닉네임
      </label>
      <p id="displayName-help" className="type-body-sm mt-1 text-text-muted">
        글과 프로필에 보이는 이름이에요.
      </p>
      <div className="relative mt-4">
        <Input
          id="displayName"
          name="displayName"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onCompositionStart={() => setComposing(true)}
          onCompositionEnd={() => setComposing(false)}
          autoComplete="nickname"
          spellCheck={false}
          required
          disabled={pending}
          aria-invalid={tone === "error"}
          aria-describedby="displayName-help displayName-status"
          className={cn(
            "pr-16",
            tone === "error" && "ring-1 ring-destructive focus-visible:outline-destructive",
            tone === "success" && "ring-1 ring-success focus-visible:outline-success",
          )}
        />
        <span
          aria-hidden="true"
          className={cn(
            "type-caption pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 tabular-nums",
            length > MAX_DISPLAY_NAME_LENGTH ? "text-destructive" : "text-text-faint",
          )}
        >
          {length}/{MAX_DISPLAY_NAME_LENGTH}
        </span>
      </div>
      <StatusLine id="displayName-status" tone={tone}>
        {message}
      </StatusLine>
      <div className="mt-4 flex justify-end">
        <Button
          type="submit"
          disabled={pending || tone !== "success"}
          className={cn("relative min-w-20", pending && "pl-9")}
        >
          {pending && <Loader2 aria-hidden="true" className="absolute left-3 animate-spin" />}
          저장
        </Button>
      </div>
    </form>
  );
}
