/**
 * "들어온 곳으로 돌아가기". 앞 화면이 이 앱의 화면이면 브라우저 뒤로 가기를 쓰고
 * (피드 스크롤 위치가 그대로 돌아온다), 링크로 바로 들어와 앞 화면이 없거나 로그인 화면이면 fallback으로 간다.
 */
type Router = { back: () => void; push: (href: string) => void };

const AUTH_PATHS = ["/login", "/auth/", "/set-password", "/reset-password"];

// Navigation API가 없는 브라우저용: 이 탭에서 앱 안 이동이 한 번이라도 있었는지.
let navigatedInApp = false;
export function noteInAppNavigation() {
  navigatedInApp = true;
}

type NavigationEntry = { url: string | null; index: number };
type NavigationLike = { currentEntry: NavigationEntry | null; entries: () => NavigationEntry[] };

function canGoBackInApp(): boolean {
  const navigation = (window as unknown as { navigation?: NavigationLike }).navigation;
  if (!navigation?.currentEntry) return navigatedInApp;
  // entries()에는 같은 출처의 기록만 들어 있다. 바로 앞 기록이 앱 화면인지 본다.
  const previous = navigation.entries()[navigation.currentEntry.index - 1];
  if (!previous?.url) return false;
  const path = new URL(previous.url).pathname;
  return !AUTH_PATHS.some((auth) => path === auth || path.startsWith(auth));
}

export function goBack(router: Router, fallback: string) {
  if (canGoBackInApp()) router.back();
  else router.push(fallback);
}
