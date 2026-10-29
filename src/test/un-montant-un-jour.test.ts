import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { nextRun, premierVersement, type StandingOrder } from "@/lib/domain/standing";

const ROOT = path.join(__dirname, "../..");
const code = (p: string) =>
  fs
    .readFileSync(path.join(ROOT, p), "utf8")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const TSX = "src/components/Standing.tsx";

/**
 * UN MONTANT, UN JOUR, ET CE QUE ÇA FAIT — RELEVÉ LE 29 OCTOBRE 2026.
 *
 * Le versement programmé est l'engagement le plus long du guichet : on le
 * signe une fois et il court jusqu'à ce qu'on l'arrête. Mesuré à l'écran, son
 * formulaire posait quatre questions justes et ne répondait à aucune.
 *
 *   LE MONTANT s'ouvrait sur « 100000 » — six chiffres collés, dans une case
 *   de douze pixels. C'est le moment précis où l'on compte les zéros, et c'est
 *   le défaut que « lib/ui/grouped » explique sur vingt lignes avant de le
 *   corriger partout ailleurs : le champ ne groupait qu'à la frappe, donc
 *   jamais sur la valeur qu'il affichait d'entrée.
 *
 *   LE JOUR était un « input type=number » : sur un téléphone, le clavier
 *   numérique ou deux flèches de huit pixels, pour une décision qui vaut un
 *   geste du pouce.
 *
 *   SOUS LES DEUX, DES BORNES ET NON DES CONSÉQUENCES : « minimum 100 000 »,
 *   « du 1 au 28 ». Ni ce qu'on aura mis de côté dans un an, ni quand le
 *   premier versement tombe.
 */
