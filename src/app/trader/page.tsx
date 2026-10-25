import { Suspense } from "react";
import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { ETAPES, RAISON, servicesDuClient } from "@/lib/domain/services";
import { contexteDuClient } from "@/lib/domain/contexte-client";
import { getT } from "@/i18n/server";
import { fmt } from "@/lib/format";
import { CeQuiVousAttend } from "@/components/CeQuiVousAttend";
import { CeQuiFermeBientot } from "@/components/CeQuiFermeBientot";
import { Parcours } from "./Parcours";
import { Rayons } from "./Rayons";
import styles from "./page.module.css";
import { Glissement } from "@/components/mobile/Glissement";
import { EnTete } from "@/components/EnTete";
import { apercusDuService } from "@/lib/domain/apercus";

export const dynamic = "force-dynamic";
export const metadata = { title: "Trade" };

/**
 * Trade : ce que vous pouvez faire, et par où chaque geste commence.
 *
 * LE TROU QUE CETTE PAGE BOUCHE. Le portefeuille suppose qu'on possède déjà,
 * le marché suppose qu'on sait quel instrument on cherche. Personne ne
 * répondait à « j'ai de l'argent, qu'est-ce que je peux en faire ».
 *
 * ─── Ce que la page a perdu, et pourquoi ───────────────────────────────────
 *
 * LA CARTE DU CONSEILLER ET LE RAYON « COMPRENDRE » N'Y SONT PLUS. Ils
 * vivaient sous les services, et l'on y tombait en descendant une page qu'on
 * était venu lire pour AGIR. Trois intentions sur un écran, et les deux
 * dernières ne se trouvaient que par accident : personne ne descend une page
 * de services pour chercher un numéro ou une leçon. Chacune a sa page, et le
 * rail y mène — « Nous contacter » et « Le guide ».
 *
 * Une page qui fait agir ne fait que cela.
 *
 * ─── Un seul contenu, deux arrangements ────────────────────────────────────
 *
 * Les deux écrans lisent la MÊME donnée et rendent le même texte dans le même
 * ordre : raison, phrase, étapes, geste (composant `Fiche`). Ce qui change
 * est la façon de s'y déplacer, et rien d'autre.
 *
 *   L'ÉCRAN LARGE empile trois plis : on voit l'ensemble, on déplie ce qu'on
 *   veut, on compare. C'est la grammaire de « Mes documents ».
 *
 *   LE TÉLÉPHONE donne un écran par niveau et les fait glisser. La même page
 *   dépliée y faisait deux mille pixels de mur, et ouvrir une bande poussait
 *   le reste si bas qu'on perdait de vue ce qu'on venait de lire.
 *
 * LE CHOIX SE FAIT EN CSS, pas en JavaScript, et c'est délibéré : mesurer la
 * largeur au montage ferait rendre au serveur un arrangement et au navigateur
 * l'autre, c'est-à-dire l'erreur d'hydratation qui faisait échouer une page
 * sur deux au premier clic il y a trois jours.
 */
