/**
 * Confirmer en lot des séances d'adjudication lues par la machine.
 *
 *   node scripts/confirmer-adjudications.mjs Gabon RCA
 *   node scripts/confirmer-adjudications.mjs Gabon RCA --ecrire --par "Prénom Nom" --compte vous@exemple.com
 *
 * Ce que confirmer veut dire, et pourquoi ce script est long.
 *
 * Dans le Guichet, confirmer une séance n'est pas un rangement : c'est ce qui
 * autorise son chiffre à servir de référence au taux proposé à un client. Le
 * desk le fait normalement une séance à la fois, la pièce ouverte à côté de
 * l'écran, et c'est la seule barrière qui existe entre une faute de lecture et
 * un prix annoncé à quelqu'un.
 *
 * Il y a un cas où l'on veut malgré tout le faire en lot : la reprise d'un
 * historique. Deux cent quarante-neuf communiqués dorment chez la BEAC, la
 * machine les a lus, et les relire un à un coûterait des jours de desk pour un
 * bénéfice que personne n'a demandé. Ce script est fait pour ce cas-là, et
 * pour lui seul.
 *
 * Trois précautions, qui sont tout l'intérêt du fichier.
 *
 *   Il ne fait rien sans « --ecrire ». Par défaut il montre ce qu'il ferait,
 *   ce qu'il écarterait, et pourquoi.
 *
 *   Il passe les lectures à un crible avant de les proposer. Le crible n'a pas
 *   la pièce et ne juge donc pas de la justesse d'un chiffre : il cherche ce
 *   qui ne ressemble pas à une adjudication de la zone, c'est-à-dire ce qu'une
 *   faute de lecture produirait. Ce qu'il écarte n'est pas rejeté, il est
 *   laissé au desk.
 *
 *   Il signe, et de deux façons, parce que l'application en fait deux. La
 *   séance porte le nom affiché de la personne (« --par »), comme le fait
 *   l'écran de relecture ; le journal d'audit porte l'adresse du compte
 *   (« --compte »), comme le fait audit(). Les confondre rendrait le journal
 *   illisible au moment précis où on le lirait : quand quelqu'un demandera qui
 *   a arrêté ce chiffre.
 *
 * La trace : une seule entrée d'audit pour le lot, qui dit que c'en était un.
 * Écrire quatre-vingt-quatorze entrées ferait croire à quatre-vingt-quatorze
 * relectures individuelles, ce qui serait faux. Le journal d'audit est chaîné
 * par empreintes, chaque ligne scellant la précédente : la forme est reprise
 * telle quelle de src/lib/data/supabase.ts, et une ligne mal formée casserait
 * la chaîne en silence.
 */
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

const args = process.argv.slice(2);
const ecrire = args.includes("--ecrire");
const par = args.includes("--par") ? args[args.indexOf("--par") + 1] : undefined;
// Le journal d'audit nomme un compte, la séance nomme une personne : les
// cinquante-sept confirmations déjà faites portent « Test Toto » sur la séance
// et l'adresse du compte au journal.
const compte = args.includes("--compte") ? args[args.indexOf("--compte") + 1] : undefined;
const pays = args.filter((a) => !a.startsWith("--") && a !== par && a !== compte);

if (!pays.length) {
  console.error('usage : node scripts/confirmer-adjudications.mjs <Pays> [Pays...] [--ecrire --par "Prénom Nom" --compte vous@exemple.com]');
  process.exit(1);
}
if (ecrire && (!par || !compte)) {
  console.error('« --ecrire » demande « --par "Prénom Nom" » et « --compte vous@exemple.com » : la séance porte le nom, le journal porte le compte.');
  process.exit(1);
}

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "")]),
);
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !KEY) throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants dans .env.local");
const head = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };
const n = (x) => (x == null ? null : Number(x));

/**
 * Le crible.
 *
 * Chaque motif correspond à une faute de lecture déjà vue sur ces pièces, ou à
 * une impossibilité arithmétique. Aucun ne prétend dire qu'un chiffre est
 * juste : seulement qu'il ne se contredit pas lui-même.
 */
