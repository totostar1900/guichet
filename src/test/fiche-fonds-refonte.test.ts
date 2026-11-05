import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { correction } from "@/lib/ui/garder-la-place";
import { voletsMasques } from "@/lib/fiche-volets";

const ROOT = path.join(__dirname, "../..");
const lire = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");
const code = (p: string) =>
  lire(p)
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

/**
 * LA FICHE D'UN FONDS, LA PAGE D'INTENTION, 1ER NOVEMBRE 2026.
 *
 * Treize points tranchés sur planche (« fiche-planche ») : la phrase générée du
 * fonds part ; la fréquence quitte la catégorie et prend la place de
 * « Centralisation » ; la barre d'onglets et la bascule gardent leur place ; la
 * visite guidée et son bouton partent ; les deux notes de VL passent en bulles
 * avec une mention courte visible ; les risques descendent en pied de page ; le
 * volet « Émetteur » d'un fonds n'existe plus ; le total d'une souscription qui
 * redit le montant tapé disparaît.
 */
describe("garder la place", () => {
  it("ne défile pas quand rien n'a changé", () => {
    expect(correction({ top: 73, scrollY: 279 }, 73, 279, 1123, 844)).toEqual({ cible: 279, ajout: 0 });
  });
  it("défile de l'écart quand l'élément est parti, et rend la hauteur manquante quand la page est devenue trop courte", () => {
    /* Mesuré : barre à 73 px, page défilée de 279 ; après « Chiffres », la page fait 862 px, le défilement est ramené à 18 et la barre est à 334. */
    const c = correction({ top: 73, scrollY: 279 }, 334, 18, 862, 844);
    expect(c.cible, "le défilement visé ne remet pas la barre à 73 px").toBe(279);
    expect(c.ajout, "la hauteur manquante n'est pas rendue au conteneur").toBe(279 - (862 - 844));
  });
  it("ne rend pas de hauteur quand la page reste assez longue, et ne défile jamais sous zéro", () => {
    expect(correction({ top: 100, scrollY: 400 }, 160, 400, 3000, 844)).toEqual({ cible: 460, ajout: 0 });
    expect(correction({ top: 100, scrollY: 10 }, 30, 10, 3000, 844).cible).toBe(0);
  });
});