describe("un montant, un jour", () => {
  /* LA DATE DU PREMIER VERSEMENT, ET SON SEUL CALCUL. « nextRun » la posait
     déjà ; une copie dans l'écran aurait divergé un 31 décembre. */
  it("place le premier versement ce mois-ci s'il est devant, le mois suivant sinon", () => {
    expect(premierVersement(17, "2026-10-29"), "le 17 est passé, on reste en octobre").toBe("2026-11-17");
    expect(premierVersement(31 - 1, "2026-10-29"), "le 30 est devant, on part en novembre").toBe("2026-10-30");
    expect(premierVersement(29, "2026-10-29"), "le jour même n'est pas le premier versement").toBe("2026-10-29");
    // Le passage d'année, qui est l'endroit où une copie se trompe.
    expect(premierVersement(5, "2026-12-20"), "décembre ne roule pas sur janvier").toBe("2027-01-05");
  });

  /* LA RÈGLE PLUTÔT QUE SA COPIE : « nextRun » doit la lire, sans quoi les
     deux dates affichées au client finiraient par ne plus se répondre. */
  it("laisse « nextRun » lire la même règle", () => {
    const src = code("src/lib/domain/standing.ts");
    expect(src, "« nextRun » s'est réécrit le calcul du premier versement").toMatch(/premierVersement\(s\.dayOfMonth, d\)/);
    // Et les deux rendent bien la même date sur une instruction neuve.
    const s = { state: "active", dayOfMonth: 17, startsOn: "2026-10-01" } as unknown as StandingOrder;
    expect(nextRun(s, "2026-10-29")).toBe(premierVersement(17, "2026-10-29"));
  });

  /* LE MONTANT EST GROUPÉ DÈS L'OUVERTURE, et non seulement à la frappe. */
  it("ouvre le montant sur un nombre qu'on peut compter", () => {
    const src = code(TSX);
    expect(src, "le montant s'ouvre de nouveau sur des chiffres collés").toMatch(/useState\(minimum \? groupDigits\(String\(minimum\)\) : ""\)/);
  });

  /* LE JOUR EST UNE GRILLE, et le montant porte le degré de ce qu'on écrit de
     sa main — le même que dans le passage d'ordre, puisque c'est la même main. */
  it("donne le jour au pouce et le chiffre à la main", () => {
    const src = code(TSX);
    expect(src, "le jour est redevenu un champ numérique").not.toMatch(/name="dayOfMonth" type="number"/);
    expect(src, "la grille des vingt-huit jours a disparu").toMatch(/length: 28/);
    expect(src, "le montant a perdu la carte du chiffre").toMatch(/styles\.carteDuChiffre/);
    const css = fs.readFileSync(path.join(ROOT, "src/components/Standing.module.css"), "utf8");
    expect(css, "le chiffre qu'on tape n'est plus au neuvième degré").toMatch(/\.chiffreTape input \{[^}]*--t-9/);
    expect(css, "les cases du jour sont retombées sous la cible du pouce").toMatch(/\.jour,\s*\n\.jourOn \{\s*\n\s*min-height: 44px/);
  });

  /* LES DEUX CONSÉQUENCES, ET LA BORNE QUI NE RESTE QUE TANT QU'IL N'Y A RIEN
     À DIRE. Une borne affichée à la place d'une conséquence est une réponse à
     une question que personne n'a posée. */
  it("répond aux deux questions au lieu d'en rappeler les règles", () => {
    const src = code(TSX);
    expect(src, "ce que le versement fait sur douze mois a disparu").toMatch(/\{n\} FCFA sur douze mois/);
    expect(src, "la date du premier versement a disparu").toMatch(/Premier versement le \{d\}/);
    // Le minimum ne s'affiche plus QUE tant que rien n'est tapé.
    expect(src, "le minimum a repris la place de la conséquence").toMatch(/verse > 0 \?[\s\S]{0,600}plancher > 0 && <small className="muted">/);
  });

  /**
   * DEUX ÉCRANS, ET LE SECOND NE DEMANDE RIEN.
   *
   * ÉCARTÉ LE 29 OCTOBRE 2026 PUIS DEMANDÉ. J'avais mis les conséquences sous
   * la main et gardé un seul écran, en jugeant qu'elles suffisaient au moment
   * de décider. Elles suffisent à DÉCIDER ; elles ne suffisent pas à SIGNER :
   * un versement programmé porte six décisions dont trois se prennent en bas
   * de l'écran — la date de fin, ce qu'on fait si un mois bloque, comment
   * l'argent arrive — et au moment d'appuyer les trois premières sont sorties
   * du champ de vision.
   */
  it("redit les six décisions avant de signer, sans en demander une septième", () => {
    const src = code(TSX);
    expect(src, "le formulaire est redevenu d'un seul tenant").toMatch(/data-at=\{etape\}/);
    const deb = src.indexOf('data-step="2"');
    expect(deb, "le récapitulatif a disparu").toBeGreaterThan(0);
    const recap = src.slice(deb, src.indexOf("styles.pied"));
    for (const dit of ["Vers quel fonds", "Chaque mois", "Jusqu'au", "Si un mois l'exécution est impossible", "Comment l'argent arrivera", "Premier versement le \\{d\\}"]) {
      expect(recap, `le récapitulatif ne redit plus « ${dit} »`).toMatch(new RegExp(dit));
    }
    /* IL NE DEMANDE RIEN DE NEUF : c'est sa valeur. Un écran de confirmation
       qui pose une question de plus n'est pas une confirmation, c'est une
       septième décision glissée au moment où l'on n'attend plus rien. */
    expect(recap, "le récapitulatif pose une question de plus").not.toMatch(/<input|<textarea|<Select/);
  });

  /* LES CHAMPS SONT CACHÉS, PAS DÉMONTÉS : le formulaire part entier, et
     « Corriger » ne perd rien de ce qu'on a tapé. */
  it("cache les champs au lieu de les démonter", () => {
    const css = fs.readFileSync(path.join(ROOT, "src/components/Standing.module.css"), "utf8");
    expect(css, "les étapes ne se cachent plus par la feuille").toMatch(/\.form\[data-at="2"\] \[data-step="1"\] \{\s*\n?\s*display: none/);
    expect(code(TSX), "le retour en arrière a disparu").toMatch(/onClick=\{\(\) => setEtape\(1\)\}/);
  });

  /* ON NE PASSE PAS AU RÉCAPITULATIF SUR UN FORMULAIRE INCOMPLET : sans
     montant, il dirait « 0 FCFA sur douze mois », et un récapitulatif qui ment
     est pire que pas de récapitulatif. */
  it("ne laisse pas passer un montant sous le minimum", () => {
    expect(code(TSX), "le passage au récapitulatif ne vérifie plus le montant").toMatch(/disabled=\{!\(verse > 0\) \|\| verse < plancher\}/);
  });

  /* LE JOUR D'AUJOURD'HUI VIENT DU SERVEUR. « new Date() » pendant un rendu
     donne une valeur au serveur et une autre au navigateur : c'est une
     discordance d'hydratation la nuit du passage à minuit, et la maison s'est
     déjà fait prendre là-dessus sur la fenêtre d'un arbitrage. */
  it("ne lit pas l'horloge pendant le rendu", () => {
    const src = code(TSX);
    expect(src, "le formulaire lit l'horloge pendant son rendu").not.toMatch(/new Date\(\)/);
    expect(src, "le jour d'aujourd'hui ne vient plus du serveur").toMatch(/aujourdhui/);
    for (const page of ["src/app/offres/[id]/intention/page.tsx", "src/app/moi/epargne/page.tsx"]) {
      expect(code(page), `${page} ne passe pas le jour au formulaire`).toMatch(/aujourdhui=\{/);
    }
  });
});
