"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useT } from "@/i18n/client";
import { Select } from "@/components/ui/Select";
import { groupedInput } from "@/lib/ui/grouped";
import { fmt, fmtDate } from "@/lib/format";
import { createStandingAction, stopStandingAction, type StandingResult } from "@/app/moi/standing-actions";
import { ModifierInstruction, type FondsChoix } from "./ModifierInstruction";
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
  offerId: string;
  /** La clé du client, quand il en a écrit une : destination et part, dans l'ordre. */
  splits?: { offerId: string; title: string; pct: number }[];
}

/** Ce qui est programmé, et le bouton pour l'arrêter. */
/**
 * LES INSTRUCTIONS ARRÊTÉES SE MASQUENT, ELLES NE SE SUPPRIMENT PAS.
 *
 * Elles portent la trace d'ordres réellement exécutés : un client qui voudrait
 * « faire le ménage » couperait le lien entre son argent et la raison pour
 * laquelle il est parti. Les masquer répond au besoin, qui est de ne pas lire
 * cinq lignes mortes au-dessus de celle qui court, sans couper la piste.
 *
 * Le compte reste visible, parce qu'un repli qui ne dit pas ce qu'il cache fait
 * douter qu'il cache quelque chose.
 */
export function StandingList({ rows, fonds = [] }: { rows: StandingRow[]; fonds?: FondsChoix[] }) {
  const t = useT();
  const [state, action, pending] = useActionState<StandingResult | null, FormData>(stopStandingAction, null);
  const [tout, setTout] = useState(false);
  const [modif, setModif] = useState<string | null>(null);
  if (!rows.length) return null;
  const vivantes = rows.filter((x) => x.state === "active");
  const closes = rows.filter((x) => x.state !== "active");
  const montrees = tout ? [...vivantes, ...closes] : vivantes;
  return (
    <div className={styles.list}>
      {montrees.map((s) => (
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
            {/* La clé se lit en entier : « 60 % ici, 40 % là » est l'ordre du
                client, et le résumer à la première destination le trahirait. */}
            {s.splits && s.splits.length > 1 && <small className={styles.cleDite}>{s.splits.map((x) => `${x.pct} % ${x.title}`).join(" · ")}</small>}
          </div>
          {s.state === "active" ? (
            <div className={styles.actes}>
              {fonds.length > 0 && (
                <button className="btn sm ghost" type="button" onClick={() => setModif(modif === s.id ? null : s.id)}>
                  {t("Modifier")}
                </button>
              )}
              <form action={action}>
                <input type="hidden" name="id" value={s.id} />
                <button className="btn sm ghost" type="submit" disabled={pending}>
                  {t("Arrêter")}
                </button>
              </form>
            </div>
          ) : (
            <span className="muted">{t(s.stateLabel)}</span>
          )}
          {modif === s.id && (
            <ModifierInstruction
              s={{ id: s.id, ref: s.ref, amount: s.amount, dayOfMonth: s.dayOfMonth, minAmount: s.minAmount ?? 0, source: s.source, offerId: s.offerId, splits: s.splits?.map((x) => ({ offerId: x.offerId, pct: x.pct })) }}
              fonds={fonds}
              onClose={() => setModif(null)}
            />
          )}
        </div>
      ))}
      {closes.length > 0 && (
        <button type="button" className={styles.repli} onClick={() => setTout((x) => !x)}>
          {tout ? t("Masquer les instructions arrêtées") : t("Voir les {n} instructions arrêtées", { n: String(closes.length) })}
        </button>
      )}
      <Msg state={state} />
    </div>
  );
}
