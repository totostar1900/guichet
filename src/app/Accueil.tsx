import Link from "next/link";
import { getT } from "@/i18n/server";
import { COMPANY } from "@/lib/config";
import { tirerLesMessages } from "@/lib/domain/vitrine-messages";
import styles from "./Accueil.module.css";

/**
 * L'accueil d'un visiteur qui n'est pas connecté : CINQ ÉCRANS PLEIN ÉCRAN, UN FOND BLEU NUIT UNI (18 novembre 2026).
 *
 * Avant : neuf sections, 7 037 px de haut à 390 px, 1 033 mots, « Créer mon compte » écrit trois fois. Le client : « très fouillie ».
 * Maintenant : un écran, un message. Le hub (ce qu'on trouve ici, produits nommés), la durée (comment chaque placement fonctionne), investir, la région, vous (le sérieux de la maison et l'accompagnement).
 * LES MESSAGES CHANGENT À CHAQUE VISITE : trois variantes par écran, une tirée côté serveur (`vitrine-messages.ts`).
 * LES BOUTONS D'ENTRÉE NE SONT PAS DANS LA PAGE : la bande basse (PorteVitrine) porte « Créer mon compte » et « Se connecter » ; au large, la pastille du haut.
 *
 * LE DESIGN, RETIRÉ DE SA LUEUR LE MÊME JOUR (le client : « retirer le glow », « un fond bleu nuit », « garder le même fond tout le long ») : un seul fond, le bleu nuit de la maison, d'un bord à l'autre de la page, pied compris ; aucun halo, aucun anneau, aucune ombre dorée.
 *
 * L'ÉCRAN « DURÉE » NE PROMET RIEN. Le client voulait « les rendements qui sécurisent le futur de l'investisseur » : la règle de la vitrine (aucun taux, aucun rendement, aucune promesse) l'interdit, et un placement ne sécurise rien. L'écran dit comment fonctionnent les obligations, les actions et les fonds, avec ce que rien ne garantit (« tant que l'émetteur tient ses engagements », « rien ne le garantit »).
 *
 * LE PIED DE LA PAGE EST LE SIEN (le pied du gabarit est masqué sur cette page, « globals.css ») : l'adresse, la localisation et la mention longue en sont retirées à la demande du client ; le nom de la maison et son agrément y restent, la phrase sur le risque de perte en capital est écrite à l'écran « vous », et « Éclairages », « Aide et contact », « Risques et limites » sont de vrais liens vers des pages publiques. Les mentions légales complètes restent à « /info/mentions ».
 */
