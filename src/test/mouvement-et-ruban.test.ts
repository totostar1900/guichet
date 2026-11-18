import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { RACINES } from "@/lib/nav-profondeur";
import { racineVoisine, rangDe, sensEntre } from "@/lib/nav-ruban";
import { SIGNES_DU_PAYS, signesPossibles } from "@/lib/domain/filigrane";
import { DEFILE, RESERVES, pageAnimee, tirer } from "@/components/mouvement/Mouvement";

const lire = (f: string) => readFileSync(f, "utf8");

/**
 * Décidé le 18 novembre 2026 (planches « Statuts et mouvement » 2A·2B·3C et « Statuts et dynamisme » 2A·2B) : le ruban à sept racines, le balayage entre menus, le mouvement tiré au hasard,
 * le titre replié et le filigrane patriote.
 */
describe("le ruban des sept racines", () => {
  it("suit l'ordre des racines : Accueil, Activité, Titres, Fonds, Adjudications, Marché, Aide", () => {
    expect([...RACINES]).toEqual(["/", "/activite", "/titres", "/fonds", "/calendrier", "/marche", "/aide"]);
    expect(RACINES.map((r) => rangDe(r))).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });
  it("avancer glisse en avant, revenir glisse en arrière, et une page qui n'est pas une racine ne glisse pas", () => {
    expect(sensEntre("/", "/marche")).toEqual(["nav-avant"]);
    expect(sensEntre("/aide", "/titres")).toEqual(["nav-retour"]);
    expect(sensEntre("/titres", "/titres")).toBeUndefined();
    expect(sensEntre("/offres/x", "/marche")).toBeUndefined();
    expect(sensEntre("/titres?x=1", "/fonds")).toEqual(["nav-avant"]);
  });
  it("Titres, Fonds et Adjudications sont voisins ; les deux bouts du ruban n'ont qu'un voisin", () => {
    expect(racineVoisine("/titres", 1)).toBe("/fonds");
    expect(racineVoisine("/fonds", 1)).toBe("/calendrier");
    expect(racineVoisine("/calendrier", 1)).toBe("/marche");
    expect(racineVoisine("/", -1)).toBeUndefined();
    expect(racineVoisine("/aide", 1)).toBeUndefined();
    expect(racineVoisine("/moi/ordres", 1)).toBeUndefined();
  });
  it("le toucher d'un onglet glisse dans le bon sens, sauf sur l'onglet où l'on est déjà", () => {
    expect(lire("src/components/mobile/MobileShell.tsx")).toMatch(/transitionTypes=\{tab\.match\(path\) \? undefined : sensEntre\(path, tab\.href\)\}/);
  });
});

describe("le balayage entre les menus", () => {
  const b = lire("src/components/mobile/BalayageDesMenus.tsx");
  it("se tait sur les zones qui ont déjà leur geste, sur les champs, sur une feuille ouverte et sur les bords", () => {
    expect(b).toMatch(/hasAttribute\("data-balayage-local"\)/);
    expect(b).toMatch(/\^\(INPUT\|TEXTAREA\|SELECT\)\$/);
    expect(b).toMatch(/scrollWidth > el\.clientWidth/);
    expect(b, "une feuille ouverte ne retient plus le balayage").toMatch(/document\.querySelector\(FEUILLE_OUVERTE\)/);
    expect(lire("src/lib/ui/feuille-ouverte.ts"), "une feuille fermée retient le balayage à tort").toContain(':not([aria-hidden="true"])');
    expect(b).toMatch(/const BORD = 24;/);
  });
  it("ne tient que pour un geste franc : 35 % de la largeur (ou 60 px et vif), plus horizontal que vertical", () => {
    expect(b).toMatch(/window\.innerWidth \* 0\.35/);
    expect(b).toMatch(/Math\.abs\(dy\) > Math\.abs\(dx\) \* 0\.6/);
  });
  it("les rangées à glissement et les courbes qu'on touche se déclarent zones locales", () => {
    expect(lire("src/components/mobile/SwipeActions.tsx")).toMatch(/data-balayage-local=""/);
    expect(lire("src/components/charts/tracker.tsx")).toMatch(/"data-balayage-local": ""/);
  });
});

