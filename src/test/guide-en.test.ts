import { describe, expect, it } from "vitest";
import { translatable } from "@/i18n/core";
import { GUIDE, ROLES, TOUR } from "@/data/desk-guide";

/**
 * LE GUIDE DU DESK PASSE EN ANGLAIS, EN ENTIER.
 *
 * La page /desk/guide passe déjà chaque champ par t(), et le dictionnaire
 * connaissait presque tout : il manquait les onze légendes des captures, parce
 * qu'elles décrivent des écrans ajoutés après coup et qu'aucune règle ne
 * rappelait de les traduire.
 *
 * Ce sont des littéraux dans un fichier de données, et non des appels à la
 * fonction de traduction : le scanner de clefs ne les voit donc pas, pas plus
 * qu'il ne voit un titre posé dans un attribut. Ce cliquet-ci lit la donnée
 * elle-même, champ par champ, et demande au dictionnaire s'il la connaît.
 *
 * Il parcourt la structure à la main plutôt qu'en lisant toutes les chaînes :
 * un champ ajouté au guide sans être ajouté ici passerait inaperçu, mais une
 * lecture automatique ramasserait les clefs techniques et les chemins, et il
 * faudrait alors deviner lesquels sont de la langue. Nommer est plus sûr.
 */
function phrasesDuGuide(): string[] {
  const out: string[] = [];
  for (const k of ["operateur", "responsable"] as const) {
    const r = ROLES[k];
    out.push(r.title, r.text, ...r.cannot);
  }
  for (const s of GUIDE) {
    out.push(s.title, s.purpose, s.when);
    for (const f of s.fields) out.push(f.name, f.what, f.how ?? "");
    out.push(...(s.tips ?? []));
    for (const x of s.shots ?? []) out.push(x.caption);
  }
  for (const t of TOUR) out.push(t.title, t.text, t.link?.label ?? "");
  return out.map((p) => p.trim()).filter((p) => p.length > 1);
}

describe("le guide du desk passe en anglais", () => {
  it("chaque rôle, chaque section, chaque champ, chaque légende, chaque arrêt du tour", () => {
    const phrases = phrasesDuGuide();
    // Non vacuité : un parcours qui ne ramasserait plus rien passerait au vert.
    expect(phrases.length).toBeGreaterThan(200);
    expect([...new Set(phrases.filter((p) => !translatable(p)))]).toEqual([]);
  });
});
