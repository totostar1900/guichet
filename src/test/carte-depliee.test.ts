import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const lire = (f: string) => fs.readFileSync(path.join(process.cwd(), f), "utf8");
const css = (f: string) => lire(f).replace(/\/\*[\s\S]*?\*\//g, "");
const code = (f: string) => lire(f).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "");

/**
 * LE DOS D'UNE CARTE EST UNE EXTENSION VERS LE BAS (9 novembre 2026, planche « Gestes et feuilles », 4A).
 * Titres, Fonds et Adjudications dépliaient d'abord leur carte en la retournant ; elles l'étendent maintenant. Le mouvement est SEUL (aucun voile, aucun rebond), rien de ce que disait le dos n'est perdu,
 * et la rangée de trois boutons est alignée sous l'extension.
 */
describe("la carte dépliée", () => {
  const m = css("src/components/mobile/CarteDepliee.module.css");
  const bloc = (sel: string) => new RegExp(`(?:^|\\n)\\${sel} \\{([^}]*)\\}`).exec(m)?.[1] ?? "";

  it("la hauteur glisse seule, avec une courbe qui ne dépasse pas, sans fondu ni voile", () => {
    expect(bloc(".region"), "l'extension ne glisse plus par sa hauteur").toMatch(/grid-template-rows:\s*0fr;[\s\S]*transition:\s*grid-template-rows 0\.34s cubic-bezier\(0\.32, 0\.72, 0, 1\)/);
    expect(m, "l'extension s'ouvre sur 1fr").toMatch(/\.region\[data-ouvert="true"\] \{[^}]*grid-template-rows:\s*1fr/);
    for (const sel of [".region", ".interieur", ".contenu"]) expect(bloc(sel), `${sel} joue un fondu, un voile ou un rebond`).not.toMatch(/opacity|filter|box-shadow|backdrop|animation|keyframes/);
    expect(m, "une courbe qui dépasse (valeur > 1) ferait rebondir").not.toMatch(/cubic-bezier\([^)]*,\s*(1\.\d+|[2-9])\s*\)/);
  });
  it("la région fermée est inerte, et le chevron dit son état", () => {
    const tsx = code("src/components/mobile/CarteDepliee.tsx");
    expect(tsx).toMatch(/inert=\{!ouvert\}/);
    expect(tsx).toMatch(/aria-expanded=\{ouvert\} aria-controls=\{idRegion\}/);
    expect(tsx, "l'état du chevron n'est plus écrit en toutes lettres").toMatch(/ouvert \? t\("Replier la carte"\) : t\("Déplier la carte"\)/);
  });
  it("les « ··· » et le chevron sont les mêmes sur les trois pages : 34 px, même colonne", () => {
    expect(bloc(".chevron")).toMatch(/width:\s*34px;\s*height:\s*34px/);
    expect(bloc(".outils")).toMatch(/margin-left:\s*16px/);
    for (const f of ["src/components/OfferCard.tsx", "src/app/fonds/FundCard.tsx"]) {
      const src = code(f);
      expect(src, `${f} n'a plus la colonne d'outils commune`).toMatch(/<Outils>[\s\S]*<LineMenu[^>]*\/>\}\s*<ChevronDeplie ouvert=\{ouvert\} onClick=\{basculer\} idRegion=\{idRegion\} \/>\s*<\/Outils>/);
      expect(src, `${f} redonne à « ··· » sa propre classe : la taille redevient différente d'une page à l'autre`).not.toMatch(/<LineMenu[^>]*className=/);
    }
  });
  it("il n'y a plus de retournement : ni dos 3D, ni icône, ni geste de tiré vers la droite", () => {
    for (const f of ["src/components/OfferCard.tsx", "src/app/fonds/FundCard.tsx"]) {
      const src = lire(f);
      expect(src, `${f} retourne encore sa carte`).not.toMatch(/turnRef|backHead=|back=\{|Retourner la carte|flipBtn/);
    }
  });
  it("aucune information du dos n'est perdue : l'extension porte tout le corps détaillé, l'état compris", () => {
    const oc = code("src/components/OfferCard.tsx");
    expect(oc, "l'extension n'est plus le corps détaillé de la carte").toMatch(/<Extension ouvert=\{ouvert\} idRegion=\{idRegion\}>\s*<div className=\{styles\.dos\}>\{corps\(true\)\}<\/div>/);
    for (const [k, re] of [["l'identité", /<LineIdentity o=\{o\} s=\{s\}/], ["la pastille d'état", /pill \$\{s\.statusClass\}/], ["la grille", /<div className=\{styles\.facts\}/], ["l'ISIN", /<span className=\{styles\.footIsin\}>\{o\.isin\}/], ["la clôture", /<span className=\{styles\.when\}>/], ["le prix d'une action", /<div className=\{styles\.bigAction\}/], ["le chiffre en avant", /<div className=\{`\$\{styles\.big\} /]] as [string, RegExp][]) expect(oc, `le corps de la carte a perdu ${k}`).toMatch(re);
    expect(oc, "le coin (pastille et cloche) n'est plus dans l'extension").toMatch(/data-coach=\{dos \? undefined : "titres-etat"\}[\s\S]*?\{suiviEtat && <Cloche \/>\}/);
    const fc = code("src/app/fonds/FundCard.tsx");
    expect(fc, "l'extension d'un fonds n'est plus son corps détaillé").toMatch(/<Extension ouvert=\{ouvert\} idRegion=\{idRegion\}>\s*<div className=\{propres\.dos\}>\{corps\(true\)\}<\/div>/);
    for (const [k, re] of [["la société de gestion", /\{r\.manager\}/], ["le dépositaire", /\{r\.depositary\}/], ["le 1er janvier", /\{signed\(ytd\)\}/], ["l'origine", /signed\(r\.perfSinceInceptionPct\)/], ["la VL", /\{fmt\(r\.nav\)\}/], ["la pastille", /\{pastille\}/]] as [string, RegExp][]) expect(fc, `le corps d'un fonds a perdu ${k}`).toMatch(re);
  });
  it("trois boutons alignés sous l'extension : l'action de la ligne, favori, la fiche", () => {
    const tsx = code("src/components/mobile/CarteDepliee.tsx");
    expect(tsx).toMatch(/kind === "FONDS" \? "Souscrire ou racheter" : kind === "MARCHE" \? "Passer un ordre" : "Déclarer une intention"/);
    expect(tsx, "le favori a perdu son libellé").toMatch(/<\/svg>\s*\{t\("Favori"\)\}/);
    expect(tsx, "la fiche a perdu son bouton").toMatch(/<Link className=\{`btn \$\{styles\.bouton\}`\} href=\{href\}>\s*\{t\("Voir la fiche"\)\}/);
    expect(tsx, "l'action de la ligne ne mène plus à l'intention").toMatch(/href=\{`\/offres\/\$\{id\}\/intention`\}/);
    expect(bloc(".boutons"), "les boutons ne sont plus sur une seule rangée").toMatch(/grid-auto-flow:\s*column/);
    expect(bloc(".bouton")).toMatch(/min-height:\s*44px/);
    for (const f of ["src/components/OfferCard.tsx", "src/app/fonds/FundCard.tsx"]) expect(code(f), `${f} ne pose plus la rangée sous l'extension`).toMatch(/<BoutonsDeLaCarte /);
  });
  it("un clic sur la carte mène toujours à la fiche : seul le chevron déplie", () => {
    expect(code("src/components/OfferCard.tsx")).toMatch(/<Link href=\{href\} className=\{styles\.cLink\}>/);
    expect(code("src/app/fonds/FundCard.tsx")).toMatch(/<Link href=\{href\} className=\{propres\.cLien\}>/);
  });
});
