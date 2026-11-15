import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { getT } from "@/i18n/server";
import styles from "../page.module.css";
import { Glissement } from "@/components/mobile/Glissement";
import { EnTete } from "@/components/EnTete";

export const dynamic = "force-dynamic";
export const metadata = { title: "Comment cela marche" };

/**
 * COMMENT CELA MARCHE : une vraie page (décision du 15 novembre 2026). Le mandat est NOMMÉ, pas contenu : les deux décisions se touchent, un versement
 * doit bien être payé, mais les mêler, c'est faire signer une autorisation de débit à qui vient choisir un placement.
 */
export default async function FonctionnementPage() {
  await requireSession("/moi/epargne/fonctionnement");
  const t = await getT();
  return (
    <Glissement>
      <div className={styles.page}>
        <EnTete titre={t("Comment cela marche")} phrase={t("Ce qui part, comment c'est payé, et comment cela s'arrête.")} />
        <ol className={styles.steps}>
          <li>{t("Vous choisissez le fonds, la somme et le jour du mois. Rien n'est prélevé à la signature.")}</li>
          <li>
            {t("Le jour venu, la somme est appelée. Vous la virez vous-même, ou vous nous autorisez à la prélever : c'est le")}{" "}
            <Link href="/moi/prelevements">{t("mandat de prélèvement")}</Link>
            {t(", une autorisation distincte, que vous signez une fois et révoquez quand vous voulez.")}
          </li>
          <li>{t("L'ordre produit est un ordre ordinaire : il porte une référence, vous en recevez l'avis, et il paraît dans votre espace comme les autres.")}</li>
          <li>{t("Vous arrêtez le versement d'un bouton, sans motif à donner. Arrêter le versement ne révoque pas le mandat, et révoquer le mandat n'arrête pas le versement : ce sont deux décisions.")}</li>
        </ol>
        <Link href="/moi/epargne/nouvelle" className={styles.suite}>
          {t("Mettre une épargne en place")} →
        </Link>
      </div>
    </Glissement>
  );
}
