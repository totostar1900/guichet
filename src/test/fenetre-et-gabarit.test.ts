import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { gabarit, manquesDeLaLigne } from "@/lib/domain/sondage";

const ROOT = path.join(__dirname, "../..");
const lire = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");
const code = (p: string) =>
  lire(p)
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const FORM = "src/app/sondage/Formulaires.tsx";
const PAGE = "src/app/sondage/page.tsx";

/**
 * UN SEUL GABARIT, UNE FENÊTRE, DEUX SOUS-TEXTES — RELEVÉ LE 30 OCTOBRE 2026.
 *
 * TROIS DÉFAUTS DU MÊME ÉCRAN, trouvés en reconstruisant sa maquette depuis la
 * production.
 *
 *   DEUX GRAMMAIRES POUR UN FORMULAIRE. Proposer une ligne donnait six jetons
 *   de Trésor et neuf de durée, qu'on prend par poignées ; la modifier donnait
 *   deux listes déroulantes. Le client qui revenait sur sa ligne ne retrouvait
 *   pas l'écran où il l'avait posée.
 *
 *   UNE DATE QU'ON ÉCRIT EN JOURS ET QU'ON RELIT EN DATE. Le champ demandait
 *   « Prêt à partir de (jours) : 55 » et toute la page répondait « prête vers
 *   24 déc. ». Le nombre rendu au formulaire n'était même pas celui qu'on
 *   avait tapé : c'était ce qui restait à courir, 55 aujourd'hui, 54 demain,
 *   pour une intention inchangée.
 *
 *   ET PAS DE FIN. Une attente ne s'éteignait jamais : le desk portait au
 *   Trésor des appétits que le client avait peut-être placés ailleurs depuis
 *   trois mois, et la seule sortie était un bouton qu'il fallait penser à
 *   venir presser.
 */
