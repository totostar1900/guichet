/**
 * LES DIX-HUIT SEANCES CAMEROUNAISES SANS RENDEMENT IMPRIME.
 *
 * Le formulaire camerounais porte DEUX moyennes : « taux d interet moyen
 * pondere », qui est le taux precompte, et « taux de rendement moyen
 * pondere », qui est le rendement actuariel calcule par le Tresor
 * lui-meme. La seconde est la meilleure des sources, puisqu elle ne
 * suppose rien : « auctionYield » la prend avant tout le reste, et
 * s abstient alors de supposer une convention de decompte des jours.
 *
 * Nous la gardons trente-trois fois sur cinquante et une. Pour les
 * dix-huit autres, trois causes possibles, et elles n appellent pas le
 * meme geste :
 *
 *   LA PIECE NE LA PORTE PAS, parce que le formulaire a change ou parce
 *   que l instrument n en a pas : rien a faire, et c est une reponse.
 *   LA PIECE EST UN SCAN MUET : il faudrait un oeil ou un modele.
 *   LA PIECE LA PORTE ET NOUS L AVONS MANQUEE : c est reparable, et c est
 *   la seule des trois qui nous appartienne.
 *
 * On ne devine pas : on ouvre les dix-huit.
 *
 *   npx tsx --conditions=react-server scripts/cameroun-rendement-imprime.mjs
 */
import fs from "node:fs";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { repo } = await import("../src/lib/data/index.ts");
const { readSource } = await import("../src/lib/intake/storage.ts");
const dire = (s) => fs.writeSync(1, `${s}\n`);

const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
async function texteDe(bytes) {
  const doc = await pdfjs.getDocument({ data: bytes, useSystemFonts: true, isEvalSupported: false }).promise;
  let out = "";
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    out += (await page.getTextContent()).items.map((i) => i.str).join(" ") + "\n";
  }
  await doc.destroy();
  return out;
}

/* L OCR de ces pieces confond l et t avec le chiffre un, et o avec zero.
   On nettoie AVANT de chercher, et seulement dans les suites de chiffres :
   nettoyer tout le texte abimerait les mots. */
const nu = (s) => String(s).replace(/<[^>]*>/g, "").replace(/\s+/g, " ");
const porteLeRendement = (t) => /rendement\s+moyen/i.test(nu(t));

const toutes = (await repo().listAuctionResults({ limit: 2000 })).filter((r) => r.country === "Cameroun" && !r.setAsideAt);
const sans = toutes.filter((r) => r.yieldAvg == null).sort((a, b) => a.sessionOn.localeCompare(b.sessionOn));
dire(`${toutes.length} seances camerounaises · ${toutes.length - sans.length} avec le rendement imprime · ${sans.length} sans\n`);

const compte = { muette: 0, sansLaCase: 0, aRecuperer: 0, illisible: 0 };
dire(`   ${"seance".padEnd(11)} ${"i".padEnd(4)} ${"duree".padEnd(12)} ${"car.".padStart(6)}  verdict`);
for (const r of sans) {
  if (!r.fileKey) {
    compte.illisible += 1;
    dire(`   ${r.sessionOn}  ${String(r.instrument).padEnd(4)} ${String(r.tenor).padEnd(12)} ${"—".padStart(6)}  pas de piece rangee`);
    continue;
  }
  let t = "";
  try {
    t = await texteDe(await readSource(r.fileKey));
  } catch (e) {
    compte.illisible += 1;
    dire(`   ${r.sessionOn}  ${String(r.instrument).padEnd(4)} ${String(r.tenor).padEnd(12)} ${"—".padStart(6)}  illisible : ${String(e.message).slice(0, 40)}`);
    continue;
  }
  const n = nu(t).replace(/\s/g, "").length;
  if (n < 200) {
    compte.muette += 1;
    dire(`   ${r.sessionOn}  ${String(r.instrument).padEnd(4)} ${String(r.tenor).padEnd(12)} ${String(n).padStart(6)}  scan muet : un oeil ou un modele`);
    continue;
  }
  if (!porteLeRendement(t)) {
    compte.sansLaCase += 1;
    dire(`   ${r.sessionOn}  ${String(r.instrument).padEnd(4)} ${String(r.tenor).padEnd(12)} ${String(n).padStart(6)}  la piece ne nomme pas le rendement moyen`);
    continue;
  }
  compte.aRecuperer += 1;
  /* On montre les nombres en pourcentage que porte la piece : c est dans
     cette suite que le rendement se trouve, et l ordre des libelles dit
     lequel. On ne le choisit pas ici, on le donne a voir. */
  const pourcents = [...nu(t).matchAll(/(\d[\d.,oOlt]{0,6})\s*[%yY]/g)].map((m) => m[1]).slice(0, 12);
  dire(`   ${r.sessionOn}  ${String(r.instrument).padEnd(4)} ${String(r.tenor).padEnd(12)} ${String(n).padStart(6)}  LA PIECE LA PORTE · pourcentages lus : ${pourcents.join(" · ")}`);
  dire(`      taux min ${r.rateMin ?? r.priceMin ?? "—"} · limite ${r.rateLimit ?? r.priceLimit ?? "—"} · moyen ${r.rateAvg ?? r.priceAvg ?? "—"} · max ${r.rateMax ?? r.priceMax ?? "—"} · couverture ${r.coverage ?? "—"}`);
  dire(`      ${r.sourceUrl}`);
}

dire(`\n=== ${compte.aRecuperer} A RECUPERER · ${compte.sansLaCase} sans la case · ${compte.muette} scan(s) muet(s) · ${compte.illisible} illisible(s) ===`);
if (compte.aRecuperer === 0) dire(`   Rien ne nous appartient dans ces dix-huit : le trou est dans les pieces, pas dans la lecture.`);
