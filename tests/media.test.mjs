import assert from "node:assert/strict";
import { test } from "node:test";
import { encodeTargets, fitWithin, IMAGE_TYPES, MAX_IMAGE_EDGE, OBJECT_PATH_RE } from "../lib/media.ts";

test("fitWithin shrinks the long edge to the limit and keeps the aspect ratio", () => {
  assert.deepEqual(fitWithin(4032, 3024), { width: MAX_IMAGE_EDGE, height: 1200 });
  assert.deepEqual(fitWithin(3024, 4032), { width: 1200, height: MAX_IMAGE_EDGE });
  assert.deepEqual(fitWithin(1170, 5000), { width: 374, height: MAX_IMAGE_EDGE });
});

test("fitWithin never upscales and never returns a zero edge", () => {
  assert.deepEqual(fitWithin(800, 600), { width: 800, height: 600 });
  assert.deepEqual(fitWithin(MAX_IMAGE_EDGE, 10), { width: MAX_IMAGE_EDGE, height: 10 });
  assert.deepEqual(fitWithin(100000, 1), { width: MAX_IMAGE_EDGE, height: 1 });
});

test("encodeTargets turns photos into WebP with a JPEG fallback", () => {
  assert.deepEqual(
    encodeTargets("image/jpeg").map((t) => t.type),
    ["image/webp", "image/jpeg"],
  );
});

test("encodeTargets keeps PNG lossless even when opaque", () => {
  assert.deepEqual(encodeTargets("image/png"), [{ type: "image/png" }]);
  assert.deepEqual(encodeTargets("image/png", true), [{ type: "image/png" }]);
});

test("encodeTargets lets WebP fall back to JPEG only when opaque", () => {
  assert.deepEqual(
    encodeTargets("image/webp").map((t) => t.type),
    ["image/webp", "image/png"],
  );
  assert.deepEqual(
    encodeTargets("image/webp", true).map((t) => t.type),
    ["image/webp", "image/jpeg", "image/png"],
  );
});

test("every encode target maps to an extension the media path accepts", () => {
  for (const source of ["image/jpeg", "image/png", "image/webp"])
    for (const target of [...encodeTargets(source), ...encodeTargets(source, true)]) {
      const ext = IMAGE_TYPES[target.type];
      assert.ok(ext, target.type);
      assert.ok(OBJECT_PATH_RE.test(`${crypto.randomUUID()}/${crypto.randomUUID()}.${ext}`), ext);
    }
});
