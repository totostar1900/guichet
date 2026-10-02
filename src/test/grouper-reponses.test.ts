import { describe, expect, it } from "vitest";
import { cleDeSecours, echangeDUneReponse, titreDEchange } from "@/app/desk/messages/grouper";

/**
 * Ranger une réponse dans son échange, quand elle n'a pas de clef.
 *
 * Depuis 0058 une réponse porte l'échange où elle a été écrite. Ce cliquet tient
 * le rangement des réponses d'AVANT, et celui des envois qui partiraient un jour
 * d'ailleurs que de la boîte aux lettres.
 *
 * LE PIÈGE QU'IL FERME : laisser une réponse hors de tout échange. Un fil qui
 * montre la question sans la réponse est pire qu'un fil mal coupé, parce qu'il
 * fait croire qu'on n'a pas répondu.
 */
const S = "r:email:client@example.cm";

describe("l'échange d'une réponse sans clef", () => {
  it("est celui du dernier message reçu avant elle", () => {
    // C'est ce que l'opérateur avait sous les yeux en écrivant.
    const recus = [
      { at: "2026-10-01T08:00:00.000Z", convKey: "A" },
      { at: "2026-10-02T08:00:00.000Z", convKey: "B" },
    ];
    expect(echangeDUneReponse("2026-10-02T09:00:00.000Z", recus, S)).toBe("B");
    expect(echangeDUneReponse("2026-10-01T09:00:00.000Z", recus, S)).toBe("A");
  });

  it("ne dépend pas de l'ordre de la liste", () => {
    /* Un appelant qui trierait d'abord ferait reposer le résultat sur son tri,
       et le jour où il change, le rangement change sans prévenir. */
    const recus = [
      { at: "2026-10-02T08:00:00.000Z", convKey: "B" },
      { at: "2026-10-01T08:00:00.000Z", convKey: "A" },
    ];
    expect(echangeDUneReponse("2026-10-02T09:00:00.000Z", recus, S)).toBe("B");
  });

  it("prend le message reçu à la même seconde, pas celui d'avant", () => {
    const recus = [
      { at: "2026-10-01T08:00:00.000Z", convKey: "A" },
      { at: "2026-10-02T09:00:00.000Z", convKey: "B" },
    ];
    expect(echangeDUneReponse("2026-10-02T09:00:00.000Z", recus, S)).toBe("B");
  });

  it("rejoint le premier message reçu APRÈS quand le desk a écrit le premier", () => {
    // Le desk ouvre, le client répond : la réponse appartient à cet échange.
    const recus = [{ at: "2026-10-02T10:00:00.000Z", convKey: "B" }];
    expect(echangeDUneReponse("2026-10-02T09:00:00.000Z", recus, S)).toBe("B");
  });

  it("se regroupe à part quand on n'a jamais rien reçu de ce correspondant", () => {
    // Plutôt que de disparaître de l'écran.
    expect(echangeDUneReponse("2026-10-02T09:00:00.000Z", [], S)).toBe(S);
  });

  it("ignore les messages sans clef et les dates illisibles", () => {
    const recus = [{ at: "2026-10-02T08:00:00.000Z" }, { at: "hier", convKey: "X" }];
    expect(echangeDUneReponse("2026-10-02T09:00:00.000Z", recus, S)).toBe(S);
  });

  it("retombe sur le secours si la date de l'envoi est illisible", () => {
    expect(echangeDUneReponse("bientôt", [{ at: "2026-10-01T08:00:00.000Z", convKey: "A" }], S)).toBe(S);
  });
});

describe("le titre d'un échange", () => {
  const date = (iso: string) => iso.slice(8, 10);

  it("est son objet quand il en a un", () => {
    expect(titreDEchange("Avis d'émission", "2026-10-02T08:00:00.000Z", date)).toBe("Avis d'émission");
  });

  it("est sa date d'ouverture quand il n'en a pas", () => {
    // Le premier mot du premier message ferait croire à un sujet qui n'existe pas.
    expect(titreDEchange(undefined, "2026-10-02T08:00:00.000Z", date)).toBe("Échange du 02");
    expect(titreDEchange("   ", "2026-10-02T08:00:00.000Z", date)).toBe("Échange du 02");
  });
});

describe("la clef de secours", () => {
  it("ignore la casse de l'adresse, comme le reste de la règle", () => {
    expect(cleDeSecours("email", "Client@Example.CM")).toBe("r:email:client@example.cm");
  });
});
