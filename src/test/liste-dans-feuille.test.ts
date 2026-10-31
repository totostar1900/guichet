import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * UNE LISTE DÉROULANTE DANS UNE FEUILLE : DEUX COMPOSANTS QUI NE SE CONNAISSENT
 * PAS, ET TROIS FAÇONS DE SE NUIRE.
 *
 * Le 26 octobre 2026, le gabarit du sondage a été le PREMIER ENDROIT de la
 * maison où un « Select » vit dans une « Sheet ». Les deux étaient justes
 * séparément, et faux ensemble — c'est la forme habituelle des défauts qui
 * coûtent cher :
 *
 *   LA LISTE S'OUVRAIT DERRIÈRE. Portée au body pour échapper aux rogneurs, elle
 *   échappait aussi à ce qu'elle devait couvrir : 40 contre 61. Le client touche
 *   « Le Trésor », rien ne paraît, et il conclut que le formulaire est cassé.
 *
 *   « ÉCHAP » FERMAIT LA FEUILLE ENTIÈRE. Les deux écoutaient le document, et la
 *   feuille gagnait : écarter une liste emportait six champs déjà remplis.
 *
 * AUCUN TYPECHECK, AUCUN LINT, AUCUNE ÉPREUVE D'UNITÉ NE POUVAIT LE DIRE : il
 * fallait ouvrir la page. Ce qui reste écrit ici est ce qu'on a appris, pour que
 * la prochaine feuille n'ait pas à le réapprendre.
 */
const ROOT = resolve(__dirname, "../..");
const lire = (f: string) => readFileSync(join(ROOT, f), "utf8");

const niveau = (f: string, classe: string): number => {
  const css = lire(f);
  const i = css.indexOf(`.${classe} {`);
  expect(i, `« .${classe} » a quitté ${f} : l'épreuve ne mesure plus rien`).toBeGreaterThan(-1);
  const m = /z-index:\s*(\d+)/.exec(css.slice(i, css.indexOf("}", i)));
  expect(m, `« .${classe} » n'a plus de niveau : il tombera sous tout le reste`).toBeTruthy();
  return Number(m![1]);
};

describe("une liste déroulante ouverte dans une feuille", () => {
  it("passe au-dessus de la feuille, et sous la porte de consentement", () => {
    const liste = niveau("src/components/ui/ui.module.css", "selMenu");
    const feuille = niveau("src/components/mobile/Sheet.module.css", "sheet");
    const porte = niveau("src/components/ConsentGate.module.css", "layer");
    expect(liste, `la liste (${liste}) repasse sous la feuille (${feuille}) : elle s'ouvrira dans le vide`).toBeGreaterThan(feuille);
    /* La porte de consentement doit tout couvrir : une liste par-dessus
       laisserait choisir dans une page qu'on n'a pas encore le droit de lire. */
    expect(liste, `la liste (${liste}) passe au-dessus de la porte de consentement (${porte})`).toBeLessThan(porte);
  });

  it("garde « Échap » pour elle, et la feuille le lui laisse", () => {
    /* LA CHAÎNE A DEUX MAILLONS, et chacun part en silence : la liste pose le
       signe, la feuille le lit. L'un sans l'autre, « Échap » emporte un
       formulaire rempli — et personne ne s'en plaint, on retape. */
    expect(lire("src/components/ui/Select.tsx"), "la liste ne se signale plus quand elle est ouverte").toMatch(/data-liste-ouverte=""/);
    const feuille = lire("src/components/mobile/Sheet.tsx");
    expect(feuille, "la feuille ne regarde plus si une liste est ouverte avant de se fermer").toMatch(/document\.querySelector\("\[data-liste-ouverte\]"\)/);
    /* NON VACUITÉ : c'est bien la touche Échap qui est en cause, et la feuille
       se ferme toujours quand aucune liste n'est ouverte. */
    const debutOnKey = feuille.indexOf("const onKey");
    const bloc = feuille.slice(debutOnKey, feuille.indexOf("document.addEventListener", debutOnKey));
    expect(bloc, "le garde ne tient plus sur la touche Échap").toMatch(/e\.key !== "Escape"/);
    expect(bloc, "la feuille ne se ferme plus du tout sur Échap").toMatch(/onClose\(\)/);
  });
});