function cribler(r) {
  const taux = n(r.rate_avg) ?? n(r.rate_limit) ?? n(r.rate_min) ?? n(r.rate_max);
  const prix = n(r.price_avg) ?? n(r.price_limit) ?? n(r.price_min) ?? n(r.price_max);
  if (!r.tenor || r.tenor === "—") return { etat: "ecarte", motifs: ["durée absente : la séance ne se compare à rien"] };
  if (taux == null && prix == null) return { etat: "sans-chiffre", motifs: ["aucun taux ni prix publié sur la pièce"] };

  const motifs = [];
  // Aucune adjudication de la zone n'est jamais sortie sous un pour cent ni au-dessus de quinze.
  if (r.instrument === "BTA" && taux != null && (taux < 1 || taux > 15)) motifs.push(`taux ${taux} % hors de 1-15 %`);
  // Un prix d'obligation est un pourcentage du nominal : il vit entre soixante et cent dix.
  if (r.instrument === "OTA" && prix != null && (prix < 60 || prix > 110)) motifs.push(`prix ${prix} % hors de 60-110 %`);
  // Un bon se sert à un taux, une obligation à un prix : l'inverse est une colonne mal lue.
  if (r.instrument === "BTA" && prix != null && taux == null) motifs.push("un bon servi à un prix, sans taux");
  if (r.instrument === "OTA" && taux != null && prix == null) motifs.push("une obligation servie à un taux, sans prix");
  // Les montants doivent s'ordonner.
  if (n(r.served) != null && n(r.bid) != null && n(r.served) > n(r.bid) * 1.001) motifs.push(`servi ${n(r.served) / 1e6} M supérieur aux soumissions ${n(r.bid) / 1e6} M`);
  if (n(r.bid) === 0 && n(r.served) > 0) motifs.push("servi sans soumission");
  if (r.bidders != null && r.network_size != null && r.bidders > r.network_size) motifs.push(`${r.bidders} soumissionnaires pour un réseau de ${r.network_size}`);
  // Une séance du 1er janvier n'existe pas : c'est une date mal lue.
  if (/-01-01$/.test(r.session_on)) motifs.push("séance datée du 1er janvier");

  /**
   * Le chiffre retenu hors de la fourchette publiée.
   *
   * Vérifié sur la pièce du 7 février 2024 (Gabon, OTA 4 ans) : le communiqué
   * imprime minimum 88,0000 %, maximum 91,5000 %, limite 91,5000 % et moyen
   * pondéré 93,7937 %. Notre lecture est exacte au chiffre près ; c'est le
   * Trésor gabonais qui publie une moyenne au-dessus de son propre maximum.
   *
   * Le motif reste signalé, parce qu'il ne se distingue pas d'une colonne mal
   * lue tant qu'on n'a pas ouvert la pièce, et qu'il faut l'avoir ouverte pour
   * en décider.
   */
  const lo = n(r.price_min) ?? n(r.rate_min);
  const hi = n(r.price_max) ?? n(r.rate_max);
  const retenu = n(r.price_avg) ?? n(r.price_limit) ?? n(r.rate_avg) ?? n(r.rate_limit);
  if (lo != null && hi != null && retenu != null && (retenu < Math.min(lo, hi) - 0.01 || retenu > Math.max(lo, hi) + 0.01)) {
    motifs.push(`chiffre retenu ${retenu} hors de la fourchette publiée ${Math.min(lo, hi)}-${Math.max(lo, hi)}`);
  }
  return { etat: motifs.length ? "a-regarder" : "propre", motifs, taux, prix };
}

const ligne = (r, c) => `  ${r.session_on} ${String(r.country).padEnd(11)} ${r.instrument} ${String(r.tenor).padEnd(13)} ${(c.taux ?? c.prix) != null ? String(c.taux ?? c.prix).padStart(8) + " %" : "         —"}`;

const lot = await fetch(`${URL_}/rest/v1/auction_results?select=*&confirmed_by=is.null&limit=2000`, { headers: head }).then((r) => r.json());
const mien = lot.filter((r) => pays.includes(r.country));
const classe = { propre: [], "a-regarder": [], "sans-chiffre": [], ecarte: [] };
for (const r of mien) {
  const c = cribler(r);
  classe[c.etat].push({ r, c });
}

