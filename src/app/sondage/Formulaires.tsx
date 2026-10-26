"use client";

import { useActionState, useState, useTransition } from "react";
import { useT } from "@/i18n/client";
import { Select } from "@/components/ui/Select";
import { groupedInput } from "@/lib/ui/grouped";
import { INSTRUMENTS_SONDES, gabarit, type InstrumentSonde } from "@/lib/domain/sondage";
import { PAYS_CEMAC } from "@/lib/market/budget";
import { deposerLaLigne, retirerLaLigne, type SondageResult } from "./actions";
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

export function Repondre({ question }: { question: { id: string; instrument: InstrumentSonde; mot: "coupon" | "taux" } }) {
  const t = useT();
  const [state, action, pending] = useActionState<SondageResult | null, FormData>(deposerLaLigne, null);
  const [montant, setMontant] = useState("");
  const [ouvert, setOuvert] = useState(false);

  if (state?.ok) return <p className={styles.recu}>{t(state.message)}</p>;

  if (!ouvert)
    return (
      <button type="button" className="btn primary" onClick={() => setOuvert(true)}>
        {t("Je serais preneur")}
      </button>
    );

  return (
    <form action={action} className={styles.form}>
      <input type="hidden" name="repondA" value={question.id} />
      <input type="hidden" name="instrument" value={question.instrument} />
      <div className={styles.deux}>
        <label className="field">
          {t("Ce que vous prendriez (FCFA)")}
          <input name="montant" inputMode="numeric" placeholder="50 000 000" value={montant} {...groupedInput(setMontant)} required />
        </label>
        {/* LE NIVEAU EST FACULTATIF, et c'est voulu : « je prendrais cinquante
            millions quel que soit le taux » est une réponse, et c'est même la
            plus utile au Trésor — elle tient à n'importe quel niveau. */}
        <label className="field">
          {t(question.mot === "taux" ? "Au taux d'au moins (%)" : "Au coupon d'au moins (%)")}
          <input name="rate" type="number" step="0.01" placeholder="6,25" />
          <small className="muted">{t("Facultatif : sans condition, votre réponse tient quel que soit le niveau.")}</small>
        </label>
      </div>
      <label className="field">
        {t("Prêt à partir de (jours)")}
        <input name="dansJours" type="number" min="0" max="365" placeholder="21" required />
        <small className="muted">{t("Une séance tenue avant ce délai vous trouverait sans fonds : c'est pour cela qu'on vous le demande.")}</small>
      </label>
      {!state?.ok && state?.error && <em className={styles.erreur}>{state.error}</em>}
      <div className={styles.boutons}>
        <button type="submit" className="btn primary" disabled={pending}>
          {t(pending ? "Un instant…" : "Dire au desk")}
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

export function ProposerMaLigne() {
  const t = useT();
  const [state, action, pending] = useActionState<SondageResult | null, FormData>(deposerLaLigne, null);
  const [instrument, setInstrument] = useState<InstrumentSonde>("OTA");
  const [country, setCountry] = useState("Cameroun");
  const [montant, setMontant] = useState("");
  const [ouvert, setOuvert] = useState(false);
  const champs = gabarit(instrument);
  const aide = (cle: string) => champs.find((c) => c.cle === cle)?.aide ?? "";

  if (state?.ok)
    return (
      <p className={styles.recu}>
        {t(state.message)} <span className="mono">{state.ref}</span>
      </p>
    );

  if (!ouvert)
    return (
      <button type="button" className="btn primary" onClick={() => setOuvert(true)}>
        {t("Remplir le gabarit")}
      </button>
    );

  return (
    <form action={action} className={styles.form}>
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
        <label className="field">
          {t("La durée")}
          <input name="tenor" placeholder={instrument === "BTA" ? "52 semaines" : "5 ans"} required />
          <small className="muted">{t(aide("tenor"))}</small>
        </label>
      </div>
      <div className={styles.deux}>
        <label className="field">
          {t(instrument === "BTA" ? "Le taux que vous accepteriez, au moins (%)" : "Le coupon que vous attendez, au moins (%)")}
          <input name="rate" type="number" step="0.01" placeholder="6,50" />
          <small className="muted">{t(aide("rate"))}</small>
        </label>
        {instrument === "OTA" && (
          <label className="field">
            {t("Le prix que vous accepteriez, au plus (%)")}
            <input name="pricePct" type="number" step="0.01" placeholder="100" />
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
          <input name="dansJours" type="number" min="0" max="365" placeholder="60" required />
          <small className="muted">{t(aide("quand"))}</small>
        </label>
      </div>
      <label className="field">
        {t("Ce que le desk doit savoir (facultatif)")}
        <textarea name="note" rows={2} maxLength={600} placeholder={t("Pourquoi cette ligne, ou ce qui vous ferait changer d'avis.")} />
      </label>
      {!state?.ok && state?.error && <em className={styles.erreur}>{state.error}</em>}
      <div className={styles.boutons}>
        <button type="submit" className="btn primary" disabled={pending}>
          {t(pending ? "Un instant…" : "Envoyer au desk")}
        </button>
        <button type="button" className="btn ghost" onClick={() => setOuvert(false)}>
          {t("Annuler")}
        </button>
      </div>
    </form>
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
  return (
    <>
      {/* LA RÉFÉRENCE SORT DU LIBELLÉ et passe au nom accessible. Elle figure
          déjà au bout de la ligne du dessus ; écrite ici une seconde fois, elle
          faisait un lien de quarante signes pour un mot. Un lecteur d'écran, lui,
          a besoin qu'elle y soit : « Retirer » annoncé trois fois de suite
          n'annonce rien. */}
      <button
        type="button"
        className={styles.retirer}
        disabled={pending}
        aria-label={t("Retirer l'attente {r}", { r: ref_ })}
        onClick={() =>
          start(async () => {
            const r = await retirerLaLigne(id);
            if (!r.ok) setErreur(r.error ?? t("Retrait impossible."));
          })
        }
      >
        {t(pending ? "Un instant…" : "Retirer")}
      </button>
      {erreur && <em className={styles.erreur}>{erreur}</em>}
    </>
  );
}
