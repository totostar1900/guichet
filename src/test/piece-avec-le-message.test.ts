import { describe, expect, it } from "vitest";
import { repo } from "@/lib/data";
import { ingererCourriel, type Courriel } from "@/lib/intake/courriel";

/**
 * La pièce vit avec le message, et n'entre dans « À valider » que par une personne.
 *
 * LA RAISON, et elle tient en une phrase : « À valider » sert à ce qui peut
 * devenir une LIGNE DE MARCHÉ. Les communiqués ramassés par les crons, les avis
 * d'émission, les résultats d'adjudication. Un document qu'un régulateur ou un
 * client envoie n'a rien à y devenir, et le bouton « Publier » n'a aucun sens à
 * côté de lui.
 *
 * Jusqu'au 2026-10-02, un courriel écrivait DEUX choses sans lien : une ligne
 * dans Messages et une entrée dans À valider. Le desk faisait la jonction de
 * tête, et une lettre de la COSUMAF attendait dans la file des choses qui
 * deviennent des offres.
 *
 * ET AUCUNE RÈGLE NE PEUT TRANCHER À LA PLACE D'UNE PERSONNE : un membre de
 * l'équipe transfère aussi bien un communiqué du Trésor qu'une lettre de
 * régulateur, donc l'expéditeur ne dit rien du contenu. C'est pour cela que la
 * promotion est un geste, et que ce cliquet vérifie qu'aucun chemin automatique
 * n'ouvre une entrée d'intake.
 */
const courriel = (p: Partial<Courriel>): Courriel => ({ from: "dobm@tresor-congo.cg", subject: "Communiqué", text: "Corps.", attachments: [], headers: {}, ...p });

describe("une pièce de courriel vit avec son message", () => {
  it("se garde sur le message, et n'ouvre aucune entrée dans À valider", async () => {
    const avant = (await repo().listIntake()).length;
    const r = await ingererCourriel(
      courriel({
        from: "supervision@cosumaf.org",
        subject: "Questionnaire annuel 2026",
        attachments: [{ name: "questionnaire.pdf", mimeType: "application/pdf", bytes: new Uint8Array(12_000), inline: false }],
      }),
    );

    // Rien dans la file des choses qui deviennent des lignes de marché.
    expect(r.created).toEqual([]);
    expect((await repo().listIntake()).length).toBe(avant);

    // Mais la pièce existe, rattachée au message, avec sa clef au dépôt.
    expect(r.gardees).toHaveLength(1);
    expect(r.gardees?.[0].name).toBe("questionnaire.pdf");
    expect(r.gardees?.[0].size).toBe(12_000);
    const msg = (await repo().listInbound(50)).find((m) => m.id === r.messageId);
    expect(msg?.attachments).toHaveLength(1);
    expect(msg?.attachments?.[0].fileKey).toContain(`courrier/${r.messageId}/`);
    // Jamais promue d'office : l'identifiant d'intake reste vide.
    expect(msg?.attachments?.[0].intakeId).toBeUndefined();
  });

  it("garde aussi un type qu'elle ne sait pas lire", async () => {
    const r = await ingererCourriel(
      courriel({
        from: "supervision@cosumaf.org",
        subject: "Grille à remplir",
        attachments: [{ name: "grille.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", bytes: new Uint8Array(4_000), inline: false }],
      }),
    );
    // Le format ne décide de rien : la pièce est arrivée, elle est gardée.
    expect(r.gardees?.[0].name).toBe("grille.xlsx");
    expect(r.errors).toEqual([]);
  });

  it("un expéditeur de confiance ne change rien : son courrier reste du courrier", async () => {
    /* C'est le cœur de la décision. Un membre de l'équipe transfère aussi bien
       un communiqué du Trésor qu'une lettre de régulateur : le reconnaître est
       un jugement, pas une règle sur l'adresse. */
    const avant = (await repo().listIntake()).length;
    const r = await ingererCourriel(
      courriel({
        from: "awa.ndongo@purposecapital.africa",
        subject: "Fw : communiqué BTA Congo",
        attachments: [{ name: "communique.pdf", mimeType: "application/pdf", bytes: new Uint8Array(76_000), inline: false }],
      }),
    );
    expect((await repo().listIntake()).length).toBe(avant);
    expect(r.gardees).toHaveLength(1);
  });

  it("une image de signature n'est toujours pas une pièce", async () => {
    const r = await ingererCourriel(
      courriel({
        from: "supervision@cosumaf.org",
        subject: "Bonjour",
        attachments: [{ name: "logo.png", mimeType: "image/png", bytes: new Uint8Array(9_000), inline: true }],
      }),
    );
    expect(r.gardees ?? []).toHaveLength(0);
    expect(r.skipped[0]).toContain("logo.png");
  });
});
