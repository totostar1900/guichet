import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { SEED_OFFERS } from "@/data/seed";
import { aUnRond, gestesProposables, lignesSimilaires, listeDeLaFiche, type FaitsPourGestes } from "@/lib/domain/accueil";
import { coursEtRevenus } from "@/lib/domain/ligne-titre";
import { fmt, fmtPct } from "@/lib/format";
import { sousLigne } from "@/lib/domain/ligne-titre";
import { rendementDeLaLigne } from "@/lib/domain/sondage";
import { gabaritDIntention, gabaritDeSondage, limitesDeSondage, periodeDeFonds } from "@/lib/domain/gabarit";
import type { Offer } from "@/lib/domain/types";

const ROOT = path.join(__dirname, "../..");
const lire = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");
const code = (p: string) =>
  lire(p)
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

/**
 * « INVESTIR » EN BLOCS, LIGNES CLIQUABLES, FICHE QUI A DES SORTIES (2 novembre 2026).
 * Les familles de la cote, les fonds et les adjudications ont chacune leur bloc pleine
 * largeur ; chaque rangée est un lien vers sa fiche ; la fiche rend la liste de sa famille,
 * des lignes similaires et les lignes de son émetteur.
 */
const faits = (o: Partial<FaitsPourGestes> = {}): FaitsPourGestes => ({
  intentions: 1, versements: 1, lignesSuivies: 1, attentesSondees: 2, mandats: 1, operations: 1, conventionOk: true, dossierAPoursuivre: false, profilRenseigne: true, appareilAjoute: true, couponsSansReinvestissement: false, ...o,
} as unknown as FaitsPourGestes);

describe("l'invitation à proposer une adjudication", () => {
  it("passe dans « Vous pouvez aussi » quand aucune séance n'est ouverte ni annoncée", () => {
    expect(gestesProposables(faits({ sansAdjudication: true }))).toContain("sondage");
    expect(gestesProposables(faits({ sansAdjudication: false }))).not.toContain("sondage");
  });
});

describe("la liste d'où une fiche vient", () => {
  it("repli : la liste de la famille, jamais la racine (qui est l'Accueil)", () => {
    expect(listeDeLaFiche({ kind: "FONDS" }).href).toBe("/fonds");
    expect(listeDeLaFiche({ kind: "OTA" }).href).toBe("/calendrier");
    expect(listeDeLaFiche({ kind: "MARCHE" }).href).toBe("/titres");
    for (const k of ["FONDS", "OTA", "MARCHE", "ACTIONS"] as const) expect(listeDeLaFiche({ kind: k }).href).not.toBe("/");
  });
});

describe("les lignes similaires", () => {
  const modele = SEED_OFFERS.find((o) => o.kind === "FONDS" && !o.hidden && o.status !== "withdrawn") as Offer;
  const fonds = (id: string, issuer: string, country = modele.country): Offer => ({ ...modele, id, issuer, country });
  const o = fonds("a", "Gestion A");
  const offres = [o, fonds("b", "Gestion B", "Gabon"), fonds("c", "Gestion A", "Gabon"), fonds("d", "Gestion C"), fonds("e", "Gestion D", "Tchad"), { ...fonds("f", "Gestion A"), hidden: true }];

  it("jamais la ligne elle-même, ni une ligne cachée, trois au plus", () => {
    const s = lignesSimilaires(o, offres, new Date("2026-11-02"));
    expect(s.map((x) => x.id)).not.toContain("a");
    expect(s.map((x) => x.id)).not.toContain("f");
    expect(s.length).toBeLessThanOrEqual(3);
  });

  it("le même émetteur d'abord, puis le même pays, puis l'ordre de la liste", () => {
    const s = lignesSimilaires(o, offres, new Date("2026-11-02")).map((x) => x.id);
    expect(s[0]).toBe("c"); // même émetteur
    expect(s[1]).toBe("d"); // même pays
  });

  it("une ligne d'une autre famille n'est pas similaire", () => {
    const ota = SEED_OFFERS.find((x) => x.kind === "OTA") as Offer;
    expect(lignesSimilaires(o, [o, ota], new Date("2026-11-02"))).toEqual([]);
  });
});

