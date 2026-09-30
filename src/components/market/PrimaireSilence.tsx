import Link from "next/link";
import { getT } from "@/i18n/server";
import { fmtDate } from "@/lib/format";
import styles from "./PrimaireSilence.module.css";

/**
 * Le creux du marché primaire, dit plutôt que laissé à deviner.
 *
 * ON MONTRE CE QUI EST VRAI, ON COMPTE CE QUI MANQUE, et le manque avait échappé
 * à la règle. La liste des titres n'affichait simplement aucune ligne de
 * primaire quand aucune n'était ouverte. Le calendrier, lui, montrait les
 * dernières séances annoncées, toutes passées : un lecteur en concluait
 * légitimement que des séances existaient et que la page les oubliait.
 *
 * Or il n'y avait rien à oublier. Les Trésors publient par vagues, trois
 * semaines sans rien puis six séances en deux jours, et la BEAC n'avait rien
 * annoncé depuis le 22 septembre. Chaque maillon fonctionnait, la source se
 * taisait, et le silence ressemblait à une panne.
 *
 * Cette bande dit donc la même chose que le calendrier, à l'endroit où la
 * question se pose : il n'y a pas de séance ouverte, voici quand la dernière
 * s'est tenue, voici le rythme. Un creux nommé n'est plus un doute.
 */
export async function PrimaireSilence({ derniereSeance }: { derniereSeance?: string }) {
  const t = await getT();
  return (
    <section className={styles.bande}>
      <div className={styles.dire}>
        <span className={styles.etiquette}>{t("Marché primaire")}</span>
        <b>{t("Aucune séance d'adjudication n'est ouverte en ce moment.")}</b>
        <p>
          {derniereSeance
            ? t("La dernière séance de la zone s'est tenue le {d}. Les Trésors annoncent par vagues, souvent une semaine avant la séance : le calendrier suit ce rythme et vous préviendra dès la prochaine annonce.", {
                d: fmtDate(derniereSeance),
              })
            : t("Les Trésors annoncent par vagues, souvent une semaine avant la séance : le calendrier suit ce rythme et vous préviendra dès la prochaine annonce.")}
        </p>
      </div>
      <Link className={styles.geste} href="/calendrier">
        {t("Le calendrier des adjudications")}
      </Link>
    </section>
  );
}
