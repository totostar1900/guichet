"use client";

import { useActionState } from "react";
import { useT } from "@/i18n/client";
import { porterAuJournal, type EncaissementResult } from "./actions";
import styles from "./page.module.css";

/**
 * Le seul geste de la page, et son retour à côté de lui.
 *
 * Un message d'enregistrement rendu en haut de l'écran pendant que le bouton
 * est en bas ne se voit jamais : l'opérateur regarde sa ligne, pas l'en-tête.
 * Chaque bouton porte donc sa propre réponse, et le refus « déjà portée » est
 * une bonne nouvelle plutôt qu'une erreur, ce que sa couleur doit dire.
 */
export function Encaisser({ userId, flux }: { userId: string; flux: { cle: string; amount: number; label: string; date: string; titre: string } }) {
  const t = useT();
  const [res, action, pending] = useActionState<EncaissementResult | null, FormData>(porterAuJournal, null);
  return (
    <form action={action} className={styles.encaisser}>
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="flowKey" value={flux.cle} />
      <input type="hidden" name="amount" value={flux.amount} />
      <input type="hidden" name="label" value={flux.label} />
      <input type="hidden" name="date" value={flux.date} />
      <input type="hidden" name="titre" value={flux.titre} />
      <button className="btn sm" type="submit" disabled={pending}>
        {pending ? t("Inscription…") : t("Constater l'encaissement")}
      </button>
      {res && <span className={res.ok ? styles.ok : styles.ko}>{res.ok ? res.message : res.error}</span>}
    </form>
  );
}