describe("les rangées et la fiche (lecture du code)", () => {
  const bloc = code("src/components/accueil/BlocDeLignes.tsx");
  const css = lire("src/components/accueil/BlocDeLignes.module.css");

  it("toute la rangée est un lien vers la fiche, sans lien dans le lien", () => {
    expect(bloc, "la rangée n'est plus un lien vers sa fiche").toMatch(/<Link href=\{l\.href\} className=\{styles\.ligne\}>/);
    const debut = bloc.indexOf("<Link href={l.href}");
    const dedans = bloc.slice(debut + 10, bloc.indexOf("</Link>", debut));
    expect(dedans, "un lien contient un autre lien : HTML l'interdit").not.toContain("<Link");
    expect(bloc, "les fiches ne sont plus à /offres/{id}").toMatch(/href: `\/offres\/\$\{o\.id\}`/);
  });

  it("la rangée fait au moins 64 px et son nom tient sur deux lignes", () => {
    expect(css).toMatch(/\.ligne \{[^}]*min-height:\s*64px/);
    expect(css).toMatch(/-webkit-line-clamp:\s*2/);
  });

  it("le titre d'un bloc mène à la liste, et les blocs de l'Accueil lisent les familles de la table de navigation", () => {
    expect(bloc).toMatch(/<TitreDeBloc id=\{id\} titre=\{titre\} href=\{href\} tout=\{tout\} \/>/);
    const g = code("src/components/accueil/GrilleInvestir.tsx");
    for (const cle of ["titres", "fonds", "calendrier"]) expect(g, `le bloc ${cle} a disparu`).toContain(`page("${cle}")`);
  });

  it("la fiche rend la liste de sa famille, des lignes similaires et les lignes de l'émetteur", () => {
    const page = code("src/app/offres/[id]/page.tsx");
    expect(page, "la fiche n'a plus de lignes similaires").toContain("<LignesSimilaires o={o} />");
    expect(page, "le retour d'une fiche retombe sur la racine").not.toContain('fallbackHref="/"');
    expect(page).toMatch(/fallbackHref=\{listeDeLaFiche\(o\)\.href\}/);
    expect(code("src/app/offres/[id]/neighbour.tsx")).toMatch(/fallbackHref=\{listeDeLaFiche\(o\)\.href\}/);
    const sim = code("src/app/offres/[id]/LignesSimilaires.tsx");
    expect(sim, "le lien vers toutes les lignes de l'émetteur a disparu").toMatch(/`\/recherche\?q=\$\{encodeURIComponent\(o\.issuer\)\}`/);
    expect(sim, "le titre ne mène plus à la liste de la famille").toMatch(/href=\{liste\.href\}/);
  });
});

