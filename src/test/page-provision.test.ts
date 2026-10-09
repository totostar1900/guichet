import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { prochaineEcheance, PREAVIS_JOURS } from "@/lib/domain/prelevement";

/**
 * LA PAGE DE LA PROVISION, REPRISE LE 9 OCTOBRE 2026.
 *
 * Elle disait trois chiffres et quatre sections. Elle dit maintenant un solde
 * partagé, et les gestes qu'on peut faire dessus. Ces vérifications tiennent
 * les trois décisions qui coûteraient cher à perdre : le placé reste hors du
 * total, le prélèvement se montre même sans mandat, et aucun chiffre n'est
 * recopié d'un autre endroit.
 */
const PAGE = "src/app/moi/provision/page.tsx";
const PLACER = "src/app/moi/provision/PlacerLaProvision.tsx";
const lire = (f: string) => readFileSync(f, "utf8");

describe("la prochaine échéance d'un mandat", () => {
  it("tombe ce mois-ci tant que le jour n'est pas passé, le jour même compris", () => {
    /* Le jour même reste une échéance à venir : elle n'est pas remise tant
       que le desk n'a pas fait sa journée, et le préavis est parti cinq jours
       plus tôt. L'avancer d'un mois ferait disparaître le tirage du jour de
       l'écran du client au moment précis où il le cherche. */
    expect(prochaineEcheance(5, "2026-10-01")).toBe("2026-10-05");
    expect(prochaineEcheance(5, "2026-10-05")).toBe("2026-10-05");
  });

  it("passe au mois suivant une fois le jour passé, et franchit l'année", () => {
    expect(prochaineEcheance(5, "2026-10-06")).toBe("2026-11-05");
    expect(prochaineEcheance(28, "2026-12-29")).toBe("2027-01-28");
    // Le jour va de 1 à 28 : aucun mois n'oblige à décider ce qu'on fait en février.
    expect(prochaineEcheance(28, "2027-01-31")).toBe("2027-02-28");
  });

  it("et le préavis se compte sur le même nombre de jours que le desk applique", () => {
    // La page annonce « annoncé {n} jours avant » : ce n doit être CELUI du robot.
    expect(PREAVIS_JOURS).toBe(5);
    expect(lire(PAGE)).toMatch(/n: String\(PREAVIS_JOURS\)/);
  });
});

describe("le solde et ce qui n'en fait plus partie", () => {
  it("le placé se lit des positions, et ne s'ajoute jamais au total", () => {
    /* Une somme devenue parts de fonds n'est plus un solde : l'ajouter au
       total ferait devoir à la maison de l'argent qu'elle a déjà transformé
       en titres. Mais la taire ferait voir un disponible fondu sans raison. */
    const src = lire(PAGE);
    expect(src).toMatch(/positionsFrom\(mine, offers\)/);
    expect(src).toMatch(/const place = placees\.reduce/);
    expect(src).toMatch(/fmt\(Math\.round\(poche\.balance\)\)/);
    expect(src).not.toMatch(/poche\.balance \+ place/);
  });

  it("et le même test dit ce qui est monétaire, pour les deux lectures", () => {
    // Deux définitions du « fonds monétaire » donneraient un placé et une
    // liste de placement qui ne parlent pas des mêmes fonds.
    const src = lire(PAGE);
    // Deux appels : la liste des fonds où placer, et la somme déjà placée.
    expect(src.match(/estMonetaire\(/g)?.length).toBe(2);
  });
});

describe("les gestes", () => {
  it("le prélèvement se montre même sans mandat", () => {
    /* Décidé le 9 octobre 2026 : une porte qui n'apparaît qu'à ceux qui l'ont
       déjà franchie n'ouvre sur personne. C'est la leçon des neuf services
       invisibles, et elle vaut ici. */
    const src = lire(PAGE);
    expect(src).toMatch(/Mettre en place un prélèvement/);
    expect(src).toMatch(/href="\/moi\/prelevements"/);
    // Les deux branches existent : l'état du mandat, et l'invitation.
    expect(src).toMatch(/\{mandat \? \(/);
  });

  it("le montant du placement se choisit, et ne dépasse pas le disponible", () => {
    /* « Tout ou rien » n'était pas un choix : on plaçait tout, ou on
       renonçait. Et un montant au-delà du disponible serait refusé à la
       signature : on le dit là où il se tape. */
    const src = lire(PLACER);
    expect(src).toMatch(/groupedInput\(setMontant\)/);
    expect(src).toMatch(/const trop = valeur > disponible/);
    expect(src).toMatch(/disabled/);
  });

  it("chaque chiffre de la page a son geste, et chaque geste sa page", () => {
    const src = lire(PAGE);
    // Le journal reste chez Analyse : une seconde table ferait une troisième
    // lecture du même argent.
    expect(src).toMatch(/href="\/moi\/performance#operations"/);
    expect(src).toMatch(/href="\/moi\/tarifs"/);
  });
});
