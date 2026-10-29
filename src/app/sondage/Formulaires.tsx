"use client";

import { useActionState, useState, useTransition } from "react";
import { useT } from "@/i18n/client";
import { Select } from "@/components/ui/Select";
import { Sheet } from "@/components/mobile/Sheet";
import { Info } from "@/components/Info";
import { groupedInput } from "@/lib/ui/grouped";
import { INSTRUMENTS_SONDES, dureesDe, gabarit, type InstrumentSonde } from "@/lib/domain/sondage";
import { PAYS_CEMAC } from "@/lib/market/budget";
import { deposerLaLigne, modifierLaLigne, retirerLaLigne, type SondageResult } from "./actions";
import styles from "./page.module.css";

/**
 * LES DEUX FORMULAIRES DU SONDAGE, ET LA DIFFÉRENCE ENTRE EUX EST TOUT.
 *
 * RÉPONDRE COÛTE DEUX CHIFFRES. La question porte déjà le Trésor, la durée et
 * le compartiment : le client n'a plus qu'à dire combien il prendrait et à
 * partir de quand. Lui redemander le pays et la maturité serait lui faire
 * remplir la question à laquelle il répond — et ouvrirait la porte à une
 * réponse qui ne répond pas à ce qu'on a demandé, que la consolidation
 * compterait quand même.
 *
 * PROPOSER SA LIGNE COÛTE SIX CHAMPS, et c'est le gabarit que le dirigeant a
 * demandé. Il est replié par défaut, parce que c'est le geste rare : déplié en
 * tête, il ferait croire qu'il faut inventer une ligne pour se servir de la
 * page.
 *
 * LES CHAMPS VIENNENT DU DOMAINE — « gabarit(instrument) » — et non d'ici : le
 * serveur refuse les mêmes manques, avec les mêmes mots, et un formulaire est
 * une commodité qu'on peut contourner. Ce qui diffère entre une OTA et un bon
 * est écrit là-bas, une fois.
 */

/* ------------------------------------------------------------------ *
 * RÉPONDRE À UNE QUESTION DE LA MAISON
 * ------------------------------------------------------------------ */

/**
 * CE QU'UNE INTENTION DÉJÀ DITE REND AU FORMULAIRE QUI LA ROUVRE.
 *
 * « Ajouter “modifier” comme possibilité. » Un formulaire de modification vide
 * n'est pas une modification : c'est un second dépôt, et le client qui ne
 * voulait changer qu'un chiffre doit retaper les autres — donc il se trompe, ou
 * il renonce. Les champs reviennent remplis, et il ne touche que ce qu'il
 * change.
 */
export interface Modifiable {
  id: string;
  montant: number;
  rate?: number;
  pricePct?: number;
  dansJours?: number;
  note?: string;
  instrument: InstrumentSonde;
  country: string;
  tenor: string;
}

/* Le montant revient groupé comme le client l'a tapé — « 50 000 000 » et non
   « 50000000 » : c'est la forme que le champ tient, et elle se relit. */
const groupe = (n: number) => n.toLocaleString("fr-FR").replace(/[\u00a0\u202f]/g, " ");

/* `discret` : le même geste, à l'endroit où il n'est pas le geste principal.
   Dans la liste des intentions, « Modifier » est un lien comme « Retirer » ; sur
   la tuile d'une question, c'est le bouton qu'on est venu chercher. Un libellé
   long à côté d'un court ferait lire deux gestes différents. */
