import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { RACINE } from "./racine";
import { allowedIntents, FIRM_TYPES } from "@/lib/domain/intent";
import { summarize } from "@/lib/domain/summary";
import { displayStatus } from "@/lib/domain/status";
import { loadRegistry } from "@/lib/reference";
import { SEED_OFFERS } from "@/data/seed";
import type { DisplayStatus, Offer, OfferKind } from "@/lib/domain/types";

/**
 * CE QUE LA FEUILLE D'ORDRE PROPOSE, ET CE QU'ELLE NE PROPOSE PLUS.
 *
 * « Information » était un troisième onglet à côté d'Acheter et de Vendre.
 * Retiré le 28 octobre 2026 : la feuille sert à passer un ordre, et une
 * question n'en est pas un. Les trois alignés mettaient sur le même rang deux
 * gestes qui n'engagent pas la même chose.
 *
 * LA RÈGLE TIENT EN UNE LIGNE, et c'est elle qu'on tient ici : « Information »
 * paraît là où AUCUN ordre n'est possible — une ligne close, une ligne à
 * venir, un fonds sur demande — et nulle part ailleurs. Là, elle est la seule
 * porte, et une porte qui se referme sur un compte qui ne peut rien commander
 * serait pire que le troisième onglet.
 */
const KINDS: OfferKind[] = ["OTA", "BTA", "ACTIONS", "APE", "RACHAT", "MARCHE", "FONDS"];
const ETATS: DisplayStatus[] = ["quoted", "on_request", "upcoming", "open", "closing", "closed", "results", "live", "matured"];
const offre = (kind: OfferKind): Offer => ({ id: `o-${kind}`, kind, title: kind, status: "published" }) as Offer;

/** Les états où plus rien ne se commande. */
const PASSES: DisplayStatus[] = ["closed", "results", "live", "matured"];

/**
 * LES LIGNES DU JEU D'ESSAI, PLUS CELLES QU'IL N'A PAS.
 *
 * Il ne porte ni introduction en bourse ni rachat OUVERTS : rien qu'en l'état
 * clos. Un relevé qui s'y limiterait ne verrait jamais les boutons d'une ligne
 * ouverte de ces deux genres. On clone donc une ligne de chaque genre et on
 * lui rend une échéance à venir — le reste de la ligne est vrai, seule sa date
 * change.
 */
function corpus(): Offer[] {
  const demain = new Date(Date.now() + 20 * 864e5).toISOString();
  const ouvertes = KINDS.map((kind) => {
    /* L'APE n'est dans le jeu d'essai sous AUCUN état : elle emprunte la forme
       d'une obligation du Trésor, qui est la sienne — un emprunt obligataire
       avec une fenêtre, un nominal et une échéance. */
    const modele = SEED_OFFERS.find((o) => o.kind === kind) ?? SEED_OFFERS.find((o) => o.kind === "OTA");
    return modele ? ({ ...modele, kind, id: `${modele.id}-${kind}-ouverte`, status: "published", deadlineAt: demain, resultLine: undefined, servedPricePct: undefined } as Offer) : undefined;
  }).filter(Boolean) as Offer[];
  return [...SEED_OFFERS, ...ouvertes];
}

