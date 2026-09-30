/**
 * Ce que la BEAC annonce en ce moment, et ce que le Guichet en fait.
 *
 * Le pont existe : annonce BEAC, fiche « à valider », puis une ligne publiée
 * par le desk. Quand la page des titres n'a plus de séance ouverte, la
 * question est de savoir à quel maillon la chaîne s'arrête. Ce script lit la
 * source telle que le robot la lit, sans passer par le dépôt, et dit ce qu'il
 * y trouve.
 *
 *   node scripts/beac-annonces-etat.mjs
 */
const URL_BEAC = "https://www.beac.int/annonces-et-communiques/";

const html = await fetch(URL_BEAC, { headers: { "user-agent": "Mozilla/5.0 (compatible; Guichet/1.0)" } })
  .then((r) => (r.ok ? r.text() : Promise.reject(new Error(`HTTP ${r.status}`))))
  .catch((e) => {
    console.log(`La source ne répond pas : ${e.message}`);
    process.exit(1);
  });

console.log(`Page lue : ${html.length} octets`);

// Les lignes du tableau, sans le parseur de l'application : on veut savoir ce
// que la page CONTIENT, pas ce que le parseur en retient.
const lignes = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map((m) =>
  [...m[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((c) =>
    c[1]
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  ),
);

const annonces = lignes.filter((c) => c.join(" ").match(/annonce/i));
const resultats = lignes.filter((c) => c.join(" ").match(/r[ée]sultat|communiqu[ée] de r/i));

console.log(`Lignes du tableau : ${lignes.length}`);
console.log(`dont annonces : ${annonces.length}`);
console.log(`dont résultats : ${resultats.length}`);

// Une date quelque part dans la ligne, au format que la BEAC emploie.
const MOIS = { janvier: 1, "février": 2, mars: 3, avril: 4, mai: 5, juin: 6, juillet: 7, "août": 8, septembre: 9, octobre: 10, novembre: 11, "décembre": 12 };
const dateDe = (texte) => {
  const m = texte.match(/(\d{1,2})\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+(\d{4})/i);
  if (!m) return undefined;
  const mois = MOIS[m[2].toLowerCase()];
  return `${m[3]}-${String(mois).padStart(2, "0")}-${String(Number(m[1])).padStart(2, "0")}`;
};

const today = new Date().toISOString().slice(0, 10);
const datees = annonces.map((c) => ({ date: dateDe(c.join(" ")), texte: c.join(" · ").slice(0, 110) })).filter((x) => x.date);
const devant = datees.filter((x) => x.date >= today).sort((a, b) => a.date.localeCompare(b.date));

console.log(`\nAnnonces portant une date lisible : ${datees.length}`);
console.log(`Annonces dont la date est aujourd'hui ou après : ${devant.length}`);
if (datees.length) {
  const tri = [...datees].sort((a, b) => b.date.localeCompare(a.date));
  console.log(`La plus récente : ${tri[0].date}`);
}
for (const a of devant.slice(0, 12)) console.log(`  ${a.date}  ${a.texte}`);
if (!devant.length) console.log("  (aucune séance devant nous dans les annonces)");
