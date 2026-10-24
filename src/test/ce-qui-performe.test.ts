import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.join(__dirname, "../..");
const lire = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");
/* Le code, pas ce qu'on en dit : ces fichiers citent « indexPageData » dans
   leurs notes, pour expliquer pourquoi ils ne l'appellent pas. */
const code = (p: string) =>
  lire(p)
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const SECTION = "src/components/CeQuiPerforme.tsx";
const SENS = "src/components/SensDuClassement.tsx";

/**
 * LA SECTION QUI CLASSE, ET CE QU'ELLE DOIT DIRE POUR RESTER VRAIE.
 *
 * Sur cette cote, l'indice bouge sur 70 des 271 séances lues et une action
 * garde son cours dans 95 % d'entre elles. Un pourcentage posé sans sa
 * période se lit donc comme celui du jour — c'est-à-dire comme le seul
 * chiffre qui n'existe pas ici.
 */
describe("ce qui performe, à l'écran", () => {
  it("écrit la fenêtre, avec ses deux séances", () => {
    const src = code(SECTION);
    expect(src, "la période a quitté la section : les pourcentages se liront comme ceux de la séance").toContain("classement.depuis");
    expect(src, "la borne récente n'est plus écrite").toContain("classement.jusquAu");
  });

  /* LE COÛT EST LA RAISON D'ÊTRE DE LA LECTURE DÉDIÉE. La section est sur la
     page la plus visitée de la maison ; y rappeler « indexPageData » lui
     coûterait une dizaine de requêtes, dont sept non bornées. */
  it("passe par la lecture dédiée, et par elle seule", () => {
    const src = code(SECTION);
    expect(src, "la section n'appelle plus « performanceSur »").toContain("performanceSur(");
    expect(src, "la section est repassée par « indexPageData », que la lecture dédiée existait pour éviter").not.toContain("indexPageData");
  });

  /* LE SIGNE EST ÉCRIT, PAS SEULEMENT TEINTÉ. Qui ne distingue pas le vert du
     rouge doit lire « −3,1 % » et savoir tout. */
  it("écrit le signe de la variation", () => {
    expect(code(SENS), "le signe n'est plus écrit : la couleur porte seule le sens de la variation").toMatch(/variationPct > 0 \? "\+" : "−"/);
  });

  /* UN CÔTÉ VIDE SE NOMME. Sur cette place, un mois entier sans une seule
     baisse arrive, et un onglet qui s'ouvre sur rien se lit comme une panne
     alors qu'il dit quelque chose. */
  it("nomme chacun des deux côtés vides", () => {
    const src = code(SENS);
    expect(src, "le côté sans baisse ne se nomme plus").toContain("Aucune ligne n'a reculé sur la période.");
    expect(src, "le côté sans hausse ne se nomme plus").toContain("Aucune ligne n'a monté sur la période.");
  });

  /* L'ÉTAT NON CHOISI GARDE SON CONTOUR, et les deux onglets se disent à qui
     écoute la page : un segmenté qui ne se distingue que par un remplissage
     disparaît pour qui ne voit pas la teinte. */
  it("tient un segmenté lisible sans la couleur", () => {
    expect(code(SENS), "les onglets ne se déclarent plus comme tels").toContain("aria-selected");
    const css = lire("src/components/CeQuiPerforme.module.css");
    const onglet = css.match(/\.onglet\s*\{([^}]*)\}/)?.[1] ?? "";
    expect(onglet, "l'onglet non choisi a perdu sa bordure : il ne se distingue plus que par un fond").toMatch(/border:\s*1px solid/);
  });
});
