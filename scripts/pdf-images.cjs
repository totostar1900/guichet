// Dump embedded JPEG (DCTDecode) images of a PDF: the usual content of scanned statements.
// usage: node scripts/pdf-images.cjs <file.pdf> <outDir> [maxImages]
const fs = require("fs");
const [file, outDir, max] = process.argv.slice(2);
const buf = fs.readFileSync(file);
const txt = buf.toString("latin1");
let n = 0, pos = 0;
const filters = {};
const re = /\/Filter\s*\/(\w+)/g; let m; while ((m = re.exec(txt))) filters[m[1]] = (filters[m[1]] ?? 0) + 1;
console.log("filters:", filters);
while ((pos = txt.indexOf("stream", pos)) >= 0) {
  const head = txt.lastIndexOf("obj", pos);
  const dict = txt.slice(head, pos);
  pos += 6;
  if (!/\/Subtype\s*\/Image/.test(dict) || !/DCTDecode/.test(dict)) continue;
  const start = txt[pos] === "\r" ? pos + 2 : pos + 1;
  const end = txt.indexOf("endstream", start);
  const w = Number(/\/Width\s+(\d+)/.exec(dict)?.[1]), h = Number(/\/Height\s+(\d+)/.exec(dict)?.[1]);
  if (w < 400 || h < 400) continue; // logos, signatures
  const out = `${outDir}/${file.split(/[\/]/).pop().replace(/\.pdf$/i, "")}-img${++n}.jpg`;
  fs.writeFileSync(out, buf.subarray(start, end));
  console.log(out, w, "x", h);
  if (max && n >= Number(max)) break;
}
console.log(n, "images");
