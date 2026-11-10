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
    expect(bloc(".chevron"), "le chevron est revenu dans un cercle").toMatch(/border:\s*0;[\s\S]*background:\s*none/);
    expect(m, "les « ··· » de la carte sont revenus dans un cercle").toMatch(/\.outils \.points \{[^}]*border:\s*0;[^}]*background:\s*none/);
    expect(bloc(".outils")).toMatch(/margin-left:\s*16px/);
    for (const f of ["src/components/OfferCard.tsx", "src/app/fonds/FundCard.tsx"]) {
      const src = code(f);
      expect(src, `${f} n'a plus la colonne d'outils commune`).toMatch(/<Outils>[\s\S]*<LineMenu[^>]*\/>\}\s*\{!sansExtension && <ChevronDeplie ouvert=\{ouvert\} onClick=\{basculer\} idRegion=\{idRegion\} \/>\}\s*<\/Outils>/);
      expect(src, `${f} redonne à « ··· » une classe qui n'est pas la commune : la taille redevient différente d'une page à l'autre`).toMatch(/<LineMenu[^>]*className=\{classePoints\}/);
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
    expect(tsx).toMatch(/kind === "FONDS" \? "Souscrire" : kind === "MARCHE" \? "Passer un ordre" : "Déclarer une intention"/);
    expect(tsx, "le favori (ou l'alerte d'une adjudication) a perdu son libellé").toMatch(/\{cadence === "quotidien" \? t\("Alerte"\) : t\("Favori"\)\}/);
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

  it("une carte dépliée se replie quand elle sort de l'écran, sans faire sauter la page", () => {
    const tsx = code("src/components/mobile/CarteDepliee.tsx");
    expect(tsx, "plus d'observateur de sortie d'écran").toMatch(/new IntersectionObserver\(/);
    expect(tsx, "la carte ne se replie plus à la sortie").toMatch(/if \(e\.isIntersecting\) return;[\s\S]*replier\(\)/);
    expect(tsx, "sortie par le haut : plus de correction du défilement").toMatch(/window\.scrollBy\(0, -perdu\)/);
    for (const f of ["src/components/OfferCard.tsx", "src/app/fonds/FundCard.tsx"]) expect(code(f), `${f} ne donne plus « replier » à sa carte`).toMatch(/<Depliable ouvert=\{ouvert\} replier=\{replier\}>/);
  });
  it("une seule carte est ouverte à la fois, sur toutes les pages : en ouvrir une referme l'autre", () => {
    const tsx = code("src/components/mobile/CarteDepliee.tsx");
    expect(tsx, "l'état d'ouverture n'est plus partagé entre les cartes").toMatch(/let ouverteId: string \| null = null;/);
    expect(tsx).toMatch(/useSyncExternalStore\(abonner, \(\) => ouverteId === id/);
    expect(tsx, "ouvrir une carte ne referme plus celle qui l'était").toMatch(/basculer: \(\) => poser\(ouverteId === id \? null : id\)/);
    expect(tsx, "une carte garde son propre état local d'ouverture").not.toMatch(/const \[ouvert, setOuvert\] = useState/);
  });
  it("une séance close n'a plus de bouton : ni « Tous les résultats » ni « Voir la fiche »", () => {
    const tsx = code("src/components/mobile/CarteDepliee.tsx");
    expect(tsx, "les boutons d'une séance close sont revenus").not.toMatch(/BoutonsDeSeanceClose|Tous les résultats/);
  });
});
