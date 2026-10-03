/**
 * Le jeu de démonstration : un dossier qui fait paraître les trois écrans du lot F.
 *
 * Trois surfaces livrées en octobre 2026 ne se montrent qu'à un client qui tient
 * quelque chose, et le compte d'essai ne tenait rien : la bande des chiffres ne
 * s'affiche qu'avec des positions, et c'est elle qui porte « Disponible ».
 *
 *   LA BANDE DU PRÉAVIS, « ces 300 000 partent le 6 octobre · Ne faites pas ça ».
 *   LE BOUTON DE VERSEMENT, « ce solde reste tant que vous le souhaitez ».
 *   LES TROIS RÉPONSES DU TÉMOIGNAGE sur une échéance échue non constatée.
 *
 * IL PASSE PAR LE CODE DE L'APPLICATION, et non par du SQL à la main. La clef
 * d'un flux s'écrit « opération|date|montant », et la calculer de tête donnerait
 * une clef qui ne rapproche rien : le rapprochement chercherait celle que
 * `suivre()` calcule, qui serait une autre. On fabrique donc la position avec
 * `positionsFrom`, et on lit la clef avec `cleDuFlux`.
 *
 * LA LIGNE EST MARQUÉE « isExample », qui est le marqueur de la maison : l'accueil
 * les exclut déjà, et la fiche porte l'étiquette « exemple ». Rien ne va donc
 * dans la vitrine.
 *
 * L'OCCURRENCE EST ANNONCÉE POUR DANS TROIS JOURS, à dessein : la bande se voit
 * sans que le robot l'exécute demain matin. Pour voir l'exécution, il suffit de
 * rapprocher la date, ou de laisser courir.
 *
 *   node scripts/jeu-de-demonstration.mjs            inspecte et n'écrit rien
 *   node scripts/jeu-de-demonstration.mjs --ecrire   pose le jeu
 *   node scripts/jeu-de-demonstration.mjs --effacer  le retire
 */
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { positionsFrom } from "../src/lib/positions.ts";
import { cleDuFlux } from "../src/lib/domain/encaissement.ts";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
const v = (k) => env.match(new RegExp("^" + k + "=(.*)$", "m"))[1].trim().replace(/^["']|["']$/g, "");
const db = createClient(v("NEXT_PUBLIC_SUPABASE_URL"), v("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });

const OFFRE = "demo-ota-6-2023-2028";
const CLIENT = "3553a84b-09c6-45d7-9835-28ceb365e585"; // Test Toto
const jour = (n = 0) => new Date(Date.now() + n * 86_400_000).toLocaleDateString("sv-SE");

/** Toute erreur se dit : un nettoyage qui se tait laisse derrière lui ce qu'il
    prétend avoir retiré, et c'est ainsi que j'ai d'abord cru la ligne effacée
    alors que son coupon tenait toujours. */
const sur = async (quoi, p) => {
  const { error } = await p;
  if (error) throw new Error(`${quoi} : ${error.message}`);
};

const effacer = async () => {
  /* L'ordre suit les dépendances : ce qui pointe vers l'ordre d'abord. */
  const { data: ordres } = await db.from("intents").select("id").eq("offer_id", OFFRE);
  const ids = (ordres ?? []).map((x) => x.id);
  const { data: inst } = await db.from("standing_orders").select("id").eq("offer_id", OFFRE);
  for (const s of inst ?? []) await sur("standing_runs", db.from("standing_runs").delete().eq("standing_id", s.id));
  await sur("standing_orders", db.from("standing_orders").delete().eq("offer_id", OFFRE));
  await sur("flow_reports", db.from("flow_reports").delete().eq("user_id", CLIENT));

  /* LE JOURNAL NE S'EFFACE PAS, et c'est voulu : « un mouvement ne se modifie
     pas ; passer un mouvement inverse ». Un déclencheur de la base refuse la
     suppression, et il a raison. On neutralise donc le mouvement de
     démonstration par son contraire, ce qui ramène le disponible à zéro sans
     effacer la trace. Sans cela le client garderait un solde orphelin, dont la
     ligne qui l'a produit n'existe plus. */
  const { data: mouvements } = await db.from("client_cash").select("id,amount,kind,label").eq("user_id", CLIENT).like("label", "%démonstration%");
  let inverses = 0;
  for (const m of mouvements ?? []) {
    if (/^Contrepartie de démonstration/.test(m.label)) continue;
    const dejaDefait = (mouvements ?? []).some((x) => x.label === `Contrepartie de démonstration · ${m.id}`);
    if (dejaDefait) continue;
    await sur(
      "contrepartie",
      db.from("client_cash").insert({
        user_id: CLIENT,
        amount: m.amount,
        kind: "restitution",
        label: `Contrepartie de démonstration · ${m.id}`,
        created_by: "jeu de démonstration",
      }),
    );
    inverses += 1;
  }

  await sur("intents", db.from("intents").delete().eq("offer_id", OFFRE));
  await sur("offers", db.from("offers").delete().eq("id", OFFRE));
  console.log(`efface : ${ids.length} ordre(s), ${(inst ?? []).length} instruction(s), la ligne · journal : ${inverses} mouvement(s) neutralisé(s) par leur contraire`);
};

const ecrire = async () => {
  await effacer();

  /* Une obligation réglée il y a trois ans : son échéancier a donc trois coupons
     derrière lui et deux devant, ce qui donne à la fois de l'échu non constaté et
     de quoi constater. */
  const offre = {
    id: OFFRE,
    kind: "OTA",
    operation: "nouvelle_ligne",
    country: "CM",
    country_name: "Cameroun",
    issuer: "État du Cameroun",
    title: "OTA démonstration 6 % 2023-2028",
    isin: "CM0000DEMO01",
    status: "published",
    is_example: true,
    blurb: "Ligne de démonstration : elle sert à montrer les écrans, elle ne se souscrit pas.",
    documents: [],
    opens_at: "2023-09-01T08:00:00.000Z",
    deadline_at: "2023-09-15T16:00:00.000Z",
    settle_on: "2023-09-20",
    maturity_on: "2028-09-20",
    nominal: 10000,
    coupon_rate: 6,
    price_pct: 100,
    commission_pct: 0.5,
    version: 1,
  };
  const { error: eo } = await db.from("offers").insert(offre);
  if (eo) throw new Error(`offre : ${eo.message}`);

  const tail = Array.from({ length: 3 }, () => "ACDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 31)]).join("");
  const ordre = {
    ref: `PF-DEMO-${tail}`,
    offer_id: OFFRE,
    offer_version: 1,
    client_id: CLIENT,
    client_name: "Test Toto",
    client_segment: "Personne physique",
    type: "ferme",
    amount: 5_000_000,
    channel: "WhatsApp",
    state: "reglee",
    message: "Jeu de démonstration",
  };
  const { data: io, error: ei } = await db.from("intents").insert(ordre).select("*").single();
  if (ei) throw new Error(`ordre : ${ei.message}`);

  /* La position se calcule avec le code de l'application : c'est elle qui donne
     les dates et les montants exacts, donc la clef exacte. */
  const pos = positionsFrom(
    [{ ...io, offerId: OFFRE, offerVersion: 1, clientId: CLIENT, clientName: "Test Toto", clientSegment: "Personne physique", state: "reglee", createdAt: io.created_at, updatedAt: io.updated_at }],
    [{ ...offre, offerId: undefined, countryName: offre.country_name, isExample: true, couponRate: 6, settleOn: offre.settle_on, maturityOn: offre.maturity_on, commissionPct: 0.5, opensAt: offre.opens_at, deadlineAt: offre.deadline_at, pricePct: 100, lastCouponOn: null }],
  );
  const p = pos[0];
  if (!p) throw new Error("aucune position : la ligne ne produit pas d'échéancier");
  console.log(`position : ${p.units} ${p.unitWord} · ${p.echus.length} échéance(s) passée(s), ${p.flows.length} à venir`);

  /* Le plus ancien coupon est constaté, les autres restent attendus : le client
     a donc à la fois du disponible et de quoi témoigner. */
  const premier = p.echus[0];
  const mouvement = {
    user_id: CLIENT,
    at: `${premier.date}T12:00:00.000Z`,
    amount: premier.amount,
    kind: "coupon",
    label: `${premier.label} · ${offre.title} · échéance du ${premier.date} · démonstration`,
    flow_key: cleDuFlux(io.id, premier),
    evidence: "avis teneur de compte n° 4471 (démonstration)",
    expected: premier.amount,
    created_by: "jeu de démonstration",
  };
  const { error: ec } = await db.from("client_cash").insert(mouvement);
  if (ec) throw new Error(`mouvement : ${ec.message}`);

  const { data: inst, error: es } = await db
    .from("standing_orders")
    .insert({
      ref: `EP-DEMO-${tail}`,
      user_id: CLIENT,
      client_name: "Test Toto",
      client_segment: "Personne physique",
      offer_id: OFFRE,
      amount: 0,
      source: "encaissements",
      min_amount: 100000,
      day_of_month: 1,
      starts_on: jour(-30),
      on_blocked: "passer",
      channel: "E-mail",
    })
    .select("*")
    .single();
  if (es) throw new Error(`instruction : ${es.message}`);

  /* Dans trois jours : la bande se voit sans que le robot l'exécute demain. Le
     préavis est marqué parti, parce qu'on ne veut pas envoyer de message réel. */
  const { error: ep } = await db.from("standing_runs").insert({
    standing_id: inst.id,
    user_id: CLIENT,
    due_on: jour(3),
    amount: premier.amount,
    notice_sent: true,
    state: "annoncee",
  });
  if (ep) throw new Error(`préavis : ${ep.message}`);

  console.log(`\nposé :
  ligne      ${OFFRE} (« exemple », hors vitrine)
  ordre      ${io.ref} · ${io.id}
  encaissé   ${premier.label} du ${premier.date} · ${premier.amount} FCFA, avec sa pièce
  attendus   ${p.echus.length - 1} échéance(s) à témoigner
  préavis    ${premier.amount} FCFA pour le ${jour(3)}, annoncé sans message envoyé`);
};

const inspecter = async () => {
  for (const [t, q] of [
    ["offers", db.from("offers").select("id,title,is_example").eq("id", OFFRE)],
    ["intents", db.from("intents").select("ref,state,amount").eq("offer_id", OFFRE)],
    ["client_cash", db.from("client_cash").select("amount,kind,flow_key,evidence").eq("user_id", CLIENT)],
    ["standing_orders", db.from("standing_orders").select("ref,state,source").eq("offer_id", OFFRE)],
    ["standing_runs", db.from("standing_runs").select("due_on,amount,state,notice_sent").eq("user_id", CLIENT)],
    ["flow_reports", db.from("flow_reports").select("said,flow_key").eq("user_id", CLIENT)],
  ]) {
    const { data, error } = await q;
    console.log(`${t.padEnd(16)} ${error ? `erreur : ${error.message}` : JSON.stringify(data)}`);
  }
};

const mode = process.argv[2];
if (mode === "--ecrire") await ecrire();
else if (mode === "--effacer") await effacer();
await inspecter();
