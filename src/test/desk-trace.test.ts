import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * TOUT GESTE DU DESK QUI ÉCRIT LAISSE UNE TRACE.
 *
 * C'est la règle de la maison, écrite au CLAUDE.md : « toute écriture métier
 * passe par audit() avec avant / après ». Elle existait, elle était suivie par
 * vingt-six gestes sur trente-quatre, et personne ne tenait les huit autres.
 *
 * CE QUE LA REVUE DES PAGES DU DESK A TROUVÉ, le 26 octobre 2026, et la forme
 * est toujours la même : le MÊME événement tracé par une porte et pas par
 * l'autre. Un ordre qui passe à « servie » était tracé avec son avant et son
 * après par la transition générique, et pas du tout par la page du marché —
 * celle qui écrit pourtant le PRIX SERVI, c'est-à-dire le chiffre qui se
 * conteste. Fermer un compte client, clôturer une ligne cotée, transmettre
 * vingt ordres par bordereau : aucun n'entrait au registre.
 *
 * POURQUOI UN RELEVÉ DE SOURCE ET NON UNE ÉPREUVE PAR GESTE. Trente-quatre
 * gestes, et le risque n'est pas qu'un de ceux-là perde son audit : c'est que
 * le TRENTE-CINQUIÈME naisse sans. Une épreuve par geste ne dit rien du geste
 * qui n'existe pas encore ; un relevé qui parcourt le dossier le voit arriver.
 *
 * ON NE LIT QUE CE QUI S'EXÉCUTE : les commentaires sont retirés d'abord, parce
 * que celui de cette page raconte le défaut qu'on vient de corriger et qu'une
 * épreuve qui lirait la prose se trouverait verte sur son propre récit.
 */
const ROOT = resolve(__dirname, "../app/desk");

/** Les écritures métier : ce qui change l'état du monde pour un client. */
const ECRITURES = [
  "setIntentState",
  "updateIntent",
  "createIntent",
  "updateLigneSondee",
  "createLigneSondee",
  "updateMandat",
  "createMandat",
  "updateTirage",
  "updateStandingOrder",
  "addCash",
  "closePayout",
  "upsertOffer",
  "updateClientFile",
  "createCustodyNotice",
  "upsertReference",
];

const fichiers = (dir: string): string[] =>
  readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? fichiers(p) : p.endsWith(".ts") ? [p] : [];
  });

interface Geste {
  ou: string;
  nom: string;
  corps: string;
  ecrit: string[];
}

