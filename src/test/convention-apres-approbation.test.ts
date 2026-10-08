import { describe, expect, it, vi } from "vitest";
import { emptyClientFile, type ClientFile } from "@/lib/domain/kyc";
import { missingForSubmission } from "@/lib/kyc/checklist";
import { peutOPCVM } from "@/lib/auth/types";
import type { Session } from "@/lib/auth/types";

const fiche = (p: Partial<ClientFile> = {}): ClientFile => ({
  id: "f1",
  ...emptyClientFile("u1", "physique", "Essai", { phone: "+237600000000", email: "forme@exemple.com" }),
  ...p,
});

/**
 * LA SIGNATURE VIENT APRÈS LA DÉCISION.
 *
 * Le code d'acceptation était exigé avant l'envoi du dossier, et le desk refusait
 * d'approuver sans lui : on faisait signer une convention d'ouverture de compte à
 * quelqu'un dont on ne savait pas si le compte serait ouvert. La documentation de
 * la maison annonçait l'inverse depuis le début. Ces quatre vérifications tiennent
 * l'ordre en place.
 */
describe("la convention s'accepte après l'approbation", () => {
  it("ne bloque plus l'envoi du dossier", () => {
    const f = fiche({
      funds: { pep: false, source: "Revenus d'activité" },
      profile: { category: "non_professionnel", objectives: "Revenus réguliers (coupons)", horizon: "3 à 5 ans", riskTolerance: "Moyenne" },
      consents: { dataAt: new Date().toISOString() },
    });
    // Le consentement aux données reste : sans lui le desk ne peut pas instruire.
    expect(missingForSubmission(f)).toEqual([]);
    expect(missingForSubmission({ ...f, consents: {} })).toContain("consentement données");
  });

  it("n'est à portée qu'une fois le dossier approuvé, et une seule fois", async () => {
    const { conventionSignable } = await import("@/lib/kyc/checklist");
    expect(conventionSignable(fiche({ status: "brouillon" }))).toBe(false);
    expect(conventionSignable(fiche({ status: "soumis" }))).toBe(false);
    expect(conventionSignable(fiche({ status: "approuve" }))).toBe(true);
    const { CONVENTION_VERSION } = await import("@/data/legal");
    expect(conventionSignable(fiche({ status: "approuve", consents: { conventionAt: new Date().toISOString(), conventionVersion: CONVENTION_VERSION } }))).toBe(false);
  });

  /**
   * ET UNE SECONDE FOIS QUAND LE TEXTE A CHANGÉ CE À QUOI ON S'ENGAGE.
   *
   * Le 9 octobre 2026 la convention reçoit le mandat d'ouverture : la maison
   * ouvre des comptes au nom du client sur la foi de ce texte. Deux clients
   * l'avaient acceptée la veille, sous un texte qui ne contenait aucun
   * mandat, et rien en base ne permettait de les distinguer : l'acceptation
   * portait une date et pas de version.
   */
  it("se reprend quand la version acceptée n'est plus celle en vigueur", async () => {
    const { conventionSignable, conventionAJour, conventionAReprendre } = await import("@/lib/kyc/checklist");
    const vieille = fiche({ status: "approuve", consents: { conventionAt: "2026-10-08T09:56:28.522Z" } });
    expect(conventionAJour(vieille)).toBe(false);
    expect(conventionAReprendre(vieille)).toBe(true);
    expect(conventionSignable(vieille)).toBe(true);
    // Jamais acceptée : à signer, mais ce n'est pas une reprise.
    expect(conventionAReprendre(fiche({ status: "approuve" }))).toBe(false);
  });

  /**
   * TROIS ENDROITS LISAIENT LA DATE AU LIEU DE LA RÈGLE, et le défaut ne s'est
   * vu qu'à l'écran, à la première reprise : la page annonçait « Votre
   * convention a changé », et dessous le bloc affichait « Convention acceptée
   * le 7 octobre », sans bouton. Les deux actions, elles, refusaient le code.
   * « conventionAt existe » n'est pas la question ; « est-elle à jour » l'est.
   */
  it("aucun garde ne se contente de la date d'acceptation", async () => {
    const { readFileSync } = await import("node:fs");
    const actions = readFileSync("src/app/ouvrir-un-compte/actions.ts", "utf8");
    expect(actions).not.toContain("if (file.consents.conventionAt) return");
    expect(actions).toContain("conventionAJour(file)");
    const sections = readFileSync("src/app/ouvrir-un-compte/Sections.tsx", "utf8");
    expect(sections).toContain("const accepted = Boolean(c.conventionAt) && !signable");
  });

  it("la convention dit que la provision n'est jamais obligatoire", async () => {
    const { PASSAGES } = await import("@/lib/documents/passages-catalog");
    const especes = (PASSAGES.convention ?? []).find((p) => p.key === "art_especes");
    // Une commodité présentée comme un passage obligé est une friction de plus.
    expect(especes?.fr).toContain("Elle n'est jamais obligatoire");
    expect(especes?.fr).toContain("ne peut lui en imposer une");
    expect(especes?.en).toContain("never compulsory");
  });

  it("la convention porte le mandat d'ouverture, qui est la raison de cette version", async () => {
    const { PASSAGES } = await import("@/lib/documents/passages-catalog");
    const garde = (PASSAGES.convention ?? []).find((p) => p.key === "art_conservation");
    expect(garde?.fr).toContain("donne mandat à l'Intermédiaire d'ouvrir en son nom");
    expect(garde?.en).toContain("mandate to open in their name");
  });

  it("un dossier approuvé sans signature n'ouvre aucune porte", () => {
    const s = (p: Partial<Session>): Session => ({ userId: "u1", role: "client", name: "Essai", segment: "Personne physique", tier: 1, provider: "dev", mfaEnrolled: false, mfaVerified: false, ...p });
    expect(peutOPCVM(s({ kycStatus: "approuve" }))).toBe(false);
    expect(peutOPCVM(s({ kycStatus: "approuve", conventionAccepted: true }))).toBe(true);
    expect(peutOPCVM(s({ kycStatus: "soumis", conventionAccepted: true }))).toBe(false);
    expect(peutOPCVM(null)).toBe(false);
  });
});

