import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../..");
const lire = (p: string): string => fs.readFileSync(path.join(ROOT, p), "utf8");

/**
 * LA PORTE DE L'ADMINISTRATION EST NUE.
 *
 * Sur l'adresse du desk, la page de connexion est la seule chose qu'un
 * visiteur atteint, et elle a dérivé trois fois vers la vitrine : le pied
 * réglementaire y vendait Guichet sous un formulaire d'administration
 * (retiré le 12 octobre 2026), la colonne de gauche y a dressé les groupes du
 * VISITEUR — « Nos placements », « À propos », « Le guide » — le jour où la
 * porte est sortie des parcours fermés, et le canal WhatsApp / SMS y proposait
 * à un opérateur deux façons d'entrer dont il n'a aucun usage.
 *
 * Ces dérives se ressemblent : chacune vient d'un réglage pensé pour le
 * client, appliqué par défaut à une surface qui n'est pas la sienne. Aucune ne
 * se voit en développement, où un seul hôte sert les deux sites, et aucune ne
 * casse un test de rendu. Elles se tiennent donc ici, sur le texte des deux
 * fichiers qui en décident.
 *
 * UN OPÉRATEUR A UNE ADRESSE PROFESSIONNELLE, et c'est elle qui porte son
 * habilitation. Le téléphone sert à joindre un client là où il vit ; il n'a
 * rien à faire sur la console.
 */
describe("la porte du desk reste une porte d'administration", () => {
  it("n'ouvre jamais le canal téléphone sur l'hôte du desk", () => {
    const page = lire("src/app/connexion/page.tsx");
    /* Le drapeau se calcule une fois, et il exclut l'administration. */
    expect(page, "« telephoneOuvert » ne se calcule plus en excluant l'administration").toMatch(/telephoneOuvert\s*=\s*process\.env\.PHONE_OTP_ENABLED\s*===\s*"1"\s*&&\s*!administration/);
    /* Et c'est LUI que le formulaire reçoit, pas la variable d'environnement
       nue : la lire deux fois, c'est la laisser diverger. */
    expect(page, "le formulaire ne reçoit plus « telephoneOuvert »").toMatch(/phoneEnabled=\{telephoneOuvert\}/);
    expect(page.includes('phoneEnabled={process.env.PHONE_OTP_ENABLED === "1"}'), "le formulaire relit la variable d'environnement et contourne la règle").toBe(false);
  });

  it("ne dresse pas la colonne du visiteur devant la console", () => {
    const layout = lire("src/app/layout.tsx");
    expect(layout, "la colonne n'est plus retenue quand un visiteur arrive sur l'hôte du desk").toMatch(/!\(onDeskHost && !session\)/);
  });

  it("garde la porte hors des parcours fermés pour le client", () => {
    /* La contrepartie : sur le site client, la colonne EST sur la connexion,
       parce qu'un visiteur qui s'y trompe doit pouvoir repartir ailleurs que
       par la flèche du navigateur. Les deux autres parcours restent fermés :
       on y est déjà entré, et on y signe. */
    const nav = lire("src/lib/nav-colonne.ts");
    const ligne = nav.match(/export const SANS_COLONNE[^\n]*\n/)?.[0] ?? "";
    expect(ligne, "« /connexion » est revenue dans les parcours sans colonne").not.toMatch(/"\/connexion"/);
    expect(ligne).toMatch(/"\/ouvrir-un-compte"/);
    expect(ligne).toMatch(/"\/ne-plus-recevoir"/);
  });
});
