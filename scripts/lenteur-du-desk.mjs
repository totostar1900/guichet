/**
 * OU PASSENT LES SEPT SECONDES DU DESK ?
 *
 * Mesure sur la production : le serveur repond en 110 ms (TTFB) puis met
 * 2,4 a 7,3 secondes a PRODUIRE le HTML. Ce n est ni le reseau, ni le
 * JavaScript (14 fichiers, 5 Ko), ni la colonne. C est le rendu serveur et
 * ses lectures.
 *
 * ON NE DEVINE PAS LAQUELLE COUTE : on les chronometre une par une, contre
 * la vraie base, et on les classe. Une optimisation posee sans cette liste
 * est une optimisation posee au hasard.
 *
 * CHAQUE LECTURE EST FAITE DEUX FOIS : la premiere paie l etablissement de
 * la connexion, la seconde dit le cout reel. On garde les deux, parce que la
 * premiere est celle que paie un visiteur sur une fonction froide.
 *
 *   npx tsx --conditions=react-server scripts/lenteur-du-desk.mjs
 */
import fs from "node:fs";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const dire = (s) => fs.writeSync(1, `${s}\n`);
const { repo } = await import("../src/lib/data/index.ts");
const r = repo();

/** Ce que la mise en page et le carnet lisent, dans l ordre ou ils le font. */
const LECTURES = [
  ["layout · loadRegistry", async () => (await import("../src/lib/reference.ts")).loadRegistry?.() ?? null],
  ["layout · countOffers", () => r.listOffers()],
  ["layout · listAudit(poste)", () => r.listAudit({ actorId: "x", from: new Date().toISOString().slice(0, 10), limit: 500 })],
  ["layout · listApprovals", () => r.listApprovals(true)],
  ["carnet · listOffers", () => r.listOffers()],
  ["carnet · listIntents", () => r.listIntents()],
  ["carnet · listEvents(30)", () => r.listEvents(30)],
  ["carnet · listNotifications(20)", () => r.listNotifications(20)],
  ["carnet · listContacts", () => r.listContacts()],
  ["carnet · listAuctionResults(800)", () => r.listAuctionResults({ limit: 800 })],
  ["marche · listQuotes", () => r.listQuotes?.() ?? null],
  ["marche · listFundNavs", () => r.listFundNavs?.() ?? null],
];

const chrono = async (f) => {
  const t = Date.now();
  let n = 0;
  try {
    const v = await f();
    n = Array.isArray(v) ? v.length : v == null ? -1 : 1;
  } catch (e) {
    return { ms: Date.now() - t, n: -2, err: String(e.message).slice(0, 40) };
  }
  return { ms: Date.now() - t, n };
};

dire(`=== CHAQUE LECTURE, A FROID PUIS A CHAUD ===\n`);
dire(`${"lecture".padEnd(34)} ${"froid".padStart(7)} ${"chaud".padStart(7)}  lignes`);
const mesures = [];
for (const [nom, f] of LECTURES) {
  const a = await chrono(f);
  const b = await chrono(f);
  mesures.push({ nom, froid: a.ms, chaud: b.ms, n: b.n, err: a.err });
  dire(`${nom.padEnd(34)} ${String(a.ms).padStart(6)}ms ${String(b.ms).padStart(6)}ms  ${a.err ? `ERREUR ${a.err}` : b.n < 0 ? "—" : b.n}`);
}

dire(`\n=== LES PLUS COUTEUSES, A CHAUD ===`);
for (const m of [...mesures].sort((a, b) => b.chaud - a.chaud).slice(0, 6)) dire(`   ${String(m.chaud).padStart(6)} ms  ${m.nom}  (${m.n < 0 ? "—" : `${m.n} lignes`})`);

const total = mesures.reduce((a, m) => a + m.chaud, 0);
dire(`\n   somme des lectures a chaud : ${total} ms`);
dire(`   SI ELLES ETAIENT TOUTES EN PARALLELE : ${Math.max(...mesures.map((m) => m.chaud))} ms`);
dire(`\n   Le carnet en fait six en parallele PUIS une septieme en serie.`);
