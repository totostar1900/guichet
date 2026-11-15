import { requireSession } from "@/lib/auth";
import { getT } from "@/i18n/server";
import styles from "../page.module.css";
import { Glissement } from "@/components/mobile/Glissement";
import { EnTete } from "@/components/EnTete";

export const dynamic = "force-dynamic";
export const metadata = { title: "Comment cela marche" };

/** L'EXPLICATION, une vraie page : quatre temps, de l'arrivée du coupon à l'avis d'opéré. */
export default async function FonctionnementPage() {
  await requireSession("/moi/reinvestir/fonctionnement");
  const t = await getT();
  return (
    <Glissement>
      <div className={styles.page}>
        <EnTete titre={t("Comment cela marche")} phrase={t("Quatre temps, de l'arrivée du coupon à l'avis d'opéré.")} />
        <ol className={styles.steps}>
          <li>{t("Un coupon ou un remboursement tombe. Le desk constate le crédit et le porte à votre journal : à ce moment seulement, la somme est « reçue ».")}</li>
          <li>{t("Le lendemain au plus tard, tout ce qui est disponible part sur la ligne que vous avez choisie, si le total atteint votre plancher.")}</li>
          <li>{t("L'ordre produit est un ordre ordinaire : il porte une référence, vous en recevez l'avis, et il paraît dans votre espace comme les autres.")}</li>
          <li>{t("Vous arrêtez l'instruction d'un bouton, sans motif à donner. Ce qui est facile à prendre doit être au moins aussi facile à quitter.")}</li>
        </ol>
        <p className={styles.note}>
          {t("Trois choses sont déjà écrites quand l'ordre part : la ligne, que vous avez choisie ; le moment, celui où l'argent arrive ; et le montant, celui que l'émetteur a versé.")}
        </p>
      </div>
    </Glissement>
  );
}
