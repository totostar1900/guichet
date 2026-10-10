import { createElement } from "react";
import { describe, expect, it } from "vitest";
import type { Contact } from "@/lib/domain/types";
import type { AvisGarde } from "@/lib/domain/garde";
import type { Tirage } from "@/lib/domain/prelevement";

/**
 * LES TROIS AVIS D'ARGENT, LUS DANS LE PDF LUI-MÊME.
 *
 * La convention promet « un avis d'opéré par opération, un relevé de
 * position ». Trois mouvements n'avaient aucune pièce : le versement du
 * disponible, le prélèvement présenté, le trimestre de droits de garde. Le
 * client les voyait passer à son journal, sans rien à citer.
 *
 * On lit le texte produit, pas le code qui le produit : c'est la méthode
 * retenue pour l'ordre signé, le jour où la maison a affirmé deux choses
 * sans les vérifier et où l'une des deux était fausse.
 */
const contact: Contact = { id: "c1", name: "Client d'essai", segment: "Personne physique · Yaoundé", phone: "+237 600000000", email: "essai@exemple.cm", whatsappOptIn: false };
const now = new Date("2026-10-10T09:00:00Z");

async function texte(C: unknown, ctx: unknown): Promise<string> {
  const { renderToBuffer } = await import("@react-pdf/renderer");
  const buf = await renderToBuffer(createElement(C as never, ctx as never) as never);
  // « pdf-parse » lit un fichier d'essai à l'import de son index : la maison passe par la lib.
  const parse = (await import("pdf-parse/lib/pdf-parse.js")).default;
  return (await parse(buf as Buffer)).text.replace(/\s+/g, " ");
}

