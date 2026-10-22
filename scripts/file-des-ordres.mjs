/**
 * LA FILE DES ORDRES : QU EST-CE QU ELLE NE DIT PAS ?
 *
 * Le carnet du desk range les intentions par etat, avec sa recherche, son
 * tri et ses pastilles. Un etat dit OU en est un ordre ; il ne dit pas
 * DEPUIS QUAND il y est, et c est la seule chose qu une file doive dire.
 * « Douze a traiter » se lit pareil que la file compte douze ordres d hier
 * ou un ordre de quarante jours et onze de ce matin.
 *
 * On mesure donc l anciennete DANS L ETAT COURANT, et non depuis la
 * reception : un ordre recu il y a trente jours mais confirme hier n a pas
 * attendu trente jours, il en a attendu un. C est le journal des
 * evenements qui porte la derniere transition.
 *
 * ON REGARDE AUSSI CE QUI NE BOUGERA PLUS TOUT SEUL : une offre close dont
 * l ordre est encore « recue », une signature attendue depuis des
 * semaines, un code a usage unique jamais consomme.
 *
 *   npx tsx --conditions=react-server scripts/file-des-ordres.mjs
 */
import fs from "node:fs";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { repo } = await import("../src/lib/data/index.ts");
const dire = (s) => fs.writeSync(1, `${s}\n`);
const AUJ = new Date();
const jours = (iso) => (iso ? Math.round((AUJ.getTime() - Date.parse(iso)) / 86_400_000) : null);
const med = (xs) => (xs.length ? [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] : null);

const r = repo();
const [intents, offres, events] = await Promise.all([r.listIntents(), r.listOffers(), r.listEvents(4000).catch(() => [])]);
dire(`${intents.length} ordres · ${offres.length} offres · ${events.length} evenements au journal\n`);

const parOffre = new Map(offres.map((o) => [o.id, o]));

/* LA DERNIERE TRANSITION. Le journal porte les changements d etat ; a
   defaut, on retombe sur la creation, en le disant. */
const derniereBougee = new Map();
for (const e of events) {
  const id = e.intentId ?? e.entityId ?? null;
  if (!id) continue;
  const quand = e.at ?? e.createdAt;
  if (!quand) continue;
  const vu = derniereBougee.get(id);
  if (!vu || quand > vu) derniereBougee.set(id, quand);
}

const OUVERTS = ["recue", "contre_proposee", "confirmee", "transmise"];
const parEtat = new Map();
for (const i of intents) {
  const depuis = derniereBougee.get(i.id) ?? i.createdAt;
  const age = jours(depuis) ?? 0;
  const c = parEtat.get(i.state) ?? { n: 0, ages: [], sansJournal: 0 };
  c.n += 1;
  c.ages.push(age);
  if (!derniereBougee.has(i.id)) c.sansJournal += 1;
  parEtat.set(i.state, c);
  i._age = age;
}

dire(`=== DEPUIS QUAND CHAQUE ORDRE EST-IL DANS SON ETAT ? ===`);
dire(`   ${"etat".padEnd(18)} ${"n".padStart(4)} ${"median".padStart(8)} ${"le plus vieux".padStart(14)} ${"sans journal".padStart(13)}`);
for (const [etat, c] of [...parEtat].sort((a, b) => b[1].n - a[1].n)) {
  const ouvert = OUVERTS.includes(etat);
  dire(
    `   ${(ouvert ? etat : `${etat} (clos)`).padEnd(18)} ${String(c.n).padStart(4)} ${(med(c.ages) + " j").padStart(8)} ${(Math.max(...c.ages) + " j").padStart(14)} ${String(c.sansJournal).padStart(13)}`,
  );
}

const ouverts = intents.filter((i) => OUVERTS.includes(i.state));
dire(`\n=== ${ouverts.length} ORDRE(S) OUVERT(S) ===`);
const vieux = ouverts.filter((i) => i._age > 14).sort((a, b) => b._age - a._age);
dire(`   ${vieux.length} attendent depuis plus de quinze jours\n`);
for (const i of vieux.slice(0, 12)) {
  const o = parOffre.get(i.offerId);
  dire(`   ${String(i.ref).padEnd(14)} ${String(i.state).padEnd(16)} ${String(i._age).padStart(4)} j · ${String(i.clientName).slice(0, 20).padEnd(20)} · ${String(o?.title ?? "ligne inconnue").slice(0, 34)}`);
}

dire(`\n=== CE QUI NE BOUGERA PLUS TOUT SEUL ===`);
const now = new Date().toISOString();
const closes = ouverts.filter((i) => {
  const o = parOffre.get(i.offerId);
  return o?.deadlineAt && o.deadlineAt < now;
});
dire(`   ${closes.length} ordre(s) ouvert(s) sur une ligne dont la date limite est PASSEE`);
for (const i of closes.slice(0, 8)) {
  const o = parOffre.get(i.offerId);
  dire(`      ${String(i.ref).padEnd(14)} ${String(i.state).padEnd(16)} limite ${String(o?.deadlineAt).slice(0, 10)} · ${String(o?.title ?? "").slice(0, 34)}`);
}

const sansSignature = ouverts.filter((i) => !i.signedAt && ["confirmee", "transmise"].includes(i.state));
dire(`\n   ${sansSignature.length} ordre(s) confirme(s) ou transmis SANS signature`);

const codeEnAttente = intents.filter((i) => i.pendingCodeAt && !i.signedAt);
dire(`   ${codeEnAttente.length} code(s) a usage unique envoye(s) et jamais consomme(s)`);
for (const i of codeEnAttente.slice(0, 6)) dire(`      ${String(i.ref).padEnd(14)} envoye il y a ${jours(i.pendingCodeAt)} j · ${i.pendingCodeTries ?? 0} essai(s)`);

const sansLigne = ouverts.filter((i) => !parOffre.has(i.offerId));
dire(`\n   ${sansLigne.length} ordre(s) ouvert(s) dont la ligne n existe plus`);
