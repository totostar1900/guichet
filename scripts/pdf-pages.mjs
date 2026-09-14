// Render selected pages of a PDF to PNG (dev helper for reading scanned statements).
// usage: node scripts/pdf-pages.mjs <file.pdf> <outDir> <pages e.g. 9-13> [scale]
import { readFileSync, writeFileSync } from "node:fs";
import { createCanvas } from "canvas";
const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
class NodeCanvasFactory {
  create(width, height) { const canvas = createCanvas(width, height); return { canvas, context: canvas.getContext("2d") }; }
  reset(cc, width, height) { cc.canvas.width = width; cc.canvas.height = height; }
  destroy(cc) { cc.canvas.width = 0; cc.canvas.height = 0; cc.canvas = null; cc.context = null; }
}
const [file, outDir, range, scaleArg] = process.argv.slice(2);
const [a, b] = range.split("-").map(Number);
const scale = Number(scaleArg ?? 1.6);
const doc = await pdfjs.getDocument({ data: new Uint8Array(readFileSync(file)), disableFontFace: true, CanvasFactory: NodeCanvasFactory }).promise;
for (let p = a; p <= (b ?? a) && p <= doc.numPages; p++) {
  const page = await doc.getPage(p);
  const vp = page.getViewport({ scale });
  const canvas = createCanvas(vp.width, vp.height);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, vp.width, vp.height);
  await page.render({ canvasContext: ctx, viewport: vp, canvas }).promise;
  const out = `${outDir}/${file.split(/[\/]/).pop().replace(/\.pdf$/i, "")}-p${p}.png`;
  writeFileSync(out, canvas.toBuffer("image/png"));
  console.log(out, Math.round(vp.width), "x", Math.round(vp.height));
}