/**
 * OÙ PART LE CODE.
 *
 * Trois codes sont partis vers l'adresse tapée dans le formulaire pendant que le
 * client regardait celle avec laquelle il s'était connecté. Le fournisseur les a
 * acceptés les trois fois : rien ne signalait la panne. Un canal prouvé passe
 * désormais devant un champ libre.
 */
describe("le canal du code suit ce qui est prouvé", () => {
  const poser = (profil: { phone?: string; email?: string; phoneVerifiedAt?: string; emailVerifiedAt?: string }, session?: { userId: string; email?: string; phone?: string; phoneVerified?: boolean }) => {
    vi.resetModules();
    vi.doMock("@/lib/data", () => ({ repo: () => ({ getChannelStatus: async () => profil }) }));
    vi.doMock("@/lib/notify/providers", () => ({ emailConfigured: () => true, whatsappConfigured: () => true }));
    vi.doMock("@/lib/auth", () => ({ getSession: async () => session ?? null }));
  };

  it("préfère l'adresse prouvée au champ du formulaire", async () => {
    poser({ email: "prouve@exemple.com", emailVerifiedAt: new Date().toISOString() });
    const { canalDuCode } = await import("@/lib/kyc/canal");
    expect(await canalDuCode("u1", fiche())).toEqual({ channel: "email", to: "prouve@exemple.com", prouve: true });
  });

  it("ne fait jamais passer un canal tapé devant un canal prouvé", async () => {
    poser({ email: "prouve@exemple.com", emailVerifiedAt: new Date().toISOString() });
    const { canalDuCode } = await import("@/lib/kyc/canal");
    // Même quand WhatsApp est demandé : le téléphone du formulaire n'est pas prouvé.
    expect(await canalDuCode("u1", fiche(), true)).toEqual({ channel: "email", to: "prouve@exemple.com", prouve: true });
  });

  it("retombe sur le champ du formulaire, et le dit", async () => {
    poser({});
    const { canalDuCode } = await import("@/lib/kyc/canal");
    expect(await canalDuCode("u1", fiche())).toEqual({ channel: "email", to: "forme@exemple.com", prouve: false });
  });

  /* S'être connecté avec une adresse la prouve, et c'est la preuve que la base
     ne range nulle part : la connexion par code e-mail n'écrit pas
     « email_verified_at ». Mesuré en production le 8 octobre 2026, où l'écran
     annonçait « cette adresse vient de votre formulaire » pour l'adresse même
     de la session. */
  it("compte l'adresse de la session comme prouvée, colonne vide ou non", async () => {
    poser({}, { userId: "u1", email: "connexion@exemple.com" });
    const { canalDuCode } = await import("@/lib/kyc/canal");
    expect(await canalDuCode("u1", fiche())).toEqual({ channel: "email", to: "connexion@exemple.com", prouve: true });
  });

  it("ne prend la session que si c'est bien le même utilisateur", async () => {
    poser({}, { userId: "autre", email: "quelquun.dautre@exemple.com" });
    const { canalDuCode } = await import("@/lib/kyc/canal");
    expect(await canalDuCode("u1", fiche())).toEqual({ channel: "email", to: "forme@exemple.com", prouve: false });
  });

  it("le numéro confirmé à la connexion vaut preuve aussi", async () => {
    poser({}, { userId: "u1", phone: "+237600000099", phoneVerified: true });
    const { canalDuCode } = await import("@/lib/kyc/canal");
    expect(await canalDuCode("u1", fiche(), true)).toEqual({ channel: "whatsapp", to: "+237600000099", prouve: true });
  });
});