describe("les onglets de la feuille d'ordre", () => {
  beforeAll(async () => {
    await loadRegistry();
  });

  it("ne propose « Information » que là où aucun ordre n'est possible", () => {
    const fautifs: string[] = [];
    let avecOrdre = 0;
    let sansOrdre = 0;
    for (const kind of KINDS) {
      for (const etat of ETATS) {
        const types = allowedIntents(offre(kind), etat);
        const ordre = types.some((t) => FIRM_TYPES.includes(t));
        if (ordre) avecOrdre++;
        else sansOrdre++;
        if (types.includes("info") !== !ordre) fautifs.push(`${kind}/${etat} → ${types.join(", ")}`);
      }
    }
    expect(fautifs, `« Information » doit paraître si et seulement si rien ne peut être commandé :\n${fautifs.join("\n")}`).toEqual([]);
    /* NON VACUITÉ, DANS LES DEUX SENS : si aucune combinaison n'ouvrait un
       ordre, la règle serait tenue par un tableau vide ; si aucune ne le
       fermait, elle le serait par « info » partout. */
    expect(avecOrdre, "aucune combinaison n'ouvre d'ordre : le relevé ne mesure rien").toBeGreaterThan(3);
    expect(sansOrdre, "aucune combinaison n'est fermée : le relevé ne mesure rien").toBeGreaterThan(3);
  });

  it("laisse toujours quelque chose à faire, sur n'importe quelle ligne", () => {
    /* Une liste vide serait une feuille sans aucun onglet : le client ouvre
       la feuille et n'y trouve rien. C'est ce qu'un retrait trop large de
       « Information » produirait sur les lignes closes. */
    for (const kind of KINDS) for (const etat of ETATS) expect(allowedIntents(offre(kind), etat).length, `${kind}/${etat}`).toBeGreaterThan(0);
  });

  it("ne promet depuis une carte aucune intention que la ligne n'autorise pas", () => {
    /* LA CLASSE DE DÉFAUT QUE CECI ATTRAPE : un bouton de carte porte une
       intention en dur — « Question → info » — et la feuille, elle, lit les
       intentions autorisées. Le jour où les deux divergent, le bouton ouvre la
       feuille sur un AUTRE onglet que celui qu'il annonçait, sans que rien
       n'échoue. C'est arrivé le 28 octobre : deux cartes promettaient encore
       « Question » sur une ligne ouverte, où l'intention venait de disparaître.
       Mesuré sur les lignes du jeu d'essai, qui couvrent les sept genres. */
    const fautifs: string[] = [];
    for (const o of corpus()) {
      const types = allowedIntents(o, displayStatus(o));
      const s = summarize(o, new Date());
      for (const [ou, action] of [["principal", s.primary], ["second", s.secondary]] as const) {
        if (action && !types.includes(action.intent)) fautifs.push(`${o.id} (${o.kind}/${displayStatus(o)}) · bouton ${ou} « ${action.label} » → ${action.intent}, non autorisé : ${types.join(", ")}`);
      }
    }
    expect(fautifs, `ces boutons mènent à un onglet qui n'existe pas :\n${fautifs.join("\n")}`).toEqual([]);
    // Non vacuité : le corpus porte bien des boutons à vérifier.
    expect(corpus().filter((o) => summarize(o, new Date()).primary).length, "aucune carte ne porte d'action : le relevé ne mesure rien").toBeGreaterThan(5);
  });

  it("et le corpus de ce relevé voit chaque genre de ligne OUVERT", () => {
    /* CE QUI A FAILLI PASSER, et c'est la leçon du jour : le jeu d'essai ne
       porte aucune introduction en bourse ni aucun rachat OUVERTS — seulement
       clos ou dépouillés. Le relevé d'à côté était donc aveugle sur la branche
       même qu'on venait de changer : il a laissé passer, sans rien dire, un
       bouton « Question » remis sur une ligne ouverte.
       Un corpus qui ne couvre pas le cas ne prouve rien, et il faut que ça se
       voie ici plutôt que dans six mois. */
    const ouverts = new Set(corpus().filter((o) => !PASSES.includes(displayStatus(o))).map((o) => o.kind));
    expect([...KINDS].filter((k) => !ouverts.has(k)), "ces genres ne sont vus qu'à l'état clos : le relevé des boutons ne les mesure pas").toEqual([]);
  });
});

/**
 * CE QUE LA FEUILLE D'ORDRE MONTRE AVANT LE PREMIER CHAMP.
 *
 * Les quatre chiffres de la ligne — rendement, dividende, cours, nominal —
 * ouvraient la feuille, au-dessus de tout. Retirés le 28 octobre 2026 à la
 * demande de l'écran.
 *
 * LA MESURE QUI TRANCHE, prise sur un téléphone de 844 px : avec eux, le
 * PREMIER CHAMP À REMPLIR commençait à 700 px du haut — sous la barre
 * d'onglets, donc hors de vue au chargement. Sans eux, à 519. Le client sort
 * de la fiche, où il vient de les lire ; le bouton « La fiche » est à deux
 * centimètres au-dessus de sa tête ; et le formulaire porte le cours dans son
 * champ et le total qu'il calcule.
 *
 * LE TAMPON RESTE, et ce n'est pas un oubli : il dit de QUAND date le prix,
 * et c'est la seule chose qu'on ne retrouve pas ailleurs sans repartir.
 */
describe("la tête de la feuille d'ordre", () => {
  const page = () => readFileSync(`${RACINE}/src/app/offres/[id]/intention/page.tsx`, "utf8").replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "");

  it("ne remet pas les quatre chiffres au-dessus du premier champ", () => {
    expect(page(), "les quatre chiffres sont revenus en tête de la feuille d'ordre").not.toMatch(/<Kpis\b/);
  });

  it("garde le tampon, qui dit de quand date le prix", () => {
    /* Non vacuité : sans cette ligne, une feuille vidée de tout passerait
       l'épreuve ci-dessus. */
    expect(page(), "le tampon a disparu avec les chiffres : plus rien ne date le prix").toMatch(/className=\{`stamp/);
  });
});