describe("l'avis de versement", () => {
  it("porte le compte crédité, les deux montants, et dit l'écart", async () => {
    /* L'ÉCART EXISTE : le desk recalcule au moment du virement, et un coupon
       tombé entre-temps change le montant. Le taire ferait croire à une
       erreur de la maison. */
    const { AvisVersementPdf } = await import("@/lib/documents/pdf/cash-templates");
    const txt = await texte(AvisVersementPdf, {
      number: "PC-VER-261010-AAAA",
      contact,
      askedAmount: 500_000,
      askedAt: "2026-10-07",
      paidAmount: 512_000,
      paidAt: "2026-10-10",
      banque: { name: "Afriland First Bank", ribEnd: "0987" },
      now,
      texts: {},
    });
    expect(txt).toContain("Avis de versement");
    expect(txt).toContain("PC-VER-261010-AAAA");
    // Le PDF rend l'ellipse en trois points : on lit ce qui est imprimé.
    expect(txt).toMatch(/Afriland First Bank\s*\.{3}0987/);
    expect(txt).toContain("500 000");
    expect(txt).toContain("512 000");
    expect(txt).toMatch(/bougé de \+12 000/);
    // La phrase de portée vient du catalogue : elle nomme le compte, et lui seul.
    expect(txt).toMatch(/déclaré à l'ouverture.{0,80}et sur lui seul/);
  });
});

describe("l'avis de prélèvement", () => {
  const mandat = { ref: "PM-0930-R4T1", maxAmount: 50_000, bankName: "Afriland First Bank", bankAccount: "CM21 10005 00001 98765432109 87" };
  const base: Tirage = { id: "t1", ref: "TR-261005-R4T1", mandatId: "m1", userId: "u1", dueOn: "2026-10-05", amount: 50_000, state: "encaisse", announcedAt: "2026-09-30", noticeSent: true, settledAt: "2026-10-07", createdAt: "2026-09-30T08:00:00Z" };

  it("met le plafond du mandat à côté du montant prélevé", async () => {
    /* La promesse du mandat est « jamais plus que ce que vous avez signé » :
       elle se vérifie sur le papier, les deux chiffres côte à côte. */
    const { AvisTiragePdf } = await import("@/lib/documents/pdf/cash-templates");
    const txt = await texte(AvisTiragePdf, { number: "PC-TIR-261007-AAAA", contact, tirage: base, mandat, now, texts: {} });
    expect(txt).toContain("Avis de prélèvement");
    expect(txt).toContain("PM-0930-R4T1");
    expect(txt).toContain("50 000");
    expect(txt).toMatch(/Encaissé le/);
    // Le compte débité ne paraît que par sa fin : un RIB entier sur un avis est un RIB qui circule.
    expect(txt).toMatch(/Afriland First Bank\s*\.{3}0987/);
    expect(txt).not.toContain("98765432109");
  });

  it("et sur un rejet, dit la cause et la suite", async () => {
    const { AvisTiragePdf } = await import("@/lib/documents/pdf/cash-templates");
    const txt = await texte(AvisTiragePdf, {
      number: "PC-TIR-261007-BBBB",
      contact,
      tirage: { ...base, state: "rejete", rejectCode: "provision_insuffisante", rejectNote: "solde à 12 000" },
      mandat,
      now,
      texts: {},
    });
    expect(txt).toContain("rejeté");
    expect(txt).toContain("Provision insuffisante");
    expect(txt).toContain("solde à 12 000");
    // La cause décide de la suite, et la suite se dit au client.
    expect(txt).toMatch(/représenterons une fois/);
  });
});

describe("l'avis de droits de garde", () => {
  const avis: AvisGarde = {
    id: "g1",
    ref: "GAR-2026T3-K7Q4",
    userId: "u1",
    clientName: contact.name,
    period: "2026T3",
    periodFrom: "2026-07-01",
    periodTo: "2026-09-30",
    bareme: { bps: 25, minimum: 2_000, franchise: 1_000_000, exonerees: ["FONDS"] },
    lignes: [
      { intentId: "i1", titre: "OTA 6,50 % · 14 févr. 2028", nature: "obligation", depuis: "2026-07-01", assiette: 5_000_000, origine: "nominal", jours: 92, brut: 3_150, exoneree: false },
      { intentId: "i2", titre: "FCP Trésorerie Corridor", nature: "FONDS", depuis: "2026-08-14", assiette: 1_980_276, origine: "cours", jours: 47, brut: 0, exoneree: true },
    ],
    assietteMoyenne: 5_000_000,
    brut: 3_150,
    du: 3_150,
    plancher: false,
    issuedAt: now.toISOString(),
    issuedBy: "Desk",
  };

  it("imprime chaque ligne avec son assiette, ses jours et son taux", async () => {
    /* UN FRAIS QU'ON NE VOIT QU'EN TOTAL EST UN FRAIS QU'ON SUBIT : c'est le
       détail ligne à ligne qui en fait un frais vérifiable, et c'est la seule
       raison d'être de ce papier. */
    const { AvisGardePdf } = await import("@/lib/documents/pdf/cash-templates");
    const txt = await texte(AvisGardePdf, { number: "PC-GAR-261001-AAAA", contact, avis, now, texts: {} });
    expect(txt).toContain("Avis de droits de garde");
    expect(txt).toContain("2026T3");
    expect(txt).toContain("OTA 6,50 %");
    expect(txt).toContain("5 000 000");
    expect(txt).toContain("92");
    expect(txt).toContain("0,25 %");
    // Une ligne exonérée paraît quand même, à zéro : son absence se lirait comme un oubli.
    expect(txt).toContain("FCP Trésorerie Corridor");
    expect(txt).toContain("exonérée");
    expect(txt).toContain("3 150");
    expect(txt).toMatch(/réclamation.{0,60}trente jours/);
  });

  it("un avis à zéro le dit, plutôt que de ne pas exister", async () => {
    const { AvisGardePdf } = await import("@/lib/documents/pdf/cash-templates");
    const txt = await texte(AvisGardePdf, { number: "PC-GAR-261001-BBBB", contact, avis: { ...avis, lignes: [avis.lignes[1]], brut: 0, du: 0, assietteMoyenne: 1_980_276 }, now, texts: {} });
    expect(txt).toMatch(/Aucun montant n'a été prélevé/);
  });
});

describe("les trois avis sont au registre comme les autres", () => {
  it("avec leur préfixe, leur moment et leur passage relisable", async () => {
    const { DOC_LABEL, DOC_PREFIX, DOC_KIND, DOC_WHEN, DOC_ORDER, DOC_ROLES } = await import("@/lib/documents/registry");
    const { PASSAGES } = await import("@/lib/documents/passages-catalog");
    for (const type of ["versement", "tirage", "garde"] as const) {
      expect(DOC_LABEL[type], type).toBeTruthy();
      expect(DOC_PREFIX[type], type).toHaveLength(3);
      expect(DOC_KIND[type], type).toBe("envoye");
      expect(DOC_WHEN[type], type).toBeTruthy();
      expect(DOC_ORDER, type).toContain(type);
      expect(DOC_ROLES[type].born.href, type).toMatch(/^\/desk\//);
      // Tout modèle est relisable par le desk : un modèle sans passage ne se reformule pas.
      expect(PASSAGES[type]?.length, type).toBeGreaterThan(0);
    }
  });

  it("et chacun se prévisualise sur des données de démonstration", async () => {
    /* « Tout modèle est prévisualisable » est une règle de la maison : le
       desk relit un texte sur la page où il paraîtra, pas sur sa parole.
       C'est aussi la seule chose qui exerce la branche d'aperçu. */
    const { renderPreview } = await import("@/lib/documents/generate");
    for (const type of ["versement", "tirage", "garde"] as const) {
      const pdf = await renderPreview(type);
      expect(pdf, type).toBeTruthy();
      expect(pdf!.length, type).toBeGreaterThan(2000);
    }
  });

  it("et chacun naît d'une pièce qu'il nomme", async () => {
    const { readFileSync } = await import("node:fs");
    const src = readFileSync("src/lib/documents/generate.ts", "utf8");
    // `sourceId` est ce qui empêche un mouvement de paraître deux fois dans Mes documents.
    for (const n of ["sourceId: payout.id", "sourceId: tirage.id", "sourceId: avis.id"]) expect(src, n).toContain(n);
  });
});
