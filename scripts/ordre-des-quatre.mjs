/**
 * L ORDRE DES QUATRE NOMBRES D UNE SEANCE, VERIFIE AVANT D EN FAIRE UN DESSIN.
 *
 * Une bougie suppose un ordre : bas, corps, haut. Si l ordre n est pas celui
 * qu on croit, le dessin ment sans qu on s en apercoive, et il ment d autant
 * mieux qu il est joli.
 *
 * CE QU ON CROIT SAVOIR, et qu il faut etablir :
 *
 *   Le Tresor sert du MEILLEUR pour lui en descendant la liste. Donc la
 *   soumission la moins chere est TOUJOURS servie, et la limite est la
 *   derniere acceptee. Il suit que, pour un BTA exprime en taux :
 *
 *     min propose  <=  moyen pondere  <=  limite  <=  max propose
 *
 *   La bande SERVIE est donc [min, limite], et la queue REFUSEE est
 *   (limite, max]. Pour un OTA exprime en prix, tout s inverse :
 *
 *     max propose  >=  moyen pondere  >=  limite  >=  min propose
 *
 * Si cela tient, la bougie a un sens exact : le corps est ce qui a ete
 * servi, la meche haute est ce qui a ete demande et refuse, et la marque
 * interieure est le moyen pondere.
 *
 *   npx tsx --conditions=react-server scripts/ordre-des-quatre.mjs
 */
import fs from "node:fs";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { repo } = await import("../src/lib/data/index.ts");
const dire = (s) => fs.writeSync(1, `${s}\n`);

const toutes = await repo().listAuctionResults({ limit: 2000 });
const compte = { bta: 0, btaOk: 0, ota: 0, otaOk: 0 };
const fautes = [];

for (const r of toutes) {
  if (r.instrument === "BTA") {
    const { rateMin: a, rateAvg: b, rateLimit: c, rateMax: d } = r;
    if ([a, b, c, d].some((v) => v == null)) continue;
    compte.bta += 1;
    if (a <= b && b <= c && c <= d) compte.btaOk += 1;
    else fautes.push({ r, ordre: `min ${a} · moyen ${b} · limite ${c} · max ${d}` });
  }
  if (r.instrument === "OTA") {
    const { priceMin: a, priceAvg: b, priceLimit: c, priceMax: d } = r;
    if ([a, b, c, d].some((v) => v == null)) continue;
    compte.ota += 1;
    if (d >= b && b >= c && c >= a) compte.otaOk += 1;
    else fautes.push({ r, ordre: `min ${a} · moyen ${b} · limite ${c} · max ${d}` });
  }
}

dire(`BTA : ${compte.btaOk} sur ${compte.bta} suivent min <= moyen <= limite <= max`);
dire(`OTA : ${compte.otaOk} sur ${compte.ota} suivent max >= moyen >= limite >= min\n`);

if (fautes.length) {
  dire(`=== ${fautes.length} SEANCE(S) HORS DE L ORDRE ===`);
  for (const f of fautes.slice(0, 12)) {
    dire(`   ${f.r.sessionOn} ${String(f.r.country).padEnd(12)} ${f.r.instrument} ${String(f.r.codeEmission ?? "—").padEnd(14)} ${f.ordre}`);
  }
  if (fautes.length > 12) dire(`   … et ${fautes.length - 12} autres`);
} else {
  dire("Aucune seance hors de l ordre : la bougie peut se dessiner sur cette lecture.");
}

/* LA QUEUE REFUSEE : quelle part de l ecart total le Tresor a-t-il refusee ?
   C est ce que la meche montrerait, et il faut savoir si elle est visible. */
const parts = [];
for (const r of toutes) {
  const [a, c, d] = r.instrument === "BTA" ? [r.rateMin, r.rateLimit, r.rateMax] : [r.priceMax, r.priceLimit, r.priceMin];
  if ([a, c, d].some((v) => v == null)) continue;
  const total = Math.abs(d - a);
  if (!(total > 0)) continue;
  parts.push(Math.round((100 * Math.abs(d - c)) / total));
}
const t = parts.sort((x, y) => x - y);
const med = t.length ? t[Math.floor(t.length / 2)] : null;
dire(`\n=== LA MECHE, PART DE L ECART TOTAL QUE LE TRESOR A REFUSEE ===`);
dire(`   ${t.length} seances · mediane ${med} % · 1er quartile ${t[Math.floor(t.length * 0.25)]} % · 3e ${t[Math.floor(t.length * 0.75)]} %`);
dire(`   ${t.filter((x) => x === 0).length} seances ou RIEN n a ete refuse : la limite est le plus cher propose.`);
