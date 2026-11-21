import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SEUILS_D_ATTENTE, niveauDAttente } from "@/components/MessageDAttente";

const lire = (f: string) => readFileSync(f, "utf8");
const sansNotes = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "");

/**
 * L'ATTENTE APRÈS LE CODE (21 novembre 2026, planche « Attente après le code », 1A · 2A · 3A).
 *
 * Après le sixième chiffre la page paraissait figée : les ronds se vidaient, les chiffres s'éteignaient, aucun mot. Les ronds restent pleins et ondulent jusqu'à la réponse, un message monte par paliers, et le même geste vaut pour l'écran à six chiffres, les codes reçus et la page d'après.
 */
describe("les paliers de l'attente", () => {
  it("0,15 s, 4 s, 15 s", () => {
    expect(SEUILS_D_ATTENTE).toEqual({ affiche: 150, lent: 4_000, tropLong: 15_000 });
    expect([0, 149, 150, 3_999, 4_000, 14_999, 15_000, 60_000].map(niveauDAttente)).toEqual([0, 0, 1, 1, 2, 2, 3, 3]);
  });
  it("dit chaque palier, et ne propose « Réessayer » qu'au dernier", () => {
    const m = sansNotes(lire("src/components/MessageDAttente.tsx"));
    expect(m).toMatch(/niveau === 1 && t\("Vérification…"\)/);
    expect(m).toMatch(/niveau === 2 && t\("La connexion est lente, un instant…"\)/);
    expect(m).toMatch(/niveau === 3 && \([\s\S]*t\("Ça prend plus de temps que prévu\."\)[\s\S]*avecBouton[\s\S]*window\.location\.reload\(\)/);
  });
});

describe("les six ronds", () => {
  const k = sansNotes(lire("src/components/ClavierCode.tsx"));
  it("restent pleins tant qu'une réponse attend, et se vident dès que plus rien n'attend", () => {
    // le code part sans vider les ronds ; ils se vident par l'effet qui lit « occupe »
    expect(k).toMatch(/rendre\.current\(c\);\s*setRendu\(true\);/);
    expect(k).toMatch(/if \(!rendu \|\| occupe\) return;[\s\S]*setSaisi\(""\)/);
    expect(k, "les ronds se vident encore avant que le code parte").not.toMatch(/setSaisi\(""\);\s*dernier\.current = "";\s*rendre\.current\(c\)/);
  });
  it("ondulent pendant l'attente, tremblent sur une erreur, et se taisent si le téléphone demande moins de mouvement", () => {
    const css = sansNotes(lire("src/components/ClavierCode.module.css"));
    expect(css).toMatch(/\.ronds\[data-attente\] i \{\s*animation: onde 1\.2s ease-in-out infinite;/);
    expect(css).toMatch(/\.ronds\[data-secoue\] \{\s*animation: tremble 0\.42s/);
    expect(css).toMatch(/prefers-reduced-motion: reduce\) \{\s*\.ronds\[data-attente\] i,\s*\.ronds\[data-secoue\] \{\s*animation: none;/);
    expect(k).toMatch(/data-attente=\{occupe && saisi\.length === CHIFFRES_DU_CODE \? "1" : undefined\}/);
  });
});

describe("la portée : écran à six chiffres, codes reçus, page d'après", () => {
  it("l'écran de code (porte et verrou) montre le message d'attente quand il est occupé", () => {
    expect(sansNotes(lire("src/components/EcranDeCode.tsx"))).toMatch(/occupe \? <MessageDAttente \/>/);
  });
  it("la porte garde l'attente après le succès, jusqu'à ce que la page d'après arrive (rechargement entier)", () => {
    expect(sansNotes(lire("src/app/connexion/PorteDeConnexion.tsx"))).toMatch(/occupe=\{enCours \|\| fini\}/);
  });
  it("le code reçu par e-mail ou WhatsApp prend les points qui ondulent et le message lent", () => {
    const e = sansNotes(lire("src/app/connexion/EmailOtpForm.tsx"));
    expect(e).toMatch(/pending \? <Attend>\{t\("Vérification…"\)\}<\/Attend>/);
    expect(e).toMatch(/pending && <MessageDAttente avecBouton=\{false\} depuis=\{2\} \/>/);
    const c = sansNotes(lire("src/app/connexion/creer/CreerCompte.tsx"));
    expect(c).toMatch(/enCours \? <Attend>\{t\("Vérification…"\)\}<\/Attend>/);
    expect(c).toMatch(/enCours && <MessageDAttente avecBouton=\{false\} depuis=\{2\} \/>/);
  });
  it("la création du compte et la modification du code, qui ont leur propre clavier, disent aussi qu'elles attendent", () => {
    expect(sansNotes(lire("src/app/connexion/creer/CreerCompte.tsx"))).toMatch(/enCours \? <MessageDAttente \/>/);
    expect(sansNotes(lire("src/app/parametres/code/ModifierLeCode.tsx"))).toMatch(/enCours \? <MessageDAttente \/>/);
  });
});