/**
 * UN ENVOI QUI RATE LAISSE UNE TRACE.
 *
 * La branche WhatsApp attrapait son erreur, la branche e-mail non : un refus du
 * fournisseur traversait l'action sans rien écrire dans les notifications.
 */
describe("l'envoi du code garde une trace de son échec", () => {
  it("écrit la ligne avant d'envoyer et la ferme en « failed »", async () => {
    vi.resetModules();
    const lignes: { status?: string; error?: string }[] = [];
    vi.doMock("@/lib/data", () => ({
      repo: () => ({
        createNotification: async (n: { status?: string }) => {
          lignes.push({ ...n });
          return { id: "n1" };
        },
        updateNotification: async (_id: string, p: { status?: string; error?: string }) => {
          lignes.push(p);
        },
      }),
    }));
    vi.doMock("@/lib/notify/providers", () => ({
      emailConfigured: () => true,
      whatsappConfigured: () => true,
      sendEmail: async () => {
        throw new Error("refus du fournisseur");
      },
      sendWhatsAppText: async () => "x",
    }));
    const { notifyCode } = await import("@/lib/kyc/notify");
    const r = await notifyCode(fiche(), "123456", { channel: "email", to: "prouve@exemple.com", prouve: true });
    expect(r).toEqual({ via: "echec", to: "prouve@exemple.com", raison: "refus du fournisseur" });
    expect(lignes.map((l) => l.status)).toEqual(["queued", "failed"]);
    expect(lignes[1].error).toBe("refus du fournisseur");
  });

  it("sans canal joignable, le code s'affiche plutôt que de disparaître", async () => {
    vi.resetModules();
    vi.doMock("@/lib/data", () => ({ repo: () => ({}) }));
    vi.doMock("@/lib/notify/providers", () => ({ emailConfigured: () => false, whatsappConfigured: () => false, sendEmail: async () => "", sendWhatsAppText: async () => "" }));
    const { notifyCode } = await import("@/lib/kyc/notify");
    expect(await notifyCode(fiche(), "123456", undefined)).toEqual({ via: "demo" });
  });
});
