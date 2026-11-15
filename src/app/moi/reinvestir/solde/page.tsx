import { requireSession } from "@/lib/auth";
import { getT } from "@/i18n/server";
import { fmt, fmtDate } from "@/lib/format";
import { lireLeReinvestissement } from "../donnees";
import styles from "../page.module.css";
import { Glissement } from "@/components/mobile/Glissement";
import { EnTete } from "@/components/EnTete";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ce que vous avez aujourd'hui" };

/**
 * CE QUI EST RÉELLEMENT DISPONIBLE, d'abord : une promesse de réinvestissement posée au-dessus d'un solde qu'on ne voit pas ne se vérifie pas.
 * La distinction que la page défend : ce qui est arrivé n'est pas ce qui est dû. Les additionner ferait une promesse invérifiable.
 */
export default async function SoldePage() {
  const s = await requireSession("/moi/reinvestir/solde");
  const t = await getT();
  const { b, poche, prochains } = await lireLeReinvestissement(s.userId);
  return (
    <Glissement>
      <div className={styles.page}>
        <EnTete titre={t("Ce que vous avez aujourd'hui")} phrase={t("Ce qui est arrivé, ce qui vous est dû, et ce qui viendra.")} />
        <dl className={styles.band}>
          <div>
            <dt>{t("Disponible")}</dt>
            <dd>{fmt(Math.round(poche.idle))}</dd>
            <span>{t("reçu et n'attendant aucune opération")}</span>
          </div>
          <div>
            <dt>{t("Échu, pas encore reçu")}</dt>
            <dd>{fmt(Math.round(b.attendu))}</dd>
            <span>{b.nbAttendus ? t("{n} échéances, la plus ancienne depuis {j} jours", { n: b.nbAttendus, j: b.retardMax }) : t("rien en attente")}</span>
          </div>
          <div>
            <dt>{t("Encaissé à ce jour")}</dt>
            <dd>{fmt(Math.round(b.encaisse))}</dd>
            <span>{t("porté à votre journal")}</span>
          </div>
          <div>
            <dt>{t("À venir")}</dt>
            <dd>{fmt(Math.round(b.aVenir))}</dd>
            <span>{prochains[0] ? t("le prochain le {d}", { d: fmtDate(prochains[0].date) }) : t("aucune échéance connue")}</span>
          </div>
        </dl>
        <p className={styles.note}>
          {t(
            "« Disponible » est de l'argent réellement arrivé sur le compte de règlement et constaté par le desk. « Échu, pas encore reçu » est une créance sur l'émetteur : elle vous est due, elle n'est pas là, et rien ne se replace avec.",
          )}
        </p>
      </div>
    </Glissement>
  );
}
