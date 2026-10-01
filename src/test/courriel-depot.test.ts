import { describe, expect, it } from "vitest";
import { repo } from "@/lib/data";
import { adresseSeule, ingererCourriel, type Courriel } from "@/lib/intake/courriel";

/**
 * La plateforme garde l'exemplaire, pas l'aperçu.
 *
 * Ces trois règles ne tiennent que par ce cliquet, et chacune se perd en
 * silence : une troncature ne se voit pas, une pièce jetée ne laisse rien, et
 * une boucle de courrier ressemble à du trafic normal.
 *
 * Le contexte : dès que le courrier de `guichet@` est redirigé vers la
 * plateforme, celle-ci devient le SEUL exemplaire. Ce qu'elle laisse tomber est
 * perdu pour de bon.
 */
const courriel = (p: Partial<Courriel>): Courriel => ({ from: "dobm@tresor-congo.cg", subject: "Communiqué", text: "Corps du message.", attachments: [], ...p });

const octets = (n: number) => new Uint8Array(n);

describe("le courriel entrant est gardé en entier", () => {
  it("garde le corps entier, sans le couper à 4 000 caractères", async () => {
    const long = "a".repeat(9_000);
    await ingererCourriel(courriel({ from: "regulateur@cosumaf.org", subject: "Demande longue", text: long }));
    const msg = (await repo().listInbound(50)).find((m) => m.subject === "Demande longue");
    expect(msg).toBeDefined();
    // Le défaut exact qu'on corrige : slice(0, 4000) coupait au milieu d'une phrase.
    expect(msg!.body.length).toBe(9_000);
  });

  it("garde une pièce d'un type qu'elle ne sait pas lire, au lieu de la refuser", async () => {
    const r = await ingererCourriel(
      courriel({
        from: "regulateur@cosumaf.org",
        subject: "Questionnaire",
        attachments: [{ name: "questionnaire.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", bytes: octets(5_000), inline: false }],
      }),
    );
    // Une pièce gardée ouvre une ligne : un régulateur doit retrouver son
    // document, même si la machine ne sait pas le lire.
    expect(r.created).toHaveLength(1);
    expect(r.errors).toHaveLength(0);
    const item = (await repo().listIntake()).find((i) => i.id === r.created[0]);
    expect(item?.fileName?.endsWith(".docx")).toBe(true);
    // Et le brouillon dit pourquoi aucun champ n'est proposé, sinon le desk
    // croit à une extraction ratée.
    expect(item?.draft.remarks?.[0]).toContain("gardée telle quelle");
  });

  it("écarte une image de signature, et la nomme", async () => {
    const r = await ingererCourriel(
      courriel({
        from: "contact@bvmac.africa",
        subject: "Bonjour",
        attachments: [{ name: "logo.png", mimeType: "image/png", bytes: octets(12_000), inline: true }],
      }),
    );
    expect(r.created).toHaveLength(0);
    expect(r.skipped[0]).toContain("logo.png");
    // Nommée, jamais muette : une perte silencieuse n'est pas acceptable.
    expect(r.skipped[0]).toContain("image du corps");
  });

  it("garde une image du corps assez lourde pour être un communiqué", async () => {
    const r = await ingererCourriel(
      courriel({
        from: "contact@bvmac.africa",
        subject: "Communiqué en image",
        attachments: [{ name: "communique.png", mimeType: "image/png", bytes: octets(200_000), inline: true }],
      }),
    );
    expect(r.skipped).toHaveLength(0);
    expect(r.created).toHaveLength(1);
  });
});

describe("la boucle du courrier", () => {
  it("écarte ce qui vient de notre propre adresse d'envoi", async () => {
    const avant = process.env.EMAIL_FROM;
    process.env.EMAIL_FROM = "Guichet <guichet@purposecapital.africa>";
    try {
      const r = await ingererCourriel(courriel({ from: "guichet@purposecapital.africa", subject: "Undelivered Mail Returned to Sender", text: "bounce" }));
      expect(r.created).toHaveLength(0);
      expect(r.skipped).toHaveLength(1);
      // Rien dans la boîte du desk : sinon il relirait ses propres envois en
      // croyant lire les réponses.
      const msg = (await repo().listInbound(50)).find((m) => m.subject === "Undelivered Mail Returned to Sender");
      expect(msg).toBeUndefined();
    } finally {
      if (avant === undefined) delete process.env.EMAIL_FROM;
      else process.env.EMAIL_FROM = avant;
    }
  });

  it("lit l'adresse seule, que EMAIL_FROM porte un nom ou non", () => {
    expect(adresseSeule("Guichet <guichet@purposecapital.africa>")).toBe("guichet@purposecapital.africa");
    expect(adresseSeule("guichet@purposecapital.africa")).toBe("guichet@purposecapital.africa");
    expect(adresseSeule("  GUICHET@Purposecapital.Africa ")).toBe("guichet@purposecapital.africa");
    expect(adresseSeule(undefined)).toBe("");
  });
});
