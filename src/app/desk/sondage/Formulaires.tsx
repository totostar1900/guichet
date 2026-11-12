"use client";

import { useActionState, useId, useState } from "react";
import { ConfirmPublish } from "@/components/desk/ConfirmPublish";
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
  const [tenor, setTenor] = useState("");
  const [rate, setRate] = useState("");
  const [pricePct, setPricePct] = useState("");
  const [seanceLe, setSeanceLe] = useState("");
  const [dansJours, setDansJours] = useState("");
  const [note, setNote] = useState("");
  const formId = useId();

  /* LA RELECTURE AVANT D'ENGAGER LA PAROLE DE LA MAISON (12 novembre 2026) : poser une question la publie à tous les clients, et on ne la retire qu'en la clôturant. Le bouton ne pose plus : il ouvre une relecture qui redit la ligne, le montant, l'horizon et ce que les clients liront. */
  const horizon = seanceLe ? t("À partir du {d}", { d: seanceLe }) : dansJours ? t("Dans {n} jours", { n: dansJours }) : t("Sans horizon précisé");
  const lines = [
    t("Question : {i} · {c} · {d}", { i: instrument, c: t(country), d: tenor || "—" }),
    t("Montant cherché : {m} FCFA", { m: montant || "—" }),
    ...(rate ? [t(instrument === "BTA" ? "Taux indicatif : {r} %" : "Coupon indicatif : {r} %", { r: rate })] : []),
    ...(instrument === "OTA" && pricePct ? [t("Prix indicatif : {p} %", { p: pricePct })] : []),
    horizon,
    t("Elle paraît dès maintenant sur la page de tous les clients. On ne la retire qu'en la clôturant."),
    ...(note.trim() ? [t("Ce que les clients liront : « {n} »", { n: note.trim() })] : []),
  ];

  return (
    <form id={formId} action={action} className={styles.form}>
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
          <input name="tenor" placeholder={instrument === "BTA" ? "52 semaines" : "5 ans"} value={tenor} onChange={(e) => setTenor(e.target.value)} required />
        </label>
        <label className="field">
          {t(instrument === "BTA" ? "Taux indicatif (%)" : "Coupon indicatif (%)")}
          <input name="rate" inputMode="decimal" placeholder="6,25" value={rate} onChange={(e) => setRate(e.target.value)} />
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
            <input name="pricePct" inputMode="decimal" placeholder="97" value={pricePct} onChange={(e) => setPricePct(e.target.value)} />
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
          <input name="seanceLe" type="date" value={seanceLe} onChange={(e) => setSeanceLe(e.target.value)} />
        </label>
        <label className="field">
          {t("…ou dans (jours)")}
          <input name="dansJours" type="number" min="0" max="365" placeholder="21" value={dansJours} onChange={(e) => setDansJours(e.target.value)} />
        </label>
      </div>
      <label className="field">
        {t("Ce que les clients doivent savoir")}
        <textarea name="note" rows={2} maxLength={600} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("Pourquoi cette ligne est sondée, et ce qu'on attend d'eux.")} />
      </label>
      {state && <em className={state.ok ? styles.ok : styles.erreur}>{state.ok ? state.message : state.error}</em>}
      <ConfirmPublish form={formId} label={t("Poser la question")} title={t("Poser cette question aux clients ?")} lines={lines} confirmLabel={t("Poser la question")} className="btn primary" disabled={!tenor.trim() || !montant.trim()} pending={pending} />
    </form>
  );
}

/**
 * CLORE UNE LIGNE SONDÉE, EN DEUX TEMPS (12 novembre 2026).
 *
 * Le motif se saisit sur la ligne, puis « Clore » ouvre une relecture : la ligne, le nombre de réponses qui la suivent dans la clôture, et la phrase que le client lira
 * sur sa page. « Portée au Trésor » n'est plus offerte au desk : le geste de clôturer est le seul qui reste.
 */
export function Statuer({ id, ref_, reponses = 0 }: { id: string; ref_: string; reponses?: number }) {
  const t = useT();
  const [state, action, pending] = useActionState<DeskSondageResult | null, FormData>(statuerSurLaLigne, null);
  const [motif, setMotif] = useState("");
  const formId = useId();

  if (state?.ok) return <em className={styles.ok}>{state.message}</em>;

  return (
    <form id={formId} action={action} className={styles.statuer}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="etat" value="close" />
      {/* LE MOTIF EST DEMANDÉ, et il est lu : le client le lit sur sa page, et une attente qui disparaît sans un mot est une attente qu'on ne redonnera pas. */}
      <input name="motif" value={motif} onChange={(e) => setMotif(e.target.value)} placeholder={t("Pourquoi ({r})", { r: ref_ })} className={styles.motif} />
      <ConfirmPublish
        form={formId}
        label={t("Clore")}
        title={t("Clore la ligne {r} ?", { r: ref_ })}
        lines={[
          t("La ligne {r} est close.", { r: ref_ }),
          ...(reponses > 0 ? [t("Les {n} réponses qui la suivent sont closes avec elle.", { n: String(reponses) })] : []),
          t("Les clients concernés lisent ce motif sur leur page : « {m} »", { m: motif.trim() || "—" }),
        ]}
        confirmLabel={t("Clore la ligne")}
        className={styles.lien}
        disabled={motif.trim().length < 3}
        pending={pending}
      />
      {state && !state.ok && <em className={styles.erreur}>{state.error}</em>}
    </form>
  );
}
