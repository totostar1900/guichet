/**
 * LES CHIFFRES RÉELS DE LA SANTÉ DE L'INDICE.
 *
 * Sept actions, 814 séances, et trois faits qui commandent tout : le marché
 * bouge un jour sur cinq, 1,12 titre s'échange par séance, et un émetteur pèse
 * les trois quarts de la capitalisation. Une maquette sur des chiffres inventés
 * les cacherait tous les trois.
 *
 * L'INDICE N'EST PAS DE NOUS. Le BVMAC All Share est publié par la bourse et
 * nous le lisons dans le bulletin. Tout ce qui est calculé ici MESURE cet
 * indice-là ou ses composants ; rien ne construit un indice concurrent.
 *
 *   npx tsx --conditions=react-server scripts/maquette-donnees-indice.mjs
 */
import fs from "node:fs";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { createClient } = await import("@supabase/supabase-js");
const { tout } = await import("./_journal.mjs");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const dire = (s) => fs.writeSync(1, `${s}\n`);

const bulletins = await tout(sb, "market_bulletins", "session_date, index_value, index_variation_pct");
const q = await tout(
  sb,
  "quotes",
  "isin, session_date, instrument, mnemo, issuer, close, previous_close, variation_pct, volume_traded, value_traded, trades, shares_total, shares_float, market_cap_total, market_cap_float, last_dividend, dividend_year, eps, liquidity_3m_pct",
);
const actions = q.filter((x) => x.instrument === "action");
dire(`${bulletins.length} bulletins · ${actions.length} lignes d'actions · ${new Set(actions.map((x) => x.isin)).size} titres`);

/* ============ L'INDICE PUBLIÉ ============ */
const serie = bulletins
  .filter((b) => b.index_value != null && Number(b.index_value) > 0)
  .map((b) => ({ d: String(b.session_date), v: Number(b.index_value) }))
  .sort((a, b) => a.d.localeCompare(b.d));

/**
 * LE REPLI MAXIMUM : la pire chute depuis un sommet, et la date où elle a eu
 * lieu. On garde le creux ET le sommet dont il descend : « −8,9 % » sans dire
 * d'où ne se vérifie pas.
 */
let sommet = -Infinity, sommetLe = "", pire = { pct: 0 };
for (const p of serie) {
  if (p.v > sommet) { sommet = p.v; sommetLe = p.d; }
  const pct = (100 * (p.v - sommet)) / sommet;
  if (pct < pire.pct) pire = { pct, creuxLe: p.d, creux: p.v, sommet, sommetLe };
}

/** Les niveaux distincts : la mesure de l'immobilité de ce marché. */
const niveaux = new Set(serie.map((p) => p.v)).size;

/* ============ LA DERNIÈRE PHOTO DE LA COTE ============ */
const derniere = [...new Set(actions.map((x) => String(x.session_date)))].sort().pop();
const cote = actions
  .filter((x) => String(x.session_date) === derniere)
  .map((x) => ({
    mnemo: x.mnemo,
    emetteur: String(x.issuer ?? "").replace(/^.*?(?=[A-Z]{3,})/, "").slice(0, 60),
    cours: Number(x.close ?? 0),
    titres: Number(x.shares_total ?? 0),
    flottant: Number(x.shares_float ?? 0),
    capi: Number(x.market_cap_total ?? 0) / 1e9,
    capiFlottant: Number(x.market_cap_float ?? 0) / 1e9,
    dividende: x.last_dividend == null ? null : Number(x.last_dividend),
    exercice: x.dividend_year ?? null,
    bpa: x.eps == null ? null : Number(x.eps),
  }))
  .sort((a, b) => b.capi - a.capi);

/* ============ LA BREADTH, PAR MOIS ============ */
/**
 * SEPT TITRES ET 1,12 ÉCHANGE PAR SÉANCE : au jour le jour, une ligne
 * d'avances et de reculs serait plate. Au mois, elle redevient lisible, et
 * c'est le pas auquel on la publie.
 */
