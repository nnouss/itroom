import assert from "node:assert/strict";
import { test } from "node:test";
import { getEnv, isEnvConfigured } from "../lib/env.ts";
import { safeNextPath } from "../lib/auth-redirect.ts";

test("missing environment is checked at call time and never considered configured", () => {
  const keys = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "NEXT_PUBLIC_SITE_URL",
  ];
  const saved = keys.map((key) => process.env[key]);
  try {
    for (const key of keys) delete process.env[key];
    assert.equal(isEnvConfigured(), false);
    assert.throws(() => getEnv(), /환경 변수가 설정되지 않았습니다/);
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "public-test-key";
    assert.equal(isEnvConfigured(), false);
    process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000/";
    assert.equal(getEnv().siteUrl, "http://localhost:3000");
    assert.equal(isEnvConfigured(), true);
    process.env.NEXT_PUBLIC_SITE_URL = "javascript:alert(1)";
    assert.equal(isEnvConfigured(), false);
  } finally {
    keys.forEach((key, index) =>
      saved[index] === undefined
        ? delete process.env[key]
        : (process.env[key] = saved[index]),
    );
  }
});

test("callback next rejects external, protocol-relative and ambiguous redirect destinations", () => {
  for (const next of [
    null,
    "",
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "/\nevil.example",
    "javascript:alert(1)",
    "/a/..//evil.example",
  ]) {
    assert.equal(safeNextPath(next), "/", JSON.stringify(next));
  }
  for (const next of ["/", "/reset-password", "/posts/123?from=mail#content"])
    assert.equal(safeNextPath(next), next);
});
