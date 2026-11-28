import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { getT } from "@/i18n/server";
import { fmt, fmtDate } from "@/lib/format";
import { facialLisible } from "@/lib/domain/facial-lisible";
import { annoncesPubliees, peutParticiper, placeOuverte } from "@/lib/place-donnees";
import { Glissement } from "@/components/mobile/Glissement";
import { EnTete } from "@/components/EnTete";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Place de marché" };

/**
 * LA PLACE DE MARCHÉ (28 novembre 2026, planche 1A) : une carte par annonce, le facial en gras avec le nombre de titres, le découpage dit, le prix. Anonyme : aucune identité n'est lue ici.
 * Fermée par défaut en production (`PLACE_DE_MARCHE=on`), jamais liée à la navigation tant que la conformité n'a pas rendu ses textes.
 */
export default async function PlacePage({ searchParams }: { searchParams: Promise<{ depose?: string }> }) {
  const s = await requireSession("/place");
  if (!placeOuverte() || !peutParticiper(s)) notFound();
  const t = await getT();
  const [liste, sp] = await Promise.all([annoncesPubliees(s.userId), searchParams]);
  return (
    <Glissement>
      <div className="pile">
        <EnTete titre={t("Place de marché")} phrase={t("Des titres du Trésor non cotés, de gré à gré : vous déposez, on vous propose un prix, Purpose arrange l'échange.")} />
        {sp.depose && <p className={styles.ok}>{t("Annonce reçue. Elle est publiée après relecture par la maison.")}</p>}
        <div>
          <Link className="btn" href="/place/deposer">
            {t("Déposer une annonce")}
          </Link>
        </div>
        {liste.length === 0 ? (
          <p className={styles.vide}>{t("Aucune annonce publiée pour le moment.")}</p>
        ) : (
          <ul className={styles.liste}>
            {liste.map((a) => (
              <li key={a.id}>
                <Link className={styles.carte} href={`/place/${a.id}`}>
                  <span className={styles.sens}>{a.mienne ? t("Mon annonce") : a.sens === "vend" ? t("À vendre") : t("Recherché")}</span>
                  <strong className={styles.facial}>{facialLisible(a.facialOffert)} FCFA</strong>
                  <span className={styles.titre}>{a.titre}</span>
                  <span className={styles.meta}>
                    {fmt(a.titresOfferts)} {t("titres")} · {a.decoupage ? t("découpage permis") : t("tout ou rien")}
                  </span>
                  <span className={styles.prix}>
                    {a.unite === "pct" ? `${a.prix.toLocaleString("fr-FR")} %` : `${fmt(a.prix)} FCFA`}
                  </span>
                  <span className={styles.meta}>{fmtDate(a.deposeeLe)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Glissement>
  );
}
