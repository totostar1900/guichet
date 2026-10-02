/**
 * Remplir la clef d'échange des messages déjà reçus.
 *
 * POURQUOI UNE FOIS, À LA MAIN. La clef se pose à l'arrivée depuis la migration
 * 0057, et les messages d'avant n'en ont pas. Elle ne se recalcule jamais
 * ensuite : les étiquettes et les reports s'y accrochent, et une clef qui bouge
 * les ferait sauter d'un échange à l'autre.
 *
 * LE PASSÉ EST APPROXIMÉ, ET C'EST ASSUMÉ. Les messages d'avant n'ont pas
 * d'en-têtes gardés : ils se regroupent par objet seul, et l'historique
 * WhatsApp par silences. Certains échanges anciens seront mal coupés. Ce n'est
 * pas rattrapable, et c'est tolérable : ce qui compte se traite dans les jours
 * qui suivent son arrivée. Deux échanges mal coupés se recollent à la main.
 *
 * CE SCRIPT NE TOUCHE QUE CE QUI EST VIDE. Relancé, il ne refait rien : un
 * message qui a déjà sa clef la garde, quelle que soit la règle du jour.
 *
 *   node scripts/remplir-echanges.mjs           (dit ce qu'il ferait)
 *   node scripts/remplir-echanges.mjs --ecrire  (l'écrit)
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const exiger = createRequire("C:/dev/guichet/package.json");
const { createClient } = exiger("@supabase/supabase-js");

/* La règle est importée, jamais recopiée : une copie divergerait du jour au
   lendemain, et c'est elle qui décide de ce qui se range ensemble. */
const { cleDEchange } = await import(pathToFileURL("C:/dev/guichet/src/lib/domain/echange.ts").href).catch(async () => {
  /* Node ne lit pas le TypeScript : on passe par la version compilée du test. */
  throw new Error("Lancez ce script avec un chargeur TypeScript : npx tsx scripts/remplir-echanges.mjs");
});

const env = {};
for (const l of readFileSync("C:/dev/guichet/.env.local", "utf8").split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const ecrire = process.argv.includes("--ecrire");

const { data: tous, error } = await sb
  .from("inbound_messages")
  .select("id, channel, from_address, subject, received_at, message_id, in_reply_to, conv_key")
  .order("received_at", { ascending: true });
if (error) throw new Error(error.message);

/* Dans l'ordre d'arrivée : la règle du silence lit le message précédent, donc
   remplir à l'envers donnerait des coupures fausses. */
const parMessageId = new Map();
const dernierDe = new Map();
const poses = [];

for (const m of tous) {
  if (m.channel !== "whatsapp" && m.channel !== "email") continue;
  const cleCourante = m.conv_key ?? undefined;
  const voisinage = dernierDe.get(`${m.channel}|${m.from_address}`);
  if (cleCourante) {
    /* Déjà posée : on la garde, et on la propage comme voisine. */
    if (m.message_id) parMessageId.set(m.message_id, cleCourante);
    dernierDe.set(`${m.channel}|${m.from_address}`, { receivedAt: m.received_at, convKey: cleCourante });
    continue;
  }
  const { cle, chemin } = cleDEchange(
    { channel: m.channel, from: m.from_address, subject: m.subject ?? undefined, receivedAt: m.received_at, inReplyTo: m.in_reply_to ?? undefined },
    { cleDuParent: m.in_reply_to ? parMessageId.get(m.in_reply_to) : undefined, dernier: voisinage },
  );
  poses.push({ id: m.id, cle, chemin, quoi: `${m.received_at.slice(0, 10)} ${m.channel} ${m.from_address} · ${(m.subject ?? "(sans objet)").slice(0, 46)}` });
  if (m.message_id) parMessageId.set(m.message_id, cle);
  dernierDe.set(`${m.channel}|${m.from_address}`, { receivedAt: m.received_at, convKey: cle });
}

const parChemin = poses.reduce((a, p) => ({ ...a, [p.chemin]: (a[p.chemin] ?? 0) + 1 }), {});
const echanges = new Set(poses.map((p) => p.cle)).size;
console.log(`${tous.length} messages lus · ${poses.length} à remplir · ${echanges} échanges formés`);
console.log(`par objet : ${parChemin.objet ?? 0} · par silence : ${parChemin.silence ?? 0} · par en-tête : ${parChemin.entete ?? 0}`);
for (const p of poses) console.log(`  ${p.chemin.padEnd(8)} ${p.quoi}`);

if (!ecrire) {
  console.log("\nRien n'est écrit. Relancez avec --ecrire.");
  process.exit(0);
}

let faits = 0;
for (const p of poses) {
  const { error: e } = await sb.from("inbound_messages").update({ conv_key: p.cle }).eq("id", p.id).is("conv_key", null);
  if (e) throw new Error(`${p.id} : ${e.message}`);
  faits++;
}
const { count } = await sb.from("inbound_messages").select("id", { count: "exact", head: true }).is("conv_key", null);
console.log(`\n${faits} clefs posées · ${count ?? 0} message(s) encore sans clef`);