describe("la ligne d'un titre : le cours en tête, les revenus dessous (2 novembre 2026)", () => {
  const t = (k: string) => k;
  const action = { instrument: "action", lastPrice: 228085, dividendPerShare: 4835 } as unknown as Offer;
  const obligation = { instrument: "obligation", lastPrice: 100, couponRate: 6.25 } as unknown as Offer;

  it("une action : le cours en FCFA, puis le dividende et le rendement, abrégés", () => {
    const r = coursEtRevenus(action, "2,12 %", t);
    expect(r.cours).toEqual({ texte: fmt(228085), unite: "FCFA" });
    expect(r.revenus?.map((x) => x.etiquette)).toEqual(["Div.", "Rdt"]);
    expect(r.revenus?.[0].unite).toBe("FCFA");
  });

  it("une obligation : le cours en % du nominal, puis le coupon et le rendement", () => {
    const r = coursEtRevenus(obligation, "6,25 %", t);
    expect(r.cours).toEqual({ texte: "100 %", unite: "du nominal" });
    expect(r.revenus?.map((x) => x.etiquette)).toEqual(["Coupon", "Rdt"]);
  });

  it("sans cours connu, la ligne garde son ancienne forme ; sans rendement, pas de ligne de rendement", () => {
    expect(coursEtRevenus({ instrument: "action" } as unknown as Offer, "2 %", t)).toEqual({});
    expect(coursEtRevenus(action, "—", t).revenus?.map((x) => x.etiquette)).toEqual(["Div."]);
  });

  it("le cours est en or et le revenu en bleu, par deux jetons de page ; l'unité est en petit", () => {
    const css = lire("src/app/globals.css");
    expect(css, "le cours n'est plus en or").toMatch(/--accueil-cours:\s*var\(--gold-ink\)/);
    expect(css, "le revenu n'est plus en bleu d'information").toMatch(/--accueil-revenu:\s*var\(--info\)/);
    const b = lire("src/components/accueil/BlocDeLignes.module.css");
    expect(b).toMatch(/\.cours \{\s*color: var\(--accueil-cours, inherit\);/);
    expect(b).toMatch(/\.unite \{[^}]*font-size: var\(--t-1\);/);
  });
});

describe("les titres à plat sur tout l'Accueil", () => {
  it("le dossier n'a plus de titre dans une carte : chaque rubrique est un BlocPlat", () => {
    const d = code("src/components/accueil/DossierAccueil.tsx");
    for (const titre of ["Mes intentions", "Mes intentions au sondage", "Mes lignes suivies", "Mon espace", "Vous pouvez aussi"]) expect(d, `« ${titre} » n'est plus un bloc à plat`).toContain(`titre="${titre}"`);
    expect(d, "une rubrique est redevenue une tuile entière en lien").not.toMatch(/styles\.pleine|styles\.compacte|styles\.entete/);
    expect(code("src/components/accueil/BlocPlat.tsx"), "la carte d'un bloc à plat est devenue un lien").not.toContain("<Link");
  });

  it("« Mon espace » liste les rubriques présentes, chacune un lien", () => {
    const d = code("src/components/accueil/DossierAccueil.tsx");
    expect(d).toMatch(/<BlocPlat id="dossier-espace" titre="Mon espace">\s*\{compactes\.map\(\(c\) => \(\s*<Rang key=\{c\.cle\} href=\{c\.href\}>/);
  });
});

describe("retouches du 2 novembre 2026 sur l'Accueil", () => {
  it("la phrase « Dix-sept questions » n'est plus sous « Compléter mon profil » : la ligne ne porte que son nom", () => {
    const d = code("src/components/accueil/DossierAccueil.tsx");
    expect(d).not.toContain("Dix-sept questions");
    expect(d, "le geste « profil » a retrouvé une phrase").toMatch(/profil: \{ href: "\/moi\/profil", nom: t\("Compléter mon profil d'investisseur"\), dit: "" \}/);
    expect(d, "une ligne sans phrase ne doit pas rendre un <small> vide").toMatch(/\{g\.dit && <small>\{g\.dit\}<\/small>\}/);
  });
});

describe("le gabarit « OTA 4 ans • CMR » et les lignes suivies sans doublon (2 novembre 2026)", () => {
  it("une ligne de sondage s'écrit « OTA 4 ans • CMR », le pays abrégé comme sur les cartes", () => {
    expect(gabaritDeSondage({ instrument: "OTA", tenor: "4 ans", country: "Cameroun" })).toBe("OTA 4 ans • CMR");
    expect(gabaritDeSondage({ instrument: "BTA", tenor: "52 semaines", country: "Gabon" })).toBe("BTA 52 semaines • GAB");
  });

  it("les limites sont celles du sondage : coupon/taux min et rendement min, écrites seulement si elles sont fixées", () => {
    const base = { tenor: "4 ans", seanceLe: "2026-12-01", dansJours: undefined, createdAt: "2026-10-01T00:00:00Z" };
    const ota = limitesDeSondage({ ...base, instrument: "OTA", rate: 6.5, pricePct: 95 });
    expect(ota.niveau).toEqual({ mot: "coupon", valeur: fmtPct(6.5, 2) });
    expect(ota.rendement?.valeur).toBe(fmtPct(rendementDeLaLigne({ ...base, instrument: "OTA", rate: 6.5, pricePct: 95 })!, 2));
    expect(limitesDeSondage({ ...base, instrument: "OTA" }), "rien de fixé : aucun mot sans chiffre").toEqual({});
    const bon = limitesDeSondage({ ...base, instrument: "BTA", rate: 5.2 });
    expect(bon.niveau).toEqual({ mot: "taux", valeur: fmtPct(5.2, 2) });
    expect(bon.rendement, "un bon n'a pas de rendement à part").toBeUndefined();
  });

  it("la sous-ligne d'un fonds ne porte que l'émetteur, jamais le dépositaire", () => {
    expect(sousLigne({ kind: "FONDS", issuer: "Gestionnaire" }, "Gestionnaire · Dépositaire")).toBe("Gestionnaire");
    expect(sousLigne({ kind: "OTA", issuer: "Cameroun" }, "Trésor du Cameroun")).toBe("Trésor du Cameroun");
  });

  it("une intention sur une OTA ou un BTA a son gabarit ; un fonds ou une action non", () => {
    const base = { country: "Cameroun", settleOn: "2026-01-15", maturityOn: "2030-01-15" } as const;
    expect(gabaritDIntention({ ...base, kind: "OTA" })).toBe("OTA 4 ans • CMR");
    expect(gabaritDIntention({ ...base, kind: "FONDS" })).toBeUndefined();
    expect(gabaritDIntention({ ...base, kind: "OTA", maturityOn: "" })).toBeUndefined();
  });

  it("la période d'un fonds s'écrit en abrégé, deux dates à deux chiffres d'année ; sans date de départ pas de période", () => {
    const p = periodeDeFonds({ perf1yPct: 7.4, perf1yFrom: "2025-09-18", navDate: "2026-10-16" });
    expect(p?.a).toMatch(/25$/);
    expect(p?.b).toMatch(/26$/);
    expect(p?.a).not.toMatch(/2025/);
    expect(periodeDeFonds({ perf1yPct: 7.4, navDate: "2026-09-18" })).toBeUndefined();
    expect(periodeDeFonds({ perf1yFrom: "2025-09-18", navDate: "2026-09-18" })).toBeUndefined();
  });

  it("une ligne suivie n'écrit son chiffre qu'une fois : plus de « note » qui le répète", () => {
    const d = code("src/components/accueil/DossierAccueil.tsx");
    expect(d, "le doublon (une note qui répète la performance) est revenu").not.toMatch(/perf \?\? /);
    expect(d, "le chiffre de tête n'est plus seul en haut, en or").toMatch(/<b className=\{styles\.or\}>\{l\.valeur\}<\/b>/);
    expect(d, "la période n'a plus sa propre ligne").toMatch(/\{l\.periode && <small className=\{styles\.periode\}>\{l\.periode\}<\/small>\}/);
    expect(d, "ce qui presse n'est plus une pastille").toMatch(/\{l\.urgence && <PastilleEtat ton=\{l\.presse \? "attention" : "neutre"\}>/);
    expect(d, "la période n'est plus écrite en abrégé avec ses deux dates").toContain("`${periodeFonds.a} – ${periodeFonds.b}`");
    expect(lire("src/components/accueil/DossierAccueil.module.css"), "la période peut de nouveau se couper sur deux lignes").toMatch(/\.periode \{\s*white-space: nowrap;/);
  });
});

describe("chaque rangée de l'Accueil ouvre la ligne qu'elle montre (2 novembre 2026)", () => {
  it("une rangée du sondage ouvre SA ligne : un lien propre, jamais la page entière", () => {
    const d = code("src/components/accueil/DossierAccueil.tsx");
    expect(d, "les rangées du sondage mènent de nouveau à la page entière").toContain("href={`/sondage?ligne=${l.id}`}");
    expect(d, "le sondage de l'Accueil montre trois lignes").toContain("vivantes.slice(0, 3)");
    /* LA PAGE DU SONDAGE FAIT DE MÊME : toute la rangée d'une intention ouvre son détail. */
    expect(code("src/app/sondage/RangeeDeSondage.tsx"), "une rangée de la page du sondage n'ouvre plus sa ligne").toContain("href={`/sondage?ligne=${l.id}`}");
    const p = code("src/app/sondage/page.tsx");
    expect(p, "la page du sondage ne lit plus ?ligne=").toMatch(/const \{ ligne, pays, duree \} = await searchParams/);
    expect(p, "le détail n'a plus son retour vers la liste").toMatch(/retour=\{\{ href: "\/sondage"/);
  });

  it("une rangée d'intention, de ligne suivie, de titre, de fonds ou d'adjudication ouvre la fiche de SA ligne", () => {
    const d = code("src/components/accueil/DossierAccueil.tsx");
    expect(d).toContain("href: `/offres/${i.offerId}`");
    expect(d).toContain("href: `/offres/${o.id}`");
    expect(code("src/components/accueil/BlocDeLignes.tsx")).toContain("href: `/offres/${o.id}`");
  });
});

describe("« Ce qui performe » : chaque rangée ouvre sa ligne (2 novembre 2026)", () => {
  it("la rangée est un lien vers la fiche de la ligne, ou à défaut vers la société — jamais vers rien", () => {
    const s = code("src/components/SensDuClassement.tsx");
    expect(s, "la rangée n'est plus un lien").toMatch(/<Link href=\{l\.href\} className=\{styles\.ligne\}>/);
    const c = code("src/components/CeQuiPerforme.tsx");
    expect(c, "la fiche de la ligne n'est plus le lien quand le catalogue la porte").toContain("`/offres/boc-${l.isin.toLowerCase()}`");
    expect(c, "le repli vers la société a disparu : un lien vers une fiche absente serait un 404").toContain("`/societes/${encodeURIComponent(l.mnemo)}`");
  });
});

describe("le rond devant le nom : les adjudications seulement (2 novembre 2026)", () => {
  it("un drapeau devant une séance du Trésor ; rien devant un titre coté ni un fonds", () => {
    expect(aUnRond({ kind: "OTA" })).toBe(true);
    expect(aUnRond({ kind: "BTA" })).toBe(true);
    expect(aUnRond({ kind: "RACHAT" })).toBe(true);
    expect(aUnRond({ kind: "MARCHE" }), "un titre coté n'a plus de rond").toBe(false);
    expect(aUnRond({ kind: "FONDS" }), "un fonds n'a plus de rond").toBe(false);
  });

  it("les trois blocs qui posent un rond le conditionnent à la règle", () => {
    expect(code("src/components/accueil/BlocDeLignes.tsx")).toContain("{l.rond && <Avatar offre={l.offre} />}");
    expect(code("src/components/accueil/BlocDeLignes.tsx")).toContain("rond: aUnRond(o)");
    expect(code("src/components/SelectionDuDesk.tsx")).toContain("{sobre && aUnRond(o) && <Avatar offre={o} />}");
    expect(code("src/components/CeQuiFermeBientot.tsx")).toMatch(/o && aUnRond\(o\) \? <Avatar offre=\{o\} \/> : null/);
  });
});