export function Repondre({ question, existante, discret }: { question: { id: string; instrument: InstrumentSonde; mot: "coupon" | "taux" }; existante?: Modifiable; discret?: boolean }) {
  const t = useT();
  const [state, action, pending] = useActionState<SondageResult | null, FormData>(existante ? modifierLaLigne : deposerLaLigne, null);
  const [montant, setMontant] = useState(existante ? groupe(existante.montant) : "");
  const [ouvert, setOuvert] = useState(false);

  /* LE MÊME DÉFAUT QUE SUR « PROPOSER SA PROPRE LIGNE », et il a été trouvé
     par l'épreuve écrite pour l'autre : répondre à une question du desk
     effaçait le bouton pour de bon. Un client qui se ravise — il voulait dire
     cinquante millions, il en veut dire cent — n'avait plus aucun geste, et
     la page ne lui disait pas pourquoi. Même remède : l'accusé se lit
     AU-DESSUS du bouton, et un accusé déjà vu ne bloque plus rien. */
  const refRecue = state?.ok ? state.ref : undefined;
  const [refLue, setRefLue] = useState<string | undefined>(undefined);
  const accuseFrais = refRecue !== undefined && refRecue !== refLue;

  if (!ouvert || accuseFrais)
    return (
      <>
        {accuseFrais && state?.ok && <p className={styles.recu}>{t(state.message)}</p>}
        <button
          type="button"
          className={discret ? styles.lien : "btn primary"}
          onClick={() => {
            setRefLue(refRecue);
            setOuvert(true);
          }}
        >
          {t(discret ? "Modifier" : accuseFrais ? "Modifier ma réponse" : existante ? "Modifier ma réponse" : "Je serais preneur")}
        </button>
      </>
    );

  return (
    <form action={action} className={styles.form}>
      {existante && <input type="hidden" name="id" value={existante.id} />}
      <input type="hidden" name="repondA" value={question.id} />
      <input type="hidden" name="instrument" value={question.instrument} />
      <div className={styles.deux}>
        <label className="field">
          {t("Ce que vous prendriez (FCFA)")}
          <input name="montant" inputMode="numeric" placeholder="50 000 000" value={montant} {...groupedInput(setMontant)} required />
        </label>
        {/* LE NIVEAU EST FACULTATIF, et c'est voulu : « je prendrais cinquante
            millions quel que soit le taux » est une réponse, et c'est même la
            plus utile au Trésor — elle tient à n'importe quel niveau.

            ET LE CHAMP N'EST PLUS « type=number », qui REFUSAIT la virgule que
            son propre repère invite — « 6,25 ». Relevé à l'écran le 26 octobre
            2026 : un client qui tape « 6,5 » voit son champ se vider, envoie, et
            sa réponse part SANS CONDITION. Le serveur, lui, lisait déjà les deux
            écritures ; c'est le navigateur qui coupait. « decimal » donne le même
            clavier au doigt et laisse passer la virgule. */}
        <label className="field">
          <span className={styles.question}>
            {t(question.mot === "taux" ? "Au taux d'au moins (%)" : "Au coupon d'au moins (%)")}
            <Info text="Facultatif : sans condition, votre réponse tient quel que soit le niveau." label={t("Votre condition")} subtle />
          </span>
          <input name="rate" inputMode="decimal" placeholder="6,25" defaultValue={existante?.rate ?? ""} />
        </label>
      </div>
      <label className="field">
        <span className={styles.question}>
          {t("Prêt à partir de (jours)")}
          <Info text="Une séance tenue avant ce délai vous trouverait sans fonds : c'est pour cela qu'on vous le demande." label={t("Prêt à partir de")} subtle />
        </span>
        <input name="dansJours" type="number" min="0" max="365" placeholder="21" defaultValue={existante?.dansJours ?? ""} required />
      </label>
      {!state?.ok && state?.error && <em className={styles.erreur}>{state.error}</em>}
      <div className={styles.boutons}>
        <button type="submit" className="btn primary" disabled={pending}>
          {t(pending ? "Un instant…" : existante ? "Enregistrer" : "Dire au desk")}
        </button>
        <button type="button" className="btn ghost" onClick={() => setOuvert(false)}>
          {t("Annuler")}
        </button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ *
 * LE GABARIT : PROPOSER SA PROPRE LIGNE
 * ------------------------------------------------------------------ */

/** Un jeton qu'on prend ou qu'on rend : le même geste pour les deux listes. */
const bascule = (liste: string[], pose: (v: string[]) => void, v: string) => pose(liste.includes(v) ? liste.filter((x) => x !== v) : [...liste, v]);

export function ProposerMaLigne({ existante }: { existante?: Modifiable } = {}) {
  const t = useT();
  const [state, action, pending] = useActionState<SondageResult | null, FormData>(existante ? modifierLaLigne : deposerLaLigne, null);
  const [instrument, setInstrument] = useState<InstrumentSonde>(existante?.instrument ?? "OTA");
  const [country, setCountry] = useState(existante?.country ?? "Cameroun");
  const [montant, setMontant] = useState(existante ? groupe(existante.montant) : "");
  /* La durée suit le compartiment : changer d'instrument change la liste, et une
     valeur qui n'y est plus laisserait le champ sur « 5 ans » pour un bon. */
  const durees = dureesDe(instrument);
  const [tenor, setTenor] = useState(existante?.tenor ?? "");
  const choisie = durees.includes(tenor) ? tenor : durees[instrument === "BTA" ? 2 : 2];
  const setTenorSur = (v: string) => setTenor(v);
  const [ouvert, setOuvert] = useState(false);
  /* LES CHOIX MULTIPLES, ET LA LISTE QU'ILS PRODUISENT. Un seul Trésor et une
     seule durée au départ : la proposition la plus courante reste d'un geste,
     et l'on n'élargit que si l'on veut. */
  const [pays, setPays] = useState<string[]>([existante?.country ?? "Cameroun"]);
  const [tenors, setTenors] = useState<string[]>(existante?.tenor ? [existante.tenor] : [dureesDe("OTA")[2]]);
  /* CHANGER DE COMPARTIMENT CHANGE LA LISTE DES DURÉES, et une durée d'OTA
     retenue sur un bon ne paraîtrait plus cochée tout en partant quand même
     dans le formulaire : un champ caché ne se voit pas. On ne garde donc que
     ce que le compartiment du moment propose. */
  const tenorsValides = tenors.filter((d) => dureesDe(instrument).includes(d));
  const lignesProduites = pays.flatMap((p) => tenorsValides.map((d) => `${p} · ${d}`));
  const champs = gabarit(instrument);
  const aide = (cle: string) => champs.find((c) => c.cle === cle)?.aide ?? "";

  /**
   * UNE LIGNE ENVOYÉE NE FERME PAS LA PORTE AUX SUIVANTES.
   *
   * SIGNALÉ LE 29 OCTOBRE 2026 : « le bouton proposer votre ligne disparaît
   * une fois la ligne validée ». Il disparaissait pour de bon — le composant
   * rendait l'accusé À LA PLACE du déclencheur, et un client qui voulait
   * proposer une seconde ligne devait recharger la page pour retrouver le
   * bouton. Or proposer plusieurs lignes est le cas NORMAL : on dit ce qu'on
   * prendrait sur le 5 ans, puis sur le 7 ans.
   *
   * ET UN SECOND DÉFAUT SE CACHAIT DERRIÈRE, que garder le bouton n'aurait
   * pas suffi à lever : la feuille s'ouvre sur « ouvert && !state.ok », et
   * « state.ok » reste vrai pour toujours. Le bouton rendu, il aurait cliqué
   * dans le vide — une panne muette, pire que celle qu'on corrigeait.
   *
   * CE QUI LES FERME TOUS LES DEUX : la feuille ne se ferme plus sur « il y a
   * eu un succès » mais sur « il y a eu un succès QUE LE CLIENT N'A PAS
   * ENCORE VU ». Rouvrir, c'est voir — donc le déclencheur marque l'accusé
   * comme lu, et la feuille s'ouvre de nouveau. Pas d'effet, pas de
   * « setState » dans un rendu : une comparaison de deux références.
   */
  const refRecue = state?.ok ? state.ref : undefined;
  const [refLue, setRefLue] = useState<string | undefined>(undefined);
  const accuseFrais = refRecue !== undefined && refRecue !== refLue;
  const ouvrir = () => {
    setRefLue(refRecue);
    setOuvert(true);
  };

  /* LE DÉCLENCHEUR RESTE EN PLACE, ET LE FORMULAIRE S'OUVRE PAR-DESSUS.
     « Un bouton à lui, séparé, et de là un formulaire complet apparaît. » Déplié
     SOUS son bouton, le gabarit poussait la moitié de la page vers le bas : le
     client perdait de vue ce qu'il était venu lire, et sur un téléphone il ne
     voyait plus ni le début du formulaire ni la fin. Une feuille garde la page
     dessous, à sa place, et rend les six champs d'un seul tenant. */
  const declencheur = existante ? (
    <button type="button" className={styles.lien} onClick={ouvrir}>
      {t("Modifier")}
    </button>
  ) : (
    <button type="button" className={`btn ghost ${styles.plus}`} onClick={ouvrir}>
      <span aria-hidden="true">+</span> {t(accuseFrais ? "Proposer une autre ligne" : "Proposer votre propre ligne")}
    </button>
  );

  return (
    <>
      {/* L'ACCUSÉ SE LIT AU-DESSUS DU BOUTON, ET NON À SA PLACE. Il dit que
          c'est parti ; le bouton dit que ce n'est pas fini. */}
      {accuseFrais && state?.ok && (
        <p className={styles.recu}>
          {t(state.message)} <span className="mono">{state.ref}</span>
        </p>
      )}
      {declencheur}
      {/* LA FEUILLE SE FERME D'ELLE-MÊME QUAND L'ENVOI PASSE — « ouvert && !ok »
          plutôt qu'un effet qui la ferme : un effet qui appelle setState est
          précisément ce que le lint de cette version refuse, et l'accusé de
          réception prend la place du bouton en dessous. */}
      {/* PLEINE PAGE, ET LA CROIX POUR SEULE SORTIE.
          SIGNALÉ LE 29 OCTOBRE 2026 : « la page ne s'ouvre pas complètement ».
          C'était « wide » — une feuille qui monte et s'arrête à mi-écran, avec
          la page dessous qui tire l'œil. Un gabarit de huit questions ne se
          remplit pas dans une fenêtre : on y perd le haut en atteignant le bas.
          La demande était déjà posée pour les « en bref », et la variante
          existait ; ce formulaire-ci l'avait manquée. */}
      <Sheet open={ouvert && !accuseFrais} onClose={() => setOuvert(false)} title={t(existante ? "Modifier votre ligne" : "Proposer votre propre ligne")} plein>
        <form action={action} className={styles.form}>
          {existante && <input type="hidden" name="id" value={existante.id} />}
      {/* LE COMPARTIMENT D'ABORD, parce qu'il décide des champs qui suivent :
          une OTA porte un coupon ET un prix, un bon n'a ni l'un ni l'autre —
          il se vend précompté, et son taux EST son niveau. Demander un prix
          sur un bon serait demander un chiffre qui n'existe pas. */}
      {/* LE COMPARTIMENT PREND SA LIGNE ENTIÈRE, et ce n'est pas du confort :
          c'est lui qui décide des champs qui suivent — un bon n'a ni coupon ni
          prix — donc il se lit avant eux, pas à côté d'eux. Et à mi-largeur,
          relevé à 412 px, son libellé passait à la ligne et poussait la valeur
          choisie hors du cadre : la liste paraissait vide. */}
      <div className={styles.un}>
        {/* LES DEUX SIGLES NUS, ET L'EXPLICATION DANS UNE BULLE. Relevé à
            l'écran le 26 octobre 2026 : « OTA · obligation du Trésor » dans la
            liste donnait un bouton qui passait à la ligne et perdait sa valeur
            hors du cadre — le client lisait une liste déroulante vide. Ce
            qu'un sigle veut dire s'est donc posé dessous, puis, le 29 octobre,
            dans une bulle : huit explications permanentes faisaient du gabarit
            un mode d'emploi, et on cherchait les champs entre les phrases. */}
        <div className={`field ${styles.avecBulle}`}>
          <span className={styles.coin}>
            <Info text={instrument === "OTA" ? "Une obligation du Trésor : elle verse un coupon chaque année, sur plusieurs années." : "Un bon du Trésor : il se vend précompté et se rembourse en une fois, sous un an."} label={t("Ce que vous cherchez")} subtle />
          </span>
          <Select
            name="instrument"
            label={t("Ce que vous cherchez")}
            value={instrument}
            onChange={(v) => setInstrument(v as InstrumentSonde)}
            block
            cherchable={false}
            options={INSTRUMENTS_SONDES.map((i) => ({ value: i, label: i }))}
          />
        </div>
      </div>
      {existante ? (
        <div className={styles.deux}>
          <Select name="country" label={t("Le Trésor")} value={country} onChange={setCountry} block cherchable={false} options={PAYS_CEMAC.map((p) => ({ value: p, label: t(p) }))} />
          {/* LA DURÉE SE CHOISIT, ELLE NE S'ÉCRIT PLUS. C'est la demande du
              dirigeant — « plusieurs maturités à choisir » — et cela ferme à la
              source ce qu'on avait appris à réparer après coup : « 5ans », « 5 ANS »
              et « cinq ans » faisaient trois lignes différentes pour la
              consolidation. La liste vient du domaine, qui sait ce qu'un Trésor de
              la zone sert sur chaque compartiment. */}
          <div className={`field ${styles.avecBulle}`}>
            <span className={styles.coin}>
              <Info text={aide("tenor")} label={t("La durée")} subtle />
            </span>
            <Select name="tenor" label={t("La durée")} value={choisie} onChange={setTenorSur} block cherchable={false} options={dureesDe(instrument).map((d) => ({ value: d, label: d }))} />
          </div>
        </div>
      ) : (
        /* PLUSIEURS TRÉSORS ET PLUSIEURS DURÉES, D'UN SEUL GESTE.
           C'est la demande du 29 octobre 2026, et ce n'est pas un confort de
           saisie : un client qui prendrait du camerounais OU du gabonais, à
           deux, cinq OU sept ans, devait jusqu'ici remplir six fois le même
           formulaire — ou n'en remplir qu'un et taire le reste. Le desk ne
           voyait alors qu'un sixième de ce que la place accepterait.
           CE QUI SÉPARE CES JETONS D'UNE LISTE : on en prend PLUSIEURS. Un
           jeton qui s'ajoute et un jeton qui remplace se ressemblent trop pour
           qu'on les laisse identiques — d'où la coche, qui dit « celui-ci
           AUSSI » là où un fond plein dirait seulement « celui-ci ».
           ET CE QU'ILS PRODUISENT SE LIT DESSOUS : six cases cochées ne font
           pas une ligne mais six, et c'est la seule façon de le faire voir au
           lieu de l'écrire. */
        <>
          <fieldset className={styles.jeux}>
            <legend>{t("Le ou les Trésors")}</legend>
            {pays.map((p) => (
              <input key={p} type="hidden" name="country" value={p} />
            ))}
            <div className={styles.jetons}>
              {PAYS_CEMAC.map((p) => (
                <button key={p} type="button" aria-pressed={pays.includes(p)} className={pays.includes(p) ? styles.jetonOn : styles.jeton} onClick={() => bascule(pays, setPays, p)}>
                  {pays.includes(p) && (
                    <span className={styles.coche} aria-hidden="true">
                      ✓
                    </span>
                  )}
                  {t(p)}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset className={styles.jeux}>
            <legend>
              {t("La ou les durées")}
              <Info text={aide("tenor")} label={t("La durée")} subtle />
            </legend>
            {tenorsValides.map((d) => (
              <input key={d} type="hidden" name="tenor" value={d} />
            ))}
            <div className={styles.jetons}>
              {dureesDe(instrument).map((d) => (
                <button key={d} type="button" aria-pressed={tenorsValides.includes(d)} className={tenorsValides.includes(d) ? styles.jetonOn : styles.jeton} onClick={() => bascule(tenors, setTenors, d)}>
                  {tenorsValides.includes(d) && (
                    <span className={styles.coche} aria-hidden="true">
                      ✓
                    </span>
                  )}
                  {d}
                </button>
              ))}
            </div>
          </fieldset>
          {lignesProduites.length > 1 && (
            <p className={styles.apercu}>
              <b>{t("{n} lignes, pour le même montant", { n: String(lignesProduites.length) })}</b>{" "}
              {t("Ce sont des alternatives : le desk n'en portera qu'une, et votre montant n'est compté qu'une fois.")}
            </p>
          )}
        </>
      )}
      <div className={styles.deux}>
        <label className="field">
          <span className={styles.question}>
            {t(instrument === "BTA" ? "Le taux que vous accepteriez, au moins (%)" : "Le coupon que vous attendez, au moins (%)")}
            <Info text={aide("rate")} label={t(instrument === "BTA" ? "Le taux que vous accepteriez" : "Le coupon que vous attendez")} subtle />
          </span>
          <input name="rate" inputMode="decimal" placeholder="6,50" defaultValue={existante?.rate ?? ""} />
        </label>
        {instrument === "OTA" && (
          <label className="field">
            <span className={styles.question}>
              {t("Le prix que vous accepteriez, au plus (%)")}
              <Info text={aide("pricePct")} label={t("Le prix que vous accepteriez")} subtle />
            </span>
            <input name="pricePct" inputMode="decimal" placeholder="100" defaultValue={existante?.pricePct ?? ""} />
          </label>
        )}
      </div>
      <div className={styles.deux}>
        <label className="field">
          <span className={styles.question}>
            {t("Ce que vous prendriez (FCFA)")}
            <Info text={aide("montant")} label={t("Ce que vous prendriez")} subtle />
          </span>
          <input name="montant" inputMode="numeric" placeholder="50 000 000" value={montant} {...groupedInput(setMontant)} required />
        </label>
        <label className="field">
          <span className={styles.question}>
            {t("Prêt à partir de (jours)")}
            <Info text={aide("quand")} label={t("Prêt à partir de")} subtle />
          </span>
          <input name="dansJours" type="number" min="0" max="365" placeholder="60" defaultValue={existante?.dansJours ?? ""} required />
        </label>
      </div>
      <label className="field">
        {t("Ce que le desk doit savoir (facultatif)")}
        <textarea name="note" rows={2} maxLength={600} placeholder={t("Pourquoi cette ligne, ou ce qui vous ferait changer d'avis.")} defaultValue={existante?.note ?? ""} />
      </label>
          {!state?.ok && state?.error && <em className={styles.erreur}>{state.error}</em>}
          <div className={styles.boutons}>
            <button type="submit" className="btn primary" disabled={pending}>
              {t(pending ? "Un instant…" : existante ? "Enregistrer" : "Envoyer au desk")}
            </button>
            <button type="button" className="btn ghost" onClick={() => setOuvert(false)}>
              {t("Annuler")}
            </button>
          </div>
        </form>
      </Sheet>
    </>
  );
}

/* ------------------------------------------------------------------ *
 * RETIRER SON ATTENTE
 * ------------------------------------------------------------------ */

/**
 * ELLE SE RETIRE, ET C'EST LA MOITIÉ DE LA PROMESSE.
 *
 * Rien ne l'engageait ; une attente qu'on ne peut pas défaire est pourtant une
 * attente qu'on hésite à donner. C'est le reproche que la maison s'est déjà
 * fait sur l'ordre sans bouton de retrait — « un panier qu'on ne peut pas vider
 * se garde plein ».
 */
export function Retirer({ id, ref_ }: { id: string; ref_: string }) {
  const t = useT();
  const [pending, start] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);
  const [demande, setDemande] = useState(false);

  /**
   * RETIRER SE CONFIRME, ET LA CONFIRMATION TIENT SUR PLACE.
   *
   * CE QUE LE DIRIGEANT A DEMANDÉ, le 26 octobre 2026 : « s'assurer que le
   * bouton de suppression vienne avec une seconde confirmation ».
   *
   * ET IL PARTAIT AU PREMIER DOIGT, à côté de « Modifier », du même degré et de
   * la même encre : les deux liens se touchent, et sur un téléphone un pouce
   * qui glisse de six pixels retirait une intention au lieu de l'ouvrir. Ce
   * qu'on retire ne se reprend pas — la ligne se clôt, elle quitte le consensus
   * que le desk porte, et il faut la redire en entier.
   *
   * SANS FENÊTRE, parce que c'est la règle de la maison — déjà écrite sur
   * l'arrêt d'un versement permanent : ce qu'on retire reste SOUS LES YEUX
   * pendant qu'on décide. Une boîte modale cache précisément la ligne dont on
   * se demande si c'est la bonne.
   *
   * LES DEUX BOUTONS NOMMENT LE GESTE : « Oui, retirer » et « Annuler ». Un
   * « Confirmer » ne dit pas ce qu'il confirme, et c'est au moment où l'on
   * hésite qu'on a besoin de le lire.
   */
  if (!demande)
    return (
      <>
        {/* LA RÉFÉRENCE SORT DU LIBELLÉ et passe au nom accessible. Elle figure
            déjà au bout de la ligne du dessus ; écrite ici une seconde fois,
            elle faisait un lien de quarante signes pour un mot. Un lecteur
            d'écran, lui, a besoin qu'elle y soit : « Retirer » annoncé trois
            fois de suite n'annonce rien. */}
        <button type="button" className={styles.retirer} aria-label={t("Retirer l'attente {r}", { r: ref_ })} onClick={() => setDemande(true)}>
          {t("Retirer")}
        </button>
        {erreur && <em className={styles.erreur}>{erreur}</em>}
      </>
    );

  return (
    <span className={styles.confirme}>
      <span className={styles.quoi}>{t("Retirer cette intention ?")}</span>
      <button
        type="button"
        className={styles.retirer}
        disabled={pending}
        aria-label={t("Oui, retirer l'attente {r}", { r: ref_ })}
        onClick={() =>
          start(async () => {
            const r = await retirerLaLigne(id);
            if (!r.ok) {
              setErreur(r.error ?? t("Retrait impossible."));
              setDemande(false);
            }
          })
        }
      >
        {t(pending ? "Un instant…" : "Oui, retirer")}
      </button>
      <button type="button" className={styles.lien} disabled={pending} onClick={() => setDemande(false)}>
        {t("Annuler")}
      </button>
      {erreur && <em className={styles.erreur}>{erreur}</em>}
    </span>
  );
}
