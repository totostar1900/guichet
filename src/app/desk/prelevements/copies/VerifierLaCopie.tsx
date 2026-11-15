"use client";

import { useActionState, useState } from "react";
import { Select } from "@/components/ui/Select";
import { useT } from "@/i18n/client";
import { refuserLaCopieAction, validerLaCopieAction } from "../copies-actions";
import type { PrelevementResult } from "../actions";
import styles from "./page.module.css";

/** Les deux gestes d'une vérification : valider, ou refuser avec un motif d'une liste fermée. Un geste à la fois : le motif n'apparaît qu'au refus. */
export function VerifierLaCopie({ id, motifs }: { id: string; motifs: { value: string; label: string }[] }) {
  const t = useT();
  const [oui, validerAct, validant] = useActionState<PrelevementResult | null, FormData>(validerLaCopieAction, null);
  const [non, refuserAct, refusant] = useActionState<PrelevementResult | null, FormData>(refuserLaCopieAction, null);
  const [refus, setRefus] = useState(false);
  const [motif, setMotif] = useState(motifs[0]?.value ?? "");
  const msg = oui ?? non;
  return (
    <div className={styles.gestes}>
      {!refus ? (
        <div className={styles.rangee}>
          <form action={validerAct}>
            <input type="hidden" name="id" value={id} />
            <button className="btn primary" type="submit" disabled={validant}>
              {validant ? "…" : t("Valider le mandat")}
            </button>
          </form>
          <button className="btn" type="button" onClick={() => setRefus(true)}>
            {t("Refuser, avec un motif")}
          </button>
        </div>
      ) : (
        <form action={refuserAct} className={styles.rangee}>
          <input type="hidden" name="id" value={id} />
          <Select block name="motif" value={motif} onChange={setMotif} cherchable={false} options={motifs} label={t("Motif du refus")} />
          <button className="btn primary" type="submit" disabled={refusant}>
            {refusant ? "…" : t("Refuser la copie")}
          </button>
          <button className="btn ghost" type="button" onClick={() => setRefus(false)}>
            {t("Annuler")}
          </button>
        </form>
      )}
      {msg && <p className={msg.ok ? styles.ok : styles.ko}>{msg.ok ? msg.message : msg.error}</p>}
    </div>
  );
}
