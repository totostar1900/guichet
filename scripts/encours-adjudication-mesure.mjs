/**
 * L'ENCOURS ADJUGÉ, SUR LES 249 SÉANCES QUE NOUS AVONS.
 *
 * Le module est pur et ses tests tiennent sur six cas écrits à la main, ce qui
 * ne prouve rien du monde. On lui donne la table entière et on regarde trois
 * choses : ce qui entre, ce qui reste dehors et pourquoi, et la forme du stock
 * dans le temps. Rien n'est écrit en base.
 *
 *   npx tsx --conditions=react-server scripts/encours-adjudication-mesure.mjs
 */
import fs from "node:fs";
const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, ""); }
const { createClient } = await import("@supabase/supabase-js");
const M = await import("../src/lib/market/encours-adjudication.ts");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const dire = (s) => fs.writeSync(1, `${s}\n`);
const mds = (n) => (n / 1e9).toLocaleString("fr-FR", { maximumFractionDigits: 1 });

const { data } = await sb.from("auction_results").select("*").order("session_on");
const lignes = data.map((l) => ({
  cle: l.id, codeEmission: l.code_emission ?? undefined, pays: l.country, instrument: l.instrument,
  tenor: l.tenor ?? undefined, seance: l.session_on, servi: l.served == null ? undefined : Number(l.served),
  echeance: l.maturity_on ?? undefined, ecartee: l.set_aside_reason ?? undefined,
}));

const { retenues, laissees } = M.preparer(lignes);
dire(`${lignes.length} séance(s) en base\n`);
dire(`=== CE QUI ENTRE DANS LE STOCK ===`);
dire(`   retenues                 ${String(retenues.length).padStart(4)}`);
dire(`   échéance imprimée        ${String(retenues.filter((r) => r.origineEcheance === "imprimee").length).padStart(4)}`);
dire(`   échéance calculée        ${String(retenues.filter((r) => r.origineEcheance === "calculee").length).padStart(4)}   (séance + durée)`);
dire(`\n=== CE QUI RESTE DEHORS, ET POURQUOI ===`);
const parMotif = new Map();
for (const l of laissees) parMotif.set(l.motif, [...(parMotif.get(l.motif) ?? []), l]);
for (const [m, xs] of [...parMotif.entries()].sort((a, b) => b[1].length - a[1].length)) {
  dire(`   ${m.padEnd(14)} ${String(xs.length).padStart(4)}`);
  for (const x of xs.slice(0, 3)) dire(`         ${x.ligne.seance} ${x.ligne.pays} ${x.ligne.instrument} ${x.ligne.tenor ?? ""} · ${x.dit}`);
  if (xs.length > 3) dire(`         … et ${xs.length - 3} autre(s)`);
}

const auj = new Date().toISOString().slice(0, 10);
const p = M.encoursA(retenues, auj);
dire(`\n=== LE STOCK AUJOURD'HUI, ${auj} ===`);
dire(`   ${mds(p.total)} Mds sur ${p.lignes} ligne(s) vivante(s)\n`);
for (const [k, v] of Object.entries(p.parPays).sort((a, b) => b[1] - a[1])) dire(`   ${k.padEnd(16)} ${mds(v).padStart(8)} Mds`);
dire(``);
for (const [k, v] of Object.entries(p.parInstrument).sort((a, b) => b[1] - a[1])) dire(`   ${k.padEnd(16)} ${mds(v).padStart(8)} Mds`);

/* LA COMPARAISON QUI DONNE LA MESURE : la cote du BOC pèse ce qu'elle pèse. */
const enc = [];
for (let de = 0; ; de += 1000) {
  const { data: d2 } = await sb.from("debt_outstandings").select("session_date, outstanding").order("session_date", { ascending: false }).range(de, de + 999);
  enc.push(...(d2 ?? [])); if ((d2 ?? []).length < 1000) break;
}
const derniere = enc[0]?.session_date;
const cote = enc.filter((x) => x.session_date === derniere).reduce((a, x) => a + Number(x.outstanding), 0);
dire(`\n   pour mémoire, la cote du BOC au ${derniere} : ${mds(cote)} Mds`);
dire(`   adjugé reconstitué / coté : ${(p.total / cote).toLocaleString("fr-FR", { maximumFractionDigits: 2 })}`);

dire(`\n=== LE STOCK, FIN DE MOIS ===`);
const serie = M.serieMensuelle(retenues, auj);
for (const x of serie.filter((_, i) => i % 3 === 0 || i === serie.length - 1)) dire(`   ${x.date}  ${mds(x.total).padStart(8)} Mds  ${String(x.lignes).padStart(3)} ligne(s)`);
const haut = serie.reduce((m, x) => (x.total > m.total ? x : m), serie[0]);
dire(`\n   sommet : ${mds(haut.total)} Mds au ${haut.date}`);
dire(`\n=== CE QU'IL FAUT DIRE AVEC LE CHIFFRE ===`);
for (const a of M.AVERTISSEMENTS) dire(`   · ${a}`);
dire(`   · ${M.couverture(252, 382).dit}`);
