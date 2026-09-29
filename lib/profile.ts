export const MAX_DISPLAY_NAME_LENGTH = 30;

/** 닉네임에 쓸 수 있는 문자: 한글(완성형), 영문 대소문자, 숫자. DB `profiles_display_name_check`와 같다. */
export const DISPLAY_NAME_RE = /^[가-힣A-Za-z0-9]+$/;

/** 회원이 쓸 수 없는 운영 명칭. DB `guard_display_name`의 목록과 같게 유지한다(owner는 예외). */
export const RESERVED_DISPLAY_NAMES = ["잇룸", "itroom", "관리자", "운영자", "admin", "owner"];

/** 입력 중인 값을 저장될 형태로 미리 정리한다(앞뒤 공백만 제거). */
export const tidyDisplayName = (value: string) => value.trim();

export const isReservedDisplayName = (name: string) =>
  RESERVED_DISPLAY_NAMES.includes(name.trim().toLowerCase());

/**
 * 닉네임(profiles.display_name)을 저장 형태로 정리하고 검사한다.
 * DB 제약(1~30자, 한글·영문·숫자만)과 같은 규칙이며, 어긋나면 오류 문구를 돌려준다.
 * 금지어·중복의 최종 검사는 DB(guard_display_name, 유니크 인덱스)가 맡는다.
 */
export function normalizeDisplayName(value: unknown): { name: string } | { error: string } {
  if (typeof value !== "string") return { error: "닉네임을 입력해 주세요." };
  const name = tidyDisplayName(value);
  if (name.length === 0) return { error: "닉네임을 입력해 주세요." };
  if (Array.from(name).length > MAX_DISPLAY_NAME_LENGTH)
    return { error: `${MAX_DISPLAY_NAME_LENGTH}자까지 쓸 수 있어요.` };
  if (!DISPLAY_NAME_RE.test(name)) return { error: "한글, 영문, 숫자만 쓸 수 있어요." };
  return { name };
}
