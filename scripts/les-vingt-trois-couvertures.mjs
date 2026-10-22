/**
 * LES VINGT-TROIS COUVERTURES QUI NE TOMBENT NULLE PART.
 *
 * Le taux de couverture est un RAPPORT dont les deux termes sont imprimes
 * a cote de lui : il se verifie donc sans rien supposer, et c est lui qui
 * a prouve que la fiche parle bien des offres non servies. Cent vingt-trois
 * seances le calculent sur les SOUMISSIONS, onze sur le SERVI, et
 * quatre-vingt-sept sont muettes parce que tout a ete servi.
 *
 * Restent vingt-trois ou il ne tombe NI SUR L UN NI SUR L AUTRE. Trois
 * causes possibles, et elles n appellent pas le meme geste :
 *
 *   UN DES TROIS NOMBRES EST MAL LU, et c est reparable ;
 *   LE TRESOR DIVISE PAR AUTRE CHOSE, par exemple le montant servi d une
 *   seule ligne quand la seance en porte plusieurs, et c est a comprendre ;
 *   LE TRESOR SE TROMPE, et c est a noter sans y toucher.
 *
 * ON CHERCHE DONC LE DIVISEUR : connaissant le rapport imprime et le
 * numerateur probable, on retrouve ce par quoi il a fallu diviser, et on
 * regarde si ce nombre ressemble a quelque chose de la piece.
 *
 *   npx tsx --conditions=react-server scripts/les-vingt-trois-couvertures.mjs
 */
import fs from "node:fs";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { repo } = await import("../src/lib/data/index.ts");
const dire = (s) => fs.writeSync(1, `${s}\n`);
const M = (v) => (v == null ? "—" : (Number(v) / 1e6).toLocaleString("fr-FR", { maximumFractionDigits: 0 }));
const fr = (v, n = 2) => (v == null ? "—" : Number(v).toLocaleString("fr-FR", { minimumFractionDigits: n, maximumFractionDigits: n }));
const TOL = 0.5;

const toutes = (await repo().listAuctionResults({ limit: 2000 })).filter((r) => !r.setAsideAt);
const testables = toutes.filter((r) => r.coverage != null && r.announced != null && Number(r.announced) > 0 && r.bid != null && r.served != null);

const orphelines = [];
for (const r of testables) {
  const a = Number(r.announced);
  const parCarnet = (Number(r.bid) / a) * 100;
  const parServi = (Number(r.served) / a) * 100;
  const c = Number(r.coverage);
  if (Math.abs(parCarnet - parServi) < 0.01) continue; /* muette */
  if (Math.abs(c - parCarnet) <= TOL || Math.abs(c - parServi) <= TOL) continue;
  orphelines.push({ r, c, parCarnet, parServi, a });
}

dire(`${testables.length} seances verifiables · ${orphelines.length} dont la couverture ne tombe nulle part\n`);

/* LE DIVISEUR IMPLIQUE. Si le numerateur est la soumission, par quoi le
   Tresor a-t-il divise pour obtenir son pourcentage ? Et ce nombre
   ressemble-t-il au servi, au nominal d une ligne, a autre chose ? */
dire(`   ${"seance".padEnd(11)} ${"pays".padEnd(12)} ${"i".padEnd(4)} ${"annonce".padStart(8)} ${"soumis".padStart(8)} ${"servi".padStart(8)} ${"imprime".padStart(9)} ${"carnet".padStart(8)} ${"servi/a".padStart(8)}   diviseur impliqué`);
const familles = new Map();
for (const x of orphelines.sort((p, q) => p.r.sessionOn.localeCompare(q.r.sessionOn))) {
  const r = x.r;
  const divSoumis = (Number(r.bid) / x.c) * 100;
  const divServi = (Number(r.served) / x.c) * 100;
  /* On nomme ce que le diviseur vaut, quand il vaut quelque chose de connu. */
  const nomme = (v) => {
    if (Math.abs(v - Number(r.announced)) / Number(r.announced) < 0.01) return "l'annoncé";
    if (r.served != null && Math.abs(v - Number(r.served)) / Math.max(1, Number(r.served)) < 0.01) return "le servi";
    if (r.bid != null && Math.abs(v - Number(r.bid)) / Math.max(1, Number(r.bid)) < 0.01) return "les soumissions";
    return null;
  };
  const quoi = nomme(divSoumis) ? `soumissions / ${nomme(divSoumis)}` : nomme(divServi) ? `servi / ${nomme(divServi)}` : null;
  const etiquette = quoi ?? `inconnu : ${M(divSoumis)} M si le numérateur est la soumission`;
  familles.set(etiquette, (familles.get(etiquette) ?? 0) + 1);
  dire(
    `   ${r.sessionOn}  ${String(r.country).padEnd(12)} ${String(r.instrument).padEnd(4)} ${M(r.announced).padStart(8)} ${M(r.bid).padStart(8)} ${M(r.served).padStart(8)} ` +
      `${(fr(x.c) + " %").padStart(9)} ${(fr(x.parCarnet) + " %").padStart(8)} ${(fr(x.parServi) + " %").padStart(8)}   ${etiquette}`,
  );
}

dire(`\n=== LES FAMILLES ===`);
for (const [quoi, n] of [...familles].sort((a, b) => b[1] - a[1])) dire(`   ${String(n).padStart(3)} · ${quoi}`);

/* UNE SEANCE A PLUSIEURS LIGNES partage son montant annonce : si le Tresor
   divise par l annonce de LA SEANCE entiere alors que nous gardons celle de
   la ligne, le rapport ne tombe pas. On le teste. */
dire(`\n=== ET SI L ANNONCE ETAIT CELLE DE LA SEANCE ENTIERE ? ===`);
let explique = 0;
for (const x of orphelines) {
  const r = x.r;
  const soeurs = toutes.filter((y) => y.country === r.country && y.sessionOn === r.sessionOn);
  if (soeurs.length < 2) continue;
  const annonceTotale = soeurs.reduce((s, y) => s + Number(y.announced ?? 0), 0);
  if (!annonceTotale) continue;
  const parSeance = (Number(r.bid) / annonceTotale) * 100;
  const parSeanceServi = (Number(r.served) / annonceTotale) * 100;
  if (Math.abs(x.c - parSeance) <= TOL || Math.abs(x.c - parSeanceServi) <= TOL) {
    explique += 1;
    dire(`   ${r.sessionOn} ${r.country} ${r.instrument} : ${soeurs.length} lignes ce jour-la, annonce totale ${M(annonceTotale)} M → ${fr(Math.abs(x.c - parSeance) <= TOL ? parSeance : parSeanceServi)} % · imprime ${fr(x.c)} %`);
  }
}
dire(`   ${explique} seance(s) sur ${orphelines.length} s expliquent ainsi.`);
