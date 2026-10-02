import { describe, expect, it } from "vitest";
import { repo } from "@/lib/data";
import { adresseSeule, ingererCourriel, retourAutomatique, type Courriel } from "@/lib/intake/courriel";

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
const courriel = (p: Partial<Courriel>): Courriel => ({ from: "dobm@tresor-congo.cg", subject: "Communiqué", text: "Corps du message.", attachments: [], headers: {}, ...p });

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
    /* Le format ne décide de rien : un régulateur doit retrouver son document.
       Depuis le 2026-10-02 la pièce vit AVEC LE MESSAGE et n'ouvre plus d'entrée
       dans « À valider », qui est la file de ce qui devient une ligne de
       marché. */
    expect(r.errors).toHaveLength(0);
    expect(r.created).toEqual([]);
    expect(r.gardees).toHaveLength(1);
    expect(r.gardees?.[0].name).toBe("questionnaire.docx");
    expect(r.gardees?.[0].mimeType).toContain("wordprocessingml");
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
    // Assez lourde pour être un document : gardée avec le message.
    expect(r.gardees).toHaveLength(1);
  });
});

/**
 * NOTRE PROPRE ADRESSE NE SUFFIT PAS À ÉCARTER UN COURRIEL.
 *
 * Le garde-fou jetait tout ce qui venait de `EMAIL_FROM`, et le 2026-10-01 il a
 * jeté un message qu'une personne avait écrit depuis la boîte `guichet@`. Cette
 * adresse a deux vies : l'identité d'envoi de la plateforme, et une boîte que
 * l'équipe utilise. L'adresse seule ne tranche pas, les en-têtes si.
 */
const sousNotreNom = async (mail: Parameters<typeof ingererCourriel>[0]) => {
  const avant = process.env.EMAIL_FROM;
  process.env.EMAIL_FROM = "Guichet <guichet@purposecapital.africa>";
  try {
    return await ingererCourriel(mail);
  } finally {
    if (avant === undefined) delete process.env.EMAIL_FROM;
    else process.env.EMAIL_FROM = avant;
  }
};

describe("la boucle du courrier", () => {
  it("écarte un rebond venu de notre propre adresse", async () => {
    const r = await sousNotreNom(
      courriel({
        from: "guichet@purposecapital.africa",
        subject: "Undelivered Mail Returned to Sender",
        text: "bounce",
        headers: { "auto-submitted": "auto-replied", "content-type": "multipart/report; report-type=delivery-status" },
      }),
    );
    expect(r.created).toHaveLength(0);
    expect(r.skipped).toHaveLength(1);
    // Rien dans la boîte du desk : sinon il relirait ses propres envois en
    // croyant lire les réponses.
    const msg = (await repo().listInbound(50)).find((m) => m.subject === "Undelivered Mail Returned to Sender");
    expect(msg).toBeUndefined();
  });

  it("GARDE un message qu'une personne a écrit depuis guichet@", async () => {
    // Le défaut mesuré : ce message-là a été jeté, et c'était le mien.
    const r = await sousNotreNom(courriel({ from: "guichet@purposecapital.africa", subject: "Une question d'un confrère", text: "Bonjour, pouvez-vous confirmer la séance de jeudi ?", headers: { "content-type": "text/plain" } }));
    expect(r.skipped).toHaveLength(0);
    const msg = (await repo().listInbound(50)).find((m) => m.subject === "Une question d'un confrère");
    expect(msg).toBeDefined();
  });

  it("reconnaît une machine à chacun de ses marqueurs, et une personne à leur absence", () => {
    expect(retourAutomatique({ "auto-submitted": "auto-replied" })).toBe(true);
    expect(retourAutomatique({ "auto-submitted": "auto-generated" })).toBe(true);
    // RFC 3834 : « no » est précisément ce qu'un humain porte.
    expect(retourAutomatique({ "auto-submitted": "no" })).toBe(false);
    expect(retourAutomatique({ "content-type": "multipart/report; report-type=delivery-status" })).toBe(true);
    expect(retourAutomatique({ "return-path": "<>" })).toBe(true);
    expect(retourAutomatique({ "x-auto-response-suppress": "All" })).toBe(true);
    expect(retourAutomatique({ precedence: "bulk" })).toBe(true);
    expect(retourAutomatique({ "content-type": "text/plain", subject: "Bonjour" })).toBe(false);
    expect(retourAutomatique({})).toBe(false);
  });

  it("lit l'adresse seule, que EMAIL_FROM porte un nom ou non", () => {
    expect(adresseSeule("Guichet <guichet@purposecapital.africa>")).toBe("guichet@purposecapital.africa");
    expect(adresseSeule("guichet@purposecapital.africa")).toBe("guichet@purposecapital.africa");
    expect(adresseSeule("  GUICHET@Purposecapital.Africa ")).toBe("guichet@purposecapital.africa");
    expect(adresseSeule(undefined)).toBe("");
  });
});
