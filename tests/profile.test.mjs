import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeDisplayName, isReservedDisplayName, MAX_DISPLAY_NAME_LENGTH } from "../lib/profile.ts";

test("normalizeDisplayName accepts Hangul, English letters and digits", () => {
  assert.deepEqual(normalizeDisplayName("홍길동"), { name: "홍길동" });
  assert.deepEqual(normalizeDisplayName("Hong123"), { name: "Hong123" });
  assert.deepEqual(normalizeDisplayName("잇룸Room2026"), { name: "잇룸Room2026" });
  assert.deepEqual(normalizeDisplayName("  홍길동 "), { name: "홍길동" });
});

test("normalizeDisplayName rejects spaces, symbols, emoji and bare jamo", () => {
  for (const value of ["홍 길동", "hong_1", "kim.min", "이름!", "🙂", "ㄱㄴ", "ㅏ", "이름\u0000", "ｈｏｎｇ"])
    assert.ok("error" in normalizeDisplayName(value), value);
});

test("normalizeDisplayName rejects empty and non-string input", () => {
  assert.ok("error" in normalizeDisplayName(""));
  assert.ok("error" in normalizeDisplayName("   "));
  assert.ok("error" in normalizeDisplayName(null));
  assert.ok("error" in normalizeDisplayName(42));
});

test("normalizeDisplayName allows up to 30 characters", () => {
  assert.deepEqual(normalizeDisplayName("가".repeat(MAX_DISPLAY_NAME_LENGTH)), {
    name: "가".repeat(MAX_DISPLAY_NAME_LENGTH),
  });
  assert.ok("error" in normalizeDisplayName("가".repeat(MAX_DISPLAY_NAME_LENGTH + 1)));
});

test("isReservedDisplayName matches the DB guard list ignoring case and spaces", () => {
  assert.equal(isReservedDisplayName(" Admin "), true);
  assert.equal(isReservedDisplayName("관리자"), true);
  assert.equal(isReservedDisplayName("관리자님"), false);
});
