/**
 * 작성 화면 이탈 확인. 에디터가 작성 중일 때 가드를 등록하면,
 * 에디터 밖의 링크(헤더의 뒤로 버튼 등)가 이동 전에 confirmLeave()로 물어본다.
 */
let guard: (() => boolean) | null = null;

export function setLeaveGuard(fn: (() => boolean) | null) {
  guard = fn;
}

/** 이동해도 되면 true */
export function confirmLeave(): boolean {
  return guard ? guard() : true;
}
