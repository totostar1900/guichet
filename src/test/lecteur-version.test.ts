import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FICHIERS_DU_LECTEUR, lecteursARelire, LECTEURS, lectureAncienne, PREMIERE_VERSION_DECLAREE, relectureUtile, TOUCHE_PAR_VERSION, VERSION_DU_LECTEUR } from "@/lib/market/lecteur-version";

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

/**
 * L'empreinte des fichiers du lecteur au moment où VERSION_DU_LECTEUR a été posé.
 *
 * Recopiée SANS lever le numéro le 29 octobre 2026 : « boc-geometrie » portait
 * un cumul, « fin », qu'on écrivait dans la boucle des coupures et qu'on ne
 * relisait jamais. Le retirer ne change pas un seul caractère de ce que le
 * lecteur lit — « ecart », qui décide seul de la meilleure découpe, est
 * calculé terme pour terme comme avant.
 */
const EMPREINTE_ATTENDUE = "60e1cd0dcd93141c";

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

  /**
   * TROIS LECTEURS SOUS UN SEUL NUMÉRO.
   *
   * Le 13 octobre 2026 j'ai lancé une relecture des 813 bulletins parce que
   * leur numéro n'était pas le dernier. Les montées 13 et 14 ne touchent que
   * l'encours, qui a son propre écrivain et était déjà à jour : les douze
   * séances relues avant l'arrêt n'ont rien changé. Deux heures et demie pour
   * un numéro.
   */
  describe("ce que chaque montée a touché", () => {
    it("EXIGE QUE CHAQUE VERSION DÉCLARE SON PÉRIMÈTRE", () => {
      /* Sans ce cliquet, le tableau prendrait exactement le retard que le
         module cherche à supprimer, et le silence se lirait « tout touché ». */
      const manquantes = [];
      for (let v = PREMIERE_VERSION_DECLAREE; v <= VERSION_DU_LECTEUR; v++) {
        if (!TOUCHE_PAR_VERSION[v]?.length) manquantes.push(v);
      }
      expect(manquantes, `versions sans périmètre déclaré : ${manquantes.join(", ")}`).toEqual([]);
    });

    it("NE DÉCLARE QUE DES LECTEURS QUI EXISTENT", () => {
      for (const [v, l] of Object.entries(TOUCHE_PAR_VERSION)) {
        for (const x of l) expect(LECTEURS, `version ${v}`).toContain(x);
      }
    });

    it("NE RÉCLAME QUE L'UNION DE CE QUI A BOUGÉ DEPUIS", () => {
      /* LA RÈGLE PLUTÔT QU'UN CAS, parce qu'un cas chiffré devrait se
         réécrire à chaque montée et finirait par être ajusté sans être lu.
         Pour toute version déclarée, ce qu'on réclame est exactement l'union
         des périmètres des montées postérieures, ni plus ni moins. */
      for (let v = PREMIERE_VERSION_DECLAREE; v <= VERSION_DU_LECTEUR; v++) {
        const attendu = new Set<string>();
        for (let n = v + 1; n <= VERSION_DU_LECTEUR; n++) for (const l of TOUCHE_PAR_VERSION[n] ?? LECTEURS) attendu.add(l);
        expect(lecteursARelire(v).sort(), `depuis la v${v}`).toEqual([...attendu].sort());
      }
    });

    it("LAISSE TRANQUILLE LE LECTEUR QU'AUCUNE MONTÉE N'A TOUCHÉ", () => {
      /* Le cas qui a coûté deux heures et demie le 13 octobre 2026 : la
         séance était en v12, les montées 13 et 14 ne touchaient que
         l'encours, et une relecture complète des 813 bulletins a été lancée
         pour un numéro. La forme générale : s'il existe un lecteur
         qu'aucune montée postérieure n'a touché, il ne doit rien réclamer. */
      /* L'ANCRE EST LA DERNIÈRE MONTÉE, et non une version gravée : ancré sur
         la v12, ce test est devenu vide en trois montées, parce que les 13,
         14, 15 et 16 ont fini par toucher les trois lecteurs. Un test qui
         s'épuise en quelques jours se réécrit au lieu de se lire. */
      const derniere = TOUCHE_PAR_VERSION[VERSION_DU_LECTEUR] ?? LECTEURS;
      const epargnes = LECTEURS.filter((l) => !derniere.includes(l));
      for (const l of epargnes) {
        expect(relectureUtile(VERSION_DU_LECTEUR - 1, l), `${l} n'a pas bougé à la v${VERSION_DU_LECTEUR}`).toBe(false);
      }
      /* Et au moins un lecteur doit être épargné, sans quoi le test ne
         vérifie rien : une montée qui touche tout ne se distingue pas d'un
         numéro unique, et c'est le défaut qu'on répare. */
      expect(epargnes.length).toBeGreaterThan(0);
    });

    it("RELIT TOUT QUAND ON NE SAIT PAS", () => {
      /* Une version antérieure au tableau, ou absente : l'oubli coûte une
         relecture inutile, jamais une lecture périmée tenue pour fraîche. */
      expect(lecteursARelire(undefined)).toEqual(LECTEURS);
      expect(lecteursARelire(PREMIERE_VERSION_DECLAREE - 1)).toEqual(LECTEURS);
    });

    it("NE RÉCLAME RIEN AU LECTEUR COURANT", () => {
      expect(lecteursARelire(VERSION_DU_LECTEUR)).toEqual([]);
    });
  });
});
