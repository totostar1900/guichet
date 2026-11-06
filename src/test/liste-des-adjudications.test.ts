import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { syntheseDesSeances } from "@/lib/domain/synthese-seances";
import type { Offer } from "@/lib/domain/types";
import type { OfferSummary } from "@/lib/domain/summary";

const lire = (p: string) => readFileSync(`${__dirname}/../../${p}`, "utf8");
const css = (p: string) => lire(p).replace(/\/\*[\s\S]*?\*\//g, "");
const nu = (o: Partial<Offer>, past = false) => ({ o: { kind: "BTA", precountRate: 6.99, settleOn: "2026-11-12", maturityOn: "2027-02-09", nominal: 1_000_000, ...o } as Offer, s: { past } as OfferSummary });

/**
 * LA LISTE DES ADJUDICATIONS (6 novembre 2026, planche « 1A · 2A · 3A · 4A », grand écran compris).
 *
 * Ouvertes d'abord, les séances closes repliées dessous ; « À la une » n'est plus un cadre mais la première ligne de la liste, avec sa raison ; une ligne de synthèse sous les
 * outils ; une séance close en rangée de 64 px. La cote garde son cadre et ses sections.
 */
describe("la liste des adjudications", () => {
  it("la synthèse compte les séances à jouer, donne la fourchette actuarielle et la prochaine clôture", () => {
    const sy = syntheseDesSeances(
      [
        nu({ deadlineAt: "2026-11-17T12:00:00" }),
        nu({ deadlineAt: "2026-11-10T12:00:00", precountRate: 7.2 }),
        nu({ deadlineAt: "2026-09-15T12:00:00" }, true),
        nu({ kind: "RACHAT", deadlineAt: "2026-11-24T12:00:00" }),
      ],
      "2026-11-06T09:00:00",
    );
    expect(sy.aJouer).toBe(3);
    expect(sy.prochaineCloture).toBe("2026-11-10T12:00:00");
    expect(sy.rendementMin).toBeDefined();
    expect(sy.rendementMax).toBeGreaterThan(sy.rendementMin as number);
  });

  it("un taux « au pair » est un taux nominal : il n'entre pas dans la fourchette actuarielle", () => {
    const sy = syntheseDesSeances(
      [nu({ precountRate: 7.2, deadlineAt: "2026-11-10T12:00:00" }), nu({ kind: "OTA", couponRate: 5, pricePct: 100, maturityOn: "2031-11-16", deadlineAt: "2026-11-17T12:00:00" })],
      "2026-11-06T09:00:00",
    );
    expect(sy.aJouer).toBe(2);
    expect(sy.rendementMin as number, "le coupon d'une ligne au pair est entré dans la fourchette actuarielle").toBeGreaterThan(6);
  });

  it("la synthèse n'invente rien : sans séance ouverte, ni fourchette ni clôture", () => {
    const sy = syntheseDesSeances([nu({ deadlineAt: "2026-09-15T12:00:00" }, true)], "2026-11-06T09:00:00");
    expect(sy).toEqual({ aJouer: 0 });
  });

  it("une clôture passée n'est pas « la prochaine »", () => {
    const sy = syntheseDesSeances([nu({ deadlineAt: "2026-11-01T12:00:00" })], "2026-11-06T09:00:00");
    expect(sy.prochaineCloture).toBeUndefined();
  });

  it("les adjudications se rangent par état : ouvertes et à venir d'abord (la ligne du desk en tête), closes ensuite, repliées", () => {
    const b = lire("src/components/OfferBrowser.tsx");
    expect(b, "les blocs par état ont disparu").toMatch(/if \(adj && !sansGroupe\) \{\s*const ouvertes = list\.filter\(\(\{ s \}\) => !s\.past\);/);
    expect(b, "la ligne du desk n'est plus en tête des ouvertes").toMatch(/const premieres = \[\.\.\.ouvertes\.filter\(\(\{ o \}\) => pickIds\.has\(o\.id\)\), \.\.\.ouvertes\.filter\(\(\{ o \}\) => !pickIds\.has\(o\.id\)\)\];/);
    expect(b, "les séances closes ne démarrent plus repliées").toMatch(/ouvertParDefaut=\{!\(adj && b\.clef === "closes"\) \|\| Boolean\(q\) \|\| filterCount > 0\}/);
    expect(lire("src/components/Fold.tsx"), "le bloc ne sait plus démarrer replié").toMatch(/ouvertParDefaut = true/);
  });

  it("« À la une » n'est plus un cadre aux adjudications, il l'est toujours sur la cote ; le tableau suit le même ordre", () => {
    const b = lire("src/components/OfferBrowser.tsx");
    expect(b, "le cadre « À la une » est revenu aux adjudications").toMatch(/const cadre = adj \? \[\] : picks;/);
    expect(b, "la ligne retenue sort de la liste aux adjudications").toMatch(/const rest = adj \? rows : rows\.filter\(\(\{ o \}\) => !pickIds\.has\(o\.id\)\);/);
    expect(b, "le tableau ne suit plus l'ordre par état").toMatch(/sections=\{!featured && !sansGroupe && !grouped && \(!sectionChoisie \|\| adj\) \? blocsDuSommaire\(list\)/);
    expect(b, "la phrase du desk a quitté la ligne retenue").toMatch(/\{pick && <NoteDeSelection o=\{o\} avertir=\{adj\} \/>\}/);
    expect(b, "la phrase « Une sélection, pas un conseil » n'est plus écrite").toMatch(/t\("Une sélection, pas un conseil : chaque ligne se lit dans sa fiche\."\)/);
  });

  it("la ligne de synthèse paraît sous les outils des adjudications seulement ; la séance close est une rangée de 64 px", () => {
    const b = lire("src/components/OfferBrowser.tsx");
    expect(b, "la synthèse n'est plus montrée aux adjudications").toMatch(/\{adj && rows\.length > 0 && <BandeSeances rows=\{rows\} nowIso=\{nowIso\} \/>\}/);
    expect(b, "la séance close n'est plus une rangée en cartes").toMatch(/if \(adj && s\.past\) return <RangeeDeSeance key=\{o\.id\} o=\{o\} s=\{s\} \/>;/);
    expect(css("src/components/OfferBrowser.module.css"), "la rangée n'a plus sa hauteur de 64 px").toMatch(/\.rangee \{[^}]*min-height: 64px;/);
  });
});
