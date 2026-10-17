/**
 * LES LIGNES A TARIFER, CE QUE LE ROBOT EN DIT, ET CE QUE LE DESK A FAIT.
 *
 * La marge n est pas mal rangee dans le Guichet : elle est INVISIBLE. La
 * commission vaut zero sur les dix lignes primaires ouvertes, et le prix
 * client est un nombre tape a la main dans « pricePct ». Le niveau de
 * marche et ce que la maison prend sont donc fondus dans un seul nombre
 * que personne ne peut auditer : la question « quelle marge avons-nous
 * prise sur les BTA 26 semaines ce trimestre » n a pas de reponse.
 *
 * Ce script la rend visible pour la premiere fois. Pour chaque ligne
 * ouverte, il met cote a cote :
 *
 *   CE QUE LE MARCHE A PAYE, lu par le robot sur les adjudications
 *   comparables, lignes NEUVES seulement, apparie par la VIE RESTANTE et
 *   non par l etiquette de duree ;
 *
 *   CE QUE LE DESK A AFFICHE, converti en rendement pour etre comparable ;
 *
 *   L ECART, qui est la marge implicite, en points de base.
 *
 * Rien de tout cela n est une critique du desk : personne n a jamais pose
 * ce nombre, donc personne n a pu le choisir.
 *
 *   npx tsx --conditions=react-server scripts/maquette-donnees-marges.mjs
 */
import fs from "node:fs";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { repo } = await import("../src/lib/data/index.ts");
const { auctionYield, vieRestante } = await import("../src/lib/market/yield.ts");
const { bondCalc, btaCalc } = await import("../src/lib/finance.ts");
const dire = (s) => fs.writeSync(1, `${s}\n`);
const fr = (v, n = 2) => (v == null ? "—" : Number(v).toLocaleString("fr-FR", { minimumFractionDigits: n, maximumFractionDigits: n }));
const jours = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);

const PANIERS = [
  { nom: "≤ 6 mois", bas: 0, haut: 0.6 },
  { nom: "1 an", bas: 0.6, haut: 1.5 },
  { nom: "2 ans", bas: 1.5, haut: 2.5 },
  { nom: "3 ans", bas: 2.5, haut: 3.5 },
  { nom: "4-5 ans", bas: 3.5, haut: 5.5 },
  { nom: "7 ans +", bas: 5.5, haut: 99 },
];
const panierDe = (a) => PANIERS.find((p) => a > p.bas && a <= p.haut) ?? null;
const AUJ = new Date().toISOString().slice(0, 10);

/* ---- le marche, lu sur les adjudications ---- */
const resultats = (await repo().listAuctionResults({ limit: 2000 })).filter((r) => !r.setAsideAt);
const marche = [];
for (const r of resultats) {
  const v = vieRestante(r);
  const y = auctionYield(r, "guichet");
  if (v == null || !y) continue;
  const pa = panierDe(v.years);
  if (!pa) continue;
  const m = String(r.tenor ?? "").match(/(\d+)/);
  const etiquette = !m ? null : /semaine/i.test(String(r.tenor)) ? Number(m[1]) / 52 : /mois/i.test(String(r.tenor)) ? Number(m[1]) / 12 : Number(m[1]);
  const neuve = etiquette != null && Math.abs(v.years - etiquette) <= 0.06;
  const [limite, moyen] = r.instrument === "BTA" ? [r.rateLimit, r.rateAvg] : [r.priceLimit, r.priceAvg];
  const rl = limite == null ? null : rendementDe(r, limite);
  const rm = moyen == null ? null : rendementDe(r, moyen);
  marche.push({ pays: r.country, instrument: r.instrument, seance: r.sessionOn, tenor: r.tenor, panier: pa.nom, neuve, rendement: y.pct, rLimite: rl, rMoyen: rm });
}
function rendementDe(r, valeur) {
  const faux =
    r.instrument === "BTA"
      ? { ...r, yieldAvg: undefined, yieldLimit: undefined, rateAvg: valeur, rateLimit: undefined }
      : { ...r, yieldAvg: undefined, yieldLimit: undefined, priceAvg: valeur, priceAvgFcfa: undefined, priceLimit: undefined, priceMin: undefined, priceMax: undefined };
  const y = auctionYield(faux, "guichet");
  return y ? y.pct : null;
}

/* ---- ce que le desk affiche ---- */
const offres = await repo().listOffers();
const ouvertes = offres.filter((o) => ["BTA", "OTA", "APE"].includes(o.kind) && !["closed", "archived"].includes(o.status));

