import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { ROBOTS } from "@/lib/domain/robots";
import { CATALOGUE } from "@/lib/domain/services";
import { SEED_SONDAGES } from "@/data/seed";

/**
 * LE SONDAGE TIENT À QUATRE CHOSES QUI NE SE VOIENT PAS L'UNE L'AUTRE.
 *
 *   1. LE TYPE, dans « domain/types », et la TABLE, dans une migration. Une
 *      colonne absente de la base rend « undefined » à la lecture et perd
 *      l'écriture en silence : l'attente paraît à l'écran et la base est vide.
 *   2. LA PORTE. La tuile « Sondage » menait au calendrier — c'est la demande
 *      du dirigeant, et c'est le genre de lien qui revient tout seul quand
 *      quelqu'un « range » un href.
 *   3. LE ROBOT. Sans lui, la date d'une attente est un chiffre sur un
 *      formulaire : rien ne l'éteint, et le sondage grossit tout seul jusqu'à
 *      ce que le desk porte au Trésor des demandes de l'été.
 *   4. LES CONTRAINTES DE LA BASE. Trois chemins écrivent dans cette table —
 *      la page du client, la page du desk, le robot — et une règle tenue par
 *      un seul n'est pas tenue.
 *
 * Chacune peut partir seule, et son départ est muet.
 */
const ROOT = resolve(__dirname, "../..");
const lire = (f: string) => readFileSync(join(ROOT, f), "utf8");
const sql = () =>
  readdirSync(join(ROOT, "supabase/migrations"))
    .filter((f) => f.endsWith(".sql"))
    .map((f) => lire(`supabase/migrations/${f}`))
    .join("\n")
    /* Les commentaires sont retirés AVANT de chercher : « -- » devant un
       « create table » laisse ses colonnes lisibles aux lignes suivantes, et
       l'épreuve resterait verte sur une table désarmée. Relevé le 26 octobre
       2026 en vérifiant à l'envers le cliquet de l'arbitrage. */
    .replace(/^\s*--.*$/gm, "");

