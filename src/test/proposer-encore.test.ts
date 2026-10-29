import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.join(__dirname, "../..");
const lire = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");
/* Le code, pas ce qu'on en dit : ces épreuves cherchent des tournures que le
   fichier cite justement dans ses commentaires, pour expliquer pourquoi elles
   sont parties. */
const code = (p: string) =>
  lire(p)
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const F = "src/app/sondage/Formulaires.tsx";

/**
 * CHAQUE COMPOSANT RÉPOND POUR LUI, ET C'EST UNE LEÇON PAYÉE.
 *
 * La première écriture de cette épreuve cherchait ses tournures dans le
 * FICHIER entier. Vérification inverse faite : en remettant le défaut dans
 * « ProposerMaLigne » seul, elle restait verte — parce que « Repondre »,
 * corrigé de la même façon, portait les mêmes mots quelques lignes plus bas.
 * Un composant couvrait la faute de l'autre, et l'épreuve aurait laissé
 * passer exactement la régression qu'elle existe pour attraper.
 *
 * Les deux portent le même geste et ont porté le même défaut : il faut donc
 * les interroger séparément.
 */
const DEUX = ["ProposerMaLigne", "Repondre"] as const;

/** Le corps d'un composant exporté, jusqu'au suivant. */
function corps(nom: string): string {
  const src = code(F);
  const debut = src.indexOf(`export function ${nom}`);
  if (debut < 0) return "";
  const suite = [...src.matchAll(/export function (\w+)/g)].map((m) => m.index ?? -1).filter((i) => i > debut);
  return src.slice(debut, suite.length ? suite[0] : undefined);
}

/**
 * PROPOSER UNE LIGNE N'EMPÊCHE PAS D'EN PROPOSER UNE SECONDE.
 *
 * SIGNALÉ LE 29 OCTOBRE 2026 : « le bouton proposer votre ligne disparaît une
 * fois la ligne validée ». Le composant rendait l'accusé de réception À LA
 * PLACE de son déclencheur, et il fallait recharger la page pour retrouver le
 * bouton. Or proposer plusieurs lignes est le cas normal : on dit ce qu'on
 * prendrait sur le 5 ans, puis sur le 7 ans.
 *
 * ET LE CORRECTIF ÉVIDENT N'AURAIT PAS SUFFI, ce qui est la vraie raison de
 * cette épreuve. Rendre le bouton en plus de l'accusé l'aurait rendu INERTE :
 * la feuille s'ouvrait sur « ouvert && !state.ok », et « state.ok » reste vrai
 * pour toujours. Un bouton présent qui ne fait rien est pire que pas de
 * bouton — personne ne le signale, parce qu'on croit avoir mal cliqué.
 *
 * LES DEUX MOITIÉS SONT DONC GARDÉES SÉPARÉMENT, et c'est volontaire : une
 * épreuve qui ne vérifierait que la présence du bouton passerait au vert le
 * jour où il cesse d'ouvrir quoi que ce soit.
 */
describe("une ligne envoyée ne ferme pas la porte aux suivantes", () => {
  it("trouve bien les deux composants à éprouver", () => {
    /* Sans cela, un renommage viderait l'épreuve en silence : zéro corps,
       zéro tournure cherchée, zéro faute trouvée. */
    for (const nom of DEUX) expect(corps(nom).length, `« ${nom} » est introuvable : l'épreuve ne garde plus rien`).toBeGreaterThan(400);
  });

  it.each(DEUX)("%s ne rend plus l'accusé à la place de son déclencheur", (nom) => {
    /* La tournure exacte qui causait la disparition : un retour anticipé sur
       le succès, avant que le déclencheur soit rendu. */
    expect(corps(nom), `${nom} rend de nouveau l'accusé à la place du déclencheur : le bouton disparaît après un envoi`).not.toMatch(/if\s*\(\s*state\?\.ok\s*\)\s*\n?\s*return/);
  });

  it.each(DEUX)("%s distingue un accusé frais d'un accusé déjà lu", (nom) => {
    const src = corps(nom);
    /* NON VACUITÉ : « accuseFrais » doit vraiment se comparer à ce qui a été
       lu, et non valoir « state.ok » sous un autre nom — c'est précisément le
       raccourci qui rendrait le bouton inerte. */
    expect(src, `${nom} ne compare pas la référence reçue à celle qui a été lue`).toMatch(/refRecue\s*!==\s*refLue/);
    expect(src, `${nom} ne marque plus l'accusé comme lu en rouvrant : le geste resterait condamné`).toMatch(/setRefLue\(refRecue\)/);
    expect(src, `${nom} laisse « state.ok » condamner son ouverture`).not.toMatch(/(?:open=\{ouvert && |!ouvert \|\| )!?state\?\.ok/);
  });

  it("propose explicitement une AUTRE ligne après un envoi", () => {
    /* Le libellé compte autant que le bouton : « Proposer votre propre
       ligne » juste après en avoir proposé une se lit comme un écran qui
       n'a pas compris. */
    expect(corps("ProposerMaLigne"), "le déclencheur ne propose plus d'autre ligne après un envoi").toMatch(/Proposer une autre ligne/);
    expect(corps("ProposerMaLigne"), "l'accusé ne se lit plus à côté du bouton").toMatch(/styles\.recu/);
  });

  it("n'ouvre pas la feuille par un effet, que cette version du lint refuse", () => {
    /* La maison a déjà payé cette facture : un « useEffect » qui appelle
       « setState » est exactement ce que le lint de cette version refuse, et
       le correctif devait tenir sans lui. */
    const src = code(F);
    const effets = src.match(/useEffect\(/g) ?? [];
    expect(effets.length, "un effet est apparu dans ce fichier : la réouverture doit se dériver, pas s'orchestrer").toBe(0);
  });
});
