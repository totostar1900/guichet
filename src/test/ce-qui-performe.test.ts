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
    expect(code(SENS), "le signe n'est plus écrit : la couleur porte seule le sens de la variation").toMatch(/arrondi > 0 \? "\+" : arrondi < 0 \? "−" : ""/);
  });

  /* « TOUJOURS DEUX À TROIS LIGNES » (3 novembre 2026) : aucun seuil n'écarte une ligne immobile, et un côté
     ne se vide plus — la bascule garde la queue du classement retournée, et les lignes à 0,0 % complètent. */
  it("ne vide plus un côté : plus de message de côté vide, plus de filtre sur le signe", () => {
    const src = code(SENS);
    expect(src, "un côté vide se nomme de nouveau : le classement ne complète plus avec des lignes à 0,0 %").not.toContain("Aucune ligne n'a reculé");
    expect(src, "le classement refiltre sur le signe : un marché calme vide de nouveau le bloc").not.toMatch(/variationPct\s*[<>]\s*0\)/);
    expect(src, "les baisses ne sont plus la queue du classement, retournée").toMatch(/\(baisse \? \[\.\.\.lignes\]\.reverse\(\) : lignes\)\.slice\(0, max\)/);
  });

  /* LE PETIT GRAPHE EST AU MILIEU DE LA LIGNE : la forme du cours sur la fenêtre, entre le nom et le cours. */
  it("dessine le petit graphe de chaque ligne, entre le nom et le cours", () => {
    const src = code(SENS);
    expect(src, "le petit graphe a quitté la ligne").toMatch(/<MiniCourbe serie=\{l\.serie\} \/>/);
    expect(src.indexOf("<MiniCourbe"), "le graphe n'est plus entre le nom et le cours").toBeGreaterThan(src.indexOf("styles.nom"));
    expect(src.indexOf("<MiniCourbe"), "le graphe n'est plus avant le cours").toBeLessThan(src.indexOf("styles.cours"));
    expect(code(SECTION), "la fenêtre n'est plus dite sur trois mois").toContain("sur trois mois");
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