const parMois = new Map();
for (const x of actions) {
  const m = String(x.session_date).slice(0, 7);
  const e = parMois.get(m) ?? { m, hausse: 0, baisse: 0, stable: 0, negociees: 0, volume: 0, valeur: 0, seances: new Set() };
  const v = Number(x.variation_pct ?? 0);
  if (v > 0) e.hausse++;
  else if (v < 0) e.baisse++;
  else e.stable++;
  if (Number(x.volume_traded ?? 0) > 0) e.negociees++;
  e.volume += Number(x.volume_traded ?? 0);
  e.valeur += Number(x.value_traded ?? 0) / 1e6;
  e.seances.add(String(x.session_date));
  parMois.set(m, e);
}
const breadth = [...parMois.values()]
  .map((e) => ({ m: e.m, hausse: e.hausse, baisse: e.baisse, stable: e.stable, negociees: e.negociees, valeur: Number(e.valeur.toFixed(1)), seances: e.seances.size }))
  .sort((a, b) => a.m.localeCompare(b.m));

/* ============ L'INDICE AU MOIS, ET SA VOLATILITÉ ============ */
const indiceMois = [];
for (const p of serie) {
  const m = p.d.slice(0, 7);
  const der = indiceMois[indiceMois.length - 1];
  if (der && der.m === m) der.v = p.v;
  else indiceMois.push({ m, v: p.v });
}
for (let i = 1; i < indiceMois.length; i++) {
  indiceMois[i].r = (100 * (indiceMois[i].v - indiceMois[i - 1].v)) / indiceMois[i - 1].v;
}
const rend = indiceMois.slice(1).map((x) => x.r);
const moyR = rend.length ? rend.reduce((a, b) => a + b, 0) / rend.length : 0;
const volMensuelle = rend.length > 1 ? Math.sqrt(rend.reduce((s, r) => s + (r - moyR) ** 2, 0) / (rend.length - 1)) : null;

/* ============ LA LIQUIDITÉ, PAR TITRE ============ */
const parTitre = new Map();
for (const x of actions) {
  const e = parTitre.get(x.mnemo) ?? { mnemo: x.mnemo, seances: 0, negociees: 0, valeur: 0, variations: 0 };
  e.seances++;
  if (Number(x.volume_traded ?? 0) > 0) e.negociees++;
  e.valeur += Number(x.value_traded ?? 0) / 1e6;
  if (Number(x.variation_pct ?? 0) !== 0) e.variations++;
  parTitre.set(x.mnemo, e);
}
const liquidite = [...parTitre.values()].map((e) => ({ ...e, valeur: Number(e.valeur.toFixed(1)), partJours: Number(((100 * e.negociees) / e.seances).toFixed(1)) })).sort((a, b) => b.valeur - a.valeur);

const totalCapi = cote.reduce((s, x) => s + x.capi, 0);
const totalFlottant = cote.reduce((s, x) => s + x.capiFlottant, 0);

const sortie = {
  derniere,
  indice: { serie, niveaux, pire, dernier: serie[serie.length - 1], premier: serie[0], volMensuelle },
  indiceMois,
  cote,
  totalCapi,
  totalFlottant,
  breadth,
  liquidite,
  lu: {
    bulletins: bulletins.length,
    avecIndice: serie.length,
    seances: new Set(actions.map((x) => String(x.session_date))).size,
    lignes: actions.length,
    avecBpa: actions.filter((x) => x.eps != null).length,
    avecDividende: actions.filter((x) => x.last_dividend != null).length,
  },
};
fs.mkdirSync("C:/dev/guichet/public/maquette", { recursive: true });
fs.writeFileSync("C:/dev/guichet/public/maquette/indice-donnees.js", `window.INDICE = ${JSON.stringify(sortie)};\n`, "utf8");
dire(`indice : ${serie.length} points, ${niveaux} niveaux distincts, repli max ${pire.pct.toFixed(2)} %`);
dire(`volatilité mensuelle : ${volMensuelle?.toFixed(2)} %`);
dire(`cote : ${cote.length} actions, ${totalCapi.toFixed(1)} Mds de capitalisation, ${totalFlottant.toFixed(1)} Mds de flottant`);
dire(`   premier : ${cote[0]?.mnemo} ${((100 * (cote[0]?.capi ?? 0)) / totalCapi).toFixed(1)} % du total, ${((100 * (cote[0]?.capiFlottant ?? 0)) / totalFlottant).toFixed(1)} % du flottant`);
dire(`BPA renseigné sur ${sortie.lu.avecBpa} lignes · dividende sur ${sortie.lu.avecDividende}`);
dire(`écrit dans public/maquette/indice-donnees.js (${Math.round(fs.statSync("C:/dev/guichet/public/maquette/indice-donnees.js").size / 1024)} Ko)`);
