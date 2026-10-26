"use client";

import { useActionState, useState } from "react";
import { useT } from "@/i18n/client";
import { Select } from "@/components/ui/Select";
import { groupedInput } from "@/lib/ui/grouped";
import { INSTRUMENTS_SONDES } from "@/lib/domain/sondage";
import { PAYS_CEMAC } from "@/lib/market/budget";
import { poserLaQuestion, statuerSurLaLigne, type DeskSondageResult } from "./actions";
import styles from "./page.module.css";

/**
 * LES DEUX GESTES DU DESK SUR UNE LIGNE SONDÉE : POSER, ET STATUER.
 *
 * CE FICHIER S'EST APPELÉ « Actions.tsx » PENDANT UNE HEURE, et la page du desk
 * rendait 404. Dans un même dossier, « Actions.tsx » et « actions.ts » se
 * disputent l'import « ./actions » : le système de fichiers les distingue, le
 * résolveur du bundler non, et c'est le composant client qui a gagné — donc la
 * page importait des gestes de serveur qui n'existaient pas. Aucune épreuve, ni
 * le typecheck, ni le lint ne l'ont dit : seule la page ouverte dans un
 * navigateur l'a dit, par un 404 sans explication.
 *
 * Il n'y en a pas de troisième, et c'est délibéré. Le desk ne corrige pas la
 * réponse d'un client — elle est à lui, et une demande retouchée par la maison
 * ne serait plus un renseignement. Il pose la question, il constate qu'elle est
 * portée, ou il la clôt en disant pourquoi.
 */

export function PoserUneQuestion() {
  const t = useT();
  const [state, action, pending] = useActionState<DeskSondageResult | null, FormData>(poserLaQuestion, null);
  const [instrument, setInstrument] = useState<string>("OTA");
  const [country, setCountry] = useState("Cameroun");
  const [montant, setMontant] = useState("");

  return (
    <form action={action} className={styles.form}>
      <div className={styles.quatre}>
        <Select
          name="instrument"
          label={t("Compartiment")}
          value={instrument}
          onChange={setInstrument}
          block
          cherchable={false}
          options={INSTRUMENTS_SONDES.map((i) => ({ value: i, label: i }))}
        />
        <Select name="country" label={t("Trésor")} value={country} onChange={setCountry} block cherchable={false} options={PAYS_CEMAC.map((p) => ({ value: p, label: t(p) }))} />
        <label className="field">
          {t("Durée")}
          <input name="tenor" placeholder={instrument === "BTA" ? "52 semaines" : "5 ans"} required />
        </label>
        <label className="field">
          {t(instrument === "BTA" ? "Taux indicatif (%)" : "Coupon indicatif (%)")}
          <input name="rate" type="number" step="0.01" placeholder="6,25" />
        </label>
      </div>
      <div className={styles.quatre}>
        {/* LE PRIX INDICATIF, ET IL N'EST PAS DÉCORATIF : c'est lui qui fait le
            RENDEMENT de la tuile — un coupon de 6,25 % acheté à 97 ne rend pas
            6,25 %. Sans prix, pas de rendement : au pair il serait le coupon.
            Un bon n'en a pas, et la base refuse un prix sur ce compartiment.

            IL OUVRE CETTE LIGNE-CI et non la sienne : seul sur une rangée de
            quatre, il laissait trois colonnes vides (relevé à 1 200 px), et il
            suit ainsi le coupon dont il fait le rendement. */}
        {instrument === "OTA" && (
          <label className="field">
            {t("Prix indicatif (%)")}
            <input name="pricePct" type="number" step="0.01" placeholder="97" />
          </label>
        )}
        <label className="field">
          {t("Montant cherché (FCFA)")}
          <input name="montant" inputMode="numeric" placeholder="500 000 000" value={montant} {...groupedInput(setMontant)} required />
        </label>
        {/* LA DATE OU LE DÉLAI, JAMAIS LES DEUX : la contrainte de la base le
            refuse, parce que deux réponses à « quand » obligeraient la
            consolidation à choisir, et elle choisirait mal.

            ET CE N'EST PAS UNE SÉANCE VISÉE. Le libellé le disait, et la tuile
            du client le répétait : la maison n'adjuge pas, et le sondage ne
            suit aucun calendrier annoncé. Ce que cette date borne est
            l'HORIZON de la question — au-delà, le robot la clôt, parce qu'un
            appétit de l'été ne se porte pas en décembre. C'est le même mot que
            sur la tuile du client, « à partir du », pour la même date. */}
        <label className="field">
          {t("À partir du (date)")}
          <input name="seanceLe" type="date" />
        </label>
        <label className="field">
          {t("…ou dans (jours)")}
          <input name="dansJours" type="number" min="0" max="365" placeholder="21" />
        </label>
      </div>
      <label className="field">
        {t("Ce que les clients doivent savoir")}
        <textarea name="note" rows={2} maxLength={600} placeholder={t("Pourquoi cette ligne est sondée, et ce qu'on attend d'eux.")} />
      </label>
      {state && <em className={state.ok ? styles.ok : styles.erreur}>{state.ok ? state.message : state.error}</em>}
      <button type="submit" className="btn primary" disabled={pending}>
        {t(pending ? "Un instant…" : "Poser la question")}
      </button>
    </form>
  );
}

export function Statuer({ id, ref_ }: { id: string; ref_: string }) {
  const t = useT();
  const [state, action, pending] = useActionState<DeskSondageResult | null, FormData>(statuerSurLaLigne, null);
  const [etat, setEtat] = useState("");

  if (state?.ok) return <em className={styles.ok}>{state.message}</em>;

  return (
    <form action={action} className={styles.statuer}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="etat" value={etat} />
      {/* LE MOTIF N'EST DEMANDÉ QU'À LA CLÔTURE, et il est demandé : le client
          lit cette phrase sur sa page, et une attente qui disparaît sans un mot
          est une attente qu'on ne redonnera pas. */}
      {etat === "close" && <input name="motif" placeholder={t("Pourquoi ({r})", { r: ref_ })} className={styles.motif} />}
      <button type="submit" className={styles.lien} disabled={pending} onClick={() => setEtat("consolidee")}>
        {t("Portée au Trésor")}
      </button>
      <button type="submit" className={styles.lien} disabled={pending} onClick={() => setEtat("close")}>
        {t("Clore")}
      </button>
      {state && !state.ok && <em className={styles.erreur}>{state.error}</em>}
    </form>
  );
}
