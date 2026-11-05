import { CeQuiFermeBientot } from "@/components/CeQuiFermeBientot";
import { Glissement } from "@/components/mobile/Glissement";
import { PagePleine } from "@/components/PagePleine";
import { getT } from "@/i18n/server";
import { requireSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { echeancesProches, JOURS_FENETRE } from "@/lib/domain/echeances";
import Link from "next/link";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Ce qui ferme bientôt") };
}

/**
 * L'HORLOGE DE LA BARRE : TOUTES LES LIGNES QUI FERMENT DANS LE MOIS.
 *
 * Une page pleine, fermée par sa croix, qui est un RACCOURCI vers les lignes :
 * chaque ligne mène à sa fiche. La liste est celle de la bande de l'accueil
 * (« echeancesProches », une seule lecture) mais sans son plafond de trois :
 * ici c'est le travail de la page de les porter toutes.
 *
 * VIDE, ELLE DIT QU'ELLE EST VIDE. Contrairement à la bande de l'accueil, qui
 * disparaît quand rien ne ferme (elle occuperait la place de ce qui compte),
 * cette page est un endroit où l'on va exprès : un client qui touche l'horloge
 * veut savoir, et « rien » est une réponse.
 */
export default async function EcheancesPage() {
  /* Langue, session et offres ne dépendent de rien : un seul étage (une session absente redirige, les offres lues sont jetées). */
  const [t, , offres] = await Promise.all([getT(), requireSession("/echeances"), repo().listOffers().catch(() => [])]);
  const n = echeancesProches(offres).length;
  return (
    <Glissement>
    <PagePleine
      titre={t("Ce qui ferme bientôt")}
      fermer={t("Fermer")}
      icone={
        <svg viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7.5V12l3 2" />
        </svg>
      }
    >
      {n === 0 ? (
        <p>{t("Rien ne ferme dans les {n} prochains jours.", { n: String(JOURS_FENETRE) })}</p>
      ) : (
        <>
          <p className="muted">{t(n > 1 ? "{n} lignes ferment dans les {j} prochains jours." : "Une ligne ferme dans les {j} prochains jours.", { n: String(n), j: String(JOURS_FENETRE) })}</p>
          <CeQuiFermeBientot offres={offres} max={n} entete={false} />
        </>
      )}
      <Link className="btn ghost" href="/calendrier">
        {t("Tout le calendrier")} →
      </Link>
    </PagePleine>
    </Glissement>
  );
}
