import { getT } from "@/i18n/server";
import { counterLapsed, counterTerms, untilText } from "@/lib/domain/counter";
import type { Intent, Offer } from "@/lib/domain/types";
import { answerCounter } from "./counter-actions";
import styles from "./page.module.css";

/**
 * La contre-proposition, telle que le client la décide.
 *
 * C'est ici que l'ordre change, et nulle part ailleurs. Le desk a fait une
 * offre ; l'accepter la transforme en ordre, la refuser rend l'ordre tel qu'il
 * était. Les deux boutons ont donc le même poids visuel : on ne pousse pas.
 *
 * L'échéance est dite en clair, et une proposition périmée ne montre plus de
 * bouton : accepter un prix qui n'a plus cours ne serait un service pour
 * personne.
 */
export async function CounterAnswer({ intent, offer, now }: { intent: Intent; offer: Offer; now: Date }) {
  const t = await getT();
  const c = intent.counter;
  if (!c) return null;
  const lapsed = counterLapsed(c, now);

  return (
    <div className={styles.counter}>
      <div className={styles.counterHead}>
        <b>{t("Nous vous proposons d'autres conditions")}</b>
        <span>{lapsed ? t("Proposition expirée le {d}", { d: untilText(c) }) : t("À décider avant le {d}", { d: untilText(c) })}</span>
      </div>
      {c.note && <p className={styles.counterNote}>{c.note}</p>}
      <dl className={styles.counterTerms}>
        <dt>{t("Ce qui change")}</dt>
        <dd>{counterTerms(c, intent, offer)}</dd>
        <dt>{t("Si vous ne répondez pas")}</dt>
        <dd>{t("votre ordre revient tel qu'il était, et nous en reparlons")}</dd>
      </dl>
      {!lapsed && (
        <div className={styles.counterActions}>
          <form action={answerCounter}>
            <input type="hidden" name="intentId" value={intent.id} />
            <input type="hidden" name="answer" value="oui" />
            <button className="btn primary sm" type="submit">
              {t("J'accepte ces conditions")}
            </button>
          </form>
          <form action={answerCounter}>
            <input type="hidden" name="intentId" value={intent.id} />
            <input type="hidden" name="answer" value="non" />
            <button className="btn sm" type="submit">
              {t("Je garde mon ordre d'origine")}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
