/**
 * OÙ UN NOMBRE NU OCCUPE-T-IL UNE COLONNE DE DATE ?
 *
 * Georges a identifié « 46 120,00 » comme un numéro de série Excel laissé non
 * formaté par l'export qui fabrique le PDF : 46120 vaut le 8 avril 2026, et la
 * variation imprimée au bulletin le confirme. Avant de coder la tolérance, on
 * mesure sa portée : accident d'un fonds, ou défaut d'export systématique.
 *
 * DEUX RELEVÉS, ET ON LES LANCE SÉPARÉMENT.
 *
 *   A · les débris OPCVM. Chaque ligne que le lecteur jette est confrontée à
 *       la queue normale dont l'une des TROIS dates serait un nombre. On dit
 *       quel fonds, quelle colonne, et ce qui ne s'explique toujours pas.
 *
 *   B · le reste du bulletin. Un nombre dans la fenêtre des séries collé à
 *       une vraie date : la signature d'une colonne à moitié formatée, telle
 *       qu'on la verrait dans les obligations, les actions ou une échéance.
 *
 * DEUX LEÇONS DE LA PREMIÈRE TENTATIVE, qui a tourné 1 h 41 sans écrire un
 * octet et qu'il a fallu arrêter sans rien savoir.
 *
 *   ELLE NE DISAIT RIEN. Aucune trace par séance, donc un silence identique
 *   qu'elle avance ou qu'elle soit bloquée. Une mesure qui ne dit pas où elle
 *   en est n'est pas interrompable : on ne peut que l'attendre ou la tuer à
 *   l'aveugle. C'est la famille de défauts la plus coûteuse de ce projet, et
 *   je l'ai reproduite dans l'outil qui sert à la traquer.
 *
 *   LE RELEVÉ B ÉTAIT GOURMAND. Il gardait un contexte de cent signes pour
 *   CHAQUE couple « nombre, date » du bulletin entier, dans une table sans
 *   plafond : des centaines de milliers de clefs distinctes sur 812 séances.
 *   Il compte désormais, et ne garde qu'un échantillon borné.
 *
 *   npx tsx --conditions=react-server scripts/dates-en-serie-excel.mjs A
 *   npx tsx --conditions=react-server scripts/dates-en-serie-excel.mjs B
 */
import fs from "node:fs";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const { fetchBoc, pdfText } = await import("../src/lib/market/boc.ts");
const { parseBoc } = await import("../src/lib/market/boc-parse.ts");
const { readSource } = await import("../src/lib/intake/storage.ts");
const { repo } = await import("../src/lib/data/index.ts");

const releve = (process.argv[2] ?? "A").toUpperCase();

/* La fenêtre des séries plausibles : 42005 = 1ᵉʳ janvier 2015,
   47484 = 1ᵉʳ janvier 2030. En dehors, un nombre de cette taille est un
   montant et pas une date. */
const SERIE_MIN = 42005;
const SERIE_MAX = 47484;
const jour = (n) => new Date(Date.UTC(1899, 11, 30) + n * 86400000).toISOString().slice(0, 10);
const dansLaFenetre = (n) => Number.isFinite(n) && n >= SERIE_MIN && n <= SERIE_MAX;
const nombre = (s) => Number(String(s).replace(/[\s ]/g, "").replace(",", "."));

const MONTANT = String.raw`-?[\d ]+(?:,\d{1,2})?`;
const DATE = String.raw`\d{2}/\d{2}/\d{4}`;
const PCT = String.raw`-?[\d ]+(?:,\d{1,2})?%`;
/* La queue normale, mais chacune des trois dates peut être un nombre. */
const QUEUE = new RegExp(
  String.raw`\b([MODA0])\s+([\d ]+?)\s+(-|${MONTANT})\s+(${DATE}|${MONTANT})\s+(${MONTANT})\s+(${DATE}|${MONTANT})\s+(${DATE}|${MONTANT})\s+(${PCT})\s+(-|${PCT})\s*$`,
);
const estDate = (s) => /^\d{2}\/\d{2}\/\d{4}$/.test(String(s).trim());
const COLONNE = { 4: "date précédente", 6: "date courante", 7: "date de création" };

const bulletins = (await repo().listBulletins(2000)).sort((a, b) => a.sessionDate.localeCompare(b.sessionDate));
process.stdout.write(`relevé ${releve} · ${bulletins.length} séances en base\n\n`);

const M = /^OPCVM : ligne ignorée/;
const parColonne = new Map();
const parFonds = new Map();
const inexpliques = [];
const ailleursN = new Map();
const ailleursEx = new Map();
const PLAFOND_EXEMPLES = 400;
let vues = 0;
let sansPdf = 0;
let debris = 0;
const t0 = Date.now();

