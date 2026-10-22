/**
 * UNE DATE DES ANNÉES 1920-1930 DANS LA COLONNE D'UNE VL EST UN MONTANT.
 *
 * Le défaut connu était dans un sens : un numéro de série Excel imprimé là où
 * une date est attendue, « 46 206,00 » pour le 3 juillet 2026. Georges a vu
 * l'autre sens, et il est plus traître : un MONTANT formaté en date. Une VL
 * de 13 160 francs rendue par un tableur comme « 10/01/1936 ».
 *
 * LA SIGNATURE EST NETTE. Les fonds de la zone naissent à 10 000 francs et
 * vivent entre 9 000 et 20 000 : interprétées comme des numéros de série,
 * ces valeurs tombent toutes entre 1924 et 1954. Une date de VL antérieure à
 * 2000 n'est donc jamais une date.
 *
 * ET LE GARDE HABITUEL NE SERT À RIEN ICI. La variation imprimée est calculée
 * par la bourse SUR LA CELLULE CORROMPUE (362,06 % pour AB CASH) : elle est
 * empoisonnée, elle ne peut rien valider. Il faut un second invariant
 * indépendant, et il existe : LA SÉRIE DU FONDS LUI-MÊME. Si le montant
 * reconstruit tombe entre la VL de la séance précédente et celle de la
 * suivante, ce n'est plus une déduction, c'est une vérification.
 *
 *   npx tsx --conditions=react-server scripts/date-qui-est-un-montant.mjs
 */
import fs from "node:fs";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const dire = (s) => fs.writeSync(1, `${s}\n`);

/* L'ÉPOQUE DU SYSTÈME 1900, ET SON BOGUE. Le jour 0 est le 30 décembre 1899
   parce qu'Excel compte un 29 février 1900 qui n'a jamais existé. Toute
   conversion qui part du 31 décembre 1899 ou du 1er janvier 1900 se décale
   d'un ou deux jours, et sur un montant un jour vaut un franc. */
const EPOQUE = Date.UTC(1899, 11, 30);
const serieDuJour = (iso) => Math.round((Date.parse(`${iso}T00:00:00Z`) - EPOQUE) / 86400000);
const jourDeSerie = (n) => new Date(EPOQUE + n * 86400000).toISOString().slice(0, 10);

/* Contrôle de l'époque : 1ᵉʳ janvier 2015 vaut 42 005, borne déjà utilisée
   par le lecteur. Si cette égalité tombe, tout le reste est faux. */
if (serieDuJour("2015-01-01") !== 42005) throw new Error(`époque fausse : 2015-01-01 vaut ${serieDuJour("2015-01-01")} et non 42005`);
dire(`époque vérifiée : 2015-01-01 = 42005, et 46206 = ${jourDeSerie(46206)}\n`);

const { data: bulletins } = await sb.from("market_bulletins").select("session_date, warnings").order("session_date");
const VIEILLE = /OPCVM (.+?) : VL du (\d{4})-(\d{2})-(\d{2}) ignorée/;

const cas = [];
for (const b of bulletins ?? []) {
  for (const w of b.warnings ?? []) {
    const m = VIEILLE.exec(w);
    if (!m || Number(m[2]) >= 2000) continue;
    cas.push({ seance: b.session_date, fonds: m[1].trim(), dateLue: `${m[2]}-${m[3]}-${m[4]}` });
  }
}

dire(`${cas.length} rangée(s) portant une VL antérieure à 2000\n`);

for (const c of cas) {
  const montant = serieDuJour(c.dateLue);
  /* La série du fonds autour de la séance : c'est elle qui valide ou démolit
     la reconstruction, et elle ne doit rien à la bourse. */
  const { data: serie } = await sb
    .from("fund_navs")
    .select("session_date, nav_date, nav, previous_nav")
    .eq("name", c.fonds)
    .gte("session_date", new Date(Date.parse(c.seance) - 30 * 86400000).toISOString().slice(0, 10))
    .lte("session_date", new Date(Date.parse(c.seance) + 30 * 86400000).toISOString().slice(0, 10))
    .order("session_date");

  const voisines = (serie ?? []).map((x) => Number(x.nav));
  const plusProche = voisines.length ? voisines.reduce((a, v) => (Math.abs(v - montant) < Math.abs(a - montant) ? v : a)) : undefined;
  const ecart = plusProche == null ? undefined : montant - plusProche;

  dire(`${c.seance}  ${c.fonds}`);
  dire(`   date lue        ${c.dateLue}`);
  dire(`   montant déduit  ${montant.toLocaleString("fr-FR")}`);
  dire(`   VL voisines     ${voisines.length ? voisines.map((v) => v.toFixed(2)).join(" · ") : "(aucune)"}`);
  dire(`   la plus proche  ${plusProche?.toFixed(2) ?? "—"}   écart ${ecart == null ? "—" : ecart.toFixed(2)} franc(s)`);
  dire("");
}