describe("le sondage : un gabarit, une fenêtre", () => {
  it("rend les mêmes jetons que la ligne soit neuve ou modifiée", () => {
    const src = code(FORM);
    /* LES DEUX LISTES DÉROULANTES DE LA MODIFICATION SONT PARTIES : c'étaient
       elles, la seconde grammaire. Le compartiment garde la sienne, et il est
       le même dans les deux gestes. */
    expect(src, "la liste déroulante du Trésor est revenue sur la modification").not.toMatch(/<Select[^>]*name="country"/);
    expect(src, "la liste déroulante de la durée est revenue sur la modification").not.toMatch(/<Select[^>]*name="tenor"/);
    /* LES JETONS NE SONT ÉCRITS QU'UNE FOIS : deux copies, même identiques au
       jour où on les écrit, sont deux gabarits qui divergeront. */
    expect((src.match(/PAYS_CEMAC\.map/g) ?? []).length, "les jetons des Trésors sont écrits deux fois").toBe(1);
    expect((src.match(/dureesDe\(instrument\)\.map/g) ?? []).length, "les jetons des durées sont écrits deux fois").toBe(1);
    /* CE QUI CHANGE EST LA RÈGLE, ET ELLE EST ÉCRITE : en modification le
       choix se déplace au lieu de s'ajouter. */
    expect(src, "le choix unique de la modification n'est plus posé").toMatch(/seul \? setPays\(\[p\]\) : bascule/);
    expect(src, "le choix unique de la durée n'est plus posé").toMatch(/seul \? setTenors\(\[d\]\) : bascule/);
    expect(src, "la règle du choix unique n'est dite nulle part").toMatch(/Une intention porte un seul Trésor/);
  });

  it("demande la fenêtre en deux dates, côte à côte, et plus en jours", () => {
    const src = code(FORM);
    expect(src, "le champ en jours est revenu dans le formulaire").not.toMatch(/name="dansJours"/);
    /* LES DEUX DATES SONT DANS LA MÊME RANGÉE — « styles.deux » est la rangée
       à deux colonnes de cette feuille — et dans le même composant, pour que
       les trois formulaires ne puissent pas en porter trois versions. */
    const bloc = src.match(/function Fenetre\([\s\S]*?\n}/)?.[0] ?? "";
    expect(bloc, "le bloc de la fenêtre a disparu").not.toBe("");
    expect(bloc, "les deux dates ne sont plus dans la même rangée").toMatch(/className=\{styles\.deux\}/);
    expect(bloc, "le début de la fenêtre n'est plus une date").toMatch(/name="seanceLe" type="date"/);
    expect(bloc, "la fin de la fenêtre n'est plus une date").toMatch(/name="jusquA" type="date"/);
    /* LE JOUR VIENT DU SERVEUR. « new Date() » dans un composant client rend
       une valeur au serveur et une autre au navigateur : c'est une
       discordance d'hydratation, et le 30 octobre 2026 la maison venait d'en
       corriger cinq. */
    expect(src, "l'horloge du navigateur est revenue dans le formulaire").not.toMatch(/new Date\(\)/);
    expect(src, "le jour d'aujourd'hui ne vient plus du serveur").toMatch(/aujourdHui: string/);
    // Non-vacuité : les trois formulaires passent bien par ce bloc.
    expect((src.match(/<Fenetre /g) ?? []).length, "un formulaire a repris ses propres dates").toBe(2);
  });

  it("refuse une fenêtre qui se ferme avant de s'ouvrir, ou qui est déjà passée", () => {
    const base = { instrument: "OTA" as const, country: "Cameroun" as const, tenor: "5 ans", montant: 10_000_000, seanceLe: "2026-12-01" };
    expect(manquesDeLaLigne({ ...base, jusquA: "2027-03-31" }, "2026-10-30"), "une fenêtre droite est refusée").toEqual([]);
    expect(manquesDeLaLigne({ ...base, jusquA: "2026-11-15" }, "2026-10-30").join(" "), "une fin avant le début passe").toMatch(/avant le début/);
    expect(manquesDeLaLigne({ ...base, seanceLe: undefined, dansJours: 30, jusquA: "2026-10-01" }, "2026-10-30").join(" "), "une fin déjà passée passe").toMatch(/Cette fin est passée/);
    /* ET LE GABARIT LA NOMME : un champ que le serveur juge et que le gabarit
       tait est un champ dont le client apprend l'existence par un refus. */
    expect(
      gabarit("OTA").map((c) => c.cle),
      "le gabarit ne nomme pas la fin de la fenêtre",
    ).toContain("jusqua");
  });

  /**
   * LES DEUX SOUS-TEXTES, ET AUCUN NE NOMME LE VIDE.
   *
   * La phrase sous le titre ne disait que l'objet de la page ; ce qui la
   * JUSTIFIE — « la plupart des séances que nous obtenons en viennent » —
   * était enfermé dans l'état vide de la liste, c'est-à-dire dans l'écran que
   * presque personne n'atteint.
   */
  it("dit sous le titre ce qu'on fait, selon qu'une ligne est sondée ou non", () => {
    const src = code(PAGE);
    expect(src, "la phrase du haut ne suit plus l'état de la liste").toMatch(/phrase=\{\s*ouvertes\.length === 0/);
    expect(src, "le texte de la liste vide nomme encore le vide").not.toMatch(/Rien n'est sondé en ce moment/);
    for (const mot of ["Proposez la ligne que vous cherchez", "Répondez à une ligne, ou proposez celle que vous cherchez"]) {
      expect(src, `ce sous-texte a disparu : « ${mot} »`).toContain(mot);
    }
    /* LA PREUVE EST DANS LES DEUX, parce que c'est elle qui justifie la page
       et qu'elle était invisible : elle ne doit pas retourner se cacher dans
       une seule branche. */
    expect((src.match(/la plupart des séances que nous obtenons en viennent/g) ?? []).length, "la preuve n'est plus dans les deux états").toBe(2);
  });
});
