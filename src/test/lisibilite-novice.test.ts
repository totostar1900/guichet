import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { COMPRENDRE } from "@/data/comprendre-investir";
import { cleDeLaPhrase, enClairDe } from "@/lib/domain/en-clair";
import { GAGNER, PHRASE, RECUPERER, RISQUER } from "@/lib/domain/en-clair-textes";
import type { Offer } from "@/lib/domain/types";

/* LA LISIBILITÉ POUR LE NOVICE (28 novembre 2026) : « En clair » dans l'extension et la fiche, « Comprendre l'investissement », le bandeau et la carte annotée. */
const lire = (f: string) => readFileSync(f, "utf8");
const offre = (o: Partial<Offer>): Offer => ({ id: "x", kind: "OTA", issuer: "République du Gabon", title: "OTA 6 % 2030", nominal: 10_000, couponRate: 6, maturityOn: "2030-03-29", ...o }) as Offer;

describe("« En clair » se calcule de la ligne seule", () => {
  it("une OTA dit l'émetteur, l'année, le coupon sur le nominal : 6 % de 10 000 = 600", () => {
    const e = enClairDe(offre({}))!;
    expect(e.famille).toBe("dette");
    expect(e.params).toMatchObject({ emetteur: "République du Gabon", annee: "2030", coupon: "6", montant: "600" });
    expect(cleDeLaPhrase(e)).toBe("dette");
  });
  it("sans coupon ni échéance connus, la phrase ne les invente pas", () => {
    expect(cleDeLaPhrase(enClairDe(offre({ couponRate: undefined }))!)).toBe("dette_sans_coupon");
    expect(cleDeLaPhrase(enClairDe(offre({ maturityOn: undefined }))!)).toBe("dette_sans_echeance");
  });
  it("chaque famille de ligne a sa lecture ; un rachat n'en a pas", () => {
    expect(enClairDe(offre({ kind: "BTA" }))?.famille).toBe("bon");
    expect(enClairDe(offre({ kind: "FONDS" }))?.famille).toBe("fonds");
    expect(enClairDe(offre({ kind: "MARCHE", instrument: "action" }))?.famille).toBe("action");
    expect(enClairDe(offre({ kind: "MARCHE", instrument: "obligation" }))?.famille).toBe("dette");
    expect(enClairDe(offre({ kind: "ACTIONS" }))?.famille).toBe("action");
    expect(enClairDe(offre({ kind: "RACHAT" }))).toBeUndefined();
  });
});

describe("le ton : un engagement se dit comme un engagement, un gain comme une possibilité, le risque est toujours dit (ETALON § 10)", () => {
  const familles = ["dette", "bon", "action", "fonds"] as const;
  it("chaque famille porte les trois curseurs", () => {
    for (const f of familles) {
      expect(GAGNER[f].length, f).toBeGreaterThan(20);
      expect(RECUPERER[f].length, f).toBeGreaterThan(20);
      expect(RISQUER[f].length, f).toBeGreaterThan(20);
    }
  });
  it("aucun gain n'est écrit comme acquis : « si », « peut », « rien n'est garanti »", () => {
    for (const f of familles) expect(GAGNER[f], f).toMatch(/\b(si|peut|garanti)\b/);
  });
  it("une phrase de dette parle d'engagement de l'émetteur, jamais de gain promis", () => {
    for (const k of ["dette", "dette_sans_coupon", "dette_sans_echeance", "bon"] as const) expect(PHRASE[k], k).toMatch(/s'engage/);
    for (const t of [...Object.values(PHRASE), ...Object.values(GAGNER)]) expect(t).not.toMatch(/vous gagnerez|vous toucherez|assuré|sans risque|commission/i);
  });
  it("le risque d'une action et d'un fonds dit que le capital ou la valeur peut baisser", () => {
    expect(RISQUER.action).toMatch(/baisser/);
    expect(RISQUER.fonds).toMatch(/baisser/);
  });
});

describe("la page « Comprendre l'investissement »", () => {
  it("compte dix sections, chacune en français et en anglais, sans le mot « commission » (une seule ligne « Frais »)", () => {
    expect(COMPRENDRE).toHaveLength(10);
    const tout = JSON.stringify(COMPRENDRE);
    expect(tout).not.toMatch(/commission/i);
    for (const s of COMPRENDRE) {
      expect(s.titre.fr.length).toBeGreaterThan(3);
      expect(s.titre.en.length).toBeGreaterThan(3);
      for (const l of s.lignes ?? []) {
        expect(l.terme.en, l.terme.fr).not.toBe("");
        expect(l.texte.en, l.texte.fr).not.toBe("");
      }
    }
  });
  it("les exemples chiffrés sont ceux des éclairages", () => {
    const tout = JSON.stringify(COMPRENDRE);
    expect(tout).toMatch(/600 FCFA par titre de 10 000/);
    expect(tout).toMatch(/944 400/);
    expect(tout).toMatch(/5,6 %/);
  });
  it("elle est dans le menu Aide, le plan du site et le registre de l'espace", () => {
    expect(lire("src/lib/nav-groups.ts")).toMatch(/href: "\/info\/investir"/);
    expect(lire("src/app/sitemap.ts")).toMatch(/\/info\/investir/);
    expect(lire("src/test/espace-registre.ts")).toMatch(/info\/investir\/page\.module\.css/);
  });
});

describe("où le novice le trouve", () => {
  it("l'extension d'une carte ouvre sur « En clair » et se range par les trois curseurs", () => {
    const oc = lire("src/components/OfferCard.tsx");
    expect(oc).toMatch(/<PhraseEnClair e=\{enClair\} \/>/);
    for (const t of ["Ce que je peux gagner", "Quand je récupère mon argent", "Ce qui peut mal tourner"]) expect(oc, t).toContain(t);
    expect(oc, "le lien vers les risques a quitté l'extension").toMatch(/<LienDesRisques \/>/);
  });
  it("la fiche s'ouvre sur « En bref », dans la tête que l'aperçu d'une voisine rend aussi", () => {
    expect(lire("src/app/offres/[id]/FicheHead.tsx")).toMatch(/<EnBrefDeLaFiche e=\{enClair\} \/>/);
  });
  it("les sections techniques de la fiche disent à quoi elles servent", () => {
    const fr = lire("src/app/offres/[id]/FicheReading.tsx");
    expect((fr.match(/className=\{styles\.aide\}/g) ?? []).length).toBeGreaterThanOrEqual(6);
  });
  it("le bandeau est sur Investir et sur l'Accueil, et se ferme pour de bon", () => {
    expect(lire("src/components/market/OngletsMarche.tsx")).toMatch(/<BandeauComprendre \/>/);
    expect(lire("src/app/Console.tsx")).toMatch(/<BandeauComprendre \/>/);
    const b = lire("src/components/BandeauComprendre.tsx");
    expect(b).toMatch(/localStorage\.setItem\(CLEF, "1"\)/);
    expect(b).toMatch(/href="\/info\/investir"/);
    expect(b).toMatch(/<LireUneCarte /);
  });
});
