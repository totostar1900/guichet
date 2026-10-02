"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useT } from "@/i18n/client";
import { Select } from "@/components/ui/Select";
import { groupedInput } from "@/lib/ui/grouped";
import { fmt, fmtDate } from "@/lib/format";
import { createStandingAction, stopStandingAction, type StandingResult } from "@/app/moi/standing-actions";
import styles from "./Standing.module.css";

function Msg({ state }: { state: StandingResult | null }) {
  if (!state) return null;
  return <small className={state.ok ? styles.ok : styles.err}>{state.ok ? state.message : state.error}</small>;
}

/**
 * Programmer un versement mensuel.
 *
 * Le formulaire ne demande que ce qui décidera des versements à venir : combien,
 * quel jour, jusqu'à quand, et ce qu'on fait si un mois l'exécution est
 * impossible. La destination n'y figure pas comme un choix : c'est la ligne
 * qu'on regarde, et elle est fixée à la signature. C'est une contrainte
 * réglementaire et non une simplification : le jour où la maison choisirait la
 * destination d'un versement, elle gérerait au lieu d'exécuter.
 *
 * La dernière question est celle qu'on oublie, et c'est la plus importante :
 * décider d'avance ce qui se passe quand ça bloque. Un fonds suspendu, un
 * minimum relevé. Le client répond maintenant, sinon quelqu'un devra répondre à
 * sa place le jour venu.
 */
export function StandingForm({ offerId, minimum, unit = "FCFA" }: { offerId: string; minimum: number; unit?: string }) {
  const t = useT();
  const [state, action, pending] = useActionState<StandingResult | null, FormData>(createStandingAction, null);
  /* Le montant est tenu en etat : il se regroupe pendant la frappe. */
  const [montant, setMontant] = useState(minimum ? String(minimum) : "");
  if (state?.ok) {
    return (
      <div className={styles.done}>
        <b>{state.message}</b>
        <Link href="/">{t("Voir mes versements programmés")} →</Link>
      </div>
    );
  }
  return (
    <form action={action} className={styles.form}>
      <input type="hidden" name="offerId" value={offerId} />
      <div className={styles.row}>
        <label className="field">
          {t("Montant du versement")} : {unit}
          {/* Les milliers se séparent pendant la frappe. Le champ n'est plus de
              type « number » : un champ numérique refuse les espaces, donc il
              refuserait son propre affichage. */}
          <input name="amount" value={montant} {...groupedInput(setMontant)} inputMode="numeric" autoComplete="off" required />
          {minimum > 0 && <small className="muted">{t("minimum {n}", { n: fmt(minimum) })}</small>}
        </label>
        <label className="field">
          {t("Chaque mois, le")}
          <input name="dayOfMonth" type="number" min={1} max={28} step={1} defaultValue={5} required />
          <small className="muted">{t("du 1 au 28 : tous les mois ont ces jours-là")}</small>
        </label>
      </div>
      <div className={styles.row}>
        <label className="field">
          {t("Jusqu'au (facultatif)")}
          <input name="endsOn" type="date" />
          <small className="muted">{t("sans date, le versement court jusqu'à ce que vous l'arrêtiez")}</small>
        </label>
        <label className="field">
          {t("Si un mois l'exécution est impossible")}
          {/* La liste de la maison, pas celle du téléphone. */}
          <Select
            block
            name="onBlocked"
            value="passer"
            options={[
              { value: "passer", label: t("passer ce versement et continuer") },
              { value: "arreter", label: t("arrêter le versement programmé") },
            ]}
          />
        </label>
      </div>
      <button className="btn" type="submit" disabled={pending}>
        {t(pending ? "…" : "Programmer ce versement")}
      </button>
      <Msg state={state} />
    </form>
  );
}

export interface StandingRow {
  id: string;
  ref: string;
  title: string;
  href: string;
  amount: number;
  dayOfMonth: number;
  /** D'où vient l'argent : un virement mensuel, ou les encaissements du client. */
  source?: "virement" | "encaissements";
  /** Le plancher d'un réinvestissement, en deçà duquel on attend le coupon suivant. */
  minAmount?: number;
  state: string;
  stateLabel: string;
  next: string | null;
  lastRunOn?: string;
  endsOn?: string;
  stopReason?: string;
}

/** Ce qui est programmé, et le bouton pour l'arrêter. */
export function StandingList({ rows }: { rows: StandingRow[] }) {
  const t = useT();
  const [state, action, pending] = useActionState<StandingResult | null, FormData>(stopStandingAction, null);
  if (!rows.length) return null;
  return (
    <div className={styles.list}>
      {rows.map((s) => (
        <div key={s.id} className={styles.item}>
          <div className={styles.what}>
            {/* Un réinvestissement n'a ni montant ni jour du mois : afficher
                « 0 FCFA le 1 de chaque mois » décrirait une instruction que
                personne n'a donnée. Il dit donc ce qu'il fait vraiment. */}
            <b>
              {s.source === "encaissements"
                ? t("Vos encaissements, replacés dès qu'ils arrivent")
                : `${fmt(s.amount)} FCFA · ${t("le {d} de chaque mois", { d: String(s.dayOfMonth) })}`}
            </b>
            <Link href={s.href}>{s.title}</Link>
            <small className="muted">
              <span className="mono">{s.ref}</span>
              {s.source === "encaissements"
                ? s.minAmount
                  ? ` · ${t("à partir de {m} FCFA encaissés", { m: fmt(s.minAmount) })}`
                  : ` · ${t("quel que soit le montant")}`
                : s.next
                  ? ` · ${t("prochain versement le {d}", { d: fmtDate(s.next) })}`
                  : ""}
              {s.endsOn ? ` · ${t("jusqu'au {d}", { d: fmtDate(s.endsOn) })}` : ""}
              {s.lastRunOn ? ` · ${t("dernier versement le {d}", { d: fmtDate(s.lastRunOn) })}` : ""}
              {s.stopReason ? ` · ${s.stopReason}` : ""}
            </small>
          </div>
          {s.state === "active" ? (
            <form action={action}>
              <input type="hidden" name="id" value={s.id} />
              <button className="btn sm ghost" type="submit" disabled={pending}>
                {t("Arrêter")}
              </button>
            </form>
          ) : (
            <span className="muted">{t(s.stateLabel)}</span>
          )}
        </div>
      ))}
      <Msg state={state} />
    </div>
  );
}
