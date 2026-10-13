/**
 * Ce que le lecteur fait d'une rangée dont la grille a coupé trois nombres.
 *
 * La rangée du Congo au 15 janvier 2025, telle que les abscisses la rendent :
 *   113 | 230 000 000 | 11 | 323 000 | 6 | 666,67 | 95,00
 * Trois nombres coupés en deux, et deux découpes qui satisfont l'identité.
 */
import { encoursGeometriques } from "../src/lib/market/boc-geometrie.ts";

const rangee = (page, y, textes) => ({ page, y, cellules: textes.map((texte, i) => ({ texte, x: 100 + i * 50, largeur: 45 })) });

const entete = [
  rangee(6, 500, ["Désignation du titre", "Code ISIN", "Mnemo", "Montant levé", "Nominal", "Mat", "Amortiss", "Périod"]),
  rangee(6, 490, ["l'émetteur", "facial", "cotation", "titres cotés", "en %", "précédente", "jour", "net"]),
  rangee(6, 480, ["l'échéance", "(Liquidité)"]),
];

const congo = ["ETAT DU CONGO", "EOCG 6,25% NET 2021-2026", "CG0000020238", "ECG02", "6,25", "30/07/2021", "113", "230 000 000", "11", "323 000", "6", "666,67", "95,00", "5", "CONSTANT", "AN", "22/03/2024", "22/03/2025", "71 712 295 590", "6,2", "0"];

const carnet = { sur: (m) => console.log("REFUS :", m) };
const out = encoursGeometriques([...entete, rangee(6, 400, congo)], carnet);
console.log(JSON.stringify(out, null, 1));

/* Et le contrôle à la main, pour savoir ce que chaque découpe donne. */
const essai = (titres, nominal, cours, encours, leve) => {
  const p = (titres * nominal * cours) / 100;
  const dec = String(nominal).split(".")[1]?.length ?? 0;
  const tol = 1 + (dec > 0 ? (titres * Math.pow(10, -dec) * cours) / 100 : 0);
  console.log(
    `titres ${String(titres).padStart(11)} × nominal ${String(nominal).padStart(9)} × ${cours} % = ${p.toFixed(0).padStart(14)} ` +
      `| encours ${encours} | écart ${(p - encours).toFixed(2).padStart(12)} | tolérance ${tol.toFixed(0).padStart(9)} | ${Math.abs(p - encours) <= tol ? "IDENTITÉ OK" : "refusée"} ` +
      `| levé/titres = ${(leve / titres).toFixed(6)}`,
  );
};
console.log();
essai(11_323_000, 6666.67, 95, 71_712_295_590, 113_230_000_000);
essai(113_230_006, 666.67, 95, 71_712_295_590, 113_230_000_000);
