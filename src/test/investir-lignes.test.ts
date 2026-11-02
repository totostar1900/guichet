import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { SEED_OFFERS } from "@/data/seed";
import { gestesProposables, lignesSimilaires, listeDeLaFiche, type FaitsPourGestes } from "@/lib/domain/accueil";
import { coursEtRevenus } from "@/lib/domain/ligne-titre";
import { fmt } from "@/lib/format";
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
