import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FICHIERS_DU_LECTEUR, lectureAncienne, VERSION_DU_LECTEUR } from "@/lib/market/lecteur-version";

/**
 * LE LECTEUR A CHANGÉ : SON NUMÉRO DOIT CHANGER AUSSI.
 *
 * Un numéro qu'on oublie de lever est pire que pas de numéro : il ferait
 * croire qu'une séance lue par l'ancien lecteur est à jour, donc qu'elle n'a
 * rien à gagner à être relue, et c'est exactement la question à laquelle
 * cette colonne existe pour répondre.
 *
 * Le cliquet garde l'empreinte des fichiers qui FONT la lecture. Quand elle
 * bouge, ce cas tombe et dit quoi faire. Deux gestes : lever
 * VERSION_DU_LECTEUR avec une ligne au journal des versions, et recopier
 * l'empreinte ici.
 */
const empreinte = (): string => {
  const h = createHash("sha256");
  for (const f of FICHIERS_DU_LECTEUR) h.update(readFileSync(f));
  return h.digest("hex").slice(0, 16);
};

/** L'empreinte des fichiers du lecteur au moment où VERSION_DU_LECTEUR a été posé. */
const EMPREINTE_ATTENDUE = "92c783e48f8e8a5b";

describe("la version du lecteur", () => {
  it("bouge quand le lecteur bouge", () => {
    expect(
      empreinte(),
      [
        "",
        `Les fichiers du lecteur ont changé (${FICHIERS_DU_LECTEUR.join(", ")}).`,
        `Deux gestes, dans cet ordre :`,
        `  1. lever VERSION_DU_LECTEUR (actuellement ${VERSION_DU_LECTEUR}) dans src/lib/market/lecteur-version.ts,`,
        `     avec une ligne au journal des versions qui dit CE QUI change dans la lecture ;`,
        `  2. recopier l'empreinte ci-dessous dans EMPREINTE_ATTENDUE :`,
        `       ${empreinte()}`,
        "",
        "Si le changement ne touche pas ce que le lecteur LIT (un commentaire, un nom),",
        "recopier l'empreinte sans lever le numéro : c'est un geste légitime, et il est",
        "visible dans le diff, ce qui est tout ce qu'on demande.",
        "",
      ].join("\n"),
    ).toBe(EMPREINTE_ATTENDUE);
  });

  it("et l'absence de numéro vaut « ancienne »", () => {
    /* Les 812 séances lues avant le 11 octobre 2026 n'en portent pas. Les
       traiter comme à jour serait la seule façon de rendre la colonne
       menteuse dès sa naissance. */
    expect(lectureAncienne(undefined)).toBe(true);
    expect(lectureAncienne(0)).toBe(true);
    expect(lectureAncienne(VERSION_DU_LECTEUR - 1)).toBe(true);
    expect(lectureAncienne(VERSION_DU_LECTEUR)).toBe(false);
    /* Plus récente que le code : on ne la relit pas. Le cas arrive une
       journée, entre un déploiement et le suivant. */
    expect(lectureAncienne(VERSION_DU_LECTEUR + 1)).toBe(false);
  });
});
