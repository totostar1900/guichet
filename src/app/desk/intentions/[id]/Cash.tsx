"use client";

import { useActionState } from "react";
import { useT } from "@/i18n/client";
import { fmt, fmtDate, fmtDateTime } from "@/lib/format";
import type { CashEntry } from "@/lib/domain/cash";
import { recordProvision, recordRestitution, type CashResult } from "./cash-actions";
import styles from "./page.module.css";

/**
 * Les espèces du client, vues du desk.
 *
 * Trois chiffres et deux gestes. Le solde, ce que la maison doit en tout. La
 * part affectée à une opération vivante, qui est du règlement. Et ce qui ne va
 * nulle part, qui doit repartir, parce que le garder ressemble à un dépôt que la
 * maison n'a pas l'agrément de recevoir.
 *
 * Le montant d'une restitution ne se saisit pas : il se calcule. Le laisser
 * taper ouvrirait l'écart entre ce que la maison doit et ce qu'elle rend, et
 * c'est l'écart que ce journal existe pour fermer.
 */
export function Cash({ intentId, ref_, position }: { intentId: string; ref_: string; position: { balance: number; assigned: number; idle: number; idleSince?: string; toRestore: number; entries: CashEntry[] } }) {
  const t = useT();
  const [prov, provAction, provPending] = useActionState<CashResult | null, FormData>(recordProvision, null);
  const [rest, restAction, restPending] = useActionState<CashResult | null, FormData>(recordRestitution, null);
  const p = position;
  return (
    <div className={styles.cash}>
      <div className={styles.cashHead}>
        <b>{t("Espèces du client")}</b>
        <span className="muted">{t("Ce que la maison lui doit, et à quoi c'est destiné")}</span>
      </div>
      <div className={styles.cashFigures}>
        <div>
          <span>{t("Solde")}</span>
          <b>{fmt(Math.round(p.balance))}</b>
        </div>
        <div>
          <span>{t("Affecté à une opération")}</span>
          <b>{fmt(Math.round(p.assigned))}</b>
        </div>
        <div className={p.idle > 0 ? styles.cashIdle : undefined}>
          <span>{t("Sans destination")}</span>
          <b>{fmt(Math.round(p.idle))}</b>
          {p.idleSince && <small>{t("depuis le {d}", { d: fmtDate(p.idleSince) })}</small>}
        </div>
      </div>

      <form action={provAction} className={styles.cashForm}>
        <input type="hidden" name="intentId" value={intentId} />
        <label>
          <span>{t("Provision reçue pour {r}", { r: ref_ })}</span>
          <input name="amount" inputMode="numeric" placeholder="1 000 000" required />
        </label>
        <label>
          <span>{t("Affectée jusqu'au")}</span>
          <input name="dueBy" type="date" />
        </label>
        <button className="btn sm" type="submit" disabled={provPending}>
          {t(provPending ? "…" : "Inscrire")}
        </button>
      </form>
      {prov && <small className={prov.ok ? styles.cashOk : styles.cashErr}>{prov.ok ? prov.message : prov.error}</small>}

      {p.toRestore > 0 && (
        <form action={restAction} className={styles.cashForm}>
          <input type="hidden" name="intentId" value={intentId} />
          <span className={styles.cashWarn}>{t("{m} FCFA sans destination : à renvoyer sur le compte du client.", { m: fmt(Math.round(p.toRestore)) })}</span>
          <button className="btn sm" type="submit" disabled={restPending}>
            {t(restPending ? "…" : "Restituer")}
          </button>
        </form>
      )}
      {rest && <small className={rest.ok ? styles.cashOk : styles.cashErr}>{rest.ok ? rest.message : rest.error}</small>}

      {p.entries.length > 0 && (
        <ul className={styles.cashList}>
          {p.entries.map((e) => (
            <li key={e.id}>
              <span className={styles.when}>{fmtDateTime(e.at)}</span>
              <span>
                {t(e.label)}
                {e.dueBy ? ` · ${t("jusqu'au {d}", { d: fmtDate(e.dueBy) })}` : ""}
              </span>
              <b>{fmt(Math.round(e.amount))}</b>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
