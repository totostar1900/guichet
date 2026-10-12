/**
 * LES PHOTOS DE L'ACCUEIL, RAMENÉES AU THÈME SOMBRE.
 *
 * Chaque photo est recadrée pour sa place, assombrie, désaturée, puis voilée
 * de marine. La cible est une luminance moyenne entre 30 et 55 sur 255 : au
 * dessus la photo crève le thème, en dessous elle devient une tache noire.
 *
 * LE VOILE EST MARINE ET NON NOIR, et c'est ce qui fait la différence entre
 * « assombri » et « éteint » : le noir tue les ors du bulletin et des
 * lampadaires, le marine les garde et rapproche la photo de --paper (#081425).
 *
 * On mesure APRÈS traitement et on l'imprime : une recette qu'on ne vérifie
 * pas est une recette qu'on croit.
 *
 *   node scripts/photos-traiter.mjs
 */
import fs from "node:fs";
import sharp from "sharp";

const SRC = "C:/Users/Nitch/AppData/Local/Temp/claude/C--Users-Nitch-OneDrive---PURPOSE-CAPITAL-MyChamaProject/a342ef12-6ae7-41bd-8a4e-9fe5b5ebf7df/images";
const OUT = "C:/dev/guichet/public/maquette/photos";
fs.mkdirSync(OUT, { recursive: true });

/** Le voile : --navy, posé en couche plate avec son alpha. */
const voile = async (w, h, alpha) =>
  sharp({ create: { width: w, height: h, channels: 4, background: { r: 11, g: 37, b: 69, alpha } } })
    .png()
    .toBuffer();

/**
 * La sélection, et ce que chaque photo vient dire.
 *
 * `position` choisit ce que le recadrage garde : « attention » laisse sharp
 * viser la zone la plus saillante, sinon on nomme le bord à préserver.
 */
const LOT = [
  {
    src: "5.jpg",
    nom: "portrait-hero",
    r: "Le visage de l'ouverture. Déjà sombre (26/255), on ne fait presque rien.",
    w: 1000,
    h: 1250,
    position: "attention",
    brightness: 1.16,
    saturation: 0.92,
    contraste: [1.04, -2],
    alpha: 0.1,
  },
  {
    src: "14.jpg",
    nom: "conseiller-bande",
    r: "La bande du conseiller. Noir et blanc, 40/255, on garde le grain.",
    w: 1800,
    h: 700,
    position: "attention",
    brightness: 0.92,
    saturation: 1,
    contraste: [1.08, -6],
    alpha: 0.26,
  },
  {
    src: "9.jpg",
    nom: "deux-ecrans",
    r: "La plus claire du lot (152/255, 57 % de pixels clairs). Démonstration : plein jour ramené à la nuit.",
    w: 1400,
    h: 900,
    position: "attention",
    brightness: 0.34,
    saturation: 0.55,
    contraste: [1.22, -14],
    alpha: 0.42,
  },
  {
    src: "10.jpg",
    nom: "pont-tuile",
    r: "Le pont sur le Wouri à l'heure bleue. L'or des lampadaires est celui de la maison.",
    w: 500,
    h: 375,
    position: "centre",
    brightness: 0.68,
    saturation: 1.05,
    contraste: [1.1, -6],
    alpha: 0.3,
  },
  {
    src: "11.jpg",
    nom: "statue-tuile",
    r: "La Nouvelle Liberté, Douala. Le ciel turquoise crève le thème, il faut le noyer.",
    w: 399,
    h: 499,
    position: "centre",
    brightness: 0.5,
    saturation: 0.45,
    contraste: [1.18, -10],
    alpha: 0.4,
  },
  {
    src: "12.jpg",
    nom: "chutes-tuile",
    r: "Les chutes d'Ekom. Le vert vire au bleu nuit.",
    w: 500,
    h: 500,
    position: "centre",
    brightness: 0.52,
    saturation: 0.42,
    contraste: [1.16, -10],
    alpha: 0.4,
  },
  {
    src: "6.jpg",
    nom: "pont-texture",
    r: "Le second pont, en texture derrière l'appel final : il doit disparaître à moitié.",
    w: 910,
    h: 300,
    position: "centre",
    brightness: 0.78,
    saturation: 1,
    contraste: [1.12, -8],
    alpha: 0.3,
  },
];

const luminance = async (buf) => {
  const { data } = await sharp(buf).resize(64, 64, { fit: "inside" }).greyscale().raw().toBuffer({ resolveWithObject: true });
  let t = 0;
  for (const v of data) t += v;
  return Math.round(t / data.length);
};

const POSITION = { centre: "centre", attention: sharp.strategy.attention };

console.log("photo              sortie                 avant  après   poids");
for (const p of LOT) {
  const avant = await luminance(fs.readFileSync(`${SRC}/${p.src}`));
  const v = await voile(p.w, p.h, p.alpha);
  const buf = await sharp(`${SRC}/${p.src}`)
    .resize(p.w, p.h, { fit: "cover", position: POSITION[p.position] ?? p.position })
    .modulate({ brightness: p.brightness, saturation: p.saturation })
    .linear(p.contraste[0], p.contraste[1])
    .composite([{ input: v, blend: "over" }])
    .webp({ quality: 74 })
    .toBuffer();
  fs.writeFileSync(`${OUT}/${p.nom}.webp`, buf);
  const apres = await luminance(buf);
  const ko = Math.round(buf.length / 1024);
  const verdict = apres >= 28 && apres <= 58 ? "" : "   << hors cible 28-58";
  console.log(`${p.src.padEnd(8)} ${p.nom.padEnd(22)} ${String(avant).padStart(5)} ${String(apres).padStart(6)} ${String(ko).padStart(6)} Ko${verdict}`);
}
console.log(`\n→ ${OUT}`);