const gestesDuDesk = (): Geste[] => {
  const out: Geste[] = [];
  for (const f of fichiers(ROOT)) {
    const src = readFileSync(f, "utf8");
    if (!src.includes('"use server"')) continue;
    const bornes = [...src.matchAll(/export async function (\w+)/g)].map((m) => ({ i: m.index!, nom: m[1] }));
    for (let k = 0; k < bornes.length; k++) {
      const corps = src.slice(bornes[k].i, k + 1 < bornes.length ? bornes[k + 1].i : src.length).replace(/\/\*[\s\S]*?\*\//g, "");
      const ecrit = ECRITURES.filter((e) => corps.includes(`${e}(`));
      if (ecrit.length) out.push({ ou: f.slice(ROOT.length + 1), nom: bornes[k].nom, corps, ecrit });
    }
  }
  return out;
};

describe("la trace des gestes du desk", () => {
  const gestes = gestesDuDesk();

  it("relève bien tous les gestes qui écrivent", () => {
    /* NON VACUITÉ, et elle est la moitié de cette épreuve : un relevé qui ne
       trouve rien passe toutes les lignes du dessous. Le plancher est posé sous
       le compte du jour, pas dessus : il doit tomber le jour où le relevé cesse
       de voir, pas le jour où le desk gagne un geste. */
    expect(gestes.length, "le relevé des gestes du desk ne voit plus rien : les lignes ci-dessous ne mesurent plus rien").toBeGreaterThanOrEqual(30);
    expect(gestes.map((g) => `${g.ou}/${g.nom}`), "l'exécution d'un ordre a quitté le relevé").toContain("marche/actions.ts/executeOrderAction");
  });

  /**
   * CE QUE CE RELEVÉ NE PROUVE PAS, et il vaut mieux l'écrire que le laisser
   * croire : il voit un geste qui n'a AUCUNE trace, pas une BRANCHE qui n'en a
   * pas. Vérifié à l'envers — désarmer l'une des deux traces de la clôture
   * laisse l'autre, et le relevé reste vert.
   *
   * ET COMPTER SERAIT FAUX. La trace est par DÉCISION, pas par écriture : clore
   * une ligne sondée écrit la question ET ses réponses pour une seule décision,
   * payer un versement écrit l'espèce ET ferme la demande. Neuf gestes écrivent
   * plus de fois qu'ils ne tracent, et ils ont raison. Un cliquet qui exigerait
   * autant de traces que d'écritures ferait écrire du bruit pour se taire.
   *
   * LES BRANCHES QUI COMPTENT SE TIENNENT DONC UNE PAR UNE, et celle-ci est la
   * plus lourde : fermer le compte d'un client se fait en deux pas — l'ordre
   * signé, puis le dépositaire qui confirme — et chacun change le statut du
   * dossier. Deux pas, deux traces.
   */
  it("trace les deux pas d'une clôture de compte, et pas seulement le premier", () => {
    const g = gestes.find((x) => x.nom === "closureStepAction");
    expect(g, "la clôture d'un compte a quitté le relevé : la ligne ci-dessous ne mesure rien").toBeTruthy();
    expect([...g!.corps.matchAll(/await audit\(/g)].length, "un des deux pas de la clôture n'entre plus au registre").toBe(2);
  });

  it("les fait tous passer par audit()", () => {
    /* ON CHERCHE « await audit( », ET NON « audit( ». Vérifié à l'envers le
       26 octobre 2026 : « void 0 && audit(...) » désarme l'appel et laisse le
       mot en place, et le relevé restait vert sur deux gestes désarmés. C'est
       la leçon du « // pricePct » commenté, à une syntaxe près — la présence du
       mot n'est pas la présence de l'appel. */
    const sans = gestes.filter((g) => !/await audit\(/.test(g.corps)).map((g) => `${g.ou} › ${g.nom}  (${g.ecrit.join(", ")})`);
    expect(sans, `${sans.length} geste(s) du desk écrivent sans laisser de trace :\n  ${sans.join("\n  ")}`).toEqual([]);
  });

  /**
   * ET UNE ÉCRITURE D'OFFRE PASSE SA VERSION ATTENDUE.
   *
   * L'autre règle du CLAUDE.md, et son défaut n'est pas la mémoire de la maison
   * mais la donnée elle-même : ces gestes réécrivent l'offre ENTIÈRE lue plus
   * tôt. Sans version attendue, celui qui clôture une ligne remet en place le
   * cours tel qu'il était à sa lecture, et efface la cotation qu'un collègue
   * vient de saisir — sans un mot, et sans que rien ne tombe.
   *
   * « version + 1 » À LA MAIN NE COMPTE PAS : c'est ce que faisait le retrait
   * d'une ligne, et cela a l'air prudent. Le garde n'est pas d'incrémenter, il
   * est de REFUSER quand le nombre rangé a bougé.
   */
  it("fait passer la version attendue à toute écriture d'offre", () => {
    const offres = gestes.filter((g) => g.ecrit.includes("upsertOffer"));
    expect(offres.length, "plus aucun geste du desk n'écrit d'offre : la ligne ci-dessous ne mesure rien").toBeGreaterThanOrEqual(10);
    const sans = offres.filter((g) => !g.corps.includes("expectedVersion")).map((g) => `${g.ou} › ${g.nom}`);
    expect(sans, `${sans.length} écriture(s) d'offre sans version attendue — elles écraseront une modification concurrente en silence :\n  ${sans.join("\n  ")}`).toEqual([]);
  });
});
