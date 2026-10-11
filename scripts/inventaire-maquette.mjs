/**
 * L'inventaire d'une maquette, planche par planche.
 *
 * Georges, le 12 octobre 2026 : « nous avons généré cette maquette pour
 * l'implémenter à la virgule près ». Avant de dire comment rattraper, il faut
 * la liste exacte de ce qu'elle porte : titres, colonnes, compteurs, boutons,
 * et les éléments DESSINÉS, que la comparaison des titres ne voit pas.
 *
 *   node scripts/inventaire-maquette.mjs <dossier project/>
 */
import fs from "node:fs";
import path from "node:path";

const dir = process.argv[2];
const index = JSON.parse(fs.readFileSync(path.join(dir, "canvas.json"), "utf8"));
const sansBalises = (s) => s.replace(/<[^>]*>/g, " ").replace(/&middot;/g, "·").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

for (const nom of index.order) {
  const f = path.join(dir, nom);
  if (!fs.existsSync(f)) {
    console.log(`\n### ${nom} — FICHIER ABSENT`);
    continue;
  }
  const s = fs.readFileSync(f, "utf8");
  const b = index.boards[nom] ?? {};
  console.log(`\n### ${nom} — « ${b.title ?? "sans titre"} »  ${b.w}×${b.h}${b.expand === "fill" ? " (page)" : ""}`);

  const pris = (re, max = 40) => [...s.matchAll(re)].map((m) => sansBalises(m[1] ?? m[0])).filter((x) => x && x.length > 1).slice(0, max);

  const titres = pris(/<h[1-3][^>]*>([^]*?)<\/h[1-3]>/g);
  if (titres.length) console.log(`   titres     : ${[...new Set(titres)].join(" | ")}`);

  const colonnes = pris(/<th[^>]*>([^]*?)<\/th>/g);
  if (colonnes.length) console.log(`   colonnes   : ${colonnes.join(" · ")}`);

  /* Les sur-titres en petites capitales : ce sont les compteurs et les
     étiquettes de section, et c'est la moitié de l'information d'un écran. */
  const etiquettes = pris(/text-transform: uppercase;[^>]*>([^<]{3,60})</g);
  if (etiquettes.length) console.log(`   étiquettes : ${[...new Set(etiquettes)].join(" · ")}`);

  const dt = pris(/<dt[^>]*>([^]*?)<\/dt>/g);
  if (dt.length) console.log(`   mesures    : ${dt.join(" · ")}`);

  const boutons = pris(/<button[^>]*>([^]*?)<\/button>/g);
  if (boutons.length) console.log(`   boutons    : ${boutons.join(" · ")}`);

  const champs = [...s.matchAll(/<(input|select|textarea)[^>]*?(?:id|name)="([^"]+)"[^>]*>/g)].map((m) => `${m[2]}(${m[1]})`);
  if (champs.length) console.log(`   champs     : ${[...new Set(champs)].join(" · ")}`);

  /* LES DESSINS. Une barre est un span sans texte, de largeur fixe et de
     hauteur variable ; une série en porte plusieurs et se déclare par un
     aria-label sur son conteneur. C'est ce qu'une comparaison de titres ne
     voit jamais, et c'est ce qui manquait à la mienne. */
  const series = [...s.matchAll(/role="img" aria-label="([^"]{8,120})"/g)].map((m) => m[1]);
  const barres = (s.match(/aria-hidden="true"><\/span>/g) ?? []).length;
  if (series.length || barres) console.log(`   DESSINS    : ${series.length} série(s), ${barres} barre(s)`);
  for (const x of series.slice(0, 6)) console.log(`                « ${x.slice(0, 100)} »`);

  const liens = [...new Set([...s.matchAll(/href="([A-Za-z]+\.dc\.html)"/g)].map((m) => m[1]))];
  if (liens.length) console.log(`   mène vers  : ${liens.join(" · ")}`);
}

/* La palette, parce qu'« à la virgule près » comprend les couleurs. */
const toutes = index.order.filter((n) => fs.existsSync(path.join(dir, n))).map((n) => fs.readFileSync(path.join(dir, n), "utf8")).join("");
const couleurs = {};
for (const m of toutes.matchAll(/#[0-9A-Fa-f]{6}/g)) couleurs[m[0].toUpperCase()] = (couleurs[m[0].toUpperCase()] ?? 0) + 1;
console.log(`\n### La palette de la maquette, par fréquence\n`);
for (const [c, n] of Object.entries(couleurs).sort((a, b) => b[1] - a[1]).slice(0, 14)) console.log(`   ${c}  ${n}`);
