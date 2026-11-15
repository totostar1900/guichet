"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useDates, useT } from "@/i18n/client";
import { fmt } from "@/lib/format";
import { stopStandingAction, type StandingResult } from "@/app/moi/standing-actions";
import styles from "./Standing.module.css";

function Msg({ state }: { state: StandingResult | null }) {
  if (!state) return null;
  return <small className={state.ok ? styles.ok : styles.err}>{state.ok ? state.message : state.error}</small>;
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
  /** Comment l'épargne est payée, lu dans ses mandats (voir « paiementDeLEpargne »). */
  paiement?: "prelevement" | "mandat_a_signer" | "copie_attendue" | "en_verification" | "copie_refusee" | "virement";
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

/**
 * CE QUI EST PROGRAMMÉ, ET LE BOUTON POUR LE RETIRER (décision du 15 novembre 2026, maquette « Épargne » : 1A · 2A · 3 OK · 4 28).
 *
 * UN RETRAIT, PAS DE MODIFICATION : pour changer un montant ou un jour, on retire et on remet en place. Une instruction retirée ne se consulte plus :
 * les ordres qu'elle a produits restent dans « Mes ordres » avec leurs avis, et le desk garde tout (audit).
 *
 * UNE INSTRUCTION SUSPENDUE RESTE VISIBLE, avec sa raison : un versement qui cesse de partir sans que le client le sache est un devoir caché.
 * Les autres états (arrêtée, terminée, remplacée) ne s'affichent plus.
 */
export function StandingList({ rows, vide }: { rows: StandingRow[]; vide?: React.ReactNode }) {
  const { fmtDate } = useDates();
  const t = useT();
  const [state, action, pending] = useActionState<StandingResult | null, FormData>(stopStandingAction, null);
  /* L'instruction dont on vient de demander le retrait, et qui attend un oui. */
  const [aRetirer, setARetirer] = useState<string | null>(null);
  if (!rows.length) return null;
  const montrees = rows.filter((x) => x.state === "active" || x.state === "suspendue");
  /* La page vide vient d'être rendue de nouveau après un retrait : la confirmation « retirée » se dit quand même, au-dessus de l'état vide. */
  if (!montrees.length) {
    return (
      <>
        <Msg state={state} />
        {vide}
      </>
    );
  }
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
            </small>
            {s.state === "suspendue" && (
              <>
                <em className={styles.suspendue}>{t(s.stateLabel)}</em>
                {s.stopReason && <small className={styles.attente}>{s.stopReason}</small>}
              </>
            )}
            {/* La clé se lit en entier : « 60 % ici, 40 % là » est l'ordre du
                client, et le résumer à la première destination le trahirait. */}
            {/* « ACTIVE » NE DIT PAS SI QUELQUE CHOSE PARTIRA (audit « signature du mandat d'une épargne », 11 novembre 2026) : un mandat préparé mais pas signé ne prélève rien. La ligne le dit, avec le chemin pour signer. */}
            {s.source !== "encaissements" && s.state === "active" && s.paiement === "mandat_a_signer" && (
              <small className={styles.attente}>
                {t("En attente du mandat : rien ne sera prélevé tant qu'il n'est pas signé.")}{" "}
                <Link href={`/moi/prelevements?instruction=${s.id}&de=epargne`}>{t("Signer le mandat")} →</Link>
              </small>
            )}
            {/* LA COPIE SIGNÉE À LA MAIN CONDITIONNE LE PREMIER PRÉLÈVEMENT (15 novembre 2026) : l'étape se dit sur l'épargne, avec le chemin pour la franchir. */}
            {s.source !== "encaissements" && s.state === "active" && (s.paiement === "copie_attendue" || s.paiement === "copie_refusee") && (
              <small className={styles.attente}>
                {t(s.paiement === "copie_refusee" ? "La copie signée a été refusée : renvoyez-en une. Rien n'est prélevé tant qu'elle n'est pas vérifiée." : "Mandat signé par code : il reste à envoyer la copie signée à la main. Rien n'est prélevé avant sa vérification.")}{" "}
                <Link href={`/moi/prelevements?instruction=${s.id}&de=epargne#mandat`}>{t(s.paiement === "copie_refusee" ? "Renvoyer une copie" : "Envoyer ma copie")} →</Link>
              </small>
            )}
            {s.source !== "encaissements" && s.state === "active" && s.paiement === "en_verification" && <small className={styles.attente}>{t("Copie reçue : nous la vérifions. Le premier prélèvement part dès qu'elle est validée.")}</small>}
            {s.source !== "encaissements" && s.state === "active" && s.paiement === "prelevement" && <small className="muted">{t("Payée par prélèvement.")}</small>}
            {s.source !== "encaissements" && s.state === "active" && s.paiement === "virement" && <small className="muted">{t("Payée par virement, sur appel de fonds.")}</small>}
            {s.splits && s.splits.length > 1 && <small className={styles.cleDite}>{s.splits.map((x) => `${x.pct} % ${x.title}`).join(" · ")}</small>}
          </div>
          {/* RETIRER SE CONFIRME : un doigt qui glisse ne retire pas un versement mensuel. La confirmation tient sur place, sans fenêtre, et dit ce qui reste : les ordres passés, et le mandat qui n'est pas révoqué. */}
          {aRetirer === s.id ? (
            <form action={action} className={styles.confirme}>
              <input type="hidden" name="id" value={s.id} />
              <span>
                {s.source === "encaissements"
                  ? t("Retirer cette instruction ? Elle ne figurera plus dans votre liste. Les ordres déjà passés restent dans Mes ordres.")
                  : t("Retirer cette épargne ? Elle ne figurera plus dans votre liste. Les ordres déjà passés restent dans Mes ordres, et votre mandat de prélèvement n'est pas révoqué.")}
              </span>
              <button className="btn sm" type="submit" disabled={pending}>
                {t("Oui, retirer")}
              </button>
              <button className="btn sm ghost" type="button" onClick={() => setARetirer(null)}>
                {t("Annuler")}
              </button>
            </form>
          ) : (
            <div className={styles.actes}>
              <button className="btn sm ghost" type="button" onClick={() => setARetirer(s.id)}>
                {t("Retirer")}
              </button>
            </div>
          )}
        </div>
      ))}
      <Msg state={state} />
    </div>
  );
}