describe("restituer", () => {
  const src = () => code("src/lib/ui/garder-la-place.ts");
  it("défile sans animation : la page a un défilement doux, et une animation laisserait la barre glisser", () => {
    expect(src(), "le défilement de restitution est redevenu animé").toMatch(/window\.scrollTo\(\{ top: cible, left: 0, behavior: "instant" \}\)/);
  });
  it("rend la hauteur manquante en plusieurs passes : tant que le contenu est plus court que la fenêtre, « scrollHeight » rend celle de la fenêtre", () => {
    expect(src(), "la restitution ne refait plus la mesure après avoir ajouté de la hauteur").toMatch(/for \(let passe = 0; passe < 4; passe\+\+\) \{\s*const manque = cible - Math\.max\(0, document\.documentElement\.scrollHeight - window\.innerHeight\);/);
  });
});

describe("les volets d'une fiche", () => {
  it("masque « Émetteur » pour un fonds, et pour lui seul", () => {
    expect(voletsMasques({ kind: "FONDS" })).toEqual(["emetteur"]);
    for (const k of ["OTA", "BTA", "ACTIONS", "MARCHE", "APE"]) expect(voletsMasques({ kind: k }), k).toEqual([]);
  });
  it("filtre la barre d'onglets, et la garde en place au changement de volet", () => {
    const src = code("src/components/mobile/FichePanes.tsx");
    expect(src, "la barre ne filtre plus les volets masqués").toMatch(/PANES\.filter\(\(\[k\]\) => !sans\.includes\(k\) && !exclure\.includes\(k\)\)/);
    expect(src, "le changement de volet ne note plus la position de la barre").toMatch(/avant\.current = repere\(barre\(\)\);\s*setPane\(p\);/);
    expect(src, "la position n'est plus rendue avant la peinture").toMatch(/useLayoutEffect\(\(\) => \{[\s\S]*?restituer\(m, barre\(\), racine\.current\)/);
  });
  it("ne montre pas la carte de l'émetteur d'un fonds côté client, la garde au desk", () => {
    expect(code("src/app/offres/[id]/FicheReading.tsx"), "la carte de l'émetteur d'un fonds est revenue côté client").toMatch(/\{\(!voletsMasques\(o\)\.includes\("emetteur"\) \|\| mode === "desk"\) && \(/);
    for (const f of ["src/app/offres/[id]/page.tsx", "src/app/offres/[id]/neighbour.tsx"]) expect(code(f), `${f} ne masque plus les volets d'un fonds`).toMatch(/sans=\{voletsMasques\(o\)\}/);
  });
});

describe("la fiche d'un fonds", () => {
  const lecture = () => code("src/app/offres/[id]/FicheReading.tsx");
  it("n'affiche plus la phrase du fonds, et la garde aux autres lignes", () => {
    expect(lecture(), "la phrase du fonds est revenue").toMatch(/\{o\.kind !== "FONDS" && <p className=\{styles\.blurb\}>/);
  });
  it("sépare la fréquence de la catégorie, et la dit à la place de « Centralisation »", () => {
    expect(code("src/app/offres/[id]/Kpis.tsx"), "la catégorie redit la fréquence").not.toMatch(/FUND_FREQUENCY_LABEL/);
    expect(lecture(), "la ligne « Fréquence de la VL » a disparu").toMatch(/\["Fréquence de la VL", FUND_FREQUENCY_ADJ\[o\.fund\.frequency\]\]/);
    expect(lecture(), "« avant la prochaine VL » est revenu").not.toMatch(/avant la prochaine VL/);
    expect(lecture(), "la centralisation n'est plus dite quand le desk l'a renseignée").toMatch(/o\.fund\.cutoff \? \(\[\["Centralisation", o\.fund\.cutoff\]\]/);
  });
  it("n'a plus de visite guidée ni de bouton « Comment lire cette fiche ? »", () => {
    expect(code("src/app/offres/[id]/FicheHead.tsx"), "le bouton de rappel de la visite est revenu").not.toMatch(/CoachMarks|Comment lire cette fiche/);
    expect(code("src/app/offres/[id]/page.tsx"), "la page fabrique de nouveau les repères de la visite").not.toMatch(/ficheStops|coachStops/);
    expect(fs.existsSync(path.join(ROOT, "src/lib/domain/fiche-stops.ts")), "le fichier des repères de la visite est revenu").toBe(false);
  });
  it("met les risques en pied de page, hors des volets, et plus dans l'Essentiel", () => {
    expect(code("src/app/offres/[id]/FicheReading.tsx"), "les risques sont revenus dans un volet").not.toMatch(/les-quatre-risques/);
    const page = code("src/app/offres/[id]/page.tsx");
    const lecturePage = page.indexOf("<FicheReading o={o} data={fiche}>");
    const risques = page.indexOf("<PiedDeFiche", lecturePage);
    const fin = page.indexOf("</FichePanes>", lecturePage);
    expect(lecturePage, "la lecture de la fiche est introuvable").toBeGreaterThan(0);
    expect(risques, "les risques ne sont plus en pied de la fiche").toBeGreaterThan(lecturePage);
    expect(risques, "les risques sont sortis de la fiche").toBeLessThan(fin);
    /* LE PIED PORTE LES DEUX LIENS (8 novembre 2026) : la page dédiée « Risques et limites » ET la leçon. */
    const pied = code("src/app/offres/[id]/PiedDeFiche.tsx");
    expect(pied, "le lien vers la page dédiée aux risques a disparu").toMatch(/href: "\/info\/risques#risques"/);
    expect(pied, "le lien vers la leçon a disparu").toMatch(/href: "\/info\/les-quatre-risques"/);
  });
  it("met les deux notes dans des bulles, avec une mention courte visible, et sans les lignes de VL", () => {
    const nav = code("src/components/NavPeriod.tsx");
    expect(nav, "la ligne « VL publiées sur la période » est revenue").not.toMatch(/VL publiées sur la période/);
    expect(nav, "la ligne « plus haut · plus bas » est revenue sous le graphique").not.toMatch(/\{n\} VL sur la période/);
    expect(nav, "la mention courte n'est plus visible").toMatch(/<p className=\{styles\.periodNote\}>\{t\("Performances passées non garanties"\)\}<\/p>/);
    expect(nav, "la note des chiffres bruts n'est plus dans une bulle").toMatch(/<Info text="Chiffres bruts, calculés sur les VL publiées/);
    expect(lecture(), "la note des chiffres de référence n'est plus dans une bulle").toMatch(/<Info text="Chiffres de référence au prix publié\./);
  });
});

describe("la page d'intention", () => {
  const form = () => code("src/components/IntentForm.tsx");
  it("ne redit pas le montant dans un « Total à décaisser » pour une souscription à un fonds", () => {
    expect(form(), "la condition du total redondant a disparu").toMatch(/const totalRedondant = offer\.kind === "FONDS" && type === "souscription" && outlay > 0 && Math\.round\(outlay\) === Math\.round\(parse\(amount\)\);/);
    expect(form(), "le total redondant n'est plus retiré du rendu").toMatch(/sized && outlay > 0 && totalRedondant \? null :/);
  });
  it("garde la place de la bascule Souscription / Rachat", () => {
    const src = form();
    expect((src.match(/noterLaPlace\(e\.currentTarget\.closest\("label"\)\)/g) ?? []).length, "une des deux bascules ne note plus sa position").toBe(2);
    expect(src, "la position de la bascule n'est plus rendue avant la peinture").toMatch(/restituer\(m, formRef\.current\?\.querySelector\('input\[name="type"\]:checked'\)/);
  });
});
