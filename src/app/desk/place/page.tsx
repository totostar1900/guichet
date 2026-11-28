import Link from "next/link";
import { DeskNav } from "@/components/DeskNav";
import { requireDesk } from "@/lib/auth";
import { getT } from "@/i18n/server";
import { fmt, fmtDate } from "@/lib/format";
import { facialLisible } from "@/lib/domain/facial-lisible";
import { annoncesAModerer } from "@/lib/place-donnees";
import { moderer } from "./actions";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Place de marché" };

/** Modération des annonces (planche 6A, premier écran) : le desk lit le facial, le prix et le sens ; jamais l'identité du déposant n'est affichée. */
export default async function DeskPlacePage() {
  await requireDesk("/desk/place");
  const t = await getT();
  const liste = await annoncesAModerer();
  return (
    <div className={styles.page}>
      <DeskNav current="/desk/place" />
      <header>
        <h1>{t("Place de marché : modération")}</h1>
        <p>{t("Une annonce n'est publiée qu'après relecture. Un refus s'écrit avec son motif.")}</p>
        <Link href="/desk/place/accords">{t("Accords en cours")}</Link>
        <Link href="/place">{t("Voir la place de marché côté client")}</Link>
      </header>
      {liste.length === 0 ? (
        <p className={styles.vide}>{t("Aucune annonce à relire.")}</p>
      ) : (
        <ul className={styles.liste}>
          {liste.map((a) => (
            <li key={a.id} className={styles.ligne}>
              <span>
                <strong>{a.titre}</strong> · {a.sens === "vend" ? t("vend") : t("cherche")} · {facialLisible(a.quantite * a.nominal)} FCFA · {fmt(a.quantite)} {t("titres")} · {a.decoupage ? t("découpage permis") : t("tout ou rien")} · {a.prix.toLocaleString("fr-FR")} {a.unite === "pct" ? "%" : "FCFA"} · {fmtDate(a.deposeeLe)}
              </span>
              <form action={moderer} className={styles.gestes}>
                <input type="hidden" name="id" value={a.id} />
                <input name="motif" placeholder={t("Motif (obligatoire pour un refus)")} />
                <button className="btn primary sm" name="decision" value="publier" type="submit">{t("Publier")}</button>
                <button className="btn sm" name="decision" value="refuser" type="submit">{t("Refuser")}</button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
