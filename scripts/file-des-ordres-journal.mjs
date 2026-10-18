/**
 * LE JOURNAL PORTE-T-IL LES TRANSITIONS DES ORDRES ?
 *
 * Premiere mesure fausse, et deux fois : « listEvents(4000) » a rendu
 * EXACTEMENT MILLE lignes, le plafond que le client du depot pose sans le
 * dire. Les evenements des cinq ordres datent de septembre et tombaient
 * donc hors de la fenetre, si bien que la mesure retombait sur la date de
 * creation en se presentant comme un temps passe dans l etat. Un age
 * depuis la creation et un age dans l etat courant ne sont pas la meme
 * grandeur : un ordre recu il y a trente jours mais confirme hier n a pas
 * attendu trente jours.
 *
 * On relit donc le journal EN PAGINANT, et on regarde ce qu il porte
 * vraiment pour chaque ordre.
 *
 *   npx tsx --conditions=react-server scripts/file-des-ordres-journal.mjs
 */
import fs from "node:fs";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { repo } = await import("../src/lib/data/index.ts");
const dire = (s) => fs.writeSync(1, `${s}\n`);
const jours = (iso) => (iso ? Math.round((Date.now() - Date.parse(iso)) / 86_400_000) : null);

/* PAGINER, parce que le client coupe a mille sans le dire. */
const evts = [];
for (let de = 0; ; de += 1000) {
  const { data, error } = await sb.from("events").select("id,at,kind,html,intent_id,offer_id").order("at", { ascending: true }).range(de, de + 999);
  if (error) throw new Error(error.message);
  evts.push(...(data ?? []));
  if ((data?.length ?? 0) < 1000) break;
}
dire(`${evts.length} evenements au journal, en paginant\n`);

const intents = await repo().listIntents();
dire(`=== CE QUE LE JOURNAL PORTE POUR CHACUN DES ${intents.length} ORDRES ===\n`);
for (const i of intents) {
  const siens = evts.filter((e) => e.intent_id === i.id).sort((a, b) => a.at.localeCompare(b.at));
  dire(`   ${String(i.ref).padEnd(14)} ${String(i.state).padEnd(16)} cree il y a ${String(jours(i.createdAt)).padStart(3)} j · ${siens.length} evenement(s)`);
  for (const e of siens) {
    const texte = String(e.html).replace(/<[^>]*>/g, "").trim().slice(0, 70);
    dire(`        ${e.at.slice(0, 10)}  ${texte}`);
  }
  if (!siens.length) dire(`        AUCUN : l anciennete de cet ordre dans son etat est inconnue`);
}

const avec = intents.filter((i) => evts.some((e) => e.intent_id === i.id)).length;
dire(`\n=== ${avec} ordre(s) sur ${intents.length} ont au moins un evenement ===`);
if (avec < intents.length) {
  dire(`   Pour les autres, « depuis quand dans cet etat » ne se calcule pas : il`);
  dire(`   faudrait soit horodater la transition SUR L ORDRE, soit garantir que`);
  dire(`   chaque changement d etat laisse une ligne au journal.`);
}

/* LE JOURNAL DIT-IL LES CHANGEMENTS D ETAT, ou seulement la reception ? */
const motsDEtat = /confirm|transmis|servi|regl|annul|contre/i;
const transitions = evts.filter((e) => e.intent_id && motsDEtat.test(String(e.html).replace(/<[^>]*>/g, "")));
dire(`\n   ${transitions.length} evenement(s) sur ${evts.filter((e) => e.intent_id).length} liés à un ordre nomment un changement d etat.`);
