import assert from "node:assert/strict";
import { test } from "node:test";
import { canManagePost } from "../lib/permissions.ts";

const me = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";

test("canManagePost lets members manage only their own posts", () => {
  assert.equal(canManagePost({ id: me, isOwner: false }, me), true);
  assert.equal(canManagePost({ id: me, isOwner: false }, other), false);
});

test("canManagePost lets the owner manage every post", () => {
  assert.equal(canManagePost({ id: me, isOwner: true }, me), true);
  assert.equal(canManagePost({ id: me, isOwner: true }, other), true);
});
