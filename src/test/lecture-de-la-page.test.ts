import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { visiteDesTitres, type PageDeLaVisite, type VueDeLaVisite } from "@/lib/ui/visite-titres";
import { ORDRE_DE_LA_PAGE } from "@/data/services-risques";
import { LEGAL } from "@/data/legal";

const lire = (f: string) => readFileSync(f, "utf8");
const t = (k: string) => k;
const cibles = (vue: VueDeLaVisite, page: PageDeLaVisite) => visiteDesTitres({ vue, page, t }).map((s) => s.target);

describe("« Comment lire cette page ? » suit la vue, couvre la carte et se lance depuis le « i » (7 novembre 2026)", () => {
  it("la visite des cartes détaillées couvre l'état, le chiffre, la grille et le pied, et dit qu'il n'y a pas de dos", () => {
    const c = cibles("detaillees", "adjudications");
    for (const k of ["titres-groupe", "titres-etat", "titres-prix", "titres-grille", "titres-pied", "titres-carte"]) expect(c, `repère ${k} absent`).toContain(k);
    expect(c, "le dos n'existe pas en vue détaillée").not.toContain("titres-retourner");
  });
  it("la visite des cartes compactes parle du chiffre de la tuile et du dos", () => {
    const c = cibles("compactes", "cote");
    expect(c).toContain("titres-chiffre");
    expect(c, "le dos manque à la visite compacte").toContain("titres-retourner");
    expect(c, "la grille détaillée est au dos, pas sur la tuile").not.toContain("titres-grille");
  });
  it("chaque vue a sa visite, et les deux pages ne disent pas la même chose du chiffre", () => {
    expect(cibles("liste", "cote").length).toBeGreaterThan(4);
    expect(cibles("tableau", "cote").length).toBeGreaterThan(4);
    const texte = (p: PageDeLaVisite) => visiteDesTitres({ vue: "detaillees", page: p, t }).find((s) => s.target === "titres-prix")?.text;
    expect(texte("adjudications")).not.toBe(texte("cote"));
  });
  it("chaque repère de la visite existe dans le code de la carte ou de la barre", () => {
    const code = [lire("src/components/OfferCard.tsx"), lire("src/components/market/TeteGroupe.tsx"), lire("src/components/OfferBrowser.tsx"), lire("src/components/MarketToggles.tsx"), lire("src/components/Affichage.tsx"), lire("src/components/market/OngletsMarche.tsx")].join("\n");
    const tous = new Set(["detaillees", "compactes", "liste", "tableau"].flatMap((v) => cibles(v as VueDeLaVisite, "cote")));
    for (const k of tous) expect(code, `aucun élément ne porte le repère ${k}`).toMatch(new RegExp(`data-coach=(\\{[^}]*)?"${k}"`));
  });
  it("OfferBrowser compose sa visite avec la vue et la densité", () => {
    expect(lire("src/components/OfferBrowser.tsx")).toMatch(/stops=\{visiteDesTitres\(\{ vue: view === "cards" \? \(densite === "compact"/);
  });
  it("le bouton de rappel garde la largeur de son mot", () => {
    expect(lire("src/components/mobile/CoachMarks.module.css")).toMatch(/\.replay \{[^}]*width: fit-content;/);
  });
  it("le « i » lance la visite : il ferme la feuille puis envoie le signal du menu", () => {
    expect(lire("src/components/EnBrefInstruments.tsx")).toMatch(/setOpen\(false\);\s*window\.setTimeout\(\(\) => window\.dispatchEvent\(new Event\("guichet:coach:replay"\)\)/);
  });
  it("le « i » est le premier objet de la barre, avant l'horloge", () => {
    const b = lire("src/components/mobile/BarreDuHaut.tsx");
    const i = b.indexOf("<EnBrefInstruments");
    expect(i, "le « i » a quitté la barre").toBeGreaterThan(0);
    expect(i, "le « i » repasse après l'horloge").toBeLessThan(b.indexOf('href="/echeances"', 0));
  });
});

describe("la documentation « services et risques associés » (7 novembre 2026)", () => {
  it("la page des mentions porte une bande de menu dont chaque onglet mène à une section", () => {
    const ids = ORDRE_DE_LA_PAGE.map((e) => ("doc" in e ? e.doc.id : e.legal));
    expect(new Set(ids).size, "deux sections portent le même id").toBe(ids.length);
    for (const e of ORDRE_DE_LA_PAGE) if ("legal" in e) expect(LEGAL.some((s) => s.id === e.legal), `la section ${e.legal} n'existe plus dans legal.ts`).toBe(true);
    expect(lire("src/app/info/mentions/page.tsx")).toMatch(/<BandeDeLaPage/);
  });
  it("toutes les sections juridiques gardent leur place, et chaque ligne est écrite dans les deux langues", () => {
    const presents = ORDRE_DE_LA_PAGE.flatMap((e) => ("legal" in e ? [e.legal] : []));
    for (const s of LEGAL) expect(presents, `la section ${s.id} a disparu de la page`).toContain(s.id);
    for (const e of ORDRE_DE_LA_PAGE) {
      if (!("doc" in e)) continue;
      for (const l of e.doc.lignes ?? []) {
        expect(l.terme.en.length, l.terme.fr).toBeGreaterThan(2);
        expect(l.texte.en.length, l.terme.fr).toBeGreaterThan(10);
      }
    }
  });
  it("la liquidité vient en premier parmi les risques", () => {
    const d = ORDRE_DE_LA_PAGE.flatMap((e) => ("doc" in e && e.doc.id === "types-de-risques" ? [e.doc] : []))[0];
    expect(d.lignes?.[0].terme.fr).toBe("Liquidité");
  });
});

describe("les cartes d'adjudication (7 novembre 2026)", () => {
  it("la grille de la carte est une colonne qui rétrécit : l'émetteur ne pousse plus la pastille hors de la carte", () => {
    expect(lire("src/components/OfferCard.module.css")).toMatch(/\.card \{[^}]*grid-template-columns: minmax\(0, 1fr\);/);
  });
  it("le Trésor est en surtitre sur la carte, et la ligne grise ne le redit pas", () => {
    const l = lire("src/components/LineIdentity.tsx");
    expect(l).toMatch(/const surtitre = size === "lg" && Tag === "div"/);
    expect(l).toMatch(/const ligneGrise = surtitre \? reste\.join/);
  });
  it("le coupon est un chiffre de la carte, au même rang que le rendement, et quitte la grille", () => {
    const o = lire("src/components/OfferCard.tsx");
    expect(o).toMatch(/<b className=\{styles\.coupon\}>\{s\.coupon\}<\/b>/);
    expect(o).toMatch(/s\.facts\.filter\(\(\[k\]\) => k !== "Coupon"\)/);
  });
  it("l'identité d'une ligne est une colonne qui rétrécit, et la pastille de sélection se tronque", () => {
    const c = lire("src/components/LineIdentity.module.css");
    expect(c).toMatch(/\.id \{[^}]*grid-template-columns: minmax\(0, 1fr\);/);
    expect(c, "la pastille de sélection ne se tronque plus").toMatch(/\.badge > em \{[^}]*text-overflow: ellipsis;/);
  });
  it("le titre d'un groupe est bleu, plus or", () => {
    expect(lire("src/components/market/TeteGroupe.module.css")).toMatch(/\.teteGroupe \{[^}]*color: var\(--navy-text\);/);
  });
});