const lignes = [];
for (const o of ouvertes) {
  const annees = o.maturityOn ? jours(AUJ, o.maturityOn) / 365 : null;
  const pa = annees != null ? panierDe(annees) : null;

  /* LE RENDEMENT DU PRIX AFFICHE. Un bon porte un taux precompte, une
     obligation un prix : on passe les deux par le meme calcul. */
  const faux = {
    instrument: o.kind === "BTA" ? "BTA" : "OTA",
    tenor: o.kind === "BTA" ? tenorBta(annees) : `${Math.max(1, Math.round(annees ?? 1))} ans`,
    sessionOn: AUJ,
    maturityOn: o.maturityOn,
    couponRate: o.couponRate,
    rateAvg: o.precountRate,
    priceAvg: o.pricePct,
  };
  const yDesk = auctionYield(faux, "guichet");

  const comparables = pa
    ? marche.filter((m) => m.pays === o.country && m.panier === pa.nom && m.neuve).sort((a, b) => b.seance.localeCompare(a.seance))
    : [];
  const recente = comparables[0] ?? null;
  const pointRobot = recente ? (recente.rMoyen ?? recente.rendement) : null;
  const corps = comparables.length
    ? {
        bas: Math.min(...comparables.map((c) => Math.min(c.rLimite ?? c.rendement, c.rMoyen ?? c.rendement))),
        haut: Math.max(...comparables.map((c) => Math.max(c.rLimite ?? c.rendement, c.rMoyen ?? c.rendement))),
      }
    : null;

  /* CE QUE LE CLIENT VOIT SUR LA FICHE, par le meme calcul qu elle emploie.
     Ce n est pas une curiosite : c est le nombre qui engage la maison, et
     il n a jamais ete rapproche de ce que le marche paie. */
  let montreAuClient = null;
  try {
    if (o.kind === "BTA" && o.precountRate != null && o.maturityOn) {
      montreAuClient = btaCalc({ nominal: o.nominal, settleOn: o.settleOn, maturityOn: o.maturityOn, commissionPct: o.commissionPct }, 10_000_000, o.precountRate).yieldPct;
    } else if (o.pricePct != null && o.couponRate != null && o.maturityOn) {
      montreAuClient = bondCalc(
        { nominal: o.nominal, couponRate: o.couponRate, settleOn: o.settleOn, maturityOn: o.maturityOn, lastCouponOn: o.lastCouponOn, commissionPct: o.commissionPct },
        10_000_000,
        o.pricePct,
      ).irr;
    }
  } catch {
    montreAuClient = null;
  }
  /* LE TITRE DIT « ABONDEMENT » ET LE CHAMP DIT « LIGNE NEUVE ». Les deux ne
     peuvent pas etre vrais : sur un abondement l acheteur paie le coupon
     couru, et s en dispenser gonfle le rendement affiche. */
  const abondementSansCouru = /abondement/i.test(o.title) && o.lastCouponOn == null;

  lignes.push({
    id: o.id,
    montreAuClient: montreAuClient == null || !Number.isFinite(montreAuClient) ? null : Math.round(montreAuClient * 100) / 100,
    abondementSansCouru,
    kind: o.kind,
    statut: o.status,
    pays: o.country,
    isin: o.isin ?? null,
    titre: o.title,
    echeance: o.maturityOn ?? null,
    annees: annees == null ? null : Math.round(annees * 100) / 100,
    panier: pa?.nom ?? null,
    coupon: o.couponRate ?? null,
    prixAffiche: o.pricePct ?? null,
    tauxAffiche: o.precountRate ?? null,
    commission: o.commissionPct,
    rendementDesk: yDesk ? Math.round(yDesk.pct * 100) / 100 : null,
    pointRobot: pointRobot == null ? null : Math.round(pointRobot * 100) / 100,
    corpsBas: corps ? Math.round(corps.bas * 100) / 100 : null,
    corpsHaut: corps ? Math.round(corps.haut * 100) / 100 : null,
    nComparables: comparables.length,
    derniereSeance: recente?.seance ?? null,
    ageJours: recente ? jours(recente.seance, AUJ) : null,
    margePb: yDesk && pointRobot != null ? Math.round((pointRobot - yDesk.pct) * 100) : null,
  });
}
function tenorBta(a) {
  if (a == null) return "52 semaines";
  const sem = Math.round(a * 52);
  return `${sem <= 15 ? 13 : sem <= 32 ? 26 : 52} semaines`;
}

const sortie = { produitLe: AUJ, lignes: lignes.sort((a, b) => (a.panier ?? "").localeCompare(b.panier ?? "")), paniers: PANIERS.map((p) => p.nom) };
fs.writeFileSync("C:/dev/guichet/public/maquette/marges-donnees.js", `window.MARGES = ${JSON.stringify(sortie)};\n`, "utf8");

dire(`${ouvertes.length} ligne(s) primaire(s) ouverte(s)\n`);
dire(`   ${"instr".padEnd(5)} ${"pays".padEnd(11)} ${"echeance".padEnd(11)} ${"panier".padEnd(9)} ${"affiche".padStart(8)} ${"rdt desk".padStart(9)} ${"robot".padStart(8)} ${"corps".padStart(14)} ${"n".padStart(3)} ${"marge".padStart(9)}`);
for (const l of lignes) {
  dire(
    `   ${l.kind.padEnd(5)} ${l.pays.padEnd(11)} ${String(l.echeance ?? "—").padEnd(11)} ${String(l.panier ?? "—").padEnd(9)} ` +
      `${(l.prixAffiche != null ? fr(l.prixAffiche) : fr(l.tauxAffiche)).padStart(8)} ${(fr(l.rendementDesk) + " %").padStart(9)} ` +
      `${(l.pointRobot == null ? "—" : fr(l.pointRobot) + " %").padStart(8)} ${(l.corpsBas == null ? "—" : `${fr(l.corpsBas)}-${fr(l.corpsHaut)}`).padStart(14)} ${String(l.nComparables).padStart(3)} ` +
      `${(l.margePb == null ? "—" : (l.margePb > 0 ? "+" : "") + l.margePb + " pb").padStart(9)}`,
  );
}
const avec = lignes.filter((l) => l.margePb != null);
dire(`\n   ${avec.length} ligne(s) sur ${lignes.length} ont un comparable. La marge implicite est positive`);
dire(`   quand le marche rend PLUS que ce que nous affichons : la maison garde l ecart.`);
