/**
 * DEUX RANGÉES VOISINES QUI ONT ÉCHANGÉ LEUR NOMINAL.
 *
 * Après la grille par sous-tableau (lecteur v18), 784 relevés d'encours
 * manquent encore, et quatre lignes en concentrent 671. Sur la séance du
 * 3 juillet 2023, deux rangées voisines sont imprimées et refusées, et leur
 * arithmétique dit pourquoi :
 *
 *   CM0000020305  nominal imprimé 7 500   mais 23 500 000 × 10 000 × 0,97
 *                                         = 227 950 000 000, l'encours imprimé
 *   GA0000020248  nominal imprimé 10 000  mais 18 882 775 ×  7 500 × 0,995
 *                                         = 140 912 708 438, l'encours imprimé
 *
 * Chacune tombe juste AVEC LE NOMINAL DE L'AUTRE, au franc près. Notre lecteur
 * a raison de les refuser : le contrôle « titres × nominal × cours = encours »
 * échoue, et il échoue parce que le document se contredit.
 *
 * CE SCRIPT NE CORRIGE RIEN. Il compte : sur combien de séances, pour combien
 * de couples, l'échange rend les deux arithmétiques exactes. Un couple qui
 * tombe juste deux fois de suite n'est pas un hasard ; cinquante couples qui
 * tombent juste sont un défaut de publication, et c'est une ligne du rapport
 * au fournisseur, pas une réparation de notre côté.
 *
 *   npx tsx --conditions=react-server scripts/nominaux-echanges.mjs [n]
 */
import fs from "node:fs";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const { createClient } = await import("@supabase/supabase-js");
const { rangeesDuPdf } = await import("../src/lib/market/boc-geometrie.ts");
const { readSource } = await import("../src/lib/intake/storage.ts");
const { repo } = await import("../src/lib/data/index.ts");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const dire = (s) => fs.writeSync(1, `${s}\n`);

/* Les séances où il manque encore quelque chose. */
const brut = [];
for (let de = 0; ; de += 1000) {
  const { data } = await sb.from("debt_outstandings").select("isin, session_date").range(de, de + 999);
  brut.push(...(data ?? []));
  if ((data ?? []).length < 1000) break;
}
const bornes = new Map();
for (const l of brut) {
  const b = bornes.get(l.isin) ?? { d1: l.session_date, d2: l.session_date };
  if (l.session_date < b.d1) b.d1 = l.session_date;
  if (l.session_date > b.d2) b.d2 = l.session_date;
  bornes.set(l.isin, b);
}
const presentes = new Set(brut.map((l) => `${l.isin}|${l.session_date}`));
const seances = [...new Set(brut.map((l) => l.session_date))].sort();
const manquePar = new Map();
for (const [isin, b] of bornes) for (const s of seances) {
  if (s < b.d1 || s > b.d2 || presentes.has(`${isin}|${s}`)) continue;
  manquePar.set(s, (manquePar.get(s) ?? 0) + 1);
}
const trouees = [...manquePar.entries()].sort((a, b) => b[1] - a[1]).slice(0, Number(process.argv[2] ?? 40)).map(([s]) => s);
dire(`${trouees.length} séance(s) examinée(s)\n`);

const bulletins = new Map((await repo().listBulletins(3000)).map((b) => [b.sessionDate, b]));
const ISIN = /\b([A-Z]{2}\d{10})\b/;
const AMORTI = /\b(CONSTANT|IN\s*-?\s*FINE|DIFFERE|DIFFÉRÉ)\b/i;
const nb = (s) => Number(String(s).replace(/[^\d,]/g, "").replace(",", ".")) || 0;

/** Les nombres d'une rangée d'encours, dans l'ordre où ils paraissent. */
function chiffres(cellules) {
  return cellules
    .map((c) => c.texte.trim())
    .filter((t) => /^[\d  ]+(?:,\d+)?$/.test(t) && t.length > 0)
    .map(nb);
}

let couples = 0, seancesTouchees = 0, pieces = 0;
const parCouple = new Map();

for (const seance of trouees) {
  const b = bulletins.get(seance);
  if (!b?.fileKey) continue;
  let rangees;
  try { rangees = await rangeesDuPdf(await readSource(b.fileKey)); } catch { continue; }
  pieces++;

  /* Les rangées d'encours, dans l'ordre de la page, avec leurs nombres. */
  const lignes = [];
  for (const r of rangees) {
    const t = r.cellules.map((c) => c.texte).join(" ");
    if (!AMORTI.test(t) || !ISIN.test(t)) continue;
    const n = chiffres(r.cellules);
    /* On cherche le gabarit : montant levé, titres, nominal, cours, …, encours.
       Le dernier grand nombre de la rangée est l'encours calculé. */
    if (n.length < 5) continue;
    const encours = n.filter((x) => x > 1e8).pop();
    const leve = n.find((x) => x > 1e8);
    if (!encours || !leve) continue;
    const titres = n.find((x) => x > 1000 && x < 1e8 && Math.abs(leve / x - Math.round(leve / x)) < 1e-6);
    if (!titres) continue;
    const i = n.indexOf(titres);
    const nominal = n[i + 1];
    const cours = n[i + 2];
    if (!nominal || !cours || cours > 200) continue;
    lignes.push({ isin: t.match(ISIN)[1], titres, nominal, cours, encours, page: r.page });
  }

  const juste = (l, nominal) => Math.abs(l.titres * nominal * (l.cours / 100) - l.encours) <= 1;
  const faux = lignes.filter((l) => !juste(l, l.nominal));
  let ici = 0;
  for (const a of faux) {
    for (const b2 of faux) {
      if (a === b2 || a.isin >= b2.isin) continue;
      /* L'échange rend-il les DEUX exactes ? C'est la seule preuve qui vaille :
         une seule qui tombe juste serait un hasard sur deux valeurs rondes. */
      if (juste(a, b2.nominal) && juste(b2, a.nominal)) {
        ici++;
        const k = [a.isin, b2.isin].sort().join(" ↔ ");
        parCouple.set(k, (parCouple.get(k) ?? 0) + 1);
      }
    }
  }
  if (ici) {
    seancesTouchees++;
    couples += ici;
  }
  if (pieces % 10 === 0) dire(`   ${pieces}/${trouees.length} · ${couples} couple(s)`);
}

dire(`\n=== DEUX RANGÉES QUI ONT ÉCHANGÉ LEUR NOMINAL ===`);
dire(`   pièces examinées                 ${pieces}`);
dire(`   séances portant un échange       ${seancesTouchees}`);
dire(`   couples trouvés                  ${couples}\n`);
for (const [k, n] of [...parCouple.entries()].sort((a, b) => b[1] - a[1])) dire(`   ${k}   ${n} séance(s)`);