for (const [i, b] of bulletins.entries()) {
  /* Une trace toutes les vingt-cinq séances, écrite SANS tampon : la mesure
     dit où elle en est, et on peut l'arrêter en connaissance de cause. */
  if (i % 25 === 0) {
    const s = Math.round((Date.now() - t0) / 1000);
    fs.writeSync(1, `  … ${i}/${bulletins.length}  ${b.sessionDate}  ${s}s  (${debris} débris)\n`);
  }

  let bytes;
  try {
    bytes = b.fileKey ? await readSource(b.fileKey) : (await fetchBoc(b.sessionDate))?.bytes;
  } catch {
    bytes = undefined;
  }
  if (!bytes) {
    sansPdf++;
    continue;
  }
  const texte = await pdfText(Uint8Array.from(bytes));
  vues++;

  if (releve === "A") {
    for (const w of parseBoc(texte).warnings.filter((x) => M.test(x))) {
      debris++;
      const jete = /jeté « ([^»]*) »/.exec(w)?.[1] ?? "";
      const q = jete.match(QUEUE);
      if (!q) {
        inexpliques.push(`${b.sessionDate} · ${jete.slice(0, 140)}`);
        continue;
      }
      const nom = jete.slice(0, q.index).trim().replace(/\s+/g, " ").slice(-44);
      let touche = false;
      for (const k of [4, 6, 7]) {
        if (estDate(q[k])) continue;
        const n = nombre(q[k]);
        if (!dansLaFenetre(n)) continue;
        touche = true;
        parColonne.set(COLONNE[k], (parColonne.get(COLONNE[k]) ?? 0) + 1);
        const v = parFonds.get(nom) ?? { n: 0, exemple: "", colonne: COLONNE[k] };
        parFonds.set(nom, { n: v.n + 1, exemple: `${String(q[k]).trim()} → ${jour(n)}`, colonne: COLONNE[k] });
      }
      if (!touche) inexpliques.push(`${b.sessionDate} · ${jete.slice(0, 140)}`);
    }
  } else {
    /* LE DÉTECTEUR DE LA PREMIÈRE VERSION ÉTAIT FAUX, et il a coûté 53 minutes
       pour 2 612 fausses prises, toutes de la même espèce. Sans ancrage,
       « 43 868 » se détachait du MILIEU de « 1 043 868,10 », une valeur
       liquidative à sept chiffres, et tombait dans la fenêtre des séries.
       L'échantillon de contextes l'a montré d'un coup d'œil : les vingt
       formes les plus fréquentes étaient toutes un fragment de VL suivi de sa
       date, c'est-à-dire une rangée parfaitement normale.
       Un nombre nu est un nombre ENTIER : rien de numérique avant lui, ni
       chiffre, ni chiffre suivi d'une espace de milliers ; et rien après lui
       qui le prolonge. */
    const AVANT = String.raw`(?<![\d])(?<!\d )`;
    const NOMBRE = String.raw`\d{2}[  ]?\d{3}(?:,\d{1,2})?`;
    const APRES = String.raw`(?![  ]?\d)`;
    const DATEJ = String.raw`\d{2}\/\d{2}\/\d{4}`;
    const re = new RegExp(String.raw`${AVANT}(${NOMBRE})${APRES}\s+(${DATEJ})|(${DATEJ})\s+${AVANT}(${NOMBRE})${APRES}`, "g");
    let m;
    while ((m = re.exec(texte)) != null) {
      const n = nombre(m[1] ?? m[4]);
      if (!dansLaFenetre(n)) continue;
      const mois = jour(n).slice(0, 7);
      ailleursN.set(mois, (ailleursN.get(mois) ?? 0) + 1);
      if (ailleursEx.size < PLAFOND_EXEMPLES) {
        const ctx = texte.slice(Math.max(0, m.index - 40), m.index + 56).replace(/\s+/g, " ");
        ailleursEx.set(`${jour(n)} · ${ctx}`, (ailleursEx.get(`${jour(n)} · ${ctx}`) ?? 0) + 1);
      }
    }
  }
}

console.log(`\n${vues} séances lues, ${sansPdf} sans PDF, ${Math.round((Date.now() - t0) / 1000)}s\n`);

if (releve === "A") {
  console.log(`${debris} débris OPCVM\n`);
  console.log("=== colonne touchée par une série ===");
  if (parColonne.size === 0) console.log("  aucune");
  for (const [c, n] of [...parColonne].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(3)}  ${c}`);

  console.log("\n=== fonds concernés ===");
  for (const [f, v] of [...parFonds].sort((a, b) => b[1].n - a[1].n)) console.log(`  ×${String(v.n).padStart(3)}  ${f}   (${v.colonne}, ex. ${v.exemple})`);

  const formes = new Map();
  for (const l of inexpliques) formes.set(l.slice(13), (formes.get(l.slice(13)) ?? 0) + 1);
  console.log(`\n=== débris que la série N'EXPLIQUE PAS : ${inexpliques.length}, en ${formes.size} formes ===`);
  for (const [f, n] of [...formes].sort((a, b) => b[1] - a[1]).slice(0, 16)) console.log(`  ×${String(n).padStart(3)}  ${f}`);
} else {
  const total = [...ailleursN.values()].reduce((a, b) => a + b, 0);
  console.log(`=== ${total} nombres de la fenêtre collés à une vraie date, par mois que la série désignerait ===`);
  for (const [m, n] of [...ailleursN].sort((a, b) => b[1] - a[1]).slice(0, 20)) console.log(`  ${String(n).padStart(5)}  ${m}`);
  console.log(`\n=== échantillon de contextes (${Math.min(ailleursEx.size, 20)} sur ${ailleursEx.size} gardés) ===`);
  for (const [c, n] of [...ailleursEx].sort((a, b) => b[1] - a[1]).slice(0, 20)) console.log(`  ×${String(n).padStart(3)}  ${c}`);
}
