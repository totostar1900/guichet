"use client";

import { useActionState, useState } from "react";
import { useT } from "@/i18n/client";
import type { CoordonneesDeReglement } from "@/lib/domain/reglement";
import { enregistrerReglementAction, jeterReglementAction, publierReglementAction, type ReglementResult } from "./actions";
import styles from "./page.module.css";

/**
 * LES QUATRE LIGNES, DANS L'ORDRE OÙ LA BANQUE DU CLIENT LES DEMANDE.
 *
 * C'est le même ordre que sur l'écran du client — bénéficiaire, banque, RIB,
 * puis le motif, qui n'est pas ici parce qu'il se calcule par client. Saisir
 * dans un ordre et faire recopier dans un autre ferait relire deux fois.
 *
 * LE BROUILLON SE VOIT À CÔTÉ DE CE QUI EST EN LIGNE, et c'est tout l'objet de
 * la page : publier un RIB sans avoir sous les yeux celui qu'il remplace, c'est
 * accepter un numéro sans le comparer. Les deux colonnes marquent les lignes
 * qui changent.
 */
export function ReglementForm({ actuel, brouillon, parQui, cestMoi, seul }: { actuel: CoordonneesDeReglement; brouillon?: CoordonneesDeReglement; parQui?: string; /** Le brouillon est de la personne qui regarde. */ cestMoi: boolean; /** Personne d'autre ne peut publier : le geste passera seul, et se dira. */ seul: boolean }) {
  const t = useT();
  const [state, action, pending] = useActionState<ReglementResult | null, FormData>(enregistrerReglementAction, null);
  const [pub, publier, enCours] = useActionState<ReglementResult | null, FormData>(publierReglementAction, null);
  const depart = brouillon ?? actuel;
  const [v, setV] = useState({ beneficiaire: depart.beneficiaire, banque: depart.banque, rib: depart.rib, bic: depart.bic ?? "" });
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: e.target.value });

  return (
    <>
      <form action={action} className={styles.form}>
        <div className={styles.champs}>
          <label>
            <span>{t("Bénéficiaire")}</span>
            <input name="beneficiaire" value={v.beneficiaire} onChange={set("beneficiaire")} maxLength={140} />
            <small>{t("Tel qu'il doit être tapé chez la banque du client.")}</small>
          </label>
          <label>
            <span>{t("Banque du bénéficiaire")}</span>
            <input name="banque" value={v.banque} onChange={set("banque")} maxLength={140} />
            <small>{t("Le nom tel qu'il figure sur un relevé.")}</small>
          </label>
          <label>
            <span>{t("RIB / IBAN")}</span>
            <input name="rib" className="mono" value={v.rib} onChange={set("rib")} maxLength={60} />
            <small>{t("Lettres, chiffres, espaces, points, tirets et barres. Aucun contrôle de clef IBAN : un RIB de la zone n'en porte pas toujours.")}</small>
          </label>
          <label>
            <span>
              {t("BIC / SWIFT")} <i>{t("facultatif")}</i>
            </span>
            <input name="bic" className="mono" value={v.bic} onChange={set("bic")} maxLength={11} />
            <small>{t("8 ou 11 caractères. Sans lui, un client de la diaspora ne peut pas virer depuis l'étranger.")}</small>
          </label>
        </div>
        <label className={styles.pourquoi}>
          <span>{t("Pourquoi ce changement")}</span>
          <input name="quoi" maxLength={200} placeholder={t("changement de banque de règlement, nouveau compte ségrégué…")} />
        </label>
        <div className={styles.row}>
          <button className="btn sm" type="submit" disabled={pending}>
            {t(pending ? "…" : "Enregistrer en brouillon")}
          </button>
          {state && <span className={state.ok ? styles.ok : styles.ko}>{state.ok ? t(state.message) : t(state.error)}</span>}
        </div>
      </form>

      {brouillon && (
        <div className={styles.attente}>
          <b>{t("Un brouillon attend")}</b>
          <p className="muted">
            {parQui ? t("Écrit par {q}.", { q: parQui }) : ""}{" "}
            {cestMoi && !seul
              ? t("Vous l'avez écrit : une autre personne du desk doit le publier. C'est la règle des quatre yeux, et elle regarde la personne, pas le rôle.")
              : cestMoi && seul
                ? t("Vous l'avez écrit, et aucun autre responsable n'est en poste : la publication passera seule, et elle sera dite au journal.")
                : t("Vous ne l'avez pas écrit : vous pouvez le publier.")}
          </p>
          <ul className={styles.diff}>
            {(
              [
                ["Bénéficiaire", actuel.beneficiaire, brouillon.beneficiaire],
                ["Banque du bénéficiaire", actuel.banque, brouillon.banque],
                ["RIB / IBAN", actuel.rib, brouillon.rib],
                ["BIC / SWIFT", actuel.bic ?? "", brouillon.bic ?? ""],
              ] as [string, string, string][]
            ).map(([quoi, avant, apres]) => (
              <li key={quoi} className={avant === apres ? undefined : styles.bouge}>
                <span className={styles.quoi}>{t(quoi)}</span>
                <span className={styles.avant}>{avant || t("— rien —")}</span>
                <span className={styles.apres}>{apres || t("— rien —")}</span>
              </li>
            ))}
          </ul>
          <form action={publier} className={styles.row}>
            <label className={styles.mot}>
              <span>{t("Recopiez « publier »")}</span>
              <input name="mot" autoComplete="off" />
            </label>
            <button className="btn sm primary" type="submit" disabled={enCours}>
              {t(enCours ? "…" : "Publier ces coordonnées")}
            </button>
            {/* Le refus se lit ici, à côté du bouton. La RÉUSSITE, elle, se lit
                plus bas : voir le bloc qui suit. */}
            {pub && !pub.ok && <span className={styles.ko}>{t(pub.error)}</span>}
          </form>
          <button className="btn sm" type="button" onClick={() => void jeterReglementAction()}>
            {t("Jeter le brouillon")}
          </button>
        </div>
      )}

      {/* LA CONFIRMATION SURVIT AU BROUILLON QU'ELLE CONFIRME.
          Relevé en jouant le parcours le 25 octobre 2026 : le message de
          réussite vivait DANS le bloc du brouillon, et publier efface ce
          brouillon — donc le bloc, donc le message. La personne qui venait de
          changer la destination de l'argent de toute la clientèle ne lisait
          rien du tout : la page se réécrivait en silence, et seule la ligne
          « Publié le… » du panneau d'au-dessus disait que quelque chose avait
          eu lieu. */}
      {pub?.ok && <p className={`${styles.ok} ${styles.fait}`}>{t(pub.message)}</p>}
    </>
  );
}