describe("le modèle du sondage", () => {
  it("vit dans le type ET dans une migration", () => {
    const types = lire("src/lib/domain/types.ts");
    expect(types, "« LigneSondee » a quitté le modèle").toMatch(/export interface LigneSondee \{/);
    expect(types, "le formulaire de création a quitté le modèle").toMatch(/export interface NewLigneSondee \{/);
    expect(sql(), "aucune migration ne crée la table du sondage").toMatch(/create table if not exists survey_lines/);
    /* Les colonnes que les trois écrans lisent : une absente se lit
       « undefined » sans que rien ne tombe. */
    for (const col of ["origine", "reponse_a", "instrument", "country", "tenor", "rate", "price_pct", "montant", "seance_le", "dans_jours", "state"]) {
      expect(sql(), `la colonne « ${col} » manque à la table`).toMatch(new RegExp(`\\b${col}\\b`));
    }
  });

  /**
   * LES QUATRE RÈGLES QUE LA BASE TIENT, et aucune n'est décorative.
   *
   * Un prix sur un bon porterait au desk un chiffre qui n'existe pas sur ce
   * compartiment. Une date ET un délai sur la même ligne, ce sont deux réponses
   * à « quand » : la consolidation devrait choisir, et elle choisirait mal. Une
   * question du desk qui porterait un userId paraîtrait sur la page d'un client
   * comme sa propre attente. Et une réponse du desk à lui-même se compterait
   * dans sa propre demande.
   */
  it("fait tenir à la base ce que trois chemins pourraient écrire de travers", () => {
    const vif = sql();
    expect(vif, "un bon peut de nouveau porter un prix").toMatch(/check \(instrument <> 'BTA' or price_pct is null\)/);
    expect(vif, "une ligne peut de nouveau porter une date ET un délai").toMatch(/check \(num_nonnulls\(seance_le, dans_jours\) <= 1\)/);
    expect(vif, "une question du desk peut de nouveau porter un client").toMatch(/check \(\(origine = 'desk'\) = \(user_id is null\)\)/);
    expect(vif, "le desk peut de nouveau se répondre à lui-même").toMatch(/check \(reponse_a is null or origine = 'client'\)/);
    /* ET LES RÉPONSES SUIVENT LEUR QUESTION JUSQU'AU BOUT : une réponse
       orpheline se compterait dans un consensus sans en-tête. */
    expect(vif, "une réponse peut survivre à la question qu'elle vise").toMatch(/reponse_a uuid references survey_lines \(id\) on delete cascade/);
  });

  /**
   * CE QUE CHACUN VOIT, ET C'EST UN SECRET COMMERCIAL.
   *
   * Savoir qui prendrait combien est exactement ce qu'un concurrent voudrait
   * lire, et le consensus est la seule forme sous laquelle cette demande sort
   * de la maison. Les questions sont publiques — c'est leur objet ; les
   * réponses et les lignes poussées ne le sont pas.
   */
  it("garde les réponses privées et les questions publiques", () => {
    const vif = sql();
    expect(vif, "la table n'est plus protégée ligne à ligne").toMatch(/alter table survey_lines enable row level security/);
    expect(vif, "les questions de la maison ne sont plus lisibles : la page du client sera vide").toMatch(/for select using \(origine = 'desk'\)/);
    expect(vif, "un client ne lit plus ses propres attentes").toMatch(/for select using \(user_id = auth\.uid\(\)::text\)/);
    expect(vif, "un client peut de nouveau poser une question au nom de la maison").toMatch(/for insert with check \(origine = 'client' and user_id = auth\.uid\(\)::text\)/);
  });

  it("mène enfin à sa propre page, et non au calendrier", () => {
    /* LA DEMANDE DU DIRIGEANT, mot pour mot : « pour l'instant il mène aux
       adjudications, où il n'a pas sa place ». Le calendrier liste les séances
       DÉJÀ annoncées : c'est l'écran qui prouve que le service ne sert à rien,
       puisqu'il n'y a plus rien à sonder. */
    const sondage = CATALOGUE.find((c) => c.cle === "sondage");
    expect(sondage, "le service du sondage a quitté le catalogue").toBeTruthy();
    expect(sondage!.href, "le sondage est retourné au calendrier").toBe("/sondage");
    /* Et la page existe : un href vers le vide est une impasse qui ne se voit
       pas depuis le catalogue. */
    expect(() => lire("src/app/sondage/page.tsx")).not.toThrow();
    /**
     * UNE SEULE TUILE, ET ELLE NE DÉPEND PLUS D'UNE SÉANCE ANNONCÉE.
     *
     * CE QUE LE DIRIGEANT A DIT, le 26 octobre 2026 : « le sondage n'est pas
     * nécessairement lié à une adjudication à venir, c'est le desk qui réunit
     * l'appétit des clients ». La tuile avait deux phrases, et celle du cas
     * « une séance est annoncée » promettait « dire à quel taux vous seriez
     * preneur SUR LA SÉANCE DU 18 novembre » : le client arrivait sur une page
     * dont les lignes sondées n'ont rien à voir avec cette séance-là. C'était
     * l'autre service — le sondage d'une séance annoncée, qui vit au
     * calendrier — et une tuile qui change de promesse selon qu'un Trésor a
     * publié un avis ne décrit plus un service.
     *
     * LA CONDITION EST DONC LE DÉFAUT, et c'est elle qu'on tient ici : une
     * tuile unique ne peut pas dire deux choses.
     */
    /* LES COMMENTAIRES SONT RETIRÉS D'ABORD : celui de la tuile RACONTE la
       variante qu'on vient de retirer — « sur la séance du 18 novembre » — et
       une épreuve qui lirait la prose trouverait le défaut dans son propre
       récit. On ne relit que ce qui s'exécute. */
    const services = lire("src/lib/domain/services.ts").replace(/\/\*[\s\S]*?\*\//g, "");
    const i = services.indexOf('cle: "sondage"');
    const bloc = services.slice(services.lastIndexOf("out.push(", i), services.indexOf("out.push(", i));
    expect([...bloc.matchAll(/href: "\/sondage"/g)].length, "la tuile du sondage s'est dédoublée, ou elle mène ailleurs").toBe(1);
    expect(bloc, "la tuile sans séance renvoie de nouveau au calendrier").not.toMatch(/calendrier/);
    /* NON VACUITÉ : le bloc est bien celui de la tuile, et il porte le code qui
       la pousse — un découpage qui raterait sa cible passerait les trois
       lignes ci-dessus sans rien dire. */
    expect(bloc, "le bloc relu n'est plus celui de la tuile du sondage").toMatch(/out\.push\(\s*aActiver\(\{/);
    expect(bloc, "la tuile du sondage dépend de nouveau d'une séance annoncée").not.toMatch(/prochaineSeance/);
  });

  /**
   * LES DEUX TUILES DU CLIENT DISENT LA MÊME CHOSE, ET DE LA MÊME FAÇON.
   *
   * CE QUE LE DIRIGEANT A DEMANDÉ : « harmoniser les tuiles du sondage —
   * montant court, maturité, coupon pour une OTA, taux pour un bon ». Les deux
   * tuiles portaient la même information et l'écrivaient autrement : la durée
   * en haut d'un côté et absente de l'autre, le montant au franc, et une date
   * qui annonçait une séance que la maison n'adjuge pas.
   *
   * CE QUI LE TIENT, et c'est la seule forme qui tienne : la bande est UNE
   * FONCTION, appelée deux fois. Deux gabarits qui décrivent la même chose
   * divergent au premier changement — celui qu'on retouche, et celui qu'on
   * oublie — et aucune épreuve ne voit cette divergence, parce que les deux
   * pages restent justes séparément.
   */
  it("écrit la bande de faits une fois, et l'appelle deux fois", () => {
    const page = lire("src/app/sondage/page.tsx");
    expect([...page.matchAll(/className=\{styles\.faits\}/g)].length, "une tuile s'est remise à écrire sa propre bande de faits").toBe(1);
    expect([...page.matchAll(/<Faits\b/g)].length, "les deux tuiles ne passent plus par la même bande").toBe(2);
    /* LE RÔLE NE CHANGE QUE LE SENS DU NIVEAU : la maison dit un niveau
       INDICATIF, le client dit un PLANCHER. Les confondre porterait au Trésor
       un chiffre que personne n'a dit. */
    expect(page, "le niveau indicatif de la maison a disparu de la bande").toMatch(/role === "question" \? "ind\." : "min\."/);
  });

  /**
   * LA CLEF DE GROUPE N'EST ÉCRITE QU'UNE FOIS.
   *
   * Elle l'était deux : au domaine, et recopiée au desk pour retrouver les
   * demandes d'un groupe. Le jour où la durée a été réduite à sa forme
   * canonique — « 5ans » et « 5 ans » sont la même ligne — la page du desk
   * aurait cessé de retrouver les demandes de ses propres groupes, et « les N
   * demandes, une par une » serait restée vide sans rien dire. Une clef écrite
   * deux fois est une clef qui finit par valoir deux choses.
   */
  it("ne laisse la clef de groupe s'écrire qu'au domaine", () => {
    const desk = lire("src/app/desk/sondage/page.tsx");
    expect(desk, "la clef de groupe est de nouveau recopiée au desk").not.toMatch(/\$\{l\.tenor/);
    expect(desk, "le desk ne retrouve plus les demandes par la clef du domaine").toMatch(/cleDeGroupe\(l\) === cle/);
    /* NON VACUITÉ : le domaine la normalise vraiment — sans quoi la ligne
       ci-dessus ne garde qu'une recopie inoffensive. Son comportement est tenu
       par « sondage ». */
    expect(lire("src/lib/domain/sondage.ts"), "la durée n'est plus réduite à une forme canonique").toMatch(/dureeCanonique\(l\.tenor\)/);
  });

  /**
   * LE QUATRIÈME FAIT EXISTE DE BOUT EN BOUT, OU IL N'EXISTE PAS DU TOUT.
   *
   * « Ajouter le rendement actuariel à l'OTA, et que les quatre informations
   * tiennent bien. » Le rendement n'est pas un champ : c'est une CHAÎNE de
   * quatre maillons — le desk saisit un prix indicatif, l'action le porte
   * jusqu'à la ligne, le domaine le transforme en rendement, la tuile l'écrit.
   * Chaque maillon peut partir seul, et son départ est muet : la tuile
   * afficherait trois faits sur quatre, ce qui ressemble exactement à une OTA
   * sans prix. C'est pour cela que l'épreuve lit les quatre.
   */
  it("mène le prix indicatif du formulaire du desk jusqu'au rendement de la tuile", () => {
    expect(lire("src/app/desk/sondage/Formulaires.tsx"), "le desk ne peut plus indiquer de prix : la tuile n'aura jamais de rendement").toMatch(/name="pricePct"/);
    /* LES COMMENTAIRES SONT RETIRÉS AVANT DE CHERCHER. Vérifié à l'envers le
       26 octobre 2026 : « // pricePct: … » contient encore le motif, et les
       deux lignes ci-dessous restaient vertes sur une action désarmée. C'est le
       même défaut que celui du SQL commenté, à un langage près. */
    const actions = lire("src/app/desk/sondage/actions.ts")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");
    expect(actions, "le prix n'est plus accepté par l'action").toMatch(/pricePct: z\.string\(\)\.optional\(\)/);
    expect(actions, "le prix est accepté puis jeté avant l'écriture").toMatch(/pricePct: nombre\(d\.pricePct\)/);
    expect(lire("src/app/sondage/page.tsx"), "la tuile n'écrit plus le rendement").toMatch(/rendementDeLaLigne\(l\)/);
    /* ET LE PRIX A QUITTÉ LA BANDE, parce qu'il en est l'INGRÉDIENT : prix,
       coupon et rendement côte à côte, c'étaient trois nombres pour deux faits,
       et le cinquième élément d'une bande qui en veut quatre. */
    expect(lire("src/app/sondage/page.tsx"), "le prix est revenu sur la bande, à côté du rendement qu'il produit").not.toMatch(/prix \{p\} au plus/);
    /* NON VACUITÉ : le calcul passe par la référence de la maison et non par une
       seconde formule — c'est la règle, et elle a coûté deux points d'écart une
       fois. Le comportement du rendement est tenu par « sondage ». */
    expect(lire("src/lib/domain/sondage.ts"), "le rendement ne passe plus par finance : une seconde formule divergera").toMatch(/bondCalc\(\{/);
  });

  /**
   * LE MONTANT EST COURT SUR UNE TUILE, ET AU FRANC AU DESK.
   *
   * « Le montant en millions ou en milliards. » Une tuile se compare d'un coup
   * d'œil : neuf chiffres se comptent, un ordre de grandeur se voit. Le desk,
   * lui, porte la demande à un Trésor et la dit au franc — ce n'est pas la même
   * lecture, et c'est pour cela que la règle ne vaut que du côté client.
   */
  /**
   * LA QUESTION NE PORTE PLUS DE MONTANT, ET C'EST LE RENSEIGNEMENT LUI-MÊME
   * QUI EN DÉPEND.
   *
   * « Retirer le montant de l'offre, puisque c'est justement ce que nous
   * cherchons à savoir. » Écrit sur la question, « 500 M FCFA » donne la réponse
   * avant de poser la question : le client qui aurait dit trente millions en dit
   * cinquante, et la maison porte au Trésor son propre chiffre renvoyé par un
   * miroir. Rien à l'écran ne le montrerait — les chiffres restent plausibles,
   * et seul le renseignement est faux.
   *
   * LE MONTANT DE L'ATTENTE RESTE, lui : c'est le chiffre du client, et le
   * cacher reviendrait à ne pas lui rendre ce qu'il a dit.
   */
  it("n'écrit nulle part au client le montant que la maison cherche", () => {
    const page = lire("src/app/sondage/page.tsx").replace(/\/\*[\s\S]*?\*\//g, "");
    /* La bande ne connaît le montant que pour une attente : la branche est la
       garde, et elle est lisible en une ligne. */
    expect(page, "la bande de faits écrit de nouveau un montant hors d'une attente").toMatch(/role === "attente" \? fmtUnits\(l\.montant, true\) : null/);
    expect([...page.matchAll(/fmtUnits\(/g)].length, "un second montant a paru sur la page du client").toBe(2);
    /* NON VACUITÉ : la question est bien rendue par cette bande, et le montant
       existe toujours sur le modèle — la garde ne tient rien si la tuile a
       disparu ou si le champ a été supprimé. */
    expect(page, "la question ne passe plus par la bande de faits").toMatch(/<Faits l=\{q\} role="question"/);
    expect(lire("src/lib/domain/types.ts"), "le montant a quitté le modèle : la garde ne mesure plus rien").toMatch(/montant: number/);
    /* ET IL RESTE AU DESK, qui en a besoin comme cible — le chiffre lui-même,
       et pas le mot : « cherchés » paraît deux fois sur cette page, et la garde
       restait verte quand l'une des deux branches le perdait (vérifié à
       l'envers le 26 octobre 2026). */
    expect(lire("src/app/desk/sondage/page.tsx"), "le desk ne voit plus la cible de sa propre question").toMatch(/fmt\(q\.montant\)/);
  });

  it("rend les montants du client en millions ou en milliards", () => {
    const page = lire("src/app/sondage/page.tsx");
    expect(page, "la tuile du client est revenue au franc exact").not.toMatch(/\bfmt\((?:[qml]|mienne)\.montant\)/);
    expect(page, "le montant court a quitté la page du client").toMatch(/fmtUnits\(l\.montant, true\)/);
    /* LA TUILE DU MATIN AUSSI, et elle a sa raison : « fmtMillions » rendait
       un milliard « 1 200 M », ce qui se lit mal et se compare encore plus
       mal — « 1,2 Md » est le même chiffre dans l'unité qu'on dit. */
    const matin = lire("src/app/desk/today/today.ts");
    expect(matin, "la tuile du matin rend de nouveau les milliards en millions").not.toMatch(/fmtMillions\(c\.montant\)/);
  });

  /**
   * AUCUNE TUILE NE PROMET UNE SÉANCE, parce que la maison n'adjuge pas.
   *
   * « Le sondage n'est pas nécessairement lié à une adjudication à venir. » La
   * page disait « séance visée le 9 nov. », le formulaire du desk demandait une
   * « séance visée », le robot clôturait sur une « séance visée passée », et la
   * note d'une ligne annonçait « le Trésor camerounais revient sur le 5 ans en
   * novembre ». Quatre endroits pour une séance que personne n'a annoncée : un
   * client qui lit cela attend un avis d'annonce, et c'est la maison qui
   * paraît défaillir quand il ne vient pas.
   *
   * CE QUI RESTE DIT, parce que c'est vrai : une séance tenue AVANT la date du
   * client le trouverait sans fonds. C'est une condition, pas une annonce.
   */
  it("ne promet de séance ni sur la tuile, ni au formulaire, ni dans un motif de clôture", () => {
    for (const f of ["src/app/sondage/page.tsx", "src/app/desk/sondage/Formulaires.tsx", "src/lib/sondage/tour.ts"]) {
      const vif = lire(f).replace(/\/\*[\s\S]*?\*\//g, "");
      expect(vif, `${f} promet de nouveau une séance visée`).not.toMatch(/[Ss]éance visée/);
    }
    /* ET LA NOTE D'UNE LIGNE SONDÉE EST COURTE, parce qu'elle ne redit pas la
       tuile : le pays, la durée, le montant et le niveau y sont déjà. Ce qui
       reste à dire est POURQUOI la maison sonde celle-ci, en une phrase. */
    const notes = SEED_SONDAGES.filter((l) => l.origine === "desk").map((l) => l.note ?? "");
    expect(notes.length, "le jeu d'essai n'a plus de question du desk : les lignes ci-dessous ne mesurent rien").toBeGreaterThanOrEqual(2);
    for (const n of notes) {
      expect(n.length, `une note de ligne sondée fait ${n.length} signes : elle redit la tuile`).toBeLessThanOrEqual(90);
      expect(n, "une note annonce une séance que personne n'a annoncée").not.toMatch(/annoncé|séance|revient sur/i);
    }
  });

  it("donne au robot une cadence et une tâche planifiée, et il passe le matin", () => {
    const robot = ROBOTS.find((r) => r.cle === "sondage");
    expect(robot, "le robot du sondage a quitté le tableau : son silence ne se verra plus depuis la page Santé").toBeTruthy();
    const crons = (JSON.parse(lire("vercel.json")) as { crons: { path: string; schedule: string }[] }).crons;
    const tache = crons.find((c) => c.path === "/api/cron/sondage");
    expect(tache, "la tâche planifiée a disparu de vercel.json : plus rien n'éteint les attentes échues").toBeTruthy();
    expect(tache!.schedule, "le tableau des robots et vercel.json ne disent plus la même cadence").toBe(robot!.cron);
    /* AVANT QUE LE DESK OUVRE SA FILE : une attente échue doit être close avant
       qu'on lise le consensus du jour, sinon la première lecture du matin porte
       une demande dont une part est déjà partie ailleurs. */
    const heure = Number(robot!.cron.split(" ")[1]);
    expect(heure, "le robot passe après l'ouverture du desk : le consensus du matin portera des francs déjà partis").toBeLessThanOrEqual(8);
  });

  it("et le robot clôt vraiment, en rendant la main au client", () => {
    /* Non vacuité des lignes ci-dessus : un robot inscrit au tableau et branché
       à une tâche peut parfaitement ne rien faire. */
    const tour = lire("src/lib/sondage/tour.ts");
    expect(tour, "le tour ne clôt plus rien").toMatch(/state: "close", closedReason: motif/);
    expect(tour, "le motif ne redit plus que rien n'engageait le client").toMatch(/Rien ne vous engageait/);
    /* ET IL MESURE LE SEUIL APRÈS LES CLÔTURES : relire la table est ce qui
       garantit l'ordre, et c'est invisible à toute épreuve de source sauf
       celle-ci. Son comportement est tenu par « sondage-tour ». */
    expect(tour.indexOf("const apres = (await r.listLignesSondees())"), "le tour ne relit plus la table après avoir clos").toBeGreaterThan(tour.indexOf('state: "close", closedReason: motif'));
  });

  /**
   * LE DÉLAI NE S'AFFICHE JAMAIS TEL QU'IL A ÉTÉ ÉCRIT.
   *
   * Relevé à l'écran le 26 octobre 2026 : la page rendait « dans 21 jours »
   * pour une question posée le 19, ce qui se lit « le 16 novembre » quand la
   * ligne dit le 9. Le délai est la façon dont son auteur l'a écrit ; la date
   * est ce qu'il voulait dire, et c'est la seule chose qu'un lecteur puisse
   * vérifier. Les deux pages passent donc par « prete », qui compte depuis la
   * création — et c'est elle que l'épreuve du domaine tient.
   */
  it("n'affiche jamais un délai brut, qui se relit depuis le mauvais jour", () => {
    for (const f of ["src/app/sondage/page.tsx", "src/app/desk/sondage/page.tsx"]) {
      expect(lire(f), `${f} affiche de nouveau le délai tel quel`).not.toMatch(/dans \{n\} jours/);
      expect(lire(f), `${f} n'affiche plus la date calculée`).toMatch(/prete\(/);
    }
  });

  it("ne recopie la prose du service nulle part ailleurs", () => {
    /* Le brief lit « RAISON » et « ETAPES » dans le catalogue : la page du
       sondage ne doit pas en écrire une seconde version, qui divergerait au
       premier changement. C'est la règle que « brief-par-page » tient pour les
       huit pages, rappelée ici sur celle qui vient de naître. */
    const page = lire("src/app/sondage/page.tsx");
    expect(page, "la page recopie les étapes du service").not.toMatch(/Lire ce que la maison sonde/);
  });
});
