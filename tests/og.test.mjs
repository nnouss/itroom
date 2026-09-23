import assert from "node:assert/strict";
import { test } from "node:test";
import { createServer } from "node:http";
import { fetchLinkPreview, fetchPreviewImage, isBlockedAddress } from "../lib/og.ts";

test("fetchLinkPreview refuses loopback hosts, dotted localhost, and private IP literals", async () => {
  const server = createServer((_req, res) => {
    res.setHeader("content-type", "text/html");
    res.end("<title>loopback-proof</title>");
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  try {
    for (const url of [
      `http://localhost:${port}/`,
      `http://localhost.:${port}/`,
      `http://127.0.0.1:${port}/`,
      `http://[::1]:${port}/`,
      `http://0.0.0.0:${port}/`,
      "http://10.0.0.1/",
      "http://169.254.169.254/latest/meta-data",
      "http://192.168.1.1/",
      "ftp://example.com/",
      // IPv6로 표기한 IPv4 (보안 점검에서 우회가 재현된 형태)
      `http://[::ffff:127.0.0.1]:${port}/`,
      `http://[::ffff:7f00:1]:${port}/`,
      "http://[::ffff:a9fe:a9fe]/",
      `http://[64:ff9b::7f00:1]:${port}/`,
      `http://[2002:7f00:1::]:${port}/`,
      `http://0x7f000001:${port}/`,
      `http://2130706433:${port}/`,
      `http://user:pass@example.com/`,
    ]) {
      assert.equal(await fetchLinkPreview(url), null, url);
      assert.equal(await fetchPreviewImage(url), null, url);
    }
  } finally {
    server.close();
  }
});

test("isBlockedAddress covers private ranges in every notation and allows public addresses", () => {
  for (const ip of ["127.0.0.1", "10.1.2.3", "172.31.0.1", "192.168.0.1", "169.254.169.254", "100.64.0.1",
    "0.0.0.0", "224.0.0.1", "::", "::1", "::ffff:127.0.0.1", "::ffff:7f00:1", "::ffff:a9fe:a9fe",
    "64:ff9b::a9fe:a9fe", "2002:c0a8:1::", "fc00::1", "fd12::1", "fe80::1", "not-an-ip"])
    assert.equal(isBlockedAddress(ip), true, ip);
  for (const ip of ["8.8.8.8", "1.1.1.1", "2606:4700:4700::1111", "::ffff:8.8.8.8"])
    assert.equal(isBlockedAddress(ip), false, ip);
});
