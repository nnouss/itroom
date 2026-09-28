import type { Viewer } from "@/lib/types";

/** 글 수정·삭제 권한: 본인 글이거나 owner. 서버 액션, 페이지 가드, UI가 모두 이 함수를 쓴다. 최종 방어선은 RLS다. */
export function canManagePost(viewer: Viewer, authorId: string): boolean {
  return viewer.isOwner || viewer.id === authorId;
}
