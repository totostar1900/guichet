/**
 * CE QUE LE P/E DIRA, CALCULÉ PAR SON PROPRE CODE SUR LES VRAIES PIÈCES.
 *
 *   npx tsx --conditions=react-server scripts/pe-essai.mjs
 */
import fs from "node:fs";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { createClient } = await import("@supabase/supabase-js");
const { tout } = await import("./_journal.mjs");
const { coursSurBenefice, peDEnsemble } = await import("../src/lib/market/cours-sur-benefice.ts");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const dire = (s) => fs.writeSync(1, `${s}\n`);

const brut = await tout(sb, "issuer_financials", "mnemo, exercice, referentiel, periode, resultat_net, capitaux_propres, chiffre_affaires");
const comptes = brut.map((x) => ({
  mnemo: x.mnemo,
  exercice: x.exercice == null ? undefined : Number(x.exercice),
  referentiel: x.referentiel,
  periode: x.periode ?? undefined,
  resultatNet: x.resultat_net == null ? undefined : Number(x.resultat_net),
  capitauxPropres: x.capitaux_propres == null ? undefined : Number(x.capitaux_propres),
  chiffreAffaires: x.chiffre_affaires == null ? undefined : Number(x.chiffre_affaires),
}));

const q = await tout(sb, "quotes", "mnemo, session_date, instrument, close, market_cap_total");
const actions = q.filter((x) => x.instrument === "action" && Number(x.market_cap_total ?? 0) > 0);
const derniere = [...new Set(actions.map((x) => String(x.session_date)))].sort().pop();
const poids = actions
  .filter((x) => String(x.session_date) === derniere)
  .map((x) => ({ mnemo: x.mnemo, close: Number(x.close ?? 0), capTotal: Number(x.market_cap_total) }));

for (const cadre of ["OHADA", "IFRS"]) {
  const l = coursSurBenefice(comptes, poids, cadre);
  const e = peDEnsemble(l);
  dire(`\n=== RÉFÉRENTIEL PRÉFÉRÉ : ${cadre} ===`);
  dire(`   ${"valeur".padEnd(8)} ${"capi Mds".padStart(9)} ${"RN Mds".padStart(8)} ${"P/E".padStart(7)} ${"RoE".padStart(7)} ${"croiss.".padStart(8)}  exercice`);
  for (const x of l) {
    dire(
      `   ${x.mnemo.padEnd(8)} ${(x.capitalisation / 1e9).toFixed(1).padStart(9)} ${x.resultatNet == null ? "—".padStart(8) : (x.resultatNet / 1e9).toFixed(2).padStart(8)} ` +
        `${x.pe == null ? "—".padStart(7) : ("×" + x.pe.toFixed(1)).padStart(7)} ${x.rendementDesFondsPropres == null ? "—".padStart(7) : (x.rendementDesFondsPropres.toFixed(1) + " %").padStart(7)} ` +
        `${x.croissance == null ? "—".padStart(8) : ((x.croissance > 0 ? "+" : "") + x.croissance.toFixed(0) + " %").padStart(8)}  ${x.exercice ?? "—"} ${x.referentiel ?? ""}${x.reserve ? ` · ${x.reserve}` : ""}`,
    );
  }
  dire(`   ---`);
  dire(`   ENSEMBLE  ${(e.capitalisation / 1e9).toFixed(1).padStart(9)} ${(e.resultatNet / 1e9).toFixed(2).padStart(8)} ${("×" + (e.pe ?? 0).toFixed(1)).padStart(7)}   sur ${e.comptees}/${e.total} valeurs, exercices ${e.exercices.join(", ")}`);
  if (e.ecartees.length) dire(`   écartées : ${e.ecartees.map((x) => `${x.mnemo} (${x.motif})`).join(" · ")}`);
}
