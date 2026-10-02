import { describe, expect, it } from "vitest";
import { translate } from "@/i18n/core";
import { ROLE_LABEL } from "@/lib/auth/types";

/**
 * UN NIVEAU D'ACCÈS, UN NOM, ET LE MÊME PARTOUT.
 *
 * La page de l'équipe citait « Responsable » tout court pour désigner le
 * niveau. Or cette clef sert aussi au propriétaire d'une page de documentation,
 * où « Owner » est le mot juste. Le dictionnaire rendait donc « Owner » pour un
 * niveau que le reste de l'application appelle « Manager », et le lecteur
 * anglais voyait deux niveaux là où il n'y en a qu'un.
 *
 * Un mot français qui sert deux sens n'a qu'une entrée : c'est la forme que
 * prend ici la panne muette, et rien ne la signale, puisque les deux
 * traductions sont justes chacune de son côté.
 *
 * Ce cliquet fige les trois noms et, surtout, la cohabitation : « Responsable »
 * garde son sens de propriétaire, et le niveau se cite en entier.
 */
describe("les niveaux d'accès", () => {
  it("portent un seul nom chacun, en français comme en anglais", () => {
    expect(ROLE_LABEL.desk).toBe("Opérateur");
    expect(ROLE_LABEL.responsable).toBe("Responsable du desk");
    expect(translate("en", ROLE_LABEL.client)).toBe("Client");
    expect(translate("en", ROLE_LABEL.desk)).toBe("Operator");
    expect(translate("en", ROLE_LABEL.responsable)).toBe("Manager");
  });

  it("laissent au mot court son autre sens, celui du propriétaire d'une page", () => {
    /* /desk/docs/[slug] écrit « Responsable : <qui tient la page> » : « Owner »
       y est juste, et c'est pour cela que le niveau ne doit jamais se citer
       sous ce mot-là. */
    expect(translate("en", "Responsable")).toBe("Owner");
    expect(translate("en", ROLE_LABEL.responsable)).not.toBe(translate("en", "Responsable"));
  });
});
