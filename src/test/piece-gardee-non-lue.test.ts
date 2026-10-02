import { describe, expect, it } from "vitest";
import { ingestSource } from "@/lib/intake/ingest";

/**
 * Une pièce arrivée par courriel est gardée, jamais lue d'office.
 *
 * LA QUESTION QUI A TOUT REMIS D'APLOMB, posée le 2026-10-02 : pourquoi lire ?
 * L'extracteur a un seul métier, lire un communiqué d'opération de marché et
 * proposer une fiche d'offre. Son schéma le dit champ par champ, `isin`,
 * `couponRate`, `maturityOn`, et sa consigne commence par « Tu lis des
 * communiqués d'opérations de marché de la zone CEMAC ».
 *
 * Or le contenu d'un courriel est IMPRÉVISIBLE : une lettre de régulateur, un
 * questionnaire, un relevé. Lui demander d'y trouver un ISIN et un taux de
 * coupon ne produit rien et coûte un appel. Une file de lecture a existé une
 * nuit, créée pour ce chemin-là précisément, le seul qui ne devait pas y entrer.
 *
 * Reste le bouton du desk : une personne reconnaît un communiqué et demande la
 * lecture. C'est ce qu'il aurait dû être depuis le début, une offre et non une
 * file.
 *
 * Ce cliquet tient ce qui reste vrai du dépôt par le desk et de la remarque.
 * Que la pièce d'un courriel vive avec son message est tenu ailleurs, par
 * src/test/piece-avec-le-message.ts.
 */
describe("une pièce de courriel est gardée, pas lue", () => {
  it("ne promet pas une lecture automatique dans sa remarque", async () => {
    const res = await ingestSource({ fromLabel: "regulateur@cosumaf.org · e-mail", title: "Lettre", file: { name: "lettre.pdf", mimeType: "application/pdf", bytes: new Uint8Array(1_000) }, sansLecture: true });
    expect(res.ok).toBe(true);
    const motifs = JSON.stringify(res.ok ? res.item.draft.remarks : []);
    /* La remarque disait « À lire : la lecture automatique y passera. » Elle
       promettait un passage qui n'aura pas lieu, et un desk qui attend une
       machine n'ouvre pas le document lui-même. */
    expect(motifs).not.toContain("lecture automatique y passera");
    expect(motifs === "[]").toBe(false);
  });

  it("le dépôt par le desk reste synchrone : la personne est là pour attendre", async () => {
    // Sans « sansLecture », le chemin du formulaire du desk ne change pas.
    const res = await ingestSource({ fromLabel: "desk · dépôt", title: "Communiqué déposé", text: "Objet : communiqué\n\nLe Trésor annonce une émission." });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.item.id).toBeTruthy();
  });
});
