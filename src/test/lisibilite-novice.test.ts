import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { COMPRENDRE } from "@/data/comprendre-investir";
import { cleDeLaPhrase, enClairDe } from "@/lib/domain/en-clair";
import { CHIFFRES, GAGNER, PHRASE, RECUPERER, RISQUER } from "@/lib/domain/en-clair-textes";
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

describe("les chiffres de la ligne, expliqués avec leurs valeurs", () => {
  const cles = (o: Partial<Offer>) => enClairDe(offre(o))!.chiffres.map((c) => c.cle);
  it("une obligation sous le pair dit que le rendement dépasse le coupon ; au-dessus, l'inverse", () => {
    expect(cles({ pricePct: 96 })).toContain("prix_sous");
    expect(cles({ pricePct: 100 })).toContain("prix_pair");
    expect(cles({ pricePct: 104 })).toContain("prix_dessus");
    expect(CHIFFRES.prix_sous.texte).toMatch(/rendement dépasse le coupon/);
    expect(CHIFFRES.prix_dessus.texte).toMatch(/inférieur au coupon/);
  });
  it("le coupon est dit en FCFA sur le nominal : 6 % de 10 000 = 600", () => {
    const c = enClairDe(offre({}))!.chiffres.find((x) => x.cle === "coupon")!;
    expect(c.params).toMatchObject({ coupon: "6", montant: "600", nominal: "10 000" });
    expect(CHIFFRES.coupon.texte).toMatch(/jamais sur le prix payé/);
  });
  it("une action rapporte son dividende au cours : 2 500 / 45 000 = 5,6 %", () => {
    const e = enClairDe(offre({ kind: "MARCHE", instrument: "action", lastPrice: 45_000, dividendPerShare: 2_500 }))!;
    expect(e.chiffres.map((c) => c.cle)).toEqual(["cours", "dividende", "rendement_dividende"]);
    expect(e.chiffres[2].params.rendement).toBe("5,6");
  });
  it("un fonds dit sa valeur liquidative, sa fréquence et sa catégorie", () => {
    const e = enClairDe(offre({ kind: "FONDS", fund: { manager: "Corridor", category: "M", frequency: "hebdomadaire", nav: 10_482, navDate: "2026-11-26" } as Offer["fund"] }))!;
    expect(e.chiffres.map((c) => c.cle)).toEqual(["vl", "frequence", "categorie_M"]);
  });
  it("une ligne sans donnée n'invente aucun chiffre", () => {
    expect(cles({ couponRate: undefined, maturityOn: undefined })).toEqual(["nominal"]);
    expect(enClairDe(offre({ kind: "MARCHE", instrument: "action" }))!.chiffres).toEqual([]);
  });
  it("aucun mot de frais ni de commission dans les chiffres : une seule ligne « Frais », ailleurs", () => {
    expect(JSON.stringify(CHIFFRES)).not.toMatch(/commission|frais/i);
  });
});

describe("où le novice le trouve : une fenêtre qui s'ajoute, sans rien déplacer", () => {
  const ec = lire("src/components/EnClair.tsx");
  it("la fenêtre est celle de la maison : centrée, avec sa croix et son glissement vers le bas", () => {
    expect(ec).toMatch(/<Sheet open=\{ouvert\} onClose=\{\(\) => setOuvert\(false\)\} title=\{t\("En clair"\)\} centre>/);
  });
  it("l'extension d'une carte a un bouton « En clair » dans sa rangée de boutons", () => {
    expect(lire("src/components/mobile/CarteDepliee.tsx")).toMatch(/<EnClairBouton e=\{enClair\}/);
    expect(lire("src/components/OfferCard.tsx")).toMatch(/enClair=\{enClair\} titre=\{o\.title\}/);
    expect(lire("src/app/fonds/FundCard.tsx")).toMatch(/enClair=\{enClairDe\(/);
  });
  it("la fiche a un onglet « En clair » à la fin de la bande, et un bouton à côté de « Fiche PDF » sur grand écran", () => {
    expect(lire("src/components/mobile/FichePanes.tsx")).toMatch(/\{enClair && <EnClairBouton e=\{enClair\} titre=\{titre\} \/>\}/);
    expect(lire("src/app/offres/[id]/FicheHead.tsx")).toMatch(/<EnClairBouton e=\{enClair\} titre=\{o\.title\} className=/);
    expect(lire("src/app/offres/[id]/page.module.css")).toMatch(/\.enClairBureau \{\s*display: none;/);
  });
  it("RIEN N'EST INSÉRÉ DANS LE CONTENU ACTUEL : ni phrase dans l'extension, ni bloc dans la tête de la fiche, ni ligne sous les titres", () => {
    expect(lire("src/components/OfferCard.tsx")).not.toMatch(/PhraseEnClair|curseurTitre|<Curseur/);
    expect(lire("src/app/offres/[id]/FicheHead.tsx")).not.toMatch(/EnBrefDeLaFiche/);
    expect(lire("src/app/offres/[id]/FicheReading.tsx")).not.toMatch(/styles\.aide/);
    expect(ec).not.toMatch(/export function (PhraseEnClair|Curseur|EnBrefDeLaFiche)/);
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
