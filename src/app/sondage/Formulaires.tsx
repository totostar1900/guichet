"use client";

import { useActionState, useState, useTransition } from "react";
import { useT } from "@/i18n/client";
import { Select } from "@/components/ui/Select";
import { Sheet } from "@/components/mobile/Sheet";
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
          {t(question.mot === "taux" ? "Au taux d'au moins (%)" : "Au coupon d'au moins (%)")}
          <input name="rate" inputMode="decimal" placeholder="6,25" defaultValue={existante?.rate ?? ""} />
          <small className="muted">{t("Facultatif : sans condition, votre réponse tient quel que soit le niveau.")}</small>
        </label>
      </div>
      <label className="field">
        {t("Prêt à partir de (jours)")}
        <input name="dansJours" type="number" min="0" max="365" placeholder="21" defaultValue={existante?.dansJours ?? ""} required />
        <small className="muted">{t("Une séance tenue avant ce délai vous trouverait sans fonds : c'est pour cela qu'on vous le demande.")}</small>
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
      <Sheet open={ouvert && !accuseFrais} onClose={() => setOuvert(false)} title={t(existante ? "Modifier votre ligne" : "Proposer votre propre ligne")} wide>
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
        {/* LES DEUX SIGLES NUS, ET L'EXPLICATION DESSOUS. Relevé à l'écran le
            26 octobre 2026 : « OTA · obligation du Trésor » dans la liste
            donnait un bouton « Ce que vous cherchez · OTA · obligation du
            Trésor » qui passait à la ligne et perdait sa valeur hors du cadre
            — le client lisait une liste déroulante vide. La valeur choisie
            doit tenir sur la ligne du libellé ; ce qu'un sigle veut dire tient
            dessous, où il a la place. */}
        <div className="field">
          <Select
            name="instrument"
            label={t("Ce que vous cherchez")}
            value={instrument}
            onChange={(v) => setInstrument(v as InstrumentSonde)}
            block
            cherchable={false}
            options={INSTRUMENTS_SONDES.map((i) => ({ value: i, label: i }))}
          />
          <small className="muted">{t(instrument === "OTA" ? "Une obligation du Trésor : elle verse un coupon chaque année, sur plusieurs années." : "Un bon du Trésor : il se vend précompté et se rembourse en une fois, sous un an.")}</small>
        </div>
      </div>
      <div className={styles.deux}>
        <Select name="country" label={t("Le Trésor")} value={country} onChange={setCountry} block cherchable={false} options={PAYS_CEMAC.map((p) => ({ value: p, label: t(p) }))} />
        {/* LA DURÉE SE CHOISIT, ELLE NE S'ÉCRIT PLUS. C'est la demande du
            dirigeant — « plusieurs maturités à choisir » — et cela ferme à la
            source ce qu'on avait appris à réparer après coup : « 5ans », « 5 ANS »
            et « cinq ans » faisaient trois lignes différentes pour la
            consolidation. La liste vient du domaine, qui sait ce qu'un Trésor de
            la zone sert sur chaque compartiment. */}
        <div className="field">
          <Select name="tenor" label={t("La durée")} value={choisie} onChange={setTenorSur} block cherchable={false} options={dureesDe(instrument).map((d) => ({ value: d, label: d }))} />
          <small className="muted">{t(aide("tenor"))}</small>
        </div>
      </div>
      <div className={styles.deux}>
        <label className="field">
          {t(instrument === "BTA" ? "Le taux que vous accepteriez, au moins (%)" : "Le coupon que vous attendez, au moins (%)")}
          <input name="rate" inputMode="decimal" placeholder="6,50" defaultValue={existante?.rate ?? ""} />
          <small className="muted">{t(aide("rate"))}</small>
        </label>
        {instrument === "OTA" && (
          <label className="field">
            {t("Le prix que vous accepteriez, au plus (%)")}
            <input name="pricePct" inputMode="decimal" placeholder="100" defaultValue={existante?.pricePct ?? ""} />
            <small className="muted">{t(aide("pricePct"))}</small>
          </label>
        )}
      </div>
      <div className={styles.deux}>
        <label className="field">
          {t("Ce que vous prendriez (FCFA)")}
          <input name="montant" inputMode="numeric" placeholder="50 000 000" value={montant} {...groupedInput(setMontant)} required />
          <small className="muted">{t(aide("montant"))}</small>
        </label>
        <label className="field">
          {t("Prêt à partir de (jours)")}
          <input name="dansJours" type="number" min="0" max="365" placeholder="60" defaultValue={existante?.dansJours ?? ""} required />
          <small className="muted">{t(aide("quand"))}</small>
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
