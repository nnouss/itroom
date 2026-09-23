import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { readFile, writeFile, mkdir } from "node:fs/promises";

// Reuse Next's installed image tooling; no new package or runtime dependency.
const require = createRequire(import.meta.url);
const sharp = require(require.resolve("sharp", { paths: [require.resolve("next")] }));
const root = new URL("../../", import.meta.url);
const source = await readFile(new URL("app/icon.svg", root), "utf8");
const square = source.replaceAll('rx="14"', 'rx="0"');
// The centered i fits inside the 80% safe circle without additional scaling.
const maskable = square;
const png = (svg, size) => sharp(Buffer.from(svg), { density: 288 }).resize(size, size).png().toBuffer();
await mkdir(new URL("public/icons/", root), { recursive: true });
for (const size of [192, 512]) {
  await writeFile(new URL(`public/icons/icon-${size}.png`, root), await png(source, size));
}
await writeFile(new URL("app/apple-icon.png", root), await sharp(await png(square, 180)).removeAlpha().png().toBuffer());
await writeFile(new URL("public/icons/maskable-512.png", root), await sharp(await png(maskable, 512)).removeAlpha().png().toBuffer());

// ICO directory + uncompressed BGRA DIBs and AND masks for legacy readers.
const sizes = [16, 32, 48];
const header = Buffer.alloc(6 + 16 * sizes.length);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
const frames = [];
let offset = header.length;
for (const [i, size] of sizes.entries()) {
  const rgba = await sharp(await png(source, size)).ensureAlpha().raw().toBuffer();
  const stride = Math.ceil(size / 32) * 4;
  const dib = Buffer.alloc(40 + size * size * 4 + stride * size);
  dib.writeUInt32LE(40, 0);
  dib.writeInt32LE(size, 4);
  dib.writeInt32LE(size * 2, 8);
  dib.writeUInt16LE(1, 12);
  dib.writeUInt16LE(32, 14);
  dib.writeUInt32LE(size * size * 4 + stride * size, 20);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const src = (y * size + x) * 4;
    const dest = 40 + ((size - 1 - y) * size + x) * 4;
    dib[dest] = rgba[src + 2]; dib[dest + 1] = rgba[src + 1];
    dib[dest + 2] = rgba[src]; dib[dest + 3] = rgba[src + 3];
    if (rgba[src + 3] === 0) dib[40 + size * size * 4 + (size - 1 - y) * stride + (x >> 3)] |= 0x80 >> (x % 8);
  }
  const entry = 6 + i * 16;
  header[entry] = size; header[entry + 1] = size;
  header.writeUInt16LE(1, entry + 4); header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(dib.length, entry + 8); header.writeUInt32LE(offset, entry + 12);
  frames.push(dib); offset += dib.length;
}
await writeFile(new URL("app/favicon.ico", root), Buffer.concat([header, ...frames]));

// All icons shown at actual pixel size; 180px is the square Apple variant.
const width = 1200, height = 1320;
const columns = [70, 170, 280, 460, 900];
const previewSizes = [16, 32, 48, 180, 512];
const layers = [];
for (const [row, background] of ["#f0f2f5", "#0b0b0c"].entries()) {
  const top = row * 660;
  const foreground = row ? "#f5f5f5" : "#141414";
  const labels = previewSizes.map((size, i) => `<text x="${columns[i]}" y="${top + 114}" text-anchor="middle">${size}px</text>`).join("");
  const panel = `<svg width="${width}" height="${height}"><rect y="${top}" width="1200" height="660" fill="${background}"/><g fill="${foreground}" font-family="sans-serif" font-size="18"><text x="40" y="${top + 52}" font-size="24">ITROOM / SUNSET — ${row ? "DARK" : "LIGHT"}</text>${labels}</g></svg>`;
  layers.push({ input: Buffer.from(panel), left: 0, top: 0 });
  for (const [i, size] of previewSizes.entries()) {
    layers.push({ input: await png(size === 180 ? square : source, size), left: columns[i] - size / 2, top: top + 140 + Math.floor((512 - size) / 2) });
  }
}
await sharp({ create: { width, height, channels: 3, background: "white" } }).composite(layers).png().toFile(fileURLToPath(new URL("docs/brand/icon-preview.png", root)));
console.log("Generated SVG-derived PNGs, 16/32/48 ICO, and light/dark preview.");