describe("le mouvement tiré au hasard", () => {
  it("chaque genre a plusieurs arrivées, et chacune finit sur l'état normal de l'élément", () => {
    for (const [genre, noms] of Object.entries(RESERVES)) {
      expect(Object.keys(noms).length, genre).toBeGreaterThanOrEqual(3);
      for (const [n, r] of Object.entries(noms as Record<string, { ms: number }>)) expect(r.ms, `${genre}/${n} : une arrivée furtive dure moins d'une seconde`).toBeLessThanOrEqual(900);
    }
  });
  it("le tirage couvre toute la réserve et reste dans le genre", () => {
    for (const genre of ["bloc", "montant", "courbe"] as const) {
      const vus = new Set<string>();
      for (let i = 0; i < 400; i++) vus.add(tirer(genre));
      expect([...vus].sort()).toEqual(Object.keys(RESERVES[genre]).sort());
    }
    expect(tirer("bloc", () => 0)).toBe(Object.keys(RESERVES.bloc)[0]);
    expect(tirer("bloc", () => 0.9999)).toBe(Object.keys(RESERVES.bloc).at(-1));
  });
  it("coupé par « réduire les animations » et par l'économiseur de données ; une fois par pièce et par ouverture ; seulement des propriétés sûres", () => {
    const m = lire("src/components/mouvement/Mouvement.tsx");
    expect(m).toMatch(/prefers-reduced-motion: reduce/);
    expect(m).toMatch(/saveData/);
    expect(m).toMatch(/if \(ouverts\.has\(el\)\) continue;/);
    expect(m, "la page ne rejoue plus à chaque ouverture : une mémoire par chemin est revenue").not.toMatch(/jouees/);
    expect(m, "une classe ou un attribut est posé sur un élément que React a rendu").not.toMatch(/classList|setAttribute|dataset\.\w+ =/);
    expect(m).toMatch(/\.animate\(/);
    const debutReserve = m.indexOf("export const RESERVES");
    const reserve = m.slice(debutReserve, m.indexOf("type Genre", debutReserve));
    expect(reserve, "une animation touche la mise en page").not.toMatch(/\b(width|height|margin|padding|top|left)\b/);
  });
  it("toutes les pages animent leurs pièces à chaque ouverture puis au défilement, sans flou sur un grand bloc ni pièce collante ; celles qui engagent le client restent fixes", () => {
    const m = lire("src/components/mouvement/Mouvement.tsx");
    expect(m).toMatch(/const animee = pageAnimee\(chemin\);/);
    expect(m).toMatch(/if \(animee && page\) for \(const el of cibles\(page\)\)/);
    expect(m, "le mouvement est de nouveau réservé aux racines").not.toMatch(/estRacine/);
    for (const fixe of ["/desk/statuts", "/lire", "/offres/abc/intention", "/moi/ordres/o1", "/moi/ordres/o1/signe", "/moi/prelevements/nouveau", "/moi/prelevements/m1", "/moi/epargne/nouvelle", "/moi/provision/alimenter/virement", "/moi/documents/d1"]) expect(pageAnimee(fixe), `${fixe} bouge alors qu'elle engage le client`).toBe(false);
    for (const libre of ["/", "/activite", "/titres", "/offres/abc", "/moi/ordres", "/moi/prelevements/historique", "/moi/documents", "/moi/documents/argent", "/moi/compte", "/aide"]) expect(pageAnimee(libre), `${libre} ne bouge pas`).toBe(true);
    expect(m, "une pièce collante ou fixe serait animée").toMatch(/pos === "fixed" \|\| pos === "sticky" \|\| pos === "absolute"/);
    expect(m, "une pile est animée d'un bloc au lieu de ses pièces").toMatch(/\(pile\|chapitres\)/);
    expect(m).toMatch(/SANS_POUR_LES_GRANDS = \["flou", "zoom"\]/);
    expect(m).toMatch(/new IntersectionObserver/);
    expect(m, "une pièce n'est plus observée après sa première arrivée : le défilement ne rejoue plus").not.toMatch(/io\.unobserve/);
    expect(m, "l'arrivée au défilement ne se rejoue plus à chaque entrée dans l'écran").toMatch(/if \(e\.isIntersecting && !avant\) animer\(el, lot\+\+, genres\.get\(el\), sens\);/);
    expect(tirer("bloc", () => 0, ["monte"])).toBe("fond");
  });
  it("l'arrivée au défilement suit le sens du geste, est plus marquée que celle de l'ouverture et ne rejoue pas en rafale", () => {
    const m = lire("src/components/mouvement/Mouvement.tsx");
    expect(m).toMatch(/sens = n > y \? 1 : -1;/);
    expect(m).toMatch(/const REPOS_MS = 600;/);
    expect(DEFILE.bloc.monte(1).transform).toBe("translateY(44px)");
    expect(DEFILE.bloc.monte(-1).transform, "en remontant, la pièce doit venir d'en haut").toBe("translateY(-44px)");
    expect(RESERVES.bloc.monte.de.transform, "l'ouverture doit rester plus douce que le défilement").toBe("translateY(14px)");
  });
  it("rien de contractuel ne porte data-anim : ni la signature, ni le récapitulatif, ni l'avis", () => {
    for (const f of ["src/app/moi/ordres/[id]/Signature.tsx", "src/app/moi/ordres/[id]/page.tsx", "src/app/moi/ordres/[id]/signe/page.tsx"]) expect(lire(f), f).not.toContain("data-anim");
  });
  it("les montants, les courbes et les blocs de l'Accueil sont marqués", () => {
    const c = lire("src/app/Console.tsx");
    expect(c).toMatch(/<b data-anim="montant">/);
    expect(c).toMatch(/data-anim="courbe"/);
    for (const f of ["src/components/accueil/BlocPlat.tsx", "src/components/accueil/BlocDeLignes.tsx", "src/components/accueil/BlocDeCartes.tsx", "src/components/IndexPulse.tsx"]) expect(lire(f), f).toContain('data-anim="bloc"');
  });
  it("le point vivant ne pulse que sur ce qui est ouvert", () => {
    expect(lire("src/app/globals.css")).toMatch(/@media \(prefers-reduced-motion: no-preference\) \{\s*\.pill\.open::before/);
  });
  it("le titre replié reste sous la barre, sur téléphone, et se retire avec la carte", () => {
    expect(lire("src/app/TotalCollant.module.css")).toMatch(/@media \(max-width: 760px\) \{\s*\.barre \{\s*position: fixed;\s*top: var\(--barre-app, 0px\)/);
    expect(lire("src/app/Console.tsx")).toMatch(/<TotalCollant total=/);
  });
});

describe("le filigrane patriote", () => {
  it("donne à chaque pays son code téléphone et son code à trois lettres (UIT, ISO 3166)", () => {
    const codes = Object.fromEntries(Object.entries(SIGNES_DU_PAYS).map(([k, v]) => [k, [v.tel, v.iso3]]));
    expect(codes).toEqual({ Cameroun: ["+237", "CMR"], Congo: ["+242", "COG"], Gabon: ["+241", "GAB"], RCA: ["+236", "CAF"], Tchad: ["+235", "TCD"], "Guinée éq.": ["+240", "GNQ"] });
  });
  it("le Cameroun tire parmi ses deux codes, le mot Kontinent et ses trois monuments ; un pays sans mot ni monument garde ses deux codes", () => {
    expect(signesPossibles("Cameroun")).toEqual(["+237", "CMR", "Kontinent", "monument:reunification-statue", "monument:reunification", "monument:nouvelle-liberte"]);
    expect(signesPossibles("Gabon")).toEqual(["+241", "GAB"]);
    expect(signesPossibles(undefined)).toEqual([]);
  });
  it("chaque monument est une image détourée de sa photo, en ombre d'encre neutre (un PNG à transparence), posée en masque sur la page de statut", () => {
    const css = lire("src/components/statuts/Statuts.module.css");
    for (const m of SIGNES_DU_PAYS.Cameroun.monuments ?? []) {
      expect(existsSync(`public/filigrane/${m.id}.png`), `le monument « ${m.id} » n'a pas d'image`).toBe(true);
      expect(css, `le monument « ${m.id} » n'est pas relié à son image`).toContain(`.voile[data-fili="monument:${m.id}"] {\n  --fili-masque: url("/filigrane/${m.id}.png");`);
    }
    expect(css).toMatch(/\.voile\[data-fili\^="monument:"\]::before \{[^}]*background-color: var\(--on-navy\)[^}]*mask: var\(--fili-masque\)/);
  });
  it("le logo n'est plus le fond d'une page de statut : c'est le signe du pays de la ligne, et la première page n'en a pas", () => {
    expect(lire("src/components/statuts/Statuts.module.css"), "le logo est revenu en fond").not.toContain("icon-512");
    expect(lire("src/components/statuts/Statuts.tsx")).toMatch(/data-fili=\{it \? signe : undefined\}/);
  });
  it("il n'est QUE le fond d'une page de statut : ni une carte de titre, ni une carte de fonds, ni une ligne ne le portent", () => {
    for (const f of ["src/components/OfferCard.tsx", "src/app/fonds/FundCard.tsx", "src/components/OfferCard.module.css", "src/app/globals.css"]) expect(lire(f), `${f} porte encore le filigrane`).not.toMatch(/data-fili|useFiligrane|fili-masque/);
    expect(lire("src/components/statuts/Statuts.module.css")).toMatch(/\.voile\[data-fili\]::before \{[^}]*pointer-events: none/);
  });
  it("le signe tiré pour un autre pays ne se lit pas : il manque un instant plutôt que de montrer le monument de la page d'avant", () => {
    expect(lire("src/lib/ui/filigrane.ts")).toMatch(/return tire\.pays === pays \? tire\.signe : undefined;/);
  });
  it("se tire après le montage, jamais au rendu", () => {
    const h = lire("src/lib/ui/filigrane.ts");
    expect(h).toMatch(/useEffect\(\(\) => \{\s*const id = setTimeout/);
    expect(h.slice(0, h.indexOf("useEffect"))).not.toMatch(/Math\.random/);
  });
});