export async function Accueil() {
  const t = await getT();
  const m = tirerLesMessages();

  const produits = [
    { clef: "tresor", d: "M4 21h20 M6 21V10l8-5 8 5v11 M10 21v-6h8v6", titre: t("Titres du Trésor"), dit: t("Les obligations et les bons des États de la zone.") },
    { clef: "actions", d: "M3 22l7-8 5 4 9-11 M24 7h-6 M24 7v6", titre: t("Actions cotées"), dit: t("Les sociétés de la bourse régionale.") },
    { clef: "fonds", d: "M14 4v10h10a10 10 0 1 1-10-10z M17 3a10 10 0 0 1 8 8h-8z", titre: t("Fonds agréés"), dit: t("Des placements gérés pour vous, agréés par la COSUMAF.") },
    { clef: "adjudications", d: "M5 7h18v16H5z M5 12h18 M10 4v5 M18 4v5", titre: t("Adjudications"), dit: t("Le calendrier des séances d'emprunt des États.") },
  ];

  const placements = [
    { titre: t("Les obligations"), dit: t("Un intérêt versé à des dates connues d'avance, et votre capital remboursé à l'échéance, tant que l'émetteur tient ses engagements.") },
    { titre: t("Les actions"), dit: t("Une part du capital d'une société cotée, qui peut verser un dividende. Rien ne le garantit, et son cours peut baisser.") },
    { titre: t("Les fonds"), dit: t("Votre placement réparti sur plusieurs lignes, géré par des professionnels agréés par la COSUMAF.") },
  ];

  const garanties = [
    { titre: t("Une société agréée"), dit: t("Purpose Capital est agréée en qualité de société de bourse par la COSUMAF, régulateur du marché financier de l'Afrique centrale.") },
    { titre: t("Vos titres à votre nom"), dit: t("Les titres acquis sont inscrits à votre nom, et le demeurent si vous nous quittez.") },
    { titre: t("Vos espèces séparées"), dit: t("Votre compte espèces est ouvert à votre nom. Chaque mouvement porte sa date de valeur.") },
    { titre: t("Vous seul donnez les ordres"), dit: t("Aucun ordre ne part sans vous. Le conseiller éclaire et propose ; la décision vous appartient.") },
  ];

  const etapes = [
    { n: "1", titre: t("Ouvrir votre compte"), dit: t("Le desk vous rappelle si une pièce manque, à votre rythme.") },
    { n: "2", titre: t("Choisir une ligne"), dit: t("Chaque chiffre est expliqué, la décision reste la vôtre.") },
    { n: "3", titre: t("Passer votre ordre"), dit: t("Rien n'est débité sans votre accord.") },
    { n: "4", titre: t("Suivre vos placements"), dit: t("Chaque étape vous est notifiée ; relevés et avis se téléchargent.") },
  ];

  return (
    <div className={styles.page} data-vitrine="">
      {/* ÉCRAN 1 · LE HUB : ce qu'on trouve ici, nommé, sans un chiffre. */}
      <section className={styles.ecran}>
        <div className={styles.col}>
          <span className={styles.agrement} data-anim="">
            {t("Société de bourse agréée COSUMAF · n° COSUMAF-SDB-01/2026")}
          </span>
          <h1 data-anim="">{t(m.hub)}</h1>
          <div className={styles.produits} data-anim="">
            {produits.map((p) => (
              <article className={styles.produit} key={p.clef}>
                <span className={styles.icone}>
                  <svg viewBox="0 0 28 28" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d={p.d} />
                  </svg>
                </span>
                <h3>{p.titre}</h3>
                <p>{p.dit}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ÉCRAN 2 · LA DURÉE : comment chaque placement fonctionne, et ce que rien ne garantit. */}
      <section className={styles.ecran}>
        <div className={styles.col}>
          <span className={styles.etiquette} data-anim="">
            {t("Dans la durée")}
          </span>
          <h2 data-anim="">{t(m.futur)}</h2>
          <p className={styles.chapeau} data-anim="">
            {t("Ce que chaque placement peut vous apporter, et ce qu'il ne garantit pas.")}
          </p>
          <div className={styles.cartes} data-anim="">
            {placements.map((p) => (
              <article className={styles.carte} key={p.titre}>
                <h3>{p.titre}</h3>
                <p>{p.dit}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ÉCRAN 3 · INVESTIR : le futur et le financement. */}
      <section className={styles.ecran}>
        <div className={styles.col}>
          <span className={styles.etiquette} data-anim="">
            {t("Investir")}
          </span>
          <h2 data-anim="">{t(m.investir)}</h2>
          <p className={styles.chapeau} data-anim="">
            {t("Prêtez aux États et aux institutions de la zone, prenez part au capital des sociétés cotées, placez dans des fonds agréés par la COSUMAF.")}
          </p>
        </div>
      </section>

      {/* ÉCRAN 4 · LA RÉGION : un seul message, le plus fort. */}
      <section className={styles.ecran}>
        <div className={styles.col}>
          <span className={styles.etiquette} data-anim="">
            {t("La région")}
          </span>
          <h2 data-anim="">{t(m.region)}</h2>
          <p className={styles.chapeau} data-anim="">
            {t("Les fonds levés sur ce marché financent des projets de la région : le marché existe pour les rendre possibles.")}
          </p>
        </div>
      </section>

      {/* ÉCRAN 5 · VOUS : le sérieux de la maison, l'accompagnement à chaque étape, et le pied. */}
      <section className={styles.ecran}>
        <div className={styles.col}>
          <span className={styles.etiquette} data-anim="">
            {t("Vous")}
          </span>
          <h2 data-anim="">{t(m.vous)}</h2>
          <h3 className={styles.sousTitre} data-anim="">
            {t("Une maison sérieuse, à vos côtés à chaque étape.")}
          </h3>
          <div className={styles.cartes} data-anim="">
            {garanties.map((g) => (
              <article className={styles.carte} key={g.titre}>
                <h3>{g.titre}</h3>
                <p>{g.dit}</p>
              </article>
            ))}
          </div>
          <ol className={styles.pas} data-anim="">
            {etapes.map((e) => (
              <li key={e.n}>
                <span className={styles.rang}>{e.n}</span>
                <div>
                  <b>{e.titre}</b>
                  <p>{e.dit}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className={styles.confiance} data-anim="">
            {t("Un conseiller vous répond, en français et sans jargon, à chaque étape.")}
          </p>
          <p className={styles.avertissement} data-anim="">
            {t("Tout placement comporte un risque de perte en capital. Les performances passées ne préjugent pas des performances futures. Les conditions de chaque placement vous sont remises avant toute décision.")}
          </p>
          <nav className={styles.liens} aria-label={t("Pour en savoir plus")} data-anim="">
            <Link href="/info/eclairages">{t("Éclairages")}</Link>
            <Link href="/info/aide">{t("Aide et contact")}</Link>
            <Link href="/info/risques">{t("Risques et limites")}</Link>
          </nav>
          <p className={styles.maison}>
            <b>{COMPANY.legalName}</b>, {t(COMPANY.licence)}
            {process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ? ` · v${process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA.slice(0, 7)}` : ""}
          </p>
        </div>
      </section>
    </div>
  );
}
