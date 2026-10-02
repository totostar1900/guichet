"use client";

import { useActionState, useState } from "react";
import { useT } from "@/i18n/client";
import type { Preavis } from "@/lib/domain/preavis";
import { fmt, fmtDate } from "@/lib/format";
import { arreterLOperation, type ArretResult } from "./arret-actions";
import styles from "./Console.module.css";

/**
 * Ce qui va partir, et le moyen de dire non.
 *
 * Le robot exécutait puis prévenait. Prévenir sans donner le moyen d'arrêter
 * aurait seulement déplacé le problème d'une case : ce bouton est ce qui fait
 * d'un préavis autre chose qu'une information.
 *
 * LA BANDE SE PLACE EN HAUT ET SE LIT D'UN COUP, parce qu'elle expire. Tout le
 * reste de cette page se consulte à loisir ; ceci demande une décision avant
 * demain, et une information qui périme ne se range pas au milieu d'un relevé.
 *
 * Elle dit ce qui part, où, et quand, dans cet ordre, parce que c'est l'ordre
 * des questions : combien, sur quoi, et me reste-t-il le temps.
 */
export function Annonce({ preavis, titres }: { preavis: Preavis[]; titres: Record<string, string> }) {
  const t = useT();
  const [res, action, pending] = useActionState<ArretResult | null, FormData>(arreterLOperation, null);
  const [motif, setMotif] = useState<string | null>(null);

  if (!preavis.length) return null;

  return (
    <section className={styles.annonce}>
      {preavis.map((p) => (
        <div key={p.id} className={styles.annonceLigne}>
          <div>
            <b>
              {t("{m} FCFA partent le {j}", { m: fmt(Math.round(p.amount)), j: fmtDate(p.dueOn) })}
              {" · "}
              {titres[p.standingId] ?? t("votre instruction")}
            </b>
            <small>{t("Selon votre instruction permanente. Sans réponse de votre part, l'ordre part comme prévu.")}</small>
          </div>
          {motif === p.id ? (
            <form action={action} className={styles.annonceForm}>
              <input type="hidden" name="preavisId" value={p.id} />
              <input name="reason" maxLength={240} placeholder={t("Un mot, si vous voulez (facultatif)")} />
              <button type="button" className="btn sm ghost" onClick={() => setMotif(null)}>
                {t("Laisser partir")}
              </button>
              <button className="btn sm primary" type="submit" disabled={pending}>
                {pending ? "…" : t("Confirmer l'arrêt")}
              </button>
            </form>
          ) : (
            <button type="button" className="btn sm" onClick={() => setMotif(p.id)}>
              {t("Ne faites pas ça")}
            </button>
          )}
        </div>
      ))}
      {res && <p className={res.ok ? styles.annonceOk : styles.annonceKo}>{res.ok ? res.message : res.error}</p>}
    </section>
  );
}
