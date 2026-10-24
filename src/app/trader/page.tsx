import { Suspense } from "react";
import Link from "next/link";
import { requireSession } from "@/lib/auth";
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
  const ctx = await contexteDuClient(s.userId);
  const services = servicesDuClient(ctx);

  return (
    <Glissement>
      <div className={styles.page}>
        {/* L'EN-TÊTE DE L'ÉTALON, et plus une grille de douze colonnes pour
            lui seul : la phrase partait en colonne 8, soit huit cent vingt
            pixels à droite du titre qu'elle explique, sur une page dont le
            reste tient en une colonne. Pas de sur-titre : une racine n'est
            contenue nulle part. */}
        <EnTete titre={t("Trade")} phrase={t("Ce que Guichet peut faire pour vous, et par où chaque geste commence.")} />

        {/* CE QUI DEMANDE LA MAIN D'ABORD. Un bulletin à signer, un coupon qui
            dort, une séance qui se ferme : ce sont les seules lignes de cette
            page qui ont une échéance, et elles étaient au bas d'un mur. */}
        {/* LE DISPONIBLE PASSE DEVANT LES GESTES, parce qu'il les conditionne
            tous. La page demande « qu'est-ce que je peux faire » ; la
            première réponse est « avec quoi ». Ce franc n'est pas un reproche
            ici mais un état, et c'est pourquoi l'attente qui le reproche est
            retirée juste en dessous — voir le « sauf » de CeQuiVousAttend.
            À zéro, le chiffre se nomme au lieu de s'afficher : « 0 FCFA » se
            lit comme une panne, et c'est justement le jour où « Alimenter »
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
            <b>{t("Alimenter")}</b>
          </Link>
        </div>

        {/* L'attente « disponible » n'y est pas : la bande ci-dessus dit le
            même franc, et deux fois le même nombre sur un écran fait chercher
            lequel est le vrai. */}
        <CeQuiVousAttend userId={s.userId} sauf={["disponible"]} />

        {/* LES SÉANCES QUI SE FERMENT, SUR LA PAGE OÙ L'ON VIENT AGIR. Une
            adjudication s'annonce une semaine avant sa clôture, et le
            calendrier est une page où l'on va : celle-ci est une bande qu'on
            croise. Vide — l'état le plus fréquent, les Trésors publiant par
            vagues — elle ne rend rien. */}
        <CeQuiFermeBientot />

        <div className={styles.large}>
          <Rayons services={services} etapes={ETAPES} raisons={RAISON} />
        </div>
        <div className={styles.petit}>
          {/* « useSearchParams » veut une frontière : le parcours lit l'adresse,
              et le reste de la page se rend sans l'attendre. */}
          <Suspense fallback={null}>
            <Parcours services={services} etapes={ETAPES} raisons={RAISON} />
          </Suspense>
        </div>
      </div>
    </Glissement>
  );
}
