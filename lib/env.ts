export const ENV_MISSING_MESSAGE = "환경 변수가 설정되지 않았습니다";
export function getEnv() {
  const values = {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.trim(),
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim(),
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL?.trim(),
  };
  if (!values.supabaseUrl || !values.supabaseAnonKey || !values.siteUrl) {
    throw new Error(
      `${ENV_MISSING_MESSAGE}. NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_SITE_URL을 확인하세요.`,
    );
  }
  for (const value of [values.supabaseUrl, values.siteUrl]) {
    const url = new URL(value);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password
    )
      throw new Error("환경 변수 URL 형식이 올바르지 않습니다.");
  }
  return {
    supabaseUrl: values.supabaseUrl,
    supabaseAnonKey: values.supabaseAnonKey,
    siteUrl: new URL(values.siteUrl).origin,
  };
}
export function isEnvConfigured() {
  try {
    getEnv();
    return true;
  } catch {
    return false;
  }
}
