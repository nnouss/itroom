import assert from "node:assert/strict";
import { test } from "node:test";
import { splitImages, sanitizePostHtml, firstExternalUrl, textLength, joinImages } from "../lib/sanitize.ts";
import { normalizeTags } from "../lib/tags.ts";
import { pathFromMediaUrl, mediaUrl } from "../lib/media.ts";

const uid = "11111111-1111-4111-8111-111111111111";
const img = "22222222-2222-4222-8222-222222222222";
const path = `${uid}/${img}.jpg`;

test("mediaUrl round-trips through pathFromMediaUrl and rejects foreign paths", () => {
  assert.equal(pathFromMediaUrl(mediaUrl(path)), path);
  assert.equal(pathFromMediaUrl("https://evil.example/x.jpg"), null);
  assert.equal(pathFromMediaUrl("/media/../etc/passwd"), null);
  assert.equal(pathFromMediaUrl(`/media/${uid}/${img}.svg`), null);
});

test("splitImages pulls /media images out of the html and ignores external images", () => {
  const html = `<p>hi</p><img src="${mediaUrl(path)}" alt="x"><p>bye</p><img src="https://x.test/a.png">`;
  const result = splitImages(html);
  assert.deepEqual(result.images, [path]);
  assert.equal(result.rejected, 1);
  assert.equal(result.html, "<p>hi</p><p>bye</p>");
  assert.equal(joinImages("<p>a</p>", [path]), `<p>a</p><img src="${mediaUrl(path)}" alt="첨부 이미지">`);
});

test("sanitizePostHtml keeps editor markup, strips scripts, forces safe link attrs, trims trailing blanks", () => {
  const dirty =
    '<p>a <strong>b</strong> <em>c</em> <s>d</s> <code>e</code></p><pre><code>f</code></pre><ul><li>g</li></ul>' +
    '<p><a href="https://x.test" onclick="evil()">l</a> <a href="javascript:alert(1)">j</a></p>' +
    '<script>alert(1)</script><h1>no</h1><p></p><p><br></p>';
  const clean = sanitizePostHtml(dirty);
  assert.match(clean, /<a href="https:\/\/x\.test" target="_blank" rel="noopener noreferrer nofollow">l<\/a>/);
  assert.doesNotMatch(clean, /onclick|javascript:|<script|<h1/);
  assert.match(clean, /<pre><code>f<\/code><\/pre>/);
  assert.ok(clean.endsWith("</p>"), clean);
  assert.doesNotMatch(clean, /<p><\/p>$/);
  assert.equal(textLength("<p> </p><p><br></p>"), 0);
});

test("firstExternalUrl returns the first http(s) anchor only", () => {
  assert.equal(firstExternalUrl('<p><a href="mailto:a@b.c">m</a> <a href="https://one.test/p">1</a> <a href="https://two.test">2</a></p>'), "https://one.test/p");
  assert.equal(firstExternalUrl("<p>none</p>"), null);
});

test("normalizeTags trims, strips #, dedupes case-insensitively, caps count and length", () => {
  assert.deepEqual(normalizeTags([" #AI ", "ai", "Next.js", "", "  ", "a".repeat(30)]), ["AI", "Next.js", "a".repeat(20)]);
  assert.equal(normalizeTags(Array.from({ length: 15 }, (_, i) => `t${i}`)).length, 10);
});