console.log(`${mien.length} séances non confirmées pour ${pays.join(", ")}\n`);
console.log(`  ✓ ${classe.propre.length} passent le crible`);
console.log(`  ? ${classe["a-regarder"].length} demandent un œil sur la pièce`);
console.log(`  · ${classe["sans-chiffre"].length} sans chiffre publié, et ${classe.ecarte.length} sans durée : non confirmables\n`);

for (const x of classe["a-regarder"]) console.log(ligne(x.r, x.c) + "  → " + x.c.motifs.join(" · "));
if (classe["a-regarder"].length) console.log();

/**
 * Ce que le lot emporte.
 *
 * Seulement ce qui passe le crible. Ce qui demande un œil reste au desk, où
 * une personne l'ouvrira : c'est exactement le travail que ce script ne sait
 * pas faire, et le prétendre serait pire que de ne rien faire.
 */
const aEcrire = classe.propre.map((x) => x.r);

if (!ecrire) {
  console.log(`Essai à blanc : rien n'a été écrit. ${aEcrire.length} séances seraient confirmées.`);
  console.log('Pour les écrire : ajoutez --ecrire --par "Prénom Nom" --compte vous@exemple.com.');
  process.exit(0);
}

const at = new Date().toISOString();
const faits = [];
const ratees = [];
for (const r of aEcrire) {
  const res = await fetch(`${URL_}/rest/v1/auction_results?id=eq.${r.id}`, {
    method: "PATCH",
    headers: head,
    body: JSON.stringify({ confirmed_by: par, confirmed_at: at, updated_at: at }),
  });
  if (res.ok) faits.push(r.id);
  else ratees.push([`${r.session_on} ${r.country} ${r.tenor}`, (await res.text()).slice(0, 90)]);
}
console.log(`confirmées : ${faits.length}${ratees.length ? ` · échecs : ${ratees.length}` : ""}`);
for (const [q, m] of ratees) console.log("   ✗", q, m);
if (!faits.length) process.exit(1);

// La trace, dans la chaîne d'empreintes. La forme vient de logAudit : toute
// différence de clefs ou d'ordre produirait une empreinte que la vérification
// de Santé refuserait.
const dernier = await fetch(`${URL_}/rest/v1/audit?select=hash&order=id.desc&limit=1`, { headers: head }).then((r) => r.json());
const prevHash = dernier[0]?.hash;
const e = {
  actor: compte,
  action: "auction.confirm.lot",
  entity: "auction_result",
  entityId: `${pays.join("-").toLowerCase()}-${at.slice(0, 10)}`,
  before: { confirmedBy: null, seances: faits.length },
  after: { confirmedBy: par, seances: faits.length, ids: faits },
  reason: `Reprise d'historique : confirmation en lot de ${faits.length} séances (${pays.join(", ")}) lues par la machine. Les lectures n'ont pas été vérifiées une à une sur la pièce ; un crible de vraisemblance a écarté ${classe["a-regarder"].length} séances laissées au desk.`,
};
const hash = createHash("sha256")
  .update((prevHash ?? "") + JSON.stringify({ at, ...e }))
  .digest("hex");
const trace = await fetch(`${URL_}/rest/v1/audit`, {
  method: "POST",
  headers: head,
  body: JSON.stringify({
    at,
    actor: e.actor,
    actor_id: null,
    action: e.action,
    entity: e.entity,
    entity_id: e.entityId,
    before: e.before,
    after: e.after,
    reason: e.reason,
    ip: null,
    user_agent: null,
    prev_hash: prevHash ?? null,
    hash,
  }),
});
console.log("trace d'audit :", trace.ok ? "écrite" : "ÉCHEC " + (await trace.text()).slice(0, 160));

// Le journal du desk, qui est ce que l'équipe lit le matin.
const journal = await fetch(`${URL_}/rest/v1/events`, {
  method: "POST",
  headers: head,
  body: JSON.stringify({
    kind: "desk",
    html: `Reprise d'historique : <b>${faits.length} séances</b> (${pays.join(", ")}) confirmées en lot par ${par}. Les lectures n'ont pas été vérifiées une à une sur la pièce.`,
  }),
});
console.log("journal :", journal.ok ? "écrit" : "ÉCHEC " + (await journal.text()).slice(0, 120));
