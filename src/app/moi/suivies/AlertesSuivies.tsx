"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useDates, useT } from "@/i18n/client";
import { useBulle } from "@/components/mobile/Bulle";
import { annulerUnSeuil, arreterLaSerie, remettreUnSeuil } from "@/app/moi/alertes-actions";
import { fmt } from "@/lib/format";
import styles from "./AlertesSuivies.module.css";

/**
 * LES SÉRIES ET LES SEUILS, SOUS LES LIGNES SUIVIES (planche « Alertes de séance et de seuil », point 3) : un titre par genre d'alerte, un arrêt en un geste, et la remise d'un seuil déjà sonné.
 */
export interface SerieLigne {
  id: string;
  label: string;
}
export interface SeuilLigne {
  id: string;
  offerId: string;
  titre: string;
  nom: string;
  unite: string;
  sens: "au_dessus" | "en_dessous";
  value: number;
  state: "active" | "declenchee";
  firedAt?: string;
  firedValue?: number;
}

const dit = (unite: string, v: number) => (unite === "%" ? `${v.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} %` : `${fmt(v)} FCFA`);

export function AlertesSuivies({ series, seuils }: { series: SerieLigne[]; seuils: SeuilLigne[] }) {
  const t = useT();
  const { fmtDate } = useDates();
  const { dire } = useBulle();
  const router = useRouter();
  const [pending, start] = useTransition();
  const agir = (f: () => Promise<{ ok: boolean; error?: string }>, ok: string) =>
    start(async () => {
      const res = await f();
      dire(res.ok ? ok : t(res.error ?? "L'alerte n'a pas pu être modifiée. Réessayez."));
      if (res.ok) router.refresh();
    });
  return (
    <>
      <section className={styles.groupe} aria-label={t("Séries")}>
        <h2 className={styles.titre}>{t("Séries")}</h2>
        {series.length === 0 ? (
          <p className={styles.vide}>{t("Aucune série suivie. La cloche d'une séance vous prévient de la prochaine du même Trésor.")}</p>
        ) : (
          <ul className={styles.lignes}>
            {series.map((s) => (
              <li key={s.id} className={styles.ligne}>
                <span>
                  <b>{s.label}</b>
                  <small>{t("Prévenu à chaque nouvelle séance, toutes durées.")}</small>
                </span>
                <button type="button" className="btn sm ghost" disabled={pending} onClick={() => agir(() => arreterLaSerie(s.id), t("Série non suivie : plus de message pour {l}.", { l: s.label }))}>
                  {t("Arrêter")}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className={styles.groupe} aria-label={t("Seuils")}>
        <h2 className={styles.titre}>{t("Seuils")}</h2>
        {seuils.length === 0 ? (
          <p className={styles.vide}>{t("Aucun seuil armé. La cloche d'une ligne cotée ou d'un fonds en pose un.")}</p>
        ) : (
          <ul className={styles.lignes}>
            {seuils.map((a) => (
              <li key={a.id} className={styles.ligne}>
                <span>
                  <Link href={`/offres/${a.offerId}`}>
                    <b>{a.titre}</b>
                  </Link>
                  <small>
                    {t(a.sens === "au_dessus" ? "{nom} au-dessus de {v}" : "{nom} en dessous de {v}", { nom: t(a.nom), v: dit(a.unite, a.value) })}
                    {a.state === "declenchee" && a.firedAt ? ` · ${t("franchi le {d}", { d: fmtDate(a.firedAt.slice(0, 10), false) })}${a.firedValue != null ? ` (${dit(a.unite, a.firedValue)})` : ""}` : ""}
                  </small>
                </span>
                {a.state === "declenchee" ? (
                  <button type="button" className="btn sm" disabled={pending} onClick={() => agir(() => remettreUnSeuil(a.id), t("Alerte remise : elle sonnera quand le niveau sera franchi."))}>
                    {t("La remettre")}
                  </button>
                ) : (
                  <button type="button" className="btn sm ghost" disabled={pending} onClick={() => agir(() => annulerUnSeuil(a.id), t("Alerte annulée."))}>
                    {t("Annuler")}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