export default async function TradePage() {
  const s = await requireSession("/trader");
  const t = await getT();

  /* UN SEUL ASSEMBLAGE, ET C'EST CELUI DE contexte-client. Cette page en
     refaisait un deuxième, ligne pour ligne, pendant que la bande « Ce qui
     vous attend » lisait le premier : deux lectures du même client dans la
     même requête, donc deux occasions de diverger. */
  const [ctx, offers] = await Promise.all([contexteDuClient(s.userId), repo().listOffers().catch(() => [])]);
  const services = servicesDuClient(ctx, fmt);
  /* CE QUI ATTEND DERRIÈRE CHAQUE TUILE, calculé UNE FOIS et passé aux deux
     arrangements. Tout sort des offres déjà lues plus haut : un aperçu qui
     aurait demandé une requête par service aurait été écarté comme le volet
     « la séance » de la page d'arrivée. */
  const apercus = Object.fromEntries(services.map((sv) => [sv.cle, apercusDuService(sv.cle, offers, ctx)]));

  /* CE QUI TIENT LA TÊTE DE LA RACINE, et qui n'appartient qu'à elle.
     Le disponible, ce qui attend, ce qui ferme : trois états qui répondent à
     « qu'est-ce que je peux faire, et avec quoi ». Une fois le service
     choisi, ils sont du contexte déjà lu.
     ILS SE RENDENT DEUX FOIS, ET CELA NE COÛTE QU'UNE LECTURE. L'écran large
     n'a pas de niveaux : il les garde en tête de page. Le téléphone les pose
     DANS le premier panneau du ruban, pour qu'ils glissent avec lui.
     « contexteDuClient » est en cache par requête, et les offres sont lues
     ici puis passées aux deux bandes — c'est la règle que cette page s'est
     déjà donnée : un seul assemblage, une seule lecture. */
  const tete = (
    <>
      {/* LE DISPONIBLE PASSE DEVANT LES GESTES, parce qu'il les conditionne
          tous. La page demande « qu'est-ce que je peux faire » ; la première
          réponse est « avec quoi ». Ce franc n'est pas un reproche ici mais
          un état, et c'est pourquoi l'attente qui le reproche est retirée
          juste en dessous — voir le « sauf » de CeQuiVousAttend.
          À zéro, le chiffre se nomme au lieu de s'afficher : « 0 FCFA » se
          lit comme une panne, et c'est justement le jour où « Approvisionner »
          sert le plus. */}
      <div className={styles.solde}>
        <Link className={styles.combien} href="/moi/provision">
          <span className={styles.etiquette}>{t("Disponible pour un ordre")}</span>
          {ctx.disponible > 0 ? (
            <b className={styles.montant}>
              {fmt(Math.round(ctx.disponible))} <small>FCFA</small>
            </b>
          ) : (
            <b className={styles.vide}>{t("Rien en provision")}</b>
          )}
        </Link>
        <Link className={styles.geste} href="/moi/provision/alimenter">
          <span className={styles.rond} aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </span>
          <b>{t("Approvisionner")}</b>
        </Link>
      </div>

      {/* L'attente « disponible » n'y est pas : la bande ci-dessus dit le même
          franc, et deux fois le même nombre sur un écran fait chercher lequel
          est le vrai. */}
      <CeQuiVousAttend userId={s.userId} sauf={["disponible"]} />

      {/* LES SÉANCES QUI SE FERMENT, SUR LA PAGE OÙ L'ON VIENT AGIR. Une
          adjudication s'annonce une semaine avant sa clôture, et le calendrier
          est une page où l'on va : celle-ci est une bande qu'on croise. Vide —
          l'état le plus fréquent, les Trésors publiant par vagues — elle ne
          rend rien. */}
      <CeQuiFermeBientot offres={offers} />
    </>
  );

  return (
    <Glissement>
      <div className={styles.page}>
        {/* L'EN-TÊTE DE L'ÉTALON, et plus une grille de douze colonnes pour
            lui seul : la phrase partait en colonne 8, soit huit cent vingt
            pixels à droite du titre qu'elle explique, sur une page dont le
            reste tient en une colonne. Pas de sur-titre : une racine n'est
            contenue nulle part. */}
        <EnTete titre={t("Trade")} phrase={t("Ce que Guichet peut faire pour vous, et par où chaque geste commence.")} />

        {/* L'ÉCRAN LARGE N'A PAS DE NIVEAUX : les trois états restent en
            tête de page, au-dessus des trois bandes. */}
        <div className={styles.large}>
          {tete}
          <Rayons services={services} etapes={ETAPES} raisons={RAISON} apercus={apercus} />
        </div>
        <div className={styles.petit}>
          {/* « useSearchParams » veut une frontière : le parcours lit l'adresse,
              et le reste de la page se rend sans l'attendre. */}
          <Suspense fallback={null}>
            {/* LA TÊTE ENTRE DANS LE RUBAN, au premier panneau. Relevé le
                24 octobre 2026 : 441 px sur 844 ne bougeaient jamais — le
                titre, la phrase et « Ce qui vous attend » se repeignaient à
                l'identique aux trois niveaux, soit 52 % de l'écran. Depuis,
                le solde et les échéances s'y étaient ajoutés. Posés DANS le
                panneau de la racine, ils glissent avec lui : au deuxième
                niveau il ne reste que le chemin et la fiche. */}
            <Parcours services={services} etapes={ETAPES} raisons={RAISON} racine={tete} apercus={apercus} />
          </Suspense>
        </div>
      </div>
    </Glissement>
  );
}
