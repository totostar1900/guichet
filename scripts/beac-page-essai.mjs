/**
 * CE QUE LA PAGE BEAC MONTRERA, CALCULÉ PAR SON PROPRE CODE.
 *
 * La page du desk demande une vraie session et ses chiffres ne se vérifient
 * pas dans un navigateur de démonstration, qui n'a pas la base. On appelle
 * donc EXACTEMENT les fonctions qu'elle appelle, sur les vraies lignes : si
 * ce script dit juste, la page dit juste, puisque c'est le même calcul.
 *
 *   npx tsx --conditions=react-server scripts/beac-page-essai.mjs
 */
import fs from "node:fs";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { createClient } = await import("@supabase/supabase-js");
const { tout } = await import("./_journal.mjs");
const { couverture, rapprocher, vueBeac } = await import("../src/lib/market/beac-vue.ts");
const { anneesDe, auTemps, repere } = await import("../src/lib/market/trace.ts");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const dire = (s) => fs.writeSync(1, `${s}\n`);

const courbes = (await tout(sb, "beac_yield_curves", "mois, pays, tenor, annees, taux")).map((c) => ({ ...c, annees: Number(c.annees), taux: Number(c.taux) }));
const encours = (await tout(sb, "beac_encours_officiel", "mois, pays, encours")).map((e) => ({ ...e, encours: Number(e.encours) }));
const couts = (await tout(sb, "beac_cout_ressources", "mois, pays, instrument, taux")).map((c) => ({ ...c, taux: Number(c.taux) }));
const ops = (await tout(sb, "treasury_operations", "pays, operation, montant, montant_realise, taux_souscription, operation_on, maturity_on")).map((o) => ({
  pays: o.pays,
  operation: o.operation,
  montant: o.montant == null ? undefined : Number(o.montant),
  montantRealise: o.montant_realise == null ? undefined : Number(o.montant_realise),
  tauxSouscription: o.taux_souscription == null ? undefined : Number(o.taux_souscription),
  operationOn: o.operation_on ?? undefined,
  maturityOn: o.maturity_on ?? undefined,
}));
const seances = await tout(sb, "auction_results", "country, instrument, tenor, session_on, maturity_on, served, rate_avg, yield_avg");

const v = vueBeac(courbes, encours, couts, ops);
dire(`=== LES SÉRIES ===`);
dire(`   ${v.moisTous.length} mois, de ${v.moisTous[0]} à ${v.moisTous[v.moisTous.length - 1]}`);
dire(`   ${v.moisCourbe.length} mois portent une courbe · ${v.maturites.length} maturités`);
dire(`   encours : ${Object.entries(v.encours).map(([p, s]) => `${p} ${s.length}`).join(" · ")}`);
dire(`   pente   : ${Object.entries(v.pente).map(([p, s]) => `${p} ${s.length}`).join(" · ")}`);
dire(`   offre   : ${Object.entries(v.offre).map(([p, s]) => `${p} ${s.length}`).join(" · ")}`);
dire(`   mur     : ${Object.entries(v.mur).map(([p, s]) => `${p} ${s.length}`).join(" · ")}`);

const dernier = v.encours.CEMAC?.slice(-1)[0];
dire(`\n=== CE QUE LES CHIFFRES DE TÊTE DIRONT (zone entière, période entière) ===`);
dire(`   encours CEMAC : ${dernier?.v.toFixed(1)} Mds au ${dernier?.m}`);
const prem = v.encours.CEMAC?.[0];
dire(`   multiplié par ${(dernier.v / prem.v).toFixed(1)} depuis ${prem.m}`);
const offre = Object.values(v.offre).flat();
const prevu = offre.reduce((s, x) => s + x.prevu, 0);
const realise = offre.reduce((s, x) => s + x.realise, 0);
dire(`   taux de service : ${((100 * realise) / prevu).toFixed(0)} % (${realise.toFixed(0)} levés sur ${prevu.toFixed(0)} annoncés)`);

const r = rapprocher(
  seances.map((s) => ({ pays: s.country, instrument: s.instrument, tenor: s.tenor, sessionOn: s.session_on, taux: s.rate_avg ?? s.yield_avg })),
  v,
);
dire(`\n=== NOS SÉANCES CONTRE LEUR COURBE ===`);
dire(`   ${r.length} rapprochement(s)`);
const ecarts = r.map((x) => x.nous - x.beac).sort((a, b) => a - b);
if (ecarts.length) dire(`   écart médian ${ecarts[Math.floor(ecarts.length / 2)].toFixed(2)} point`);

const c = couverture(
  encours,
  seances.map((s) => ({ pays: s.country, sessionOn: s.session_on, maturityOn: s.maturity_on ?? undefined, servi: s.served == null ? undefined : Number(s.served) })),
  ops,
);
dire(`\n=== LA COUVERTURE AU ${c.auMois} ===`);
for (const l of c.lignes) dire(`   ${l.pays.padEnd(12)} BEAC ${l.beac.toFixed(1).padStart(8)} · nous ${l.communiques.toFixed(1).padStart(7)} (${l.beac ? ((100 * l.communiques) / l.beac).toFixed(0) : "—"} %) · flux ${l.flux.toFixed(1).padStart(7)}`);

/* LE REPÈRE SE VÉRIFIE AUSSI : une planche dont l échelle est fausse a l air
   d une planche. On regarde les bornes que la page va poser. */
dire(`\n=== LES REPÈRES QUE LA PAGE POSERA ===`);
for (const [nom, series, opts] of [
  ["encours", ["CEMAC", "Cameroun", "Congo", "Gabon"].map((p) => ({ couleur: "#000", pts: (v.encours[p] ?? []).map((x) => ({ x: auTemps(x.m), y: x.v })) })).filter((s) => s.pts.length), { y0: 0 }],
  ["courbe juillet 2026", ["Cameroun", "Congo", "Gabon"].map((p) => ({ couleur: "#000", pts: (v.courbes[`2026-07|${p}`] ?? []).map((x) => ({ x: x.annees, y: x.taux })) })).filter((s) => s.pts.length), { y0: 0, pas: 2 }],
  ["pente", Object.values(v.pente).map((s) => ({ couleur: "#000", pts: s.map((x) => ({ x: auTemps(x.m), y: x.v })) })), { pas: 1 }],
]) {
  const rep = repere(series, { ...opts, tx: anneesDe(series) });
  if (!rep) {
    dire(`   ${nom} : aucune série`);
    continue;
  }
  dire(`   ${String(nom).padEnd(22)} ${rep.graduations.length} graduation(s) de ${rep.graduations[0].texte} à ${rep.graduations[rep.graduations.length - 1].texte} · ${rep.etiquettes.length} étiquette(s) · marge gauche ${rep.marges.gauche.toFixed(0)}`);
}
