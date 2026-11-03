import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import type { AuctionResult } from "@/lib/market/auction-results";
import { comparatifDeLigne } from "@/lib/domain/sondage-comparatif";
import { limitesDeSondage } from "@/lib/domain/gabarit";

const lire = (f: string) => fs.readFileSync(path.join(process.cwd(), f), "utf8");

const base = (p: Partial<AuctionResult>): AuctionResult =>
  ({
    id: p.id ?? Math.random().toString(36).slice(2),
    country: "Cameroun",
    instrument: "OTA",
    tenor: "5 ans",
    sessionOn: "2026-09-14",
    maturityOn: "2031-09-15",
    abondement: false,
    couponRate: 6.75,
    priceAvg: 95,
    priceMin: 95,
    priceMax: 95,
    confirmedBy: "Georges",
    sourceUrl: "https://exemple",
    sourceTitle: "communiqué",
    createdAt: "2026-09-15",
    updatedAt: "2026-09-15",
    ...p,
  }) as AuctionResult;

const ligne = { instrument: "OTA" as const, country: "Cameroun" as const, tenor: "5 ans", rate: 6.5, pricePct: 95 };
const aujourdHui = "2026-11-03";

describe("le comparatif des séances passées d'une intention (3 novembre 2026)", () => {
  it("retient les séances du pays, la plus récente d'abord, et en limite le nombre", () => {
    const h = ["2020-12-09", "2021-02-24", "2021-09-29", "2022-03-21", "2026-09-14", "2019-08-21"].map((d, i) => base({ id: `s${i}`, sessionOn: d, maturityOn: `${Number(d.slice(0, 4)) + 5}${d.slice(4)}` }));
    const c = comparatifDeLigne(ligne, h, aujourdHui)!;
    expect(c.duPays.map((s) => s.le)).toEqual(["2026-09-14", "2022-03-21", "2021-09-29", "2021-02-24", "2020-12-09"]);
  });

  it("écarte un abondement, une séance écartée, une séance non relue et une séance future", () => {
    const h = [
      base({ id: "ok" }),
      base({ id: "abond", sessionOn: "2026-06-01", maturityOn: "2030-12-01" }),
      base({ id: "ecartee", sessionOn: "2026-05-01", maturityOn: "2031-05-01", setAsideAt: "2026-05-02" }),
      base({ id: "nonrelue", sessionOn: "2026-04-01", maturityOn: "2031-04-01", confirmedBy: undefined }),
      base({ id: "future", sessionOn: "2026-12-01", maturityOn: "2031-12-01" }),
    ];
    expect(comparatifDeLigne(ligne, h, aujourdHui)!.duPays.map((s) => s.id)).toEqual(["ok"]);
  });

  it("range les autres pays à part, jamais mêlés à ceux du pays de la ligne", () => {
    const c = comparatifDeLigne(ligne, [base({ id: "cm" }), base({ id: "ga", country: "Gabon", sessionOn: "2026-08-01", maturityOn: "2031-08-01" })], aujourdHui)!;
    expect(c.duPays.map((s) => s.id)).toEqual(["cm"]);
    expect(c.ailleurs.map((s) => s.id)).toEqual(["ga"]);
  });

  it("compte les séances où le prix moyen servi respecte le prix, sur au moins deux séances", () => {
    const h = [base({ id: "a", priceAvg: 95 }), base({ id: "b", sessionOn: "2022-03-21", maturityOn: "2027-03-21", priceAvg: 98.05 })];
    expect(comparatifDeLigne(ligne, h, aujourdHui)!.servies).toEqual({ n: 1, sur: 2 });
    expect(comparatifDeLigne(ligne, [h[0]], aujourdHui)!.servies, "une séance seule ne fonde aucun compte").toBeUndefined();
    expect(comparatifDeLigne({ ...ligne, pricePct: undefined }, h, aujourdHui)!.servies, "sans limite, aucun compte").toBeUndefined();
  });

  it("sur un bon, la limite est un taux minimum : le compte va dans l'autre sens", () => {
    const bta = (id: string, d: string, taux: number) => base({ id, instrument: "BTA", tenor: "52 semaines", sessionOn: d, maturityOn: `${Number(d.slice(0, 4)) + 1}${d.slice(4)}`, rateAvg: taux, priceAvg: undefined, priceMin: undefined, priceMax: undefined, couponRate: undefined });
    const h = [bta("a", "2026-07-01", 5.5), bta("b", "2026-01-07", 4.9)];
    const c = comparatifDeLigne({ instrument: "BTA", country: "Cameroun", tenor: "52 semaines", rate: 5.2, pricePct: undefined }, h, aujourdHui)!;
    expect(c.unite).toBe("taux");
    expect(c.servies).toEqual({ n: 1, sur: 2 });
  });

  it("se tait sans séance comparable", () => {
    expect(comparatifDeLigne(ligne, [], aujourdHui)).toBeUndefined();
    expect(comparatifDeLigne({ ...ligne, tenor: "n'importe quoi" }, [base({})], aujourdHui)).toBeUndefined();
  });
});

