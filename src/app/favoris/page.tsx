import Link from "next/link";
import { LineIdentity } from "@/components/LineIdentity";
import { Glissement } from "@/components/mobile/Glissement";
import { PagePleine } from "@/components/PagePleine";
import { WatchButton } from "@/components/WatchButton";
import { getT } from "@/i18n/server";
import { requireSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { lesFavoris } from "@/lib/domain/favoris";
import { summarize } from "@/lib/domain/summary";
import { RetirerFavori } from "./RetirerFavori";
import styles from "./favoris.module.css";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Mes favoris") };
}

const ONGLETS = ["tout", "lignes", "pages"] as const;
type Onglet = (typeof ONGLETS)[number];

/**
 * L'ÉTOILE DE LA BARRE : CE QUE LE CLIENT A GARDÉ, LIGNES ET PAGES.
 *
 * Une page pleine, fermée par sa croix. Les LIGNES sont les lignes suivies —
 * l'étoile d'une fiche est « Suivre », il n'y en a qu'une — et les PAGES sont
 * celles qu'on a rangées ici d'un geste, depuis le menu. Un filtre les sépare.
 *
 * Chaque ligne retire son étoile ICI comme sur la fiche : c'est le même
 * interrupteur, et la liste suit.
 */
export default async function FavorisPage({ searchParams }: { searchParams: Promise<{ onglet?: string }> }) {
  const t = await getT();
  const s = await requireSession("/favoris");
  const r = repo();
  const [watches, offers, pages] = await Promise.all([r.listWatches(s.userId).catch(() => []), r.listOffers().catch(() => []), r.listFavoris(s.userId).catch(() => [])]);
  const { lignes, pages: lesPages } = lesFavoris(watches, offers, pages);
  const q = (await searchParams).onglet;
  const onglet: Onglet = (ONGLETS as readonly string[]).includes(q ?? "") ? (q as Onglet) : "tout";
  const now = new Date();
  const compte: Record<Onglet, number> = { tout: lignes.length + lesPages.length, lignes: lignes.length, pages: lesPages.length };
  const nom: Record<Onglet, string> = { tout: t("Tout"), lignes: t("Lignes"), pages: t("Pages") };
  const montrerLignes = onglet !== "pages";
  const montrerPages = onglet !== "lignes";
  const vide = (onglet === "tout" ? compte.tout : compte[onglet]) === 0;

  return (
    <Glissement>
    <PagePleine
      titre={t("Mes favoris")}
      fermer={t("Fermer")}
      icone={
        <svg viewBox="0 0 24 24">
          <path d="M12 3.3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.6l-5.5 2.9 1-6.2L3 9.9l6.2-.9z" />
        </svg>
      }
    >
      <nav className={styles.onglets} aria-label={t("Filtrer les favoris")}>
        {ONGLETS.map((o) => (
          <Link key={o} href={o === "tout" ? "/favoris" : `/favoris?onglet=${o}`} aria-current={o === onglet ? "page" : undefined} replace>
            {nom[o]} · {compte[o]}
          </Link>
        ))}
      </nav>
      {vide ? (
        <p className="muted">
          {onglet === "pages" ? t("Aucune page en favori. Ouvrez le menu sur une page, puis « Mettre cette page en favori ».") : onglet === "lignes" ? t("Aucune ligne en favori. L'étoile d'une fiche la suit et la range ici.") : t("Rien en favori pour l'instant. L'étoile d'une fiche suit la ligne ; le menu range une page.")}{" "}
          <Link href="/titres">{t("Parcourir les titres")}</Link>
        </p>
      ) : (
        <div className={styles.liste}>
          {montrerLignes &&
            lignes.map((o) => {
              const sm = summarize(o, now);
              return (
                <div key={o.id} className={styles.ligne}>
                  <LineIdentity o={o} s={sm} href={`/offres/${o.id}`} />
                  <WatchButton offerId={o.id} initial signedIn />
                </div>
              );
            })}
          {montrerPages &&
            lesPages.map((f) => (
              <div key={f.id} className={styles.ligne}>
                <span className={styles.page}>
                  <Link href={f.href}>{t(f.title)}</Link>
                  <small>{t("Page")}</small>
                </span>
                <RetirerFavori href={f.href} titre={f.title} />
              </div>
            ))}
        </div>
      )}
    </PagePleine>
    </Glissement>
  );
}
