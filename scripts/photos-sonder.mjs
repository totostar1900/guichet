/** Ce que valent les photos livrées : format, et surtout clarté moyenne. */
import fs from "node:fs";
import sharp from "sharp";

const D = "C:/Users/Nitch/AppData/Local/Temp/claude/C--Users-Nitch-OneDrive---PURPOSE-CAPITAL-MyChamaProject/a342ef12-6ae7-41bd-8a4e-9fe5b5ebf7df/images";

const fichiers = fs
  .readdirSync(D)
  .filter((x) => /\.(jpg|jpeg|png)$/i.test(x))
  .sort((a, b) => parseInt(a) - parseInt(b));

for (const f of fichiers) {
  const p = `${D}/${f}`;
  const m = await sharp(p).metadata();
  const { data } = await sharp(p).resize(64, 64, { fit: "inside" }).greyscale().raw().toBuffer({ resolveWithObject: true });
  let t = 0;
  let clairs = 0;
  for (const v of data) {
    t += v;
    if (v > 170) clairs++;
  }
  const moy = Math.round(t / data.length);
  const pctClairs = Math.round((clairs / data.length) * 100);
  console.log(`${f.padEnd(8)} ${String(m.width).padStart(5)}x${String(m.height).padEnd(5)} r=${(m.width / m.height).toFixed(2).padStart(5)}  luminance ${String(moy).padStart(3)}/255  pixels clairs ${String(pctClairs).padStart(3)}%`);
}