describe("le prix de l'intention s'écrit, tel que le client l'a saisi (3 novembre 2026)", () => {
  const b = { tenor: "4 ans", seanceLe: "2026-12-01", dansJours: undefined, createdAt: "2026-10-01T00:00:00Z" };
  it("une OTA porte « prix min », un bon n'a pas de prix", () => {
    expect(limitesDeSondage({ ...b, instrument: "OTA", rate: 6.5, pricePct: 95 }).prix).toEqual({ valeur: "95 %" });
    expect(limitesDeSondage({ ...b, instrument: "OTA", rate: 6.5 }).prix).toBeUndefined();
    expect(limitesDeSondage({ ...b, instrument: "BTA", rate: 5.2, pricePct: 95 }).prix).toBeUndefined();
  });

  it("l'Accueil écrit le prix min, et le rendement équivalent n'y est qu'en gris entre parenthèses", () => {
    const d = lire("src/components/accueil/DossierAccueil.tsx");
    expect(d, "le prix min n'est plus écrit").toMatch(/\{t\("prix"\)\} \{t\("min"\)\} \{l\.limites\.prix\.valeur\}/);
    expect(d, "le rendement n'est plus un équivalent en gris").toMatch(/<span className=\{styles\.gris\}> \(≈ \{l\.limites\.rendement\.valeur\}\)<\/span>/);
  });

  it("la page dédiée écrit le prix min dans les chiffres du client et le comparatif sous eux", () => {
    const p = lire("src/app/sondage/page.tsx");
    expect(p, "le prix min a quitté la bande de faits").toMatch(/\$\{t\("prix"\)\} \$\{q\}/);
    expect(p, "la page dédiée ne lit plus les séances relues").toMatch(/listAuctionResults\(\{ instrument: choisie\.instrument, confirmed: true/);
    expect(p, "le chapitre de la place n'est plus conditionné au comparatif").toMatch(/\{cmp && \(\s*<section/);
  });

  it("le comparatif porte ses trois lectures, ses autres pays repliés et la mention du passé", () => {
    const c = lire("src/app/sondage/ComparatifDesSeances.tsx");
    expect(c, "la frise a disparu").toMatch(/function Frise\(/);
    expect(c, "la courbe a disparu").toMatch(/function Courbe\(/);
    expect(c, "les autres pays ne sont plus repliés").toMatch(/<details className=\{styles\.ailleurs\}>/);
    expect(c, "la mention du passé a disparu").toMatch(/t\("Les séances passées ne préjugent pas de la prochaine\."\)/);
    expect(c, "un chiffre non publié se lit de nouveau comme un tiret").toMatch(/t\("non publié"\)/);
  });

  it("une question du desk ouvre la même page, avec son niveau indicatif, et chaque question y mène", () => {
    const p = lire("src/app/sondage/page.tsx");
    expect(p, "la page dédiée ne retrouve plus les questions du desk").toMatch(/questions\.find\(\(q\) => q\.id === ligne\)/);
    expect(p, "une question n'est plus lue comme une question").toMatch(/const role = duDesk && choisie === duDesk \? "question" : "attente"/);
    expect(p, "une question du desk ne mène plus à ses séances passées").toContain("href={`/sondage?ligne=${q.id}`}");
    expect(lire("src/app/sondage/ComparatifDesSeances.tsx"), "la limite d'une question se lit encore « Votre limite »").toMatch(/role === "question" \? "Niveau indicatif" : "Votre limite"/);
  });
});
