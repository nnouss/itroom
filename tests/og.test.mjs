import assert from "node:assert/strict";
import { test } from "node:test";
import { createServer } from "node:http";
import { fetchLinkPreview } from "../lib/og.ts";

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
    ]) {
      assert.equal(await fetchLinkPreview(url), null, url);
    }
  } finally {
    server.close();
  }
});
